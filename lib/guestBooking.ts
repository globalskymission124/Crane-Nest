import { supabase } from "./supabase";
import type { PassportFormData, TransferFormData } from "./types";

// =========================================================
// Step 6: ゲストの予約フローで入力された内容をSupabaseへ実際に保存する。
//
// これまでは画面遷移用のモックデータのみで完結していたが、
// 管理画面で「誰がいつ宿泊したか」をパスポート写真とリンクして
// 確認・ダウンロードできるようにするため、実データとして永続化する。
//
// 失敗時は例外を投げず null を返す（ゲスト側の体験を止めないため）。
// 失敗の詳細は呼び出し側でログ出力やフォールバック表示に利用できる。
// =========================================================

const PASSPORT_BUCKET = "passport-photos";

// Canvas APIでJPEG圧縮。長辺を最大 MAX_PX に縮小し品質 QUALITY で圧縮する。
// ブラウザ環境のみ（SSR時はスキップ）。
const MAX_PX = 1280;
const QUALITY = 0.82;

async function compressImage(blob: Blob): Promise<Blob> {
  if (typeof window === "undefined") return blob;
  return new Promise<Blob>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, MAX_PX / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(blob); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (compressed) => resolve(compressed ?? blob),
        "image/jpeg",
        QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
    img.src = url;
  });
}

async function uploadPassportPhoto(previewUrl: string): Promise<string | null> {
  try {
    const response = await fetch(previewUrl);
    const rawBlob = await response.blob();
    // JPEG圧縮してサイズを削減
    const blob = await compressImage(rawBlob);
    const path = `${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage.from(PASSPORT_BUCKET).upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/jpeg",
    });

    if (uploadError) return null;

    const { data } = supabase.storage.from(PASSPORT_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

interface SubmitBookingResult {
  bookingReference: string;
  transferRequestId: string;
}

export async function submitBooking(
  passport: PassportFormData,
  transfer: TransferFormData
): Promise<SubmitBookingResult | null> {
  try {
    // パスポート写真をStorageへアップロード（失敗してもURLなしで続行する）
    const uploadedImageUrl = passport.passportImageUrl
      ? await uploadPassportPhoto(passport.passportImageUrl)
      : null;

    // 同一パスポート番号のゲストは情報を更新しつつ再利用する（upsert）
    // 新しい写真がある場合のみ passport_image_url を更新（nullで既存を上書きしない）
    const guestPayload: Record<string, unknown> = {
      passport_number: passport.passportNumber,
      full_name: passport.fullName,
      phone_number: passport.phoneNumber || null,
    };
    if (uploadedImageUrl) {
      guestPayload.passport_image_url = uploadedImageUrl;
    }

    const { data: guestRow, error: guestError } = await supabase
      .from("guests")
      .upsert(guestPayload, { onConflict: "passport_number" })
      .select("id")
      .single();

    if (guestError || !guestRow) return null;

    const { data: transferRow, error: transferError } = await supabase
      .from("transfer_requests")
      .insert({
        guest_id: guestRow.id,
        room_number: transfer.roomNumber,
        destination_id: transfer.destinationId,
        transfer_date: transfer.transferDate,
        flight_time: transfer.flightTime
          ? toIsoFromTimeInput(transfer.flightTime, transfer.transferDate)
          : null,
        preferred_departure_time: transfer.preferredDepartureTime,
        suggested_departure_time: transfer.suggestedDepartureTime
          ? toIsoFromTimeInput(transfer.suggestedDepartureTime, transfer.transferDate)
          : null,
        passenger_count: transfer.passengerCount,
        luggage_large: transfer.luggageLarge,
        luggage_small: transfer.luggageSmall,
        luggage_special: transfer.luggageSpecial,
        status: "pending",
      })
      .select("id")
      .single();

    if (transferError || !transferRow) return null;

    return {
      bookingReference: `TRF-${transferRow.id.slice(0, 8).toUpperCase()}`,
      transferRequestId: transferRow.id,
    };
  } catch {
    return null;
  }
}

// "HH:mm" 形式の文字列を、指定日付（YYYY-MM-DD）のISO文字列に変換する
// dateStr が省略された場合は翌日を使用（後方互換）
// （flight_time / suggested_departure_time は timestamptz 列のため）
function toIsoFromTimeInput(value: string, dateStr?: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  let date: Date;
  if (dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    date = new Date(y, (m ?? 1) - 1, d ?? 1);
  } else {
    date = new Date();
    date.setDate(date.getDate() + 1);
  }
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}
