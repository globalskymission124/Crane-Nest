// =========================================================
// POST /api/stays/tank/sync
//   Gmail から Airbnb の予約確定/キャンセルメールを取得・解析し、
//   stays_ext_reservations に反映（confirmed→cancelled も追跡）。
//   その後タンクを再計算し、80%超過を検知したら WeCom & Email 通知する。
//
//   運用: 日次スケジュールタスク等からこの API を叩くことで、
//         Airbnbの予約・キャンセルが自動でタンクに反映される。
//   GMAIL_* 未設定時は skipped を返す（アプリは落ちない）。
// =========================================================
import { NextResponse } from "next/server";
import { fetchAirbnbEmails } from "@/lib/stays/gmail";
import { parseAirbnbEmail } from "@/lib/stays/airbnbEmail";
import { upsertExternalReservation } from "@/lib/stays/tankStore";
import { evaluateAndAlert } from "@/lib/stays/tankEvaluate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
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

    // 取り込み後に再計算＋通知
    const { response, alert } = await evaluateAndAlert();

    return NextResponse.json({
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
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "同期に失敗しました" }, { status: 500 });
  }
}
