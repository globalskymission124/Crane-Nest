// =========================================================
// し尿タンク モニタリング API
//   GET  /api/stays/tank   … 現在の累積水量・前回汲み取り日・直近ログを返す
//   POST /api/stays/tank   … 当日の宿泊人数を追加/更新して累積を再計算し保存。
//                            80%超過を跨いだ瞬間に WeCom & Email を同時通知。
//
//   nodemailer を使うため Node ランタイム固定。
// =========================================================
import { NextRequest, NextResponse } from "next/server";
import {
  alertLineLiters,
  forecastDays,
  recentAvgGuests,
  remainingLiters,
  statusFor,
  tankPct,
} from "@/lib/stays/tank";
import { getTankState, upsertDailyGuests, setAlerted } from "@/lib/stays/tankStore";
import { dispatchTankAlerts } from "@/lib/stays/tankAlerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 状態にサマリー（%、状態区分、残り猶予、予測日数）を付与して返す共通整形
function withSummary(state: Awaited<ReturnType<typeof getTankState>>) {
  const avgGuests = recentAvgGuests(state.logs);
  return {
    ...state,
    summary: {
      pct: Math.round(tankPct(state.currentLiters, state.capacityLiters)),
      status: statusFor(state.currentLiters, state.capacityLiters),
      alertLine: alertLineLiters(state.capacityLiters),
      remainingLiters: remainingLiters(state.currentLiters, state.capacityLiters),
      avgGuestsPerDay: Math.round(avgGuests * 10) / 10,
      forecastDays: forecastDays(
        state.currentLiters,
        state.capacityLiters,
        avgGuests,
        state.litersPerGuestPerDay
      ),
    },
  };
}

// ---- GET：現在状態 ----
export async function GET() {
  try {
    const state = await getTankState();
    return NextResponse.json(withSummary(state));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "取得に失敗しました" }, { status: 500 });
  }
}

// ---- POST：当日の人数を追加/更新 → 再計算 → 必要なら通知 ----
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const guests = Number(body?.guests);
    const date: string = body?.date || new Date().toISOString().slice(0, 10);

    if (!Number.isFinite(guests) || guests < 0) {
      return NextResponse.json({ error: "guests は0以上の数値で指定してください" }, { status: 400 });
    }

    // 更新前の状態（通知の「跨ぎ」判定に使う）
    const before = await getTankState();
    const alertLine = alertLineLiters(before.capacityLiters);
    const wasOver = before.currentLiters >= alertLine;

    // 保存・再計算
    const after = await upsertDailyGuests(date, guests);
    const nowOver = after.currentLiters >= alertLine;

    // 80%を「下→上」に跨いだ、かつ未通知のときだけダブル通知を実行
    let alert: any = null;
    if (nowOver && (!wasOver || !before.alerted)) {
      alert = await dispatchTankAlerts({
        currentLiters: after.currentLiters,
        capacityLiters: after.capacityLiters,
        alertLine,
        pct: tankPct(after.currentLiters, after.capacityLiters),
        status: statusFor(after.currentLiters, after.capacityLiters),
      });
      await setAlerted(true);
    } else if (!nowOver && before.alerted) {
      // 何らかの訂正で閾値未満に戻ったらフラグ解除（再度超えたら再通知できる）
      await setAlerted(false);
    }

    const fresh = await getTankState();
    return NextResponse.json({ ...withSummary(fresh), alertDispatched: alert });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "更新に失敗しました" }, { status: 500 });
  }
}
