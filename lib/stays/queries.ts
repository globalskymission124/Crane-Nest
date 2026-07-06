// =========================================================
// Stays データアクセス（クライアント/サーバー共用）
// 既存の @/lib/supabase（anonクライアント）を利用する。
// =========================================================
import { supabase } from "@/lib/supabase";
import type {
  Booking,
  CalendarBlock,
  Conversation,
  Host,
  Listing,
  Message,
  Review,
} from "./types";

export async function fetchListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("stays_listings")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Listing[]) || [];
}

export async function fetchAllListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("stays_listings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Listing[]) || [];
}

export async function fetchListing(id: string): Promise<Listing | null> {
  const { data } = await supabase.from("stays_listings").select("*").eq("id", id).maybeSingle();
  return (data as Listing) || null;
}

export async function fetchHost(id: string): Promise<Host | null> {
  const { data } = await supabase.from("stays_hosts").select("*").eq("id", id).maybeSingle();
  return (data as Host) || null;
}

export async function fetchReviews(listingId: string, includeHidden = false): Promise<Review[]> {
  let q = supabase.from("stays_reviews").select("*").eq("listing_id", listingId);
  if (!includeHidden) q = q.eq("is_hidden", false);
  const { data } = await q.order("created_at", { ascending: false });
  return (data as Review[]) || [];
}

export async function fetchAllReviews(): Promise<Review[]> {
  const { data } = await supabase
    .from("stays_reviews")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Review[]) || [];
}

export async function fetchBlocks(listingId: string): Promise<CalendarBlock[]> {
  const { data } = await supabase
    .from("stays_calendar_blocks")
    .select("*")
    .eq("listing_id", listingId);
  return (data as CalendarBlock[]) || [];
}

export async function fetchBookings(listingId: string): Promise<Booking[]> {
  const { data } = await supabase
    .from("stays_bookings")
    .select("*")
    .eq("listing_id", listingId)
    .order("check_in", { ascending: true });
  return (data as Booking[]) || [];
}

export async function fetchAllBookings(): Promise<Booking[]> {
  const { data } = await supabase
    .from("stays_bookings")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Booking[]) || [];
}

export async function createBooking(
  payload: Omit<Booking, "id" | "status" | "created_at"> & { status?: Booking["status"] }
): Promise<Booking> {
  const { data, error } = await supabase
    .from("stays_bookings")
    .insert({ ...payload, status: payload.status || "pending" })
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
}

export async function createReview(
  payload: Pick<Review, "listing_id" | "guest_name" | "rating" | "comment"> & {
    booking_id?: string | null;
  }
): Promise<Review> {
  const { data, error } = await supabase
    .from("stays_reviews")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Review;
}

// ゲスト⇔オーナーのチャット。listing_id + guest_email で会話を一意化。
export async function getOrCreateConversation(
  listing: Listing,
  guestName: string,
  guestEmail: string
): Promise<Conversation> {
  const { data: existing } = await supabase
    .from("stays_conversations")
    .select("*")
    .eq("listing_id", listing.id)
    .eq("guest_email", guestEmail)
    .maybeSingle();
  if (existing) return existing as Conversation;
  const { data, error } = await supabase
    .from("stays_conversations")
    .insert({
      listing_id: listing.id,
      host_id: listing.host_id,
      guest_name: guestName,
      guest_email: guestEmail,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Conversation;
}

export async function fetchConversations(hostId?: string): Promise<Conversation[]> {
  let q = supabase.from("stays_conversations").select("*");
  if (hostId) q = q.eq("host_id", hostId);
  const { data } = await q.order("updated_at", { ascending: false });
  return (data as Conversation[]) || [];
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data } = await supabase
    .from("stays_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data as Message[]) || [];
}

export async function sendMessage(
  conversationId: string,
  senderRole: "guest" | "host",
  body: string
): Promise<Message> {
  const { data, error } = await supabase
    .from("stays_messages")
    .insert({ conversation_id: conversationId, sender_role: senderRole, body })
    .select()
    .single();
  if (error) throw error;
  // 会話の updated_at を更新（受信箱の並び替え用）
  await supabase
    .from("stays_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  return data as Message;
}

export function averageRating(reviews: Review[]): number {
  const visible = reviews.filter((r) => !r.is_hidden);
  if (visible.length === 0) return 0;
  return visible.reduce((s, r) => s + r.rating, 0) / visible.length;
}
