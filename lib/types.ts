// =========================================================
// 共通の型定義
// supabase/migrations/0001_init_schema.sql のテーブル定義に対応
// =========================================================

export type TransferStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Destination {
  id: string;
  name: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  price_jpy: number | null;
}

export interface Room {
  id: string;
  name: string;
  photo_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface SiteSettings {
  id: string;
  primary_color: string; // ブランドカラーの基準色（HEX）
  logo_url: string | null;
  hero_image_url: string | null;
}

export interface Banner {
  id: string;
  image_url: string;
  alt_text: string;
  display_order: number;
  is_active: boolean;
}

export interface Guest {
  id: string;
  passport_number: string;
  full_name: string;
  phone_number: string | null;
  passport_image_url: string | null;
}

export interface TransferRequest {
  id: string;
  guest_id: string;
  room_number: string;
  destination_id: string;
  flight_time: string | null; // ISO文字列（任意項目）
  preferred_departure_time: string | null; // "HH:mm" 形式（ゲスト希望の出発時刻。古い予約はNULLの可能性あり）
  suggested_departure_time: string | null; // ISO文字列
  passenger_count: number;
  luggage_large: number;
  luggage_small: number;
  luggage_special: number;
  status: TransferStatus;
}

// ---------------------------------------------------------
// ゲストUIのフォーム入力（Supabaseへ送信する前の状態）
// ---------------------------------------------------------
export interface PassportFormData {
  fullName: string;
  passportNumber: string;
  phoneNumber: string;
  passportImageUrl: string | null;
}

export interface TransferFormData {
  transferDate: string; // "YYYY-MM-DD" 形式（送迎希望日、デフォルトは翌日）
  roomNumber: string;
  destinationId: string | null;
  flightTime: string; // "HH:mm" 形式（空文字列の場合は未入力＝任意項目）
  preferredDepartureTime: string; // "HH:mm" 形式（ゲストが希望する送迎時刻、必須・朝10時まで）
  suggestedDepartureTime: string | null; // 算出済みの提案時刻（表示用ラベル文字列）
  passengerCount: number;
  luggageLarge: number;
  luggageSmall: number;
  luggageSpecial: number;
}
