// =========================================================
// オーナー/管理者向けミューテーション
// =========================================================
import { supabase } from "@/lib/supabase";
import type { Booking, CalendarBlock, Listing, Payout, Review } from "./types";

// ---- 受取（payout）----
// 1予約あたりのホスト受取額 = 支払総額 - ゲストサービス料 - 成約手数料
export function hostNetFromBooking(b: Booking): number {
  return Math.max(0, (b.total_price || 0) - (b.guest_fee || 0) - (b.host_commission || 0));
}

export async function fetchPayouts(hostId: string): Promise<Payout[]> {
  const { data, error } = await supabase
    .from("stays_payouts")
    .select("*")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as Payout[]) || [];
}

export async function saveHostPayoutInfo(
  hostId: string,
  info: { bank_name: string; account_name: string; account_info: string }
): Promise<void> {
  const { error } = await supabase
    .from("stays_hosts")
    .update({
      payout_bank_name: info.bank_name.trim() || null,
      payout_account_name: info.account_name.trim() || null,
      payout_account_info: info.account_info.trim() || null,
    })
    .eq("id", hostId);
  if (error) throw error;
}

export async function updateBookingStatus(id: string, status: Booking["status"]) {
  const { error } = await supabase.from("stays_bookings").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function upsertListing(listing: Partial<Listing>): Promise<Listing> {
  if (listing.id) {
    const { id, ...rest } = listing;
    const { data, error } = await supabase
      .from("stays_listings")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Listing;
  }
  const { data, error } = await supabase.from("stays_listings").insert(listing).select().single();
  if (error) throw error;
  return data as Listing;
}

export async function deleteListing(id: string) {
  const { error } = await supabase.from("stays_listings").delete().eq("id", id);
  if (error) throw error;
}

export async function addManualBlock(
  listingId: string,
  start: string,
  end: string,
  summary: string
): Promise<CalendarBlock> {
  const { data, error } = await supabase
    .from("stays_calendar_blocks")
    .insert({ listing_id: listingId, start_date: start, end_date: end, source: "manual", summary })
    .select()
    .single();
  if (error) throw error;
  return data as CalendarBlock;
}

export async function deleteBlock(id: string) {
  const { error } = await supabase.from("stays_calendar_blocks").delete().eq("id", id);
  if (error) throw error;
}

// ---- 管理者用（レビュー編集/非表示/削除） ----
export async function updateReview(id: string, patch: Partial<Review>) {
  const { error } = await supabase.from("stays_reviews").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from("stays_reviews").delete().eq("id", id);
  if (error) throw error;
}
