// =========================================================
// POST /api/stays/tank/reset
//   バキュームカーによる汲み取り完了時に呼ぶ。
//   累積水量を 0L にリセットし、前回汲み取り日を「今日」に更新する。
//   （UI側で確認ダイアログを挟む前提。誤操作防止のため GET では実行しない）
// =========================================================
import { NextResponse } from "next/server";
import {
  alertLineLiters,
  remainingLiters,
  statusFor,
  tankPct,
} from "@/lib/stays/tank";
import { resetTank } from "@/lib/stays/tankStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const state = await resetTank();
    return NextResponse.json({
      ...state,
      summary: {
        pct: Math.round(tankPct(state.currentLiters, state.capacityLiters)),
        status: statusFor(state.currentLiters, state.capacityLiters),
        alertLine: alertLineLiters(state.capacityLiters),
        remainingLiters: remainingLiters(state.currentLiters, state.capacityLiters),
        avgGuestsPerDay: 0,
        forecastDays: null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "リセットに失敗しました" }, { status: 500 });
  }
}
