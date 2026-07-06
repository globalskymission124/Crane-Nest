// =========================================================
// 空室判定ユーティリティ
// calendar_blocks（手動/airbnb/booking）と bookings から
// 予約不可の日付集合を作り、期間の重複を判定する。
// =========================================================

import type { Booking, CalendarBlock } from "./types";

// YYYY-MM-DD の日付を1日進める
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// [start, end) の各泊日（チェックアウト日は含めない）を列挙
export function nightsInRange(start: string, endExclusive: string): string[] {
  const out: string[] = [];
  let cur = start;
  let guard = 0;
  while (cur < endExclusive && guard < 1000) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

// 予約不可の「泊日」集合（Set<YYYY-MM-DD>）を作る。
// キャンセル済み予約は除外する。
export function buildBlockedNights(
  blocks: CalendarBlock[],
  bookings: Booking[]
): Set<string> {
  const set = new Set<string>();
  for (const b of blocks) {
    for (const n of nightsInRange(b.start_date, b.end_date)) set.add(n);
  }
  for (const bk of bookings) {
    if (bk.status === "cancelled") continue;
    for (const n of nightsInRange(bk.check_in, bk.check_out)) set.add(n);
  }
  return set;
}

// 指定期間 [checkIn, checkOut) が空いているか
export function isRangeAvailable(
  checkIn: string,
  checkOut: string,
  blockedNights: Set<string>
): boolean {
  if (!(checkOut > checkIn)) return false;
  for (const n of nightsInRange(checkIn, checkOut)) {
    if (blockedNights.has(n)) return false;
  }
  return true;
}
