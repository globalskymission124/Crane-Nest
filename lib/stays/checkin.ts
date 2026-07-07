// =========================================================
// オーナー別パスポート登録（チェックイン）ページのデータアクセス
// =========================================================
import { supabase } from "@/lib/supabase";

export interface CheckinPage {
  id: string;
  host_id: string;
  slug: string;
  title: string;
  welcome_message: string;
  logo_url: string | null;
  require_phone: boolean;
  require_photo: boolean;
  is_active: boolean;
}

export interface CheckinGuest {
  id: string;
  page_id: string;
  host_id: string;
  full_name: string;
  passport_number: string;
  nationality: string;
  phone: string | null;
  email: string | null;
  checkin_date: string | null;
  passport_image_url: string | null;
  created_at?: string;
}

export async function fetchCheckinPageBySlug(slug: string): Promise<CheckinPage | null> {
  const { data } = await supabase.from("stays_checkin_pages").select("*").eq("slug", slug).maybeSingle();
  return (data as CheckinPage) || null;
}

export async function fetchCheckinPages(hostId: string): Promise<CheckinPage[]> {
  const { data } = await supabase
    .from("stays_checkin_pages")
    .select("*")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });
  return (data as CheckinPage[]) || [];
}

export async function upsertCheckinPage(p: Partial<CheckinPage>): Promise<CheckinPage> {
  if (p.id) {
    const { id, ...rest } = p;
    const { data, error } = await supabase.from("stays_checkin_pages").update(rest).eq("id", id).select().single();
    if (error) throw error;
    return data as CheckinPage;
  }
  const { data, error } = await supabase.from("stays_checkin_pages").insert(p).select().single();
  if (error) {
    if ((error as any).code === "23505") throw new Error("このURL（slug）は既に使われています。別の名前にしてください。");
    throw error;
  }
  return data as CheckinPage;
}

export async function deleteCheckinPage(id: string) {
  const { error } = await supabase.from("stays_checkin_pages").delete().eq("id", id);
  if (error) throw error;
}

export async function submitCheckinGuest(
  payload: Omit<CheckinGuest, "id" | "created_at">
): Promise<CheckinGuest> {
  const { data, error } = await supabase.from("stays_checkin_guests").insert(payload).select().single();
  if (error) throw error;
  return data as CheckinGuest;
}

export async function fetchCheckinGuests(hostId: string): Promise<CheckinGuest[]> {
  const { data } = await supabase
    .from("stays_checkin_guests")
    .select("*")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });
  return (data as CheckinGuest[]) || [];
}

// パスポート画像アップロード
export async function uploadHostPassport(file: File): Promise<string> {
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("host-passports").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("host-passports").getPublicUrl(path);
  return data.publicUrl;
}

// CSV生成（Excelで開けるようBOM付きUTF-8）
export function guestsToCsv(guests: CheckinGuest[]): string {
  const header = ["登録日時", "氏名", "パスポート番号", "国籍", "電話", "メール", "チェックイン日", "パスポート画像URL"];
  const rows = guests.map((g) => [
    g.created_at?.replace("T", " ").slice(0, 16) || "",
    g.full_name,
    g.passport_number,
    g.nationality,
    g.phone || "",
    g.email || "",
    g.checkin_date || "",
    g.passport_image_url || "",
  ]);
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  return "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}

export function genSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const rand = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${rand}` : `checkin-${rand}`;
}
