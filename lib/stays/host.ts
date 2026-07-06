// =========================================================
// オーナー/管理者向けミューテーション
// =========================================================
import { supabase } from "@/lib/supabase";
import type { Booking, CalendarBlock, Listing, Review } from "./types";

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
