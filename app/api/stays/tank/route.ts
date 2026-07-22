// =========================================================
// し尿タンク モニタリング API（自社予約＋Airbnbを統合して自動計算）
//   GET  /api/stays/tank   … 再計算した現在状態＋サマリーを返す（副作用なし）
//   POST /api/stays/tank   … 再評価し、80%超過を検知したら WxPusher + Email 通知。
//                            body に { date, guests } で手動補正(override)を設定、
//                            { date, guests: null } で補正を解除。
//
//   nodemailer を使うため Node ランタイム固定。
// =========================================================
import { NextRequest, NextResponse } from "next/server";
import { getTankState, setOverride } from "@/lib/stays/tankStore";
import { buildResponse, evaluateAndAlert } from "@/lib/stays/tankEvaluate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- GET：現在状態（予約から自動計算） ----
export async function GET() {
  try {
    const state = await getTankState();
    return NextResponse.json(await buildResponse(state));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "取得に失敗しました" }, { status: 500 });
  }
}

// ---- POST：再評価（＋任意で手動補正） → 必要なら通知 ----
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const hasOverride = body && typeof body === "object" && "guests" in body && "date" in body;

    if (hasOverride) {
      const date: string = body.date || new Date().toISOString().slice(0, 10);
      const guests = body.guests === null ? null : Number(body.guests);
      if (guests !== null && (!Number.isFinite(guests) || guests < 0)) {
        return NextResponse.json({ error: "guests は0以上の数値、または null で指定してください" }, { status: 400 });
      }
      await setOverride(date, guests);
    }

    const { response, alert } = await evaluateAndAlert();
    return NextResponse.json({ ...response, alertDispatched: alert });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "更新に失敗しました" }, { status: 500 });
  }
}
