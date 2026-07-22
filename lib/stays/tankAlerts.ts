// =========================================================
// し尿タンク — 警告通知（pushplus + Email の二重通知）※サーバ専用
//   累積水量が警告ライン（既定480L / 80%）を超えたときに、
//   pushplus とメールへ「同時・非同期」に通知する。
//
//   環境変数:
//     PUSHPLUS_TOKEN      … pushplus のユーザーtokenまたはメッセージtoken
//     PUSHPLUS_TOPIC      … 任意。一対多送信用の群組コード（家族全員へ送る場合に推奨）
//     PUSHPLUS_TO         … 任意。好友トークン（複数はカンマ区切り）。TOPICがある場合はTOPIC優先
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
  test?: boolean;
}

export interface AlertResult {
  pushplus: { ok: boolean; skipped?: boolean; error?: string };
  email: { ok: boolean; skipped?: boolean; error?: string };
}

// 業者連絡先（環境変数で上書き可能・バックエンドで編集可）
function vacuumContact(): string {
  return process.env.VACUUM_CONTACT || "バキュームカー業者：〇〇環境サービス TEL 0000-00-0000";
}

// ---- 共通の文面 ----
function buildTitle(p: AlertPayload): string {
  return p.test ? "【便槽テスト】通知設定の確認" : "【便槽警告】汲み取り手配のお願い";
}

function buildLines(p: AlertPayload): string[] {
  if (p.test) {
    return [
      "これは便槽通知の動作確認です。実際の汲み取り手配ではありません。",
      `現在の水量：${roundL(p.currentLiters)} L / ${p.capacityLiters} L（${Math.round(p.pct)}%）`,
      `警告ライン：${p.alertLine} L`,
      "pushplus とメールの通知設定が正しく届くか確認してください。",
      vacuumContact(),
    ];
  }

  return [
    "し尿タンクの累積水量が警告ライン（80%）を超えました。",
    `現在の水量：${roundL(p.currentLiters)} L / ${p.capacityLiters} L（${Math.round(p.pct)}%）`,
    `警告ライン：${p.alertLine} L を超過`,
    "至急バキュームカーの手配をお願いします。",
    vacuumContact(),
  ];
}

// ---------------------------------------------------------
// 通知1: pushplus — 個人WeChat / 家族グループ向け
//   topic を指定すると、pushplus側の一対多グループ参加者全員へ送る。
//   topic がなく to があれば、好友トークン宛に送る。
// ---------------------------------------------------------
async function sendPushplus(p: AlertPayload): Promise<AlertResult["pushplus"]> {
  const token = process.env.PUSHPLUS_TOKEN;
  if (!token) return { ok: false, skipped: true, error: "PUSHPLUS_TOKEN 未設定" };

  const topic = process.env.PUSHPLUS_TOPIC;
  const to = process.env.PUSHPLUS_TO;
  const content = [
    `# ${buildTitle(p)}`,
    "",
    ...buildLines(p).map((line) => `- ${line}`),
  ].join("\n");

  try {
    const res = await fetch("https://www.pushplus.plus/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        title: buildTitle(p),
        content,
        template: "markdown",
        ...(topic ? { topic } : {}),
        ...(!topic && to ? { to } : {}),
      }),
    });
    if (!res.ok) return { ok: false, error: `pushplus HTTP ${res.status}` };
    const json = (await res.json().catch(() => ({}))) as { code?: number; msg?: string };
    if (typeof json?.code === "number" && json.code !== 200) {
      return { ok: false, error: `pushplus code ${json.code}: ${json.msg || "送信失敗"}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "pushplus 送信失敗" };
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
      <h2 style="color:#dc2626;margin:0 0 12px">${buildTitle(p)}</h2>
      <p style="margin:0 0 8px">${
        p.test
          ? "これは便槽通知の動作確認です。実際の汲み取り手配ではありません。"
          : "し尿タンクの累積水量が<strong>警告ライン（80%）</strong>を超えました。"
      }</p>
      <table style="border-collapse:collapse;margin:12px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">現在の水量</td>
            <td style="padding:4px 0;font-weight:700">${roundL(p.currentLiters)} L / ${p.capacityLiters} L（${Math.round(p.pct)}%）</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">警告ライン</td>
            <td style="padding:4px 0;font-weight:700;color:#dc2626">${p.alertLine} L 超過</td></tr>
      </table>
      <p style="margin:0 0 8px">${
        p.test
          ? "pushplus とメールの通知設定が正しく届くか確認してください。"
          : "至急バキュームカーの手配をお願いします。"
      }</p>
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
      subject: buildTitle(p),
      text,
      html,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "メール送信失敗" };
  }
}

// ---------------------------------------------------------
// 公開API：pushplus と Email を「同時・非同期」に実行
//   どれかが失敗しても他方は送る（Promise.allSettled）。
// ---------------------------------------------------------
export async function dispatchTankAlerts(p: AlertPayload): Promise<AlertResult> {
  const [pushplus, email] = await Promise.allSettled([sendPushplus(p), sendEmail(p)]);
  return {
    pushplus:
      pushplus.status === "fulfilled"
        ? pushplus.value
        : { ok: false, error: String(pushplus.reason) },
    email:
      email.status === "fulfilled"
        ? email.value
        : { ok: false, error: String(email.reason) },
  };
}
