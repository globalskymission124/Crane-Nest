import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/admin";
import { noStore } from "@/lib/server/session";
import { isWithinTransferServiceHours } from "@/lib/transferTime";

// =========================================================
// ゲストの送迎予約の保存（パスポート情報つき）
//
// guests / transfer_request_guests は anon キーから読めない（migration 0040）ため、
// 予約の保存はここで service_role を使って行う。
// パスポート写真はブラウザから非公開バケット (passport-photos) に「アップロードだけ」行い、
// ここにはバケット内のパス（例: 2f1c…e9.jpg）だけが届く。公開URLは作らない。
// =========================================================

export const runtime = "nodejs";

const PHOTO_PATH_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/i;
const MAX_COMPANIONS = 12;

interface EntryIn {
  fullName?: string;
  passportNumber?: string;
  phoneNumber?: string;
  address?: string;
  photoPath?: string | null;
}

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: noStore });
const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

async function saveGuest(entry: EntryIn): Promise<string | null> {
  const fullName = str(entry.fullName, 120);
  const passportNumber = str(entry.passportNumber, 20).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!fullName || !passportNumber) return null;
  const photoPath = entry.photoPath && PHOTO_PATH_RE.test(entry.photoPath) ? entry.photoPath : null;

  const payload: Record<string, unknown> = {
    passport_number: passportNumber,
    full_name: fullName,
    phone_number: str(entry.phoneNumber, 40) || null,
    address: str(entry.address, 300) || null,
  };
  if (photoPath) payload.passport_image_url = photoPath; // 新しい写真があるときだけ更新

  const db = supabaseAdmin();
  const { data: existing, error: lookupError } = await db
    .from("guests")
    .select("id")
    .eq("passport_number", passportNumber)
    .maybeSingle();
  if (lookupError) throw new Error("既存パスポート情報の確認に失敗しました");

  if (existing?.id) {
    const { error } = await db.from("guests").update(payload).eq("id", existing.id);
    if (error) console.warn("[booking] guest update skipped:", error.message);
    return existing.id as string;
  }
  const { data: row, error } = await db.from("guests").insert(payload).select("id").single();
  if (error || !row) throw new Error("パスポート情報の保存に失敗しました");
  return row.id as string;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return fail("不正なリクエストです");

  const primary: EntryIn = body.primary || {};
  const companions: EntryIn[] = Array.isArray(body.companions) ? body.companions.slice(0, MAX_COMPANIONS) : [];
  const t = body.transfer || {};

  if (!isWithinTransferServiceHours(str(t.preferred_departure_time, 10)))
    return fail("希望出発時刻は00:00〜10:00の間で選択してください。");
  if (!t.destination_id) return fail("目的地を選択してください。");
  if (!primary.photoPath && body.requirePrimaryPhoto)
    return fail("パスポート写真の保存に失敗しました。もう一度お試しください。");

  try {
    const primaryId = await saveGuest(primary);
    if (!primaryId) return fail("代表者のパスポート情報を保存できませんでした。");

    const linked = new Set<string>([primaryId]);
    for (const c of companions) {
      try {
        const id = await saveGuest(c);
        if (id) linked.add(id);
      } catch (e) {
        console.warn("[booking] companion skipped:", (e as Error).message);
      }
    }

    const db = supabaseAdmin();
    const num = (v: unknown) => Math.max(0, Math.min(99, Number(v) || 0));
    const transferPayload: Record<string, unknown> = {
      guest_id: primaryId,
      room_number: str(t.room_number, 40),
      destination_id: t.destination_id,
      terminal: t.terminal ?? null,
      rinku_route_intent: t.rinku_route_intent ?? null,
      transfer_date: t.transfer_date || null,
      flight_time: t.flight_time || null,
      preferred_departure_time: t.preferred_departure_time || null,
      suggested_departure_time: t.suggested_departure_time || null,
      passenger_count: num(t.passenger_count),
      luggage_large: num(t.luggage_large),
      luggage_small: num(t.luggage_small),
      luggage_special: num(t.luggage_special),
      status: "pending",
    };
    const token = str(body.reservationToken, 120);
    let { data: row, error } = await db
      .from("transfer_requests")
      .insert(token ? { ...transferPayload, reservation_token: token } : transferPayload)
      .select("id")
      .single();
    // SQL（0039）をまだ実行していないときは、合言葉なしで保存する
    if (error && token && /reservation_token/.test(error.message || "")) {
      ({ data: row, error } = await db.from("transfer_requests").insert(transferPayload).select("id").single());
    }
    if (error || !row) {
      console.error("[booking] transfer insert failed:", error?.message);
      return fail("送迎予約の保存に失敗しました", 500);
    }

    const { error: linkError } = await db.from("transfer_request_guests").insert(
      Array.from(linked).map((guestId) => ({
        transfer_request_id: row!.id,
        guest_id: guestId,
        is_primary: guestId === primaryId,
      }))
    );
    if (linkError) console.error("[booking] transfer_request_guests insert error:", linkError.message);

    return NextResponse.json({ transferRequestId: row.id }, { headers: noStore });
  } catch (e) {
    console.error("[booking] submit failed:", (e as Error).message);
    return fail((e as Error).message || "予約情報の保存に失敗しました。", 500);
  }
}
