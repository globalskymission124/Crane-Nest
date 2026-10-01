import { GUEST_WIFI } from "@/lib/guestWifi";
import { signPhotoRefs, supabaseAdmin } from "@/lib/server/admin";
import {
  validUntilFrom,
  type JapanTravelCardData,
  type JapanTravelPerson,
  type JapanTravelProfile,
  type JapanTravelTransfer,
  type TravelCardPreviewSource,
} from "@/lib/stays/travelCard";

// =========================================================
// Japan Travel Card のデータ組み立て（サーバー専用）
//   本人のパスポート情報・同行者・最新の送迎予約をまとめ、写真は期限つきリンクにする。
// =========================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHOTO_TTL = 60 * 30; // 30分

interface RawGuest {
  id: string;
  full_name: string;
  passport_number: string;
  phone_number: string | null;
  address?: string | null;
  passport_image_url: string | null;
}

interface RawTransfer {
  id: string;
  room_number: string;
  transfer_date: string | null;
  preferred_departure_time: string | null;
  suggested_departure_time: string | null;
  flight_time: string | null;
  passenger_count: number | null;
  luggage_large: number | null;
  luggage_small: number | null;
  luggage_special: number | null;
  destinations: { name: string } | { name: string }[] | null;
}

const TRANSFER_FIELDS = `id, room_number, transfer_date, preferred_departure_time, suggested_departure_time, flight_time,
  passenger_count, luggage_large, luggage_small, luggage_special, destinations ( name )`;

const isPseudoEmail = (email: string | null | undefined) => Boolean(email?.endsWith("@passport.guest"));
const pick = <T,>(v: T | T[] | null): T | null => (!v ? null : Array.isArray(v) ? v[0] ?? null : v);

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (hhmm) return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
}

function transferToCard(row: RawTransfer): JapanTravelTransfer {
  return {
    bookingReference: `TRF-${row.id.slice(0, 8).toUpperCase()}`,
    roomNumber: row.room_number,
    destinationName: pick(row.destinations)?.name ?? "Destination not set",
    transferDate: row.transfer_date ?? null,
    departureTime: formatTime(row.preferred_departure_time ?? row.suggested_departure_time ?? row.flight_time),
    passengers: row.passenger_count ?? null,
    luggageTotal: (row.luggage_large ?? 0) + (row.luggage_small ?? 0) + (row.luggage_special ?? 0),
  };
}

async function guestByPassport(pn: string | null): Promise<RawGuest | null> {
  if (!pn) return null;
  const { data } = await supabaseAdmin()
    .from("guests")
    .select("id,full_name,passport_number,phone_number,address,passport_image_url")
    .eq("passport_number", pn.trim().toUpperCase())
    .maybeSingle();
  return (data as RawGuest | null) ?? null;
}

async function userByPassport(pn: string | null) {
  if (!pn) return null;
  const { data } = await supabaseAdmin()
    .from("stays_users")
    .select("name,email,phone,passport_number,nationality,passport_image_url,avatar_url")
    .eq("passport_number", pn.trim().toUpperCase())
    .maybeSingle();
  return data as any;
}

// 最新の送迎予約（代表者として、または同行者として）
async function latestTransferFor(guestId: string | null): Promise<RawTransfer | null> {
  if (!guestId) return null;
  const db = supabaseAdmin();
  const { data: links } = await db
    .from("transfer_request_guests")
    .select("transfer_request_id")
    .eq("guest_id", guestId);
  const ids = ((links ?? []) as { transfer_request_id: string }[]).map((l) => l.transfer_request_id);
  let q = db.from("transfer_requests").select(TRANSFER_FIELDS).order("created_at", { ascending: false }).limit(1);
  q = ids.length ? q.or(`guest_id.eq.${guestId},id.in.(${ids.join(",")})`) : q.eq("guest_id", guestId);
  const { data } = await q.maybeSingle();
  return (data as RawTransfer | null) ?? null;
}

// 送迎予約に紐づく全員（代表者が先）
async function travelersForTransfer(transferId: string, primaryGuestId: string | null): Promise<RawGuest[]> {
  const { data } = await supabaseAdmin()
    .from("transfer_request_guests")
    .select("is_primary, guests ( id, full_name, passport_number, phone_number, address, passport_image_url )")
    .eq("transfer_request_id", transferId);
  const rows = ((data ?? []) as any[])
    .map((r) => ({ primary: Boolean(r.is_primary), g: pick(r.guests) as RawGuest | null }))
    .filter((r) => r.g);
  rows.sort((a, b) => Number(b.primary) - Number(a.primary));
  const list = rows.map((r) => r.g!) as RawGuest[];
  // 見ている本人を先頭に
  if (primaryGuestId) list.sort((a, b) => Number(b.id === primaryGuestId) - Number(a.id === primaryGuestId));
  return list;
}

async function assemble(
  profile: Omit<JapanTravelProfile, "passportImageUrl"> & { photoRef: string | null; photoBucket: "passport-photos" | "host-passports" },
  me: RawGuest | null,
  transfer: RawTransfer | null
): Promise<JapanTravelCardData> {
  const people: (Omit<JapanTravelPerson, "passportImageUrl"> & { ref: string | null })[] = [];
  if (transfer) {
    const list = await travelersForTransfer(transfer.id, me?.id ?? null);
    list.forEach((g, i) =>
      people.push({
        name: g.full_name,
        passportNumber: g.passport_number,
        nationality: g.id === me?.id ? profile.nationality : null,
        phone: g.phone_number,
        email: g.id === me?.id ? profile.email : null,
        address: g.address ?? null,
        ref: g.passport_image_url,
        isPrimary: i === 0,
      })
    );
  }

  const [profileSigned, ...peopleSigned] = await Promise.all([
    signPhotoRefs([profile.photoRef], profile.photoBucket, PHOTO_TTL).then((r) => r[0]),
    ...people.map((p) => signPhotoRefs([p.ref], "passport-photos", PHOTO_TTL).then((r) => r[0])),
  ]);

  const { photoRef: _r, photoBucket: _b, ...rest } = profile;
  const departureDate = transfer?.transfer_date ?? null;
  return {
    profile: { ...rest, passportImageUrl: profileSigned },
    latestTransfer: transfer ? transferToCard(transfer) : null,
    wifi: GUEST_WIFI,
    generatedAt: new Date().toISOString(),
    travelers: people.length
      ? people.map(({ ref: _x, ...p }, i) => ({ ...p, passportImageUrl: peopleSigned[i] }))
      : undefined,
    departureDate,
    validUntil: validUntilFrom(departureDate),
  };
}

// ログイン中の本人
export async function travelCardForUser(userId: string): Promise<JapanTravelCardData> {
  const { data } = await supabaseAdmin()
    .from("stays_users")
    .select("name,email,phone,passport_number,nationality,passport_image_url,avatar_url")
    .eq("id", userId)
    .maybeSingle();
  const user = data as any;
  if (!user) throw new Error("アカウントが見つかりません");
  const guest = await guestByPassport(user.passport_number);
  const transfer = await latestTransferFor(guest?.id ?? null);
  return assemble(
    {
      name: user.name ?? guest?.full_name ?? "Guest",
      email: isPseudoEmail(user.email) ? null : user.email,
      phone: user.phone ?? guest?.phone_number ?? null,
      nationality: user.nationality ?? null,
      passportNumber: user.passport_number ?? guest?.passport_number ?? null,
      avatarUrl: user.avatar_url ?? null,
      photoRef: user.passport_image_url ?? guest?.passport_image_url ?? null,
      photoBucket: user.passport_image_url ? "host-passports" : "passport-photos",
    },
    guest,
    transfer
  );
}

// 管理者: 記録からのプレビュー
export async function travelCardForAdminRecord(
  source: TravelCardPreviewSource,
  recordId: string
): Promise<JapanTravelCardData> {
  if (!UUID_RE.test(recordId)) throw new Error("Travel Card preview id is invalid.");
  const db = supabaseAdmin();

  if (source === "transfer") {
    const { data } = await db
      .from("transfer_requests")
      .select(`${TRANSFER_FIELDS}, guests ( id, full_name, passport_number, phone_number, address, passport_image_url )`)
      .eq("id", recordId)
      .maybeSingle();
    if (!data) throw new Error("Travel Card preview record was not found.");
    const row = data as unknown as RawTransfer & { guests: RawGuest | RawGuest[] | null };
    const guest = pick(row.guests);
    const user = await userByPassport(guest?.passport_number ?? null);
    return assemble(
      {
        name: guest?.full_name ?? user?.name ?? "Guest",
        email: isPseudoEmail(user?.email) ? null : user?.email ?? null,
        phone: guest?.phone_number ?? user?.phone ?? null,
        nationality: user?.nationality ?? null,
        passportNumber: guest?.passport_number ?? null,
        avatarUrl: user?.avatar_url ?? null,
        photoRef: guest?.passport_image_url ?? null,
        photoBucket: "passport-photos",
      },
      guest,
      row
    );
  }

  const { data } = await db
    .from("stays_checkin_guests")
    .select("id, full_name, passport_number, nationality, phone, email, passport_image_url")
    .eq("id", recordId)
    .maybeSingle();
  if (!data) throw new Error("Travel Card preview record was not found.");
  const row = data as any;
  const guest = await guestByPassport(row.passport_number);
  const transfer = await latestTransferFor(guest?.id ?? null);
  return assemble(
    {
      name: row.full_name,
      email: row.email ?? null,
      phone: row.phone ?? guest?.phone_number ?? null,
      nationality: row.nationality || null,
      passportNumber: row.passport_number,
      avatarUrl: null,
      photoRef: row.passport_image_url ?? null,
      photoBucket: "host-passports",
    },
    guest,
    transfer
  );
}
