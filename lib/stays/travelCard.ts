import type { GuestWifiConfig } from "@/lib/guestWifi";

// =========================================================
// Japan Travel Card のデータ型とクライアント側の取得関数
//
// 本人情報（パスポート番号・写真）は anon キーから読めない（migration 0040）ため、
// カードのデータはサーバー (/api/stays/travel-card) が組み立てて返す。
// 組み立て処理は lib/server/travelCardData.ts。
// =========================================================

export interface JapanTravelProfile {
  name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  passportNumber: string | null;
  passportImageUrl: string | null; // 表示用（期限つきリンク or 端末内のプレビュー）
  avatarUrl: string | null;
}

// カードに並べる1人分（代表者＋同行者）
export interface JapanTravelPerson {
  name: string;
  passportNumber: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  passportImageUrl: string | null;
  isPrimary: boolean;
}

export interface JapanTravelTransfer {
  bookingReference: string;
  roomNumber: string;
  destinationName: string;
  transferDate: string | null;
  departureTime: string | null;
  passengers: number | null;
  luggageTotal: number;
}

export interface JapanTravelCardData {
  profile: JapanTravelProfile;
  latestTransfer: JapanTravelTransfer | null;
  wifi: GuestWifiConfig;
  generatedAt: string;
  /** 代表者＋同行者。無ければ profile だけを1枚表示する */
  travelers?: JapanTravelPerson[];
  /** 出国予定日（空港送迎の日付から推定。プロトタイプ） */
  departureDate?: string | null;
  /** カードの有効期限（出国予定日 + 3日） */
  validUntil?: string | null;
}

export type TravelCardPreviewSource = "transfer" | "checkin";

async function load(payload: Record<string, unknown>): Promise<JapanTravelCardData> {
  const res = await fetch("/api/stays/travel-card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.error || "Travel Cardを読み込めませんでした");
  return json as JapanTravelCardData;
}

// ログイン中の本人のカード
export async function fetchJapanTravelCard(_session?: unknown): Promise<JapanTravelCardData> {
  return load({ action: "mine" });
}

// 管理者: 記録画面からのプレビュー
export async function fetchJapanTravelCardForAdminRecord(
  previewSource: TravelCardPreviewSource,
  recordId: string
): Promise<JapanTravelCardData> {
  return load({ action: "preview", source: previewSource, id: recordId.trim() });
}

export function maskPassportNumber(value: string | null): string {
  if (!value) return "Not set";
  const normalized = value.trim().toUpperCase();
  if (normalized.length <= 4) return "****";
  return `${normalized.slice(0, 2)}****${normalized.slice(-2)}`;
}

// 出国予定日 + 3日（有効期限）
export function validUntilFrom(departureDate: string | null | undefined): string | null {
  if (!departureDate || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) return null;
  const d = new Date(`${departureDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3);
  return d.toISOString().slice(0, 10);
}
