import { supabase } from "./supabase";
import { getReservationToken } from "./craneLink";
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

// パスポート写真を1回だけアップロードする内部関数（戻り値はバケット内のパス）。
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

  // バケットは非公開。公開URLは作らず、バケット内のパスだけを保存する
  // （表示はサーバーが期限つきリンクを発行する）。
  return path;
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

// 1名分の写真をアップロードし、サーバーへ送る形にする。
//  - requirePhoto=true（代表者）で、写真があるのにアップロードに失敗した場合は
//    予約を黙って成立させず例外を投げる（写真の取りこぼしを防ぐ）
async function prepareEntry(entry: GuestEntry, requirePhoto = false) {
  let photoPath: string | null = null;
  if (entry.passportImageUrl && entry.passportNumber?.trim() && entry.fullName?.trim()) {
    const { url, error } = await uploadPassportPhoto(entry.passportImageUrl);
    photoPath = url;
    if (!url && requirePhoto) {
      throw new Error(
        "パスポート写真の保存に失敗しました。通信環境の良い場所で、もう一度お試しください。"
      );
    }
    if (!url) {
      console.warn("[booking] companion passport photo upload failed:", error?.message);
    }
  }
  return {
    fullName: entry.fullName,
    passportNumber: entry.passportNumber,
    phoneNumber: entry.phoneNumber || "",
    address: entry.address || "",
    photoPath,
  };
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
    if (!passport.passportNumber?.trim() || !passport.fullName?.trim()) {
      throw new Error("代表者のパスポート情報を保存できませんでした。");
    }

    // 代表者（1人目）＋同行者（2人目以降）
    const primary = await prepareEntry(
      {
        fullName: passport.fullName,
        passportNumber: passport.passportNumber,
        phoneNumber: passport.phoneNumber,
        address: passport.address,
        passportImageUrl: passport.passportImageUrl,
      },
      true
    );
    const companions = [];
    for (const companion of passport.companions ?? []) {
      companions.push(await prepareEntry(companion));
    }

    // 保存はサーバー側で行う（guests / transfer_request_guests はブラウザから読めない）
    const res = await fetch("/api/guest/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primary,
        companions,
        requirePrimaryPhoto: Boolean(passport.passportImageUrl),
        reservationToken: getReservationToken(),
        transfer: {
          room_number: transfer.roomNumber,
          destination_id: transfer.destinationId,
          terminal: transfer.terminal,
          rinku_route_intent: transfer.rinkuRouteIntent,
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
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.transferRequestId) {
      throw new Error(json?.error || "予約情報の保存に失敗しました。");
    }
    const id = String(json.transferRequestId);
    return {
      bookingReference: `TRF-${id.slice(0, 8).toUpperCase()}`,
      transferRequestId: id,
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
