// =========================================================
// 会員ランク（Booking.com Genius風のロイヤルティプログラム）
// 有効予約数に応じて自動昇格し、宿泊料金から追加割引。
// =========================================================
import type { Booking } from "./types";

export interface LoyaltyTier {
  key: "member" | "silver" | "gold";
  minStays: number;      // このランクに必要な有効予約数
  discountPct: number;   // 宿泊料金からの追加割引%
  color: string;         // バッジ色 (Tailwindクラス)
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  { key: "member", minStays: 0, discountPct: 0, color: "bg-slate-100 text-slate-600" },
  { key: "silver", minStays: 2, discountPct: 3, color: "bg-slate-200 text-slate-700" },
  { key: "gold", minStays: 5, discountPct: 5, color: "bg-amber-100 text-amber-700" },
];

export const LOYALTY_LABELS: Record<LoyaltyTier["key"], Record<"en" | "tw" | "zh" | "ja", string>> = {
  member: { en: "Member", tw: "會員", zh: "会员", ja: "メンバー" },
  silver: { en: "Silver", tw: "銀級會員", zh: "银级会员", ja: "シルバー会員" },
  gold: { en: "Gold", tw: "金級會員", zh: "金级会员", ja: "ゴールド会員" },
};

// 有効予約（キャンセル以外）の数からランクを判定
export function getTier(bookings: Booking[]): LoyaltyTier {
  const stays = bookings.filter((b) => b.status !== "cancelled").length;
  let tier = LOYALTY_TIERS[0];
  for (const t of LOYALTY_TIERS) {
    if (stays >= t.minStays) tier = t;
  }
  return tier;
}

// 次のランクまであと何泊か（プロフィール表示用）
export function staysToNextTier(bookings: Booking[]): { next: LoyaltyTier | null; remaining: number } {
  const stays = bookings.filter((b) => b.status !== "cancelled").length;
  for (const t of LOYALTY_TIERS) {
    if (stays < t.minStays) return { next: t, remaining: t.minStays - stays };
  }
  return { next: null, remaining: 0 };
}
