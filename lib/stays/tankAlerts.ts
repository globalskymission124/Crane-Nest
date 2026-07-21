// =========================================================
// し尿タンク — 警告通知（WeCom & Email のダブル通知）※サーバ専用
//   累積水量が警告ライン（既定480L / 80%）を超えたときに、
//   企業微信(WeCom)のグループBotとメールへ「同時・非同期」に通知する。
//
//   環境変数:
//     WECOM_WEBHOOK_URL   … 企業微信 グループBot の Webhook URL
//     ADMIN_EMAIL         … 通知メールの宛先（カンマ区切りで複数可）
//     SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM … SMTP設定
//     VACUUM_CONTACT      … バキュームカー業者の連絡先（文面に埋め込む）
//
//   ※ nodemailer は Node ランタイムでのみ動くため、この import を含むファイルは
//     必ず route.ts 側で `export const runtime = "nodejs"` を指定して使う。
// =========================================================
import { TankStatus, roundL } from "./tank";

export interface AlertPayload {
  currentLiters: number;
  capacityLiters: number;
  alertLine: number;
  pct: number;
  status: TankStatus;
}

export interface AlertResult {
  wecom: { ok: boolean; skipped?: boolean; error?: string };
  email: { ok: boolean; skipped?: boolean; error?: string };
}

// 業者連絡先（環境変数で上書き可能・バックエンドで編集可）
function vacuumContact(): string {
  return process.env.VACUUM_CONTACT || "バキュームカー業者：〇〇環境サービス TEL 0000-00-0000";
}

// ---- 共通の文面 ----
function buildTitle(): string {
  return "🚨【便槽 警告】汲み取り手配のお願い";
}

function buildLines(p: AlertPayload): string[] {
  return [
    "し尿タンクの累積水量が警告ライン（80%）を超えました。",
    `現在の水量：${roundL(p.currentLiters)} L / ${p.capacityLiters} L（${Math.round(p.pct)}%）`,
    `警告ライン：${p.alertLine} L を超過`,
    "至急バキュームカーの手配をお願いします。",
    vacuumContact(),
  ];
}

// ---------------------------------------------------------
// 通知1: WeCom（企業微信）グループBot — Markdown形式でPOST
// ---------------------------------------------------------
async function sendWecom(p: AlertPayload): Promise<AlertResult["wecom"]> {
  const url = process.env.WECOM_WEBHOOK_URL;
  if (!url) return { ok: false, skipped: true, error: "WECOM_WEBHOOK_URL 未設定" };

  const md = [
    `## ${buildTitle()}`,
    "",
    `> **現在の水量**：<font color=\"warning\">${roundL(p.currentLiters)} L</font> / ${p.capacityLiters} L（**${Math.round(p.pct)}%**）`,
    `> **警告ライン**：${p.alertLine} L を超過`,
    "",
    "至急バキュームカーの手配をお願いします。",
    `> ${vacuumContact()}`,
  ].join("\n");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgtype: "markdown", markdown: { content: md } }),
    });
    if (!res.ok) return { ok: false, error: `WeCom HTTP ${res.status}` };
    const json: any = await res.json().catch(() => ({}));
    // WeCom は成功時 errcode:0 を返す
    if (typeof json?.errcode === "number" && json.errcode !== 0) {
      return { ok: false, error: `WeCom errcode ${json.errcode}: ${json.errmsg}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "WeCom 送信失敗" };
  }
}

// ---------------------------------------------------------
// 通知2: Email — nodemailer(SMTP) で送信
//   nodemailer は動的 import（クライアントバンドルへの混入を避ける）。
// ---------------------------------------------------------
async function sendEmail(p: AlertPayload): Promise<AlertResult["email"]> {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return { ok: false, skipped: true, error: "ADMIN_EMAIL 未設定" };
  if (!process.env.SMTP_HOST) {
    return { ok: false, skipped: true, error: "SMTP_HOST 未設定" };
  }

  const lines = buildLines(p);
  const text = lines.join("\n");
  const html = `
    <div style="font-family:sans-serif;max-width:520px">
      <h2 style="color:#dc2626;margin:0 0 12px">${buildTitle()}</h2>
      <p style="margin:0 0 8px">し尿タンクの累積水量が<strong>警告ライン（80%）</strong>を超えました。</p>
      <table style="border-collapse:collapse;margin:12px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">現在の水量</td>
            <td style="padding:4px 0;font-weight:700">${roundL(p.currentLiters)} L / ${p.capacityLiters} L（${Math.round(p.pct)}%）</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">警告ライン</td>
            <td style="padding:4px 0;font-weight:700;color:#dc2626">${p.alertLine} L 超過</td></tr>
      </table>
      <p style="margin:0 0 8px">至急バキュームカーの手配をお願いします。</p>
      <p style="margin:0;color:#475569">${vacuumContact()}</p>
    </div>`;

  try {
    // 依存が無い環境でもビルドが壊れないよう動的 import
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@crane-nest.local",
      to,
      subject: buildTitle(),
      text,
      html,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "メール送信失敗" };
  }
}

// ---------------------------------------------------------
// 公開API：WeCom と Email を「同時・非同期」に実行
//   片方が失敗しても他方は送る（Promise.allSettled）。
// ---------------------------------------------------------
export async function dispatchTankAlerts(p: AlertPayload): Promise<AlertResult> {
  const [wecom, email] = await Promise.allSettled([sendWecom(p), sendEmail(p)]);
  return {
    wecom:
      wecom.status === "fulfilled"
        ? wecom.value
        : { ok: false, error: String(wecom.reason) },
    email:
      email.status === "fulfilled"
        ? email.value
        : { ok: false, error: String(email.reason) },
  };
}
