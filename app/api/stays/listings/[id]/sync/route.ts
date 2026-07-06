// =========================================================
// POST /api/stays/listings/[id]/sync
// 物件に登録された airbnb_ical_url から .ics を取得・解析し、
// Airbnbの予約を calendar_blocks(source='airbnb') として取り込む。
// external_uid で重複を防ぎ、消えたイベントは削除して同期する。
// =========================================================
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { parseICS } from "@/lib/stays/ical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const listingId = params.id;

  // リクエストボディで一時的にURLを指定することも可能
  let icalUrl: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.ical_url === "string") icalUrl = body.ical_url;
  } catch {
    /* ignore */
  }

  if (!icalUrl) {
    const { data: listing } = await supabase
      .from("stays_listings")
      .select("airbnb_ical_url")
      .eq("id", listingId)
      .maybeSingle();
    icalUrl = listing?.airbnb_ical_url || null;
  }

  if (!icalUrl) {
    return NextResponse.json(
      { ok: false, error: "airbnb_ical_url が未設定です。" },
      { status: 400 }
    );
  }

  let text: string;
  try {
    const res = await fetch(icalUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: `iCalの取得に失敗しました: ${e?.message || e}` },
      { status: 502 }
    );
  }

  const events = parseICS(text);

  // 既存のairbnbブロックを取得し、差分同期する
  const { data: existing } = await supabase
    .from("stays_calendar_blocks")
    .select("id, external_uid")
    .eq("listing_id", listingId)
    .eq("source", "airbnb");

  const existingByUid = new Map<string, string>();
  for (const row of existing || []) {
    if (row.external_uid) existingByUid.set(row.external_uid, row.id);
  }

  const seenUids = new Set<string>();
  let inserted = 0;
  let updated = 0;

  for (const ev of events) {
    seenUids.add(ev.uid);
    const payload = {
      listing_id: listingId,
      start_date: ev.start,
      end_date: ev.end,
      source: "airbnb" as const,
      external_uid: ev.uid,
      summary: ev.summary,
    };
    if (existingByUid.has(ev.uid)) {
      await supabase
        .from("stays_calendar_blocks")
        .update(payload)
        .eq("id", existingByUid.get(ev.uid)!);
      updated++;
    } else {
      await supabase.from("stays_calendar_blocks").insert(payload);
      inserted++;
    }
  }

  // Airbnb側から消えたブロックを削除
  const toDelete: string[] = [];
  for (const [uid, id] of existingByUid.entries()) {
    if (!seenUids.has(uid)) toDelete.push(id);
  }
  if (toDelete.length > 0) {
    await supabase.from("stays_calendar_blocks").delete().in("id", toDelete);
  }

  return NextResponse.json({
    ok: true,
    inserted,
    updated,
    removed: toDelete.length,
    total: events.length,
  });
}
