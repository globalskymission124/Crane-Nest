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
// 失敗時は例外を投げ、ゲスト側で完了画面に進めない。
// 保存に失敗した予約は管理画面の送迎看板に表示されないため。
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

// パスポート写真を1回だけアップロードする内部関数。
// 失敗時は例外を投げる（呼び出し側でリトライ判定するため）。
async function uploadPassportPhotoOnce(previewUrl: string): Promise<string> {
  const response = await fetch(previewUrl);
  if (!response.ok) {
    throw new Error(`プレビュー画像の取得に失敗しました (status ${response.status})`);
  }
  const rawBlob = await response.blob();
  // blob URLが失効している等で中身が空のケースを明示的に失敗扱いにする
  if (!rawBlob.size) {
    throw new Error("プレビュー画像が空です（撮り直しが必要な可能性があります）");
  }

  // JPEG圧縮してサイズを削減
  const blob = await compressImage(rawBlob);
  const path = `${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage.from(PASSPORT_BUCKET).upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: "image/jpeg",
  });

  if (uploadError) {
    throw new Error(`ストレージへの保存に失敗しました: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(PASSPORT_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("公開URLの取得に失敗しました");
  }
  return data.publicUrl;
}

// パスポート写真をアップロードする。
// 一時的なネットワーク不調で写真が欠落する事故を防ぐため、最大3回リトライする。
// すべて失敗した場合は null を返し、最後のエラーを返り値の2要素目に含める。
async function uploadPassportPhoto(
  previewUrl: string
): Promise<{ url: string | null; error: Error | null }> {
  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const url = await uploadPassportPhotoOnce(previewUrl);
      return { url, error: null };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[passport upload] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError.message);
      // 最終試行以外は少し待って再試行（指数的バックオフ）
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  console.error("[passport upload] all attempts failed:", lastError?.message, lastError);
  return { url: null, error: lastError };
}

interface SubmitBookingResult {
  bookingReference: string;
  transferRequestId: string;
}

function bookingSaveError(label: string, error: unknown): Error {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message)
      : "原因不明のエラー";
  return new Error(`${label}に失敗しました: ${message}`);
}

// 1名分のパスポート情報を guests テーブルへ保存し、guest.id を返す。
//  - 写真があれば先に Storage へアップロードしてURLを取得
//  - 同一パスポート番号は既存行を再利用
//  - 新しい写真がある場合のみ passport_image_url を更新（nullで既存を上書きしない）
//  - 入力不足なら null、DB保存失敗なら例外を投げる
//  - requirePhoto=true（代表者）で、写真があるのにアップロードに失敗した場合は
//    予約を黙って成立させず例外を投げる（写真の取りこぼしを防ぐ）
async function saveGuestEntry(entry: GuestEntry, requirePhoto = false): Promise<string | null> {
  if (!entry.passportNumber?.trim() || !entry.fullName?.trim()) return null;

  const passportNumber = entry.passportNumber.trim().toUpperCase();

  let uploadedImageUrl: string | null = null;
  if (entry.passportImageUrl) {
    const { url, error } = await uploadPassportPhoto(entry.passportImageUrl);
    uploadedImageUrl = url;

    // 代表者は写真必須。リトライしても保存できなければ予約を止めて再試行を促す。
    if (!url && requirePhoto) {
      throw new Error(
        "パスポート写真の保存に失敗しました。通信環境の良い場所で、もう一度お試しください。"
      );
    }
    // 同行者は予約自体は止めないが、欠落は警告として残す。
    if (!url) {
      console.warn(
        `[booking] companion passport photo upload failed (${passportNumber}):`,
        error?.message
      );
    }
  }

  const guestPayload: Record<string, unknown> = {
    passport_number: passportNumber,
    full_name: entry.fullName.trim(),
    phone_number: entry.phoneNumber || null,
  };
  if (uploadedImageUrl) {
    guestPayload.passport_image_url = uploadedImageUrl;
  }

  const { data: existingGuest, error: lookupError } = await supabase
    .from("guests")
    .select("id")
    .eq("passport_number", passportNumber)
    .maybeSingle();

  if (lookupError) throw bookingSaveError("既存パスポート情報の確認", lookupError);

  if (existingGuest?.id) {
    const { error: updateError } = await supabase
      .from("guests")
      .update(guestPayload)
      .eq("id", existingGuest.id);

    // update権限が未適用の環境でも、既存ゲストIDを使えば送迎予約自体は保存できる。
    if (updateError) {
      console.warn("[booking] guest update skipped:", updateError.message, updateError);
    }

    return existingGuest.id as string;
  }

  const { data: guestRow, error: guestError } = await supabase
    .from("guests")
    .insert(guestPayload)
    .select("id")
    .single();

  if (guestError) throw bookingSaveError("パスポート情報の保存", guestError);
  if (!guestRow) throw new Error("パスポート情報を保存しましたが、IDを取得できませんでした。");
  return guestRow.id as string;
}

export async function submitBooking(
  passport: PassportFormData,
  transfer: TransferFormData
): Promise<SubmitBookingResult> {
  try {
    if (!isWithinTransferServiceHours(transfer.preferredDepartureTime)) {
      throw new Error("希望出発時刻は00:00〜10:00の間で選択してください。");
    }
    if (!transfer.destinationId) {
      throw new Error("目的地を選択してください。");
    }

    // 代表者（1人目）＋同行者（2人目以降）をまとめて処理する。
    const primaryEntry: GuestEntry = {
      fullName: passport.fullName,
      passportNumber: passport.passportNumber,
      phoneNumber: passport.phoneNumber,
      passportImageUrl: passport.passportImageUrl,
    };
    const companionEntries = passport.companions ?? [];

    // 代表者は必須。ここで失敗したら予約自体を中断する。
    // requirePhoto=true: 写真のアップロードに失敗した場合も中断し、再試行を促す。
    const primaryGuestId = await saveGuestEntry(primaryEntry, true);
    if (!primaryGuestId) throw new Error("代表者のパスポート情報を保存できませんでした。");

    // 同行者を順次 upsert。個別に失敗しても予約は止めず、成功分だけリンクする。
    // 重複パスポート（代表者と同一・同行者同士の重複）は1件に名寄せする。
    const linkedGuestIds = new Set<string>([primaryGuestId]);
    for (const companion of companionEntries) {
      const companionGuestId = await saveGuestEntry(companion);
      if (companionGuestId) linkedGuestIds.add(companionGuestId);
    }

    const { data: transferRow, error: transferError } = await supabase
      .from("transfer_requests")
      .insert({
        guest_id: primaryGuestId,
        room_number: transfer.roomNumber,
        destination_id: transfer.destinationId,
        terminal: transfer.terminal,
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

    if (transferError) throw bookingSaveError("送迎予約の保存", transferError);
    if (!transferRow) throw new Error("送迎予約を保存しましたが、予約IDを取得できませんでした。");

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
  } catch (error) {
    console.error("[booking] submit failed:", error);
    throw error instanceof Error ? error : new Error("予約情報の保存に失敗しました。");
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
