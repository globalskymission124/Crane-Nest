// =========================================================
// 体験（Experiences）のデータアクセス
// Supabase 未設定時はデモデータへフォールバックする。
// =========================================================
import { supabase, usingPlaceholderSupabase } from "@/lib/supabase";
import { DEMO_HOST } from "./demoData";
import type { Experience, ExperienceBooking } from "./types";

export const DEMO_EXPERIENCES: Experience[] = [
  {
    id: "eeeeeee1-0000-0000-0000-000000000001",
    host_id: DEMO_HOST.id,
    title: "大阪・裏なんば 食べ歩きナイトツアー",
    description:
      "地元ガイドと巡る、なんばの路地裏の名店ツアー。串カツ・たこ焼き・立ち飲みを少しずつ。訪日の方に大人気です。",
    category: "food",
    city: "大阪市",
    meeting_point: "難波駅 南南口",
    lat: 34.6659,
    lng: 135.5012,
    price_per_person: 6500,
    currency: "JPY",
    duration_minutes: 180,
    max_guests: 8,
    photos: ["https://images.unsplash.com/photo-1533777324565-a040eb52facd?w=1200"],
    is_published: true,
  },
  {
    id: "eeeeeee1-0000-0000-0000-000000000002",
    host_id: DEMO_HOST.id,
    title: "京都・早朝の禅寺で座禅体験",
    description: "観光客の少ない早朝、静かな禅寺で僧侶の指導のもと座禅を組みます。心を整える朝の時間を。",
    category: "culture",
    city: "京都市",
    meeting_point: "京都・建仁寺 山門前",
    lat: 35.0,
    lng: 135.7745,
    price_per_person: 4000,
    currency: "JPY",
    duration_minutes: 90,
    max_guests: 12,
    photos: ["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200"],
    is_published: true,
  },
];

export async function fetchExperiences(): Promise<Experience[]> {
  const { data } = await supabase
    .from("stays_experiences")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (usingPlaceholderSupabase && (!data || data.length === 0)) return DEMO_EXPERIENCES;
  return (data as Experience[]) || [];
}

export async function fetchAllExperiences(): Promise<Experience[]> {
  const { data } = await supabase
    .from("stays_experiences")
    .select("*")
    .order("created_at", { ascending: false });
  if (usingPlaceholderSupabase && (!data || data.length === 0)) return DEMO_EXPERIENCES;
  return (data as Experience[]) || [];
}

export async function fetchExperience(id: string): Promise<Experience | null> {
  const { data } = await supabase.from("stays_experiences").select("*").eq("id", id).maybeSingle();
  if (usingPlaceholderSupabase && !data) return DEMO_EXPERIENCES.find((e) => e.id === id) || null;
  return (data as Experience) || null;
}

export async function upsertExperience(exp: Partial<Experience>): Promise<Experience> {
  if (exp.id) {
    const { id, ...rest } = exp;
    const { data, error } = await supabase
      .from("stays_experiences")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Experience;
  }
  const { data, error } = await supabase.from("stays_experiences").insert(exp).select().single();
  if (error) throw error;
  return data as Experience;
}

export async function deleteExperience(id: string): Promise<void> {
  const { error } = await supabase.from("stays_experiences").delete().eq("id", id);
  if (error) throw error;
}

export async function createExperienceBooking(
  payload: Pick<
    ExperienceBooking,
    "experience_id" | "guest_name" | "guest_email" | "date" | "time" | "guests_count" | "total_price"
  > & { note?: string | null }
): Promise<ExperienceBooking> {
  const { data, error } = await supabase
    .from("stays_experience_bookings")
    .insert({ ...payload, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data as ExperienceBooking;
}

export async function fetchExperienceBookingsByEmail(email: string): Promise<ExperienceBooking[]> {
  const { data } = await supabase
    .from("stays_experience_bookings")
    .select("*")
    .eq("guest_email", email)
    .order("date", { ascending: false });
  return (data as ExperienceBooking[]) || [];
}

// ホストの体験に対する予約（experience_id で絞り込み）
export async function fetchExperienceBookingsForHost(
  experienceIds: string[]
): Promise<ExperienceBooking[]> {
  if (experienceIds.length === 0) return [];
  const { data } = await supabase
    .from("stays_experience_bookings")
    .select("*")
    .in("experience_id", experienceIds)
    .order("date", { ascending: false });
  return (data as ExperienceBooking[]) || [];
}

export async function updateExperienceBookingStatus(
  id: string,
  status: ExperienceBooking["status"]
): Promise<void> {
  const { error } = await supabase
    .from("stays_experience_bookings")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
