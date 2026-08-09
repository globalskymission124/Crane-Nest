// =========================================================
// Stays データアクセス（クライアント/サーバー共用）
// 既存の @/lib/supabase（anonクライアント）を利用する。
// =========================================================
import { usingPlaceholderSupabase, supabase } from "@/lib/supabase";
import type {
  Booking,
  CalendarBlock,
  Conversation,
  Host,
  Listing,
  Message,
  Review,
} from "./types";
import { DEMO_HOST, DEMO_LISTINGS, DEMO_REVIEWS } from "./demoData";

export async function fetchListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("stays_listings")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) return DEMO_LISTINGS.filter((l) => l.is_published);
  if (usingPlaceholderSupabase && (!data || data.length === 0)) return DEMO_LISTINGS.filter((l) => l.is_published);
  return (data as Listing[]) || [];
}

export async function fetchAllListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("stays_listings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return DEMO_LISTINGS;
  if (usingPlaceholderSupabase && (!data || data.length === 0)) return DEMO_LISTINGS;
  return (data as Listing[]) || [];
}

export async function fetchListing(id: string): Promise<Listing | null> {
  const { data, error } = await supabase.from("stays_listings").select("*").eq("id", id).maybeSingle();
  if (error) return DEMO_LISTINGS.find((l) => l.id === id) || null;
  if (usingPlaceholderSupabase && !data) return DEMO_LISTINGS.find((l) => l.id === id) || null;
  return (data as Listing) || null;
}

export async function fetchHost(id: string): Promise<Host | null> {
  const { data, error } = await supabase.from("stays_hosts").select("*").eq("id", id).maybeSingle();
  if (error) return id === DEMO_HOST.id ? DEMO_HOST : null;
  if (usingPlaceholderSupabase && !data) return id === DEMO_HOST.id ? DEMO_HOST : null;
  return (data as Host) || null;
}

export async function fetchReviews(listingId: string, includeHidden = false): Promise<Review[]> {
  let q = supabase.from("stays_reviews").select("*").eq("listing_id", listingId);
  if (!includeHidden) q = q.eq("is_hidden", false);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) return DEMO_REVIEWS.filter((r) => r.listing_id === listingId && (includeHidden || !r.is_hidden));
  if (usingPlaceholderSupabase && (!data || data.length === 0)) {
    return DEMO_REVIEWS.filter((r) => r.listing_id === listingId && (includeHidden || !r.is_hidden));
  }
  return (data as Review[]) || [];
}

export async function fetchAllReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("stays_reviews")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return DEMO_REVIEWS;
  if (usingPlaceholderSupabase && (!data || data.length === 0)) return DEMO_REVIEWS;
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
  const { data, error } = await supabase
    .from("stays_bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
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
    rating_cleanliness?: number | null;
    rating_accuracy?: number | null;
    rating_checkin?: number | null;
    rating_value?: number | null;
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

export async function fetchGuestConversations(guestEmail: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("stays_conversations")
    .select("*")
    .eq("guest_email", guestEmail)
    .order("updated_at", { ascending: false });
  if (error) return [];
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

  // 相手側へアプリ内通知（ベル + ブラウザ通知）。失敗しても送信は成立させる。
  try {
    const { data: conv } = await supabase
      .from("stays_conversations")
      .select("guest_name,guest_email,host_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (conv) {
      const c = conv as any;
      let target: string | null = null;
      let title = "";
      if (senderRole === "guest") {
        const { data: hostUser } = await supabase
          .from("stays_users")
          .select("email")
          .eq("host_id", c.host_id)
          .maybeSingle();
        target = (hostUser as any)?.email || null;
        title = `新着メッセージ: ${c.guest_name}`;
      } else {
        target = c.guest_email;
        title = "New message from your host";
      }
      if (target) {
        await supabase.from("stays_notifications").insert({
          user_email: target,
          title,
          body: body.slice(0, 80),
          link: senderRole === "guest" ? "/host/messages" : "/stays",
        });
      }
    }
  } catch {
    // 通知失敗は無視
  }
  return data as Message;
}

export function averageRating(reviews: Review[]): number {
  const visible = reviews.filter((r) => !r.is_hidden);
  if (visible.length === 0) return 0;
  return visible.reduce((s, r) => s + r.rating, 0) / visible.length;
}

// ---- 項目別評価（清潔さ・正確さ・チェックイン・価格）の平均 ----
export type ReviewCategory = "cleanliness" | "accuracy" | "checkin" | "value";

const CATEGORY_FIELD: Record<ReviewCategory, keyof Review> = {
  cleanliness: "rating_cleanliness",
  accuracy: "rating_accuracy",
  checkin: "rating_checkin",
  value: "rating_value",
};

// 各カテゴリの平均。値が1つも無いカテゴリは null を返す。
export function categoryAverages(reviews: Review[]): Record<ReviewCategory, number | null> {
  const visible = reviews.filter((r) => !r.is_hidden);
  const out = {} as Record<ReviewCategory, number | null>;
  (Object.keys(CATEGORY_FIELD) as ReviewCategory[]).forEach((cat) => {
    const vals = visible
      .map((r) => r[CATEGORY_FIELD[cat]] as number | null)
      .filter((v): v is number => typeof v === "number");
    out[cat] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  });
  return out;
}

// ---- オーナー別スコープ（マルチテナント表示） ----
// host ロールは自分の host_id のみ、admin（または未ログイン）は null=全件。
export function hostScope(
  session: { role: string; host_id: string | null } | null
): string | null {
  return session && session.role === "host" ? session.host_id : null;
}

// 物件をオーナーで絞り込む（scope が null なら全件）。
export function ownedListings<T extends { host_id: string }>(
  listings: T[],
  scope: string | null
): T[] {
  return scope ? listings.filter((l) => l.host_id === scope) : listings;
}

// listing_id を持つ行（予約・レビュー・空室ブロック等）を、対象物件のみに絞り込む。
export function byListingIds<T extends { listing_id: string }>(
  rows: T[],
  listingIds: Set<string>
): T[] {
  return rows.filter((r) => listingIds.has(r.listing_id));
}

// ---- スーパーホスト判定 ----
// Airbnbに倣った簡易基準: そのホストの全公開宿のレビュー平均が高く、件数も十分。
export const SUPERHOST_MIN_REVIEWS = 5;
export const SUPERHOST_MIN_RATING = 4.8;

export interface HostRatingStats {
  avgRating: number;
  reviewCount: number;
  isSuperhost: boolean;
}

// hostId のホストについて、全宿(listings)と全レビュー(allReviews)から集計する。
export function hostRatingStats(
  hostId: string,
  listings: Listing[],
  allReviews: Review[]
): HostRatingStats {
  const hostListingIds = new Set(
    listings.filter((l) => l.host_id === hostId).map((l) => l.id)
  );
  const relevant = allReviews.filter(
    (r) => !r.is_hidden && hostListingIds.has(r.listing_id)
  );
  const reviewCount = relevant.length;
  const avgRating = reviewCount
    ? relevant.reduce((s, r) => s + r.rating, 0) / reviewCount
    : 0;
  const isSuperhost =
    reviewCount >= SUPERHOST_MIN_REVIEWS && avgRating >= SUPERHOST_MIN_RATING;
  return { avgRating, reviewCount, isSuperhost };
}
