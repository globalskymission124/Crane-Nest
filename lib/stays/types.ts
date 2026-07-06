// =========================================================
// Stays（Airbnb型予約システム）共通型定義
// supabase/migrations/0016_stays_schema.sql に対応
// =========================================================

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type BlockSource = "manual" | "airbnb" | "booking";
export type SenderRole = "guest" | "host";
export type UserRole = "guest" | "host" | "admin";
export type CancellationPolicy = "flexible" | "moderate" | "strict";
export type PropertyType = "house" | "apartment" | "guesthouse" | "hotel" | "villa" | "cabin";
export type PaymentStatus = "unpaid" | "paid" | "refunded" | "partially_refunded";

export interface Host {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

export interface Listing {
  id: string;
  host_id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  price_per_night: number;
  cleaning_fee: number;
  currency: string;
  max_guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  amenities: string[];
  photos: string[];
  airbnb_ical_url: string | null;
  is_published: boolean;
  instant_book: boolean;
  cancellation_policy: CancellationPolicy;
  property_type: PropertyType;
  min_nights: number;
  weekly_discount_pct: number;
  monthly_discount_pct: number;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarBlock {
  id: string;
  listing_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD（排他的 = チェックアウト日）
  source: BlockSource;
  external_uid: string | null;
  summary: string | null;
}

export interface Booking {
  id: string;
  listing_id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  status: BookingStatus;
  note: string | null;
  payment_status: PaymentStatus;
  coupon_code: string | null;
  discount_amount: number;
  created_at?: string;
}

export interface Review {
  id: string;
  listing_id: string;
  booking_id: string | null;
  guest_name: string;
  rating: number;
  comment: string;
  host_reply: string | null;
  is_hidden: boolean;
  rating_cleanliness: number | null;
  rating_accuracy: number | null;
  rating_checkin: number | null;
  rating_value: number | null;
  created_at?: string;
  updated_at?: string;
}

// ---- v2 追加テーブル ----

export interface StaysUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  host_id: string | null;
  avatar_url: string | null;
  is_suspended: boolean;
  passport_number?: string | null;
  phone?: string | null;
  created_at?: string;
}

export interface Wishlist {
  id: string;
  user_email: string;
  listing_id: string;
  created_at?: string;
}

export interface Coupon {
  id: string;
  code: string;
  host_id: string | null;
  listing_id: string | null;
  discount_type: "percent" | "fixed";
  value: number;
  valid_from: string | null;
  valid_to: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  created_at?: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  provider: "stripe" | "mock";
  status: "pending" | "paid" | "refunded" | "partially_refunded" | "failed";
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  refund_amount: number;
  created_at?: string;
}

export interface Notification {
  id: string;
  user_email: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at?: string;
}

export interface Report {
  id: string;
  reporter_name: string;
  reporter_email: string;
  target_type: "listing" | "review" | "booking" | "user";
  target_id: string;
  reason: string;
  status: "open" | "in_review" | "resolved" | "dismissed";
  resolution_note: string | null;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target: string;
  detail: string;
  created_at?: string;
}

export const CANCELLATION_POLICY_LABELS: Record<CancellationPolicy, string> = {
  flexible: "柔軟（チェックイン前日まで全額返金）",
  moderate: "標準（5日前まで全額、以降50%返金）",
  strict: "厳格（14日前まで50%、以降返金なし）",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: "一軒家",
  apartment: "アパート・マンション",
  guesthouse: "ゲストハウス",
  hotel: "ホテル",
  villa: "ヴィラ",
  cabin: "コテージ・山小屋",
};

export interface Conversation {
  id: string;
  listing_id: string;
  host_id: string;
  guest_name: string;
  guest_email: string;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_role: SenderRole;
  body: string;
  created_at?: string;
}

// アメニティのラベル（表示用）
export const AMENITY_LABELS: Record<string, string> = {
  wifi: "Wi-Fi",
  kitchen: "キッチン",
  parking: "無料駐車場",
  washer: "洗濯機",
  air_conditioning: "エアコン",
  tv: "テレビ",
  elevator: "エレベーター",
  bathtub: "バスタブ",
  pool: "プール",
  workspace: "ワークスペース",
};

export const ALL_AMENITIES = Object.keys(AMENITY_LABELS);

export function formatJPY(n: number): string {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

// 1泊単位の宿泊日数
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T00:00:00");
  const b = new Date(checkOut + "T00:00:00");
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}
