import { GUEST_WIFI, type GuestWifiConfig } from "@/lib/guestWifi";
import { supabase } from "@/lib/supabase";
import type { StaysSession } from "@/lib/stays/auth";

interface RawStaysUser {
  name: string;
  email: string;
  phone: string | null;
  passport_number: string | null;
  nationality: string | null;
  passport_image_url: string | null;
  avatar_url: string | null;
}

interface RawGuest {
  id: string;
  full_name: string;
  passport_number: string;
  phone_number: string | null;
  passport_image_url: string | null;
}

interface RawTransfer {
  id: string;
  created_at: string;
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

interface RawCheckinGuest {
  id: string;
  created_at: string;
  full_name: string;
  passport_number: string;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  checkin_date: string | null;
  passport_image_url: string | null;
}

export interface JapanTravelProfile {
  name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  passportNumber: string | null;
  passportImageUrl: string | null;
  avatarUrl: string | null;
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
}

export type TravelCardPreviewSource = "transfer" | "checkin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPseudoEmail(email: string | null): boolean {
  return Boolean(email?.endsWith("@passport.guest"));
}

function pickRecord<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (hhmm) return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function fallbackProfile(session: StaysSession): JapanTravelProfile {
  return {
    name: session.name,
    email: isPseudoEmail(session.email) ? null : session.email,
    phone: null,
    nationality: null,
    passportNumber: session.passport_number ?? null,
    passportImageUrl: null,
    avatarUrl: session.avatar_url ?? null,
  };
}

async function fetchStaysUser(session: StaysSession): Promise<RawStaysUser | null> {
  if (session.id.startsWith("demo-")) return null;

  const { data, error } = await supabase
    .from("stays_users")
    .select("name,email,phone,passport_number,nationality,passport_image_url,avatar_url")
    .eq("id", session.id)
    .maybeSingle();

  if (error) {
    console.warn("[travel-card] stays_users lookup failed:", error.message, error);
    return null;
  }

  return (data as RawStaysUser | null) ?? null;
}

async function fetchStaysUserByPassport(passportNumber: string | null): Promise<RawStaysUser | null> {
  if (!passportNumber) return null;

  const { data, error } = await supabase
    .from("stays_users")
    .select("name,email,phone,passport_number,nationality,passport_image_url,avatar_url")
    .eq("passport_number", passportNumber.trim().toUpperCase())
    .maybeSingle();

  if (error) {
    console.warn("[travel-card] stays_users passport lookup failed:", error.message, error);
    return null;
  }

  return (data as RawStaysUser | null) ?? null;
}

async function fetchGuestByPassport(passportNumber: string | null): Promise<RawGuest | null> {
  if (!passportNumber) return null;

  const { data, error } = await supabase
    .from("guests")
    .select("id,full_name,passport_number,phone_number,passport_image_url")
    .eq("passport_number", passportNumber.trim().toUpperCase())
    .maybeSingle();

  if (error) {
    console.warn("[travel-card] guests lookup failed:", error.message, error);
    return null;
  }

  return (data as RawGuest | null) ?? null;
}

async function fetchLatestTransfer(guestId: string | null): Promise<JapanTravelTransfer | null> {
  if (!guestId) return null;

  const { data, error } = await supabase
    .from("transfer_requests")
    .select(
      `id, created_at, room_number, transfer_date, preferred_departure_time, suggested_departure_time, flight_time,
       passenger_count, luggage_large, luggage_small, luggage_special,
       destinations ( name )`
    )
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[travel-card] latest transfer lookup failed:", error.message, error);
    return null;
  }

  const row = data as RawTransfer | null;
  if (!row) return null;

  return {
    bookingReference: `TRF-${row.id.slice(0, 8).toUpperCase()}`,
    roomNumber: row.room_number,
    destinationName: pickRecord(row.destinations)?.name ?? "Destination not set",
    transferDate: row.transfer_date ?? null,
    departureTime: formatTime(row.preferred_departure_time ?? row.suggested_departure_time ?? row.flight_time),
    passengers: row.passenger_count ?? null,
    luggageTotal: (row.luggage_large ?? 0) + (row.luggage_small ?? 0) + (row.luggage_special ?? 0),
  };
}

function transferToCard(row: RawTransfer): JapanTravelTransfer {
  return {
    bookingReference: `TRF-${row.id.slice(0, 8).toUpperCase()}`,
    roomNumber: row.room_number,
    destinationName: pickRecord(row.destinations)?.name ?? "Destination not set",
    transferDate: row.transfer_date ?? null,
    departureTime: formatTime(row.preferred_departure_time ?? row.suggested_departure_time ?? row.flight_time),
    passengers: row.passenger_count ?? null,
    luggageTotal: (row.luggage_large ?? 0) + (row.luggage_small ?? 0) + (row.luggage_special ?? 0),
  };
}

function mergeProfile(
  base: {
    name: string | null;
    email: string | null;
    phone: string | null;
    nationality: string | null;
    passportNumber: string | null;
    passportImageUrl: string | null;
  },
  user: RawStaysUser | null,
  guest: RawGuest | null
): JapanTravelProfile {
  const email = base.email ?? user?.email ?? null;
  return {
    name: base.name ?? user?.name ?? guest?.full_name ?? "Guest",
    email: isPseudoEmail(email) ? null : email,
    phone: base.phone ?? user?.phone ?? guest?.phone_number ?? null,
    nationality: base.nationality ?? user?.nationality ?? null,
    passportNumber: base.passportNumber ?? user?.passport_number ?? guest?.passport_number ?? null,
    passportImageUrl: base.passportImageUrl ?? user?.passport_image_url ?? guest?.passport_image_url ?? null,
    avatarUrl: user?.avatar_url ?? null,
  };
}

async function fetchTransferPreview(recordId: string): Promise<JapanTravelCardData> {
  const { data, error } = await supabase
    .from("transfer_requests")
    .select(
      `id, created_at, room_number, transfer_date, preferred_departure_time, suggested_departure_time, flight_time,
       passenger_count, luggage_large, luggage_small, luggage_special,
       guests ( id, full_name, passport_number, phone_number, passport_image_url ),
       destinations ( name )`
    )
    .eq("id", recordId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Travel Card preview record was not found.");

  const row = data as unknown as RawTransfer & { guests: RawGuest | RawGuest[] | null };
  const guest = pickRecord(row.guests);
  const user = await fetchStaysUserByPassport(guest?.passport_number ?? null);

  return {
    profile: mergeProfile(
      {
        name: guest?.full_name ?? null,
        email: null,
        phone: guest?.phone_number ?? null,
        nationality: null,
        passportNumber: guest?.passport_number ?? null,
        passportImageUrl: guest?.passport_image_url ?? null,
      },
      user,
      guest
    ),
    latestTransfer: transferToCard(row),
    wifi: GUEST_WIFI,
    generatedAt: new Date().toISOString(),
  };
}

async function fetchCheckinPreview(recordId: string): Promise<JapanTravelCardData> {
  const { data, error } = await supabase
    .from("stays_checkin_guests")
    .select("id, created_at, full_name, passport_number, nationality, phone, email, checkin_date, passport_image_url")
    .eq("id", recordId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Travel Card preview record was not found.");

  const row = data as RawCheckinGuest;
  const guest = await fetchGuestByPassport(row.passport_number);
  const user = await fetchStaysUserByPassport(row.passport_number);

  return {
    profile: mergeProfile(
      {
        name: row.full_name ?? null,
        email: row.email ?? null,
        phone: row.phone ?? null,
        nationality: row.nationality ?? null,
        passportNumber: row.passport_number ?? null,
        passportImageUrl: row.passport_image_url ?? null,
      },
      user,
      guest
    ),
    latestTransfer: await fetchLatestTransfer(guest?.id ?? null),
    wifi: GUEST_WIFI,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchJapanTravelCard(session: StaysSession): Promise<JapanTravelCardData> {
  const user = await fetchStaysUser(session);
  const passportNumber = user?.passport_number ?? session.passport_number ?? null;
  const guest = await fetchGuestByPassport(passportNumber);

  const profile: JapanTravelProfile = {
    name: user?.name ?? guest?.full_name ?? session.name,
    email: isPseudoEmail(user?.email ?? session.email) ? null : user?.email ?? session.email,
    phone: user?.phone ?? guest?.phone_number ?? null,
    nationality: user?.nationality ?? null,
    passportNumber: user?.passport_number ?? guest?.passport_number ?? session.passport_number ?? null,
    passportImageUrl: user?.passport_image_url ?? guest?.passport_image_url ?? null,
    avatarUrl: user?.avatar_url ?? session.avatar_url ?? null,
  };

  return {
    profile: user || guest ? profile : fallbackProfile(session),
    latestTransfer: await fetchLatestTransfer(guest?.id ?? null),
    wifi: GUEST_WIFI,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchJapanTravelCardForAdminRecord(
  previewSource: TravelCardPreviewSource,
  recordId: string
): Promise<JapanTravelCardData> {
  const normalizedId = recordId.trim();
  if (!normalizedId) throw new Error("Travel Card preview id is missing.");
  if (!UUID_RE.test(normalizedId)) throw new Error("Travel Card preview id is invalid.");

  if (previewSource === "transfer") return fetchTransferPreview(normalizedId);
  return fetchCheckinPreview(normalizedId);
}

export function maskPassportNumber(value: string | null): string {
  if (!value) return "Not set";
  const normalized = value.trim().toUpperCase();
  if (normalized.length <= 4) return "****";
  return `${normalized.slice(0, 2)}****${normalized.slice(-2)}`;
}
