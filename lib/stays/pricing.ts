// =========================================================
// 料金計算・キャンセル返金・スマート価格提案
// =========================================================
import type { Booking, CalendarBlock, Coupon, Listing } from "./types";
import { nightsBetween } from "./types";
import { addDays, buildBlockedNights, todayStr } from "./availability";

export interface Quote {
  nights: number;
  subtotal: number;          // 泊数 × 単価
  cleaningFee: number;
  longStayDiscount: number;  // 週/月割引額
  longStayLabel: string | null;
  couponDiscount: number;
  total: number;
}

// 料金見積り（長期割引 + クーポン適用）
export function calcQuote(
  listing: Listing,
  checkIn: string,
  checkOut: string,
  coupon?: Coupon | null
): Quote {
  const nights = nightsBetween(checkIn, checkOut);
  const subtotal = nights * listing.price_per_night;
  const cleaningFee = nights > 0 ? listing.cleaning_fee : 0;

  let longStayDiscount = 0;
  let longStayLabel: string | null = null;
  if (nights >= 28 && listing.monthly_discount_pct > 0) {
    longStayDiscount = Math.round((subtotal * listing.monthly_discount_pct) / 100);
    longStayLabel = `月割引 ${listing.monthly_discount_pct}%`;
  } else if (nights >= 7 && listing.weekly_discount_pct > 0) {
    longStayDiscount = Math.round((subtotal * listing.weekly_discount_pct) / 100);
    longStayLabel = `週割引 ${listing.weekly_discount_pct}%`;
  }

  const base = subtotal - longStayDiscount + cleaningFee;
  let couponDiscount = 0;
  if (coupon && nights > 0) {
    couponDiscount =
      coupon.discount_type === "percent"
        ? Math.round((base * coupon.value) / 100)
        : Math.min(coupon.value, base);
  }

  return {
    nights,
    subtotal,
    cleaningFee,
    longStayDiscount,
    longStayLabel,
    couponDiscount,
    total: Math.max(0, base - couponDiscount),
  };
}

// クーポンの利用可否チェック
export function couponError(coupon: Coupon, listing: Listing): string | null {
  const today = todayStr();
  if (!coupon.is_active) return "このクーポンは無効です";
  if (coupon.valid_from && today < coupon.valid_from) return "クーポンの利用開始前です";
  if (coupon.valid_to && today > coupon.valid_to) return "クーポンの有効期限が切れています";
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses)
    return "クーポンの利用上限に達しました";
  if (coupon.listing_id && coupon.listing_id !== listing.id)
    return "この宿では利用できないクーポンです";
  if (coupon.host_id && !coupon.listing_id && coupon.host_id !== listing.host_id)
    return "この宿では利用できないクーポンです";
  return null;
}

// キャンセルポリシーに基づく返金額（キャンセル実行日=今日）
export function calcRefund(booking: Booking, policy: Listing["cancellation_policy"]): number {
  const paid = booking.total_price;
  const daysUntil = Math.ceil(
    (new Date(booking.check_in + "T00:00:00").getTime() - Date.now()) / 86400000
  );
  switch (policy) {
    case "flexible":
      return daysUntil >= 1 ? paid : 0;
    case "moderate":
      if (daysUntil >= 5) return paid;
      return daysUntil >= 0 ? Math.round(paid * 0.5) : 0;
    case "strict":
      if (daysUntil >= 14) return Math.round(paid * 0.5);
      return 0;
  }
}

export interface PriceSuggestion {
  suggested: number;
  occupancyPct: number; // 今後30日の稼働率
  reason: string;
}

// スマート価格提案：今後30日の稼働率に応じて基準価格を ±15% 調整
export function suggestPrice(
  listing: Listing,
  blocks: CalendarBlock[],
  bookings: Booking[]
): PriceSuggestion {
  const blocked = buildBlockedNights(blocks, bookings);
  const start = todayStr();
  let occupied = 0;
  for (let i = 0; i < 30; i++) {
    if (blocked.has(addDays(start, i))) occupied++;
  }
  const occupancyPct = Math.round((occupied / 30) * 100);
  let factor = 1;
  let reason = "稼働率が標準的なため現状維持が最適です";
  if (occupancyPct >= 70) {
    factor = 1.15;
    reason = `今後30日の稼働率が${occupancyPct}%と高いため、値上げの余地があります`;
  } else if (occupancyPct >= 50) {
    factor = 1.05;
    reason = `稼働率${occupancyPct}%。小幅な値上げを検討できます`;
  } else if (occupancyPct < 20) {
    factor = 0.85;
    reason = `稼働率${occupancyPct}%と低めです。値下げで予約獲得を狙えます`;
  } else if (occupancyPct < 35) {
    factor = 0.95;
    reason = `稼働率${occupancyPct}%。わずかな値下げで競争力が上がります`;
  }
  const suggested = Math.round((listing.price_per_night * factor) / 100) * 100;
  return { suggested, occupancyPct, reason };
}
