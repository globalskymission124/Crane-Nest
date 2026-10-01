import { NextResponse } from "next/server";
import { signPhotoRefs, supabaseAdmin } from "@/lib/server/admin";
import { noStore, requireRole } from "@/lib/server/session";

// =========================================================
// 管理画面用のデータ（パスポート情報を含む）
//   管理者ログイン (cn_session) を確認してから service_role で読む。
//   パスポート写真は 10 分だけ有効なリンクに置き換えて返す。
//   POST { kind: "kanban", date, rangeStart, rangeEnd }
//   POST { kind: "records" }
// =========================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type GuestLike = { passport_image_url?: string | null } | null;
type WithGuests = { guests?: GuestLike | GuestLike[] };

// 行の中の guests.passport_image_url をまとめて期限つきリンクにする
async function signGuestPhotos<T extends WithGuests>(rows: T[], ttl = 600): Promise<T[]> {
  const holders: { passport_image_url?: string | null }[] = [];
  for (const row of rows) {
    const g = row.guests;
    for (const one of Array.isArray(g) ? g : [g]) if (one) holders.push(one);
  }
  const signed = await signPhotoRefs(holders.map((h) => h.passport_image_url), "passport-photos", ttl);
  holders.forEach((h, i) => (h.passport_image_url = signed[i]));
  return rows;
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ["admin"]);
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();

  if (body?.kind === "kanban") {
    const date = String(body.date || "");
    const rangeStart = String(body.rangeStart || "");
    const rangeEnd = String(body.rangeEnd || "");
    if (!DATE_RE.test(date) || Number.isNaN(Date.parse(rangeStart)) || Number.isNaN(Date.parse(rangeEnd)))
      return NextResponse.json({ error: "日付が不正です" }, { status: 400, headers: noStore });

    const SELECT_FIELDS = `id, room_number, flight_time, suggested_departure_time, preferred_departure_time,
         passenger_count, luggage_large, luggage_small, luggage_special, status,
         guests ( full_name, passport_image_url ),
         destinations ( name, image_url )`;
    const [fresh, legacy] = await Promise.all([
      db
        .from("transfer_requests")
        .select(SELECT_FIELDS)
        .neq("status", "cancelled")
        .eq("transfer_date", date)
        .order("suggested_departure_time", { ascending: true, nullsFirst: true })
        .order("flight_time", { ascending: true, nullsFirst: false }),
      // 後方互換: transfer_date がない古いレコードは flight_time 範囲で取得
      db
        .from("transfer_requests")
        .select(SELECT_FIELDS)
        .neq("status", "cancelled")
        .is("transfer_date", null)
        .gte("flight_time", rangeStart)
        .lt("flight_time", rangeEnd)
        .order("suggested_departure_time", { ascending: true, nullsFirst: true })
        .order("flight_time", { ascending: true }),
    ]);
    if (fresh.error && legacy.error)
      return NextResponse.json({ error: "送迎予約を読み込めませんでした" }, { status: 500, headers: noStore });
    const rows = await signGuestPhotos([...((fresh.data ?? []) as WithGuests[]), ...((legacy.data ?? []) as WithGuests[])]);
    return NextResponse.json({ rows }, { headers: noStore });
  }

  if (body?.kind === "records") {
    const { data: transfers, error } = await db
      .from("transfer_requests")
      .select(
        `id, created_at, room_number, transfer_date, flight_time, preferred_departure_time, suggested_departure_time,
         passenger_count, luggage_large, luggage_small, luggage_special, status,
         guests ( full_name, passport_number, phone_number, address, passport_image_url ),
         destinations ( name )`
      )
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "送迎記録を読み込めませんでした" }, { status: 500, headers: noStore });

    const ids = (transfers ?? []).map((r: any) => r.id);
    let links: any[] = [];
    if (ids.length) {
      const { data, error: linkError } = await db
        .from("transfer_request_guests")
        .select("transfer_request_id, is_primary, guests ( full_name, passport_number, phone_number, address, passport_image_url )")
        .in("transfer_request_id", ids);
      if (linkError) console.warn("[records] transfer_request_guests:", linkError.message);
      links = data ?? [];
    }

    const { data: checkins, error: checkinError } = await db
      .from("stays_checkin_guests")
      .select(
        `id, created_at, full_name, passport_number, nationality, phone, email, checkin_date, passport_image_url,
         stays_checkin_pages ( title )`
      )
      .order("created_at", { ascending: false });
    if (checkinError) console.warn("[records] stays_checkin_guests:", checkinError.message);

    // ZIP ダウンロードに時間がかかることがあるので、記録画面のリンクは 30 分有効にする
    const TTL = 1800;
    await signGuestPhotos(transfers as WithGuests[], TTL);
    await signGuestPhotos(links as WithGuests[], TTL);
    const checkinRows = (checkins ?? []) as { passport_image_url: string | null }[];
    const signed = await signPhotoRefs(checkinRows.map((r) => r.passport_image_url), "host-passports", TTL);
    checkinRows.forEach((r, i) => (r.passport_image_url = signed[i]));

    return NextResponse.json(
      { transfers: transfers ?? [], links, checkins: checkinRows, checkinsError: Boolean(checkinError) },
      { headers: noStore }
    );
  }

  return NextResponse.json({ error: "不明な操作です" }, { status: 400, headers: noStore });
}
