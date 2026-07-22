// =========================================================
// /api/stays/tank/sync
//   Gmail から Airbnb の予約確定/キャンセルメールを取得・解析し、
//   stays_ext_reservations に反映（confirmed→cancelled も追跡）。
//   その後タンクを再計算し、80%超過を検知したら WxPusher + Email 通知する。
//
//   POST … 画面の「Airbnb同期」ボタンから手動実行
//   GET  … Vercel Cron からの自動実行用（Vercel Cron は GET で叩く）。
//          CRON_SECRET を設定している場合は Authorization ヘッダで認証する。
//   GMAIL_* 未設定時は skipped を返す（アプリは落ちない）。
// =========================================================
import { NextRequest, NextResponse } from "next/server";
import { fetchAirbnbEmails } from "@/lib/stays/gmail";
import { parseAirbnbEmail } from "@/lib/stays/airbnbEmail";
import { upsertExternalReservation } from "@/lib/stays/tankStore";
import { evaluateAndAlert } from "@/lib/stays/tankEvaluate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function runSync() {
  const gmail = await fetchAirbnbEmails();

  let parsed = 0;
  let confirmed = 0;
  let cancelled = 0;
  let ignored = 0;

  for (const email of gmail.emails) {
    const r = parseAirbnbEmail(email.subject, email.body);
    if (!r) {
      ignored++;
      continue;
    }
    await upsertExternalReservation(r, email.id);
    parsed++;
    if (r.status === "cancelled") cancelled++;
    else confirmed++;
  }

  const { response, alert } = await evaluateAndAlert();

  return {
    ...response,
    alertDispatched: alert,
    sync: {
      gmail: { ok: gmail.ok, skipped: gmail.skipped, error: gmail.error },
      fetched: gmail.emails.length,
      parsed,
      confirmed,
      cancelled,
      ignored,
    },
  };
}

// 手動同期（画面のボタン）
export async function POST() {
  try {
    return NextResponse.json(await runSync());
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "同期に失敗しました" }, { status: 500 });
  }
}

// 自動同期（Vercel Cron）。CRON_SECRET 設定時はヘッダ認証。
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    return NextResponse.json(await runSync());
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "同期に失敗しました" }, { status: 500 });
  }
}
