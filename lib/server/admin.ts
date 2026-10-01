import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// =========================================================
// サーバー専用の Supabase クライアント（service_role キー）
//
// パスポート番号・写真・パスワードハッシュなどの個人情報テーブルは
// RLS で anon キーからの読み書きを禁止している（migration 0040）。
// これらはこのクライアント経由で、API ルートが権限を確認したうえでのみ扱う。
// SUPABASE_SERVICE_ROLE_KEY は絶対に NEXT_PUBLIC_ を付けないこと。
// =========================================================

let client: SupabaseClient | null = null;

export function hasAdminConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function supabaseAdmin(): SupabaseClient {
  if (!hasAdminConfig()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY が設定されていません（サーバーの環境変数を確認してください）");
  }
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

// ---------------- パスポート写真（非公開バケット） ----------------
export const PASSPORT_BUCKETS = ["passport-photos", "host-passports"] as const;
export type PassportBucket = (typeof PASSPORT_BUCKETS)[number];

// 保存値は「公開URL（旧データ）」「署名URL」「バケット内のパス（新データ）」のどれでも来る。
// バケットとパスに分解する。判別できなければ null。
export function parsePhotoRef(
  value: string | null | undefined,
  defaultBucket: PassportBucket
): { bucket: PassportBucket; path: string } | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const m = raw.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?#]+)/);
  if (m) {
    const bucket = m[1] as PassportBucket;
    if (!PASSPORT_BUCKETS.includes(bucket)) return null;
    return { bucket, path: decodeURIComponent(m[2]) };
  }
  if (/^https?:/i.test(raw)) return null;
  return { bucket: defaultBucket, path: raw.replace(/^\/+/, "") };
}

// 写真の参照をまとめて期限つきリンクに変換する（既定 10 分）。読めないものは null。
export async function signPhotoRefs(
  values: (string | null | undefined)[],
  defaultBucket: PassportBucket,
  ttlSeconds = 600
): Promise<(string | null)[]> {
  const parsed = values.map((v) => parsePhotoRef(v, defaultBucket));
  const out: (string | null)[] = values.map(() => null);
  const byBucket = new Map<PassportBucket, { i: number; path: string }[]>();
  parsed.forEach((p, i) => {
    if (!p) return;
    const list = byBucket.get(p.bucket) ?? [];
    list.push({ i, path: p.path });
    byBucket.set(p.bucket, list);
  });
  const db = supabaseAdmin();
  for (const [bucket, items] of byBucket) {
    const { data, error } = await db.storage.from(bucket).createSignedUrls(
      items.map((x) => x.path),
      ttlSeconds
    );
    if (error || !data) {
      console.warn("[photos] sign failed:", bucket, error?.message);
      continue;
    }
    data.forEach((d, k) => {
      if (d?.signedUrl) out[items[k].i] = d.signedUrl;
    });
  }
  return out;
}

export async function signPhotoRef(
  value: string | null | undefined,
  defaultBucket: PassportBucket,
  ttlSeconds = 600
): Promise<string | null> {
  return (await signPhotoRefs([value], defaultBucket, ttlSeconds))[0];
}
