// =========================================================
// オーナー別パスポート登録（チェックイン）ページのデータアクセス
// =========================================================
import { supabase } from "@/lib/supabase";
import { resizeImage } from "@/lib/stays/image";

const PASSPORT_MAX_PX = 1280;
const PASSPORT_JPEG_QUALITY = 0.82;
const PASSPORT_BUCKET = "host-passports";

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

// stays_checkin_guests / stays_users はブラウザから直接読めない（migration 0040）。
// 保存・一覧・自分のパスポート情報はサーバー API (/api/stays/checkin, /api/stays/account) 経由。
async function postJson<T>(url: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.error || "通信に失敗しました");
  return json as T;
}

export async function submitCheckinGuest(
  payload: Omit<CheckinGuest, "id" | "created_at">
): Promise<{ id: string }> {
  return postJson("/api/stays/checkin", { action: "submit", guest: payload });
}

// オーナー: 自分のページに登録されたゲスト一覧（写真は期限つきリンク）
export async function fetchCheckinGuests(_hostId: string): Promise<CheckinGuest[]> {
  try {
    return await postJson<CheckinGuest[]>("/api/stays/checkin", { action: "host_list" });
  } catch {
    return [];
  }
}

// ログイン中ゲストの保存済みパスポート情報（ワンタップチェックイン・プロフィール用）
export interface MyPassportProfile {
  name: string;
  email: string;
  phone: string | null;
  passport_number: string | null;
  nationality: string | null;
  passport_image_url: string | null; // 保存値（転送用）
  passport_image_preview: string | null; // 表示用の期限つきリンク
}
export async function fetchMyPassportProfile(): Promise<MyPassportProfile | null> {
  try {
    return await postJson<MyPassportProfile>("/api/stays/account", { action: "profile" });
  } catch {
    return null;
  }
}

// パスポート画像アップロード（非公開バケット。戻り値はバケット内のパス）
export async function uploadHostPassport(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選択してください / Please choose an image file");
  }

  const compressed = await resizeImage(file, PASSPORT_MAX_PX, PASSPORT_JPEG_QUALITY);
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(PASSPORT_BUCKET).upload(path, compressed, {
    cacheControl: "3600",
    contentType: "image/jpeg",
  });
  if (error) throw error;
  return path;
}

// CSV生成（Excelで開けるようBOM付きUTF-8）
export function guestsToCsv(guests: CheckinGuest[]): string {
  const header = ["登録日時", "氏名", "パスポート番号", "国籍", "電話", "メール", "チェックイン日", "パスポート画像URL（30分有効）"];
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
