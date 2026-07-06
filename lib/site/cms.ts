// =========================================================
// 公式サイトCMS: 取得/保存（サーバー・クライアント共用）
// =========================================================
import { supabase } from "@/lib/supabase";
import type { SiteLocale } from "./content";

export interface SiteTextOverride {
  heroHeading?: string;
  heroSub?: string;
}

export interface SiteCms {
  id: number;
  hero_image_url: string | null;
  area_images: string[];       // エリアカード画像（順番 = エリア順）
  gallery: string[];           // ギャラリー画像
  text_overrides: Partial<Record<SiteLocale, SiteTextOverride>>;
}

export const EMPTY_CMS: SiteCms = {
  id: 1,
  hero_image_url: null,
  area_images: [],
  gallery: [],
  text_overrides: {},
};

export async function fetchSiteCms(): Promise<SiteCms> {
  try {
    const { data } = await supabase.from("stays_site_cms").select("*").eq("id", 1).maybeSingle();
    if (!data) return EMPTY_CMS;
    const d = data as any;
    return {
      id: 1,
      hero_image_url: d.hero_image_url || null,
      area_images: Array.isArray(d.area_images) ? d.area_images : [],
      gallery: Array.isArray(d.gallery) ? d.gallery : [],
      text_overrides: d.text_overrides || {},
    };
  } catch {
    return EMPTY_CMS;
  }
}

export async function saveSiteCms(patch: Partial<SiteCms>) {
  const { error } = await supabase
    .from("stays_site_cms")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

// 画像アップロード → 公開URLを返す
const BUCKET = "site-assets";

export async function uploadSiteImage(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
