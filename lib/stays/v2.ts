// =========================================================
// Stays v2 データアクセス
// ウィッシュリスト / クーポン / 決済 / 通知 / 通報 / 監査 / ユーザー / 分析
// =========================================================
import { supabase } from "@/lib/supabase";
import type {
  AuditLog,
  Booking,
  Coupon,
  Listing,
  Notification,
  Payment,
  Report,
  Review,
  StaysUser,
  Wishlist,
} from "./types";
import { nightsBetween } from "./types";

// ---------------- ウィッシュリスト ----------------
export async function fetchWishlist(userEmail: string): Promise<Wishlist[]> {
  const { data } = await supabase.from("stays_wishlists").select("*").eq("user_email", userEmail);
  return (data as Wishlist[]) || [];
}

export async function toggleWishlist(userEmail: string, listingId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from("stays_wishlists")
    .select("id")
    .eq("user_email", userEmail)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (existing) {
    await supabase.from("stays_wishlists").delete().eq("id", (existing as any).id);
    return false;
  }
  await supabase.from("stays_wishlists").insert({ user_email: userEmail, listing_id: listingId });
  return true;
}

// ---------------- クーポン ----------------
export async function fetchCouponByCode(code: string): Promise<Coupon | null> {
  const { data } = await supabase
    .from("stays_coupons")
    .select("*")
    .ilike("code", code.trim())
    .maybeSingle();
  return (data as Coupon) || null;
}

export async function fetchCoupons(hostId?: string | null): Promise<Coupon[]> {
  let q = supabase.from("stays_coupons").select("*");
  if (hostId !== undefined) {
    q = hostId === null ? q.is("host_id", null) : q.eq("host_id", hostId);
  }
  const { data } = await q.order("created_at", { ascending: false });
  return (data as Coupon[]) || [];
}

export async function upsertCoupon(c: Partial<Coupon>): Promise<Coupon> {
  if (c.id) {
    const { id, ...rest } = c;
    const { data, error } = await supabase.from("stays_coupons").update(rest).eq("id", id).select().single();
    if (error) throw error;
    return data as Coupon;
  }
  const { data, error } = await supabase.from("stays_coupons").insert(c).select().single();
  if (error) throw error;
  return data as Coupon;
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase.from("stays_coupons").delete().eq("id", id);
  if (error) throw error;
}

export async function incrementCouponUse(id: string, currentCount: number) {
  await supabase.from("stays_coupons").update({ used_count: currentCount + 1 }).eq("id", id);
}

// ---------------- 決済 ----------------
export async function fetchPaymentsByBooking(bookingId: string): Promise<Payment[]> {
  const { data } = await supabase
    .from("stays_payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });
  return (data as Payment[]) || [];
}

export async function fetchAllPayments(): Promise<Payment[]> {
  const { data } = await supabase
    .from("stays_payments")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Payment[]) || [];
}

// ---------------- 通知 ----------------
export async function fetchNotifications(userEmail: string): Promise<Notification[]> {
  const { data } = await supabase
    .from("stays_notifications")
    .select("*")
    .eq("user_email", userEmail)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data as Notification[]) || [];
}

export async function notify(userEmail: string, title: string, body: string, link?: string) {
  try {
    await supabase
      .from("stays_notifications")
      .insert({ user_email: userEmail, title, body, link: link || null });
  } catch {
    // 通知失敗は主要処理を妨げない
  }
}

export async function markNotificationsRead(userEmail: string) {
  await supabase
    .from("stays_notifications")
    .update({ is_read: true })
    .eq("user_email", userEmail)
    .eq("is_read", false);
}

// ---------------- 通報 / 紛争 ----------------
export async function createReport(
  payload: Pick<Report, "reporter_name" | "reporter_email" | "target_type" | "target_id" | "reason">
) {
  const { error } = await supabase.from("stays_reports").insert(payload);
  if (error) throw error;
}

export async function fetchReports(): Promise<Report[]> {
  const { data } = await supabase
    .from("stays_reports")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Report[]) || [];
}

export async function updateReport(id: string, patch: Partial<Report>) {
  const { error } = await supabase.from("stays_reports").update(patch).eq("id", id);
  if (error) throw error;
}

// ---------------- 監査ログ ----------------
export async function audit(
  actorEmail: string,
  actorRole: string,
  action: string,
  target = "",
  detail = ""
) {
  try {
    await supabase.from("stays_audit_logs").insert({
      actor_email: actorEmail,
      actor_role: actorRole,
      action,
      target,
      detail,
    });
  } catch {
    // 監査失敗は主要処理を妨げない
  }
}

export async function fetchAuditLogs(limit = 100): Promise<AuditLog[]> {
  const { data } = await supabase
    .from("stays_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AuditLog[]) || [];
}

// ---------------- ユーザー管理（管理者） ----------------
export async function fetchUsers(): Promise<StaysUser[]> {
  const { data } = await supabase
    .from("stays_users")
    .select("id,name,email,role,host_id,avatar_url,is_suspended,created_at")
    .order("created_at", { ascending: false });
  return (data as StaysUser[]) || [];
}

export async function updateUser(id: string, patch: Partial<StaysUser>) {
  const { error } = await supabase.from("stays_users").update(patch).eq("id", id);
  if (error) throw error;
}

// ---------------- ゲストの予約履歴 ----------------
export async function fetchBookingsByEmail(email: string): Promise<Booking[]> {
  const { data } = await supabase
    .from("stays_bookings")
    .select("*")
    .eq("guest_email", email)
    .order("check_in", { ascending: false });
  return (data as Booking[]) || [];
}

// ---------------- 類似宿レコメンド ----------------
export function similarListings(target: Listing, all: Listing[], count = 4): Listing[] {
  return all
    .filter((l) => l.id !== target.id && l.is_published)
    .map((l) => {
      let score = 0;
      if (l.city === target.city) score += 3;
      if (l.property_type === target.property_type) score += 2;
      const priceDiff = Math.abs(l.price_per_night - target.price_per_night) / Math.max(1, target.price_per_night);
      score += Math.max(0, 2 - priceDiff * 4);
      const shared = l.amenities.filter((a) => target.amenities.includes(a)).length;
      score += shared * 0.3;
      return { l, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.l);
}

// ---------------- 分析（オーナー / 管理者共用） ----------------
export interface MonthlyStat {
  month: string;      // YYYY-MM
  revenue: number;    // 確定・完了・支払済の売上
  bookings: number;
  nights: number;
}

export function monthlyStats(bookings: Booking[], months = 6): MonthlyStat[] {
  const out: MonthlyStat[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ month: key, revenue: 0, bookings: 0, nights: 0 });
  }
  const map = new Map(out.map((m) => [m.month, m]));
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const key = b.check_in.slice(0, 7);
    const m = map.get(key);
    if (!m) continue;
    m.revenue += b.total_price;
    m.bookings += 1;
    m.nights += nightsBetween(b.check_in, b.check_out);
  }
  return out;
}

export function occupancyNext30(blockedNights: Set<string>, addDaysFn: (d: string, n: number) => string, today: string): number {
  let occ = 0;
  for (let i = 0; i < 30; i++) if (blockedNights.has(addDaysFn(today, i))) occ++;
  return Math.round((occ / 30) * 100);
}

export function categoryAverages(reviews: Review[]) {
  const visible = reviews.filter((r) => !r.is_hidden);
  const avg = (key: keyof Review) => {
    const vals = visible.map((r) => r[key] as number | null).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  };
  return {
    cleanliness: avg("rating_cleanliness"),
    accuracy: avg("rating_accuracy"),
    checkin: avg("rating_checkin"),
    value: avg("rating_value"),
  };
}
