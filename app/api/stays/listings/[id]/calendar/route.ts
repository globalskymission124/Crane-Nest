// =========================================================
// GET /api/stays/listings/[id]/calendar
// この物件の予約不可期間を .ics として書き出す（エクスポート）。
// このURLを Airbnb の「カレンダーをインポート」に登録すると、
// 当サイトの予約が Airbnb 側にも反映される。
// =========================================================
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateICS, type ICalEvent } from "@/lib/stays/ical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const listingId = params.id;

  const { data: listing } = await supabase
    .from("stays_listings")
    .select("title")
    .eq("id", listingId)
    .maybeSingle();

  const { data: bookings } = await supabase
    .from("stays_bookings")
    .select("id, check_in, check_out, guest_name, status")
    .eq("listing_id", listingId)
    .neq("status", "cancelled");

  const { data: blocks } = await supabase
    .from("stays_calendar_blocks")
    .select("id, start_date, end_date, source, summary")
    .eq("listing_id", listingId);

  const events: ICalEvent[] = [];
  for (const b of bookings || []) {
    events.push({
      uid: `booking-${b.id}@crane-nest`,
      start: b.check_in,
      end: b.check_out,
      summary: `予約: ${b.guest_name}`,
    });
  }
  for (const bl of blocks || []) {
    // Airbnb由来のブロックはエクスポートに含めない（二重登録防止）
    if (bl.source === "airbnb") continue;
    events.push({
      uid: `block-${bl.id}@crane-nest`,
      start: bl.start_date,
      end: bl.end_date,
      summary: bl.summary || "ブロック（予約不可）",
    });
  }

  const ics = generateICS(listing?.title || "Crane Nest Stay", events);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="listing-${listingId}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
