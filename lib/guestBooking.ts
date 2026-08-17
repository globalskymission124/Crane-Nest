import { supabase } from "./supabase";
import { isWithinTransferServiceHours } from "./transferTime";
import type { GuestEntry, PassportFormData, TransferFormData } from "./types";

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

    if (uploadError) {
      console.error("[passport upload] storage upload error:", uploadError.message, uploadError);
      return null;
    }

    const { data } = supabase.storage.from(PASSPORT_BUCKET).getPublicUrl(path);
    console.log("[passport upload] publicUrl:", data.publicUrl);
    return data.publicUrl;
  } catch {
    return null;
  }
}

interface SubmitBookingResult {
  bookingReference: string;
  transferRequestId: string;
}

// 1名分のパスポート情報を guests テーブルへ upsert し、guest.id を返す。
//  - 写真があれば先に Storage へアップロードしてURLを取得
//  - 同一パスポート番号は既存行を更新して再利用（upsert）
//  - 新しい写真がある場合のみ passport_image_url を更新（nullで既存を上書きしない）
//  - 失敗時は null を返す（呼び出し側で代表者は必須・同行者はスキップ扱い）
async function upsertGuestEntry(entry: GuestEntry): Promise<string | null> {
  if (!entry.passportNumber?.trim() || !entry.fullName?.trim()) return null;

  const uploadedImageUrl = entry.passportImageUrl
    ? await uploadPassportPhoto(entry.passportImageUrl)
    : null;

  const guestPayload: Record<string, unknown> = {
    passport_number: entry.passportNumber,
    full_name: entry.fullName,
    phone_number: entry.phoneNumber || null,
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
  return guestRow.id as string;
}

export async function submitBooking(
  passport: PassportFormData,
  transfer: TransferFormData
): Promise<SubmitBookingResult | null> {
  try {
    if (!isWithinTransferServiceHours(transfer.preferredDepartureTime)) return null;

    // 代表者（1人目）＋同行者（2人目以降）をまとめて処理する。
    const primaryEntry: GuestEntry = {
      fullName: passport.fullName,
      passportNumber: passport.passportNumber,
      phoneNumber: passport.phoneNumber,
      passportImageUrl: passport.passportImageUrl,
    };
    const companionEntries = passport.companions ?? [];

    // 代表者は必須。ここで失敗したら予約自体を中断する。
    const primaryGuestId = await upsertGuestEntry(primaryEntry);
    if (!primaryGuestId) return null;

    // 同行者を順次 upsert。個別に失敗しても予約は止めず、成功分だけリンクする。
    // 重複パスポート（代表者と同一・同行者同士の重複）は1件に名寄せする。
    const linkedGuestIds = new Set<string>([primaryGuestId]);
    for (const companion of companionEntries) {
      const companionGuestId = await upsertGuestEntry(companion);
      if (companionGuestId) linkedGuestIds.add(companionGuestId);
    }

    const { data: transferRow, error: transferError } = await supabase
      .from("transfer_requests")
      .insert({
        guest_id: primaryGuestId,
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

    // 予約に紐づく全ゲスト（代表者＋同行者）を中間テーブルへ登録する。
    // 失敗してもゲストの完了体験は止めない（管理画面側の表示は代表者にフォールバック）。
    const linkRows = Array.from(linkedGuestIds).map((guestId) => ({
      transfer_request_id: transferRow.id,
      guest_id: guestId,
      is_primary: guestId === primaryGuestId,
    }));
    const { error: linkError } = await supabase.from("transfer_request_guests").insert(linkRows);
    if (linkError) {
      console.error("[booking] transfer_request_guests insert error:", linkError.message, linkError);
    }

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
