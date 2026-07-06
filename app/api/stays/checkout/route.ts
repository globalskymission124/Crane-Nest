// =========================================================
// POST /api/stays/checkout
// 予約IDを受け取り Stripe Checkout セッションを作成して URL を返す。
// STRIPE_SECRET_KEY 未設定時はモック決済（即時 paid）にフォールバック。
// =========================================================
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getStripe } from "@/lib/stays/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

    const { data: booking } = await supabase
      .from("stays_bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return NextResponse.json({ error: "booking not found" }, { status: 404 });
    if ((booking as any).payment_status === "paid")
      return NextResponse.json({ error: "already paid" }, { status: 400 });

    const { data: listing } = await supabase
      .from("stays_listings")
      .select("id,title")
      .eq("id", (booking as any).listing_id)
      .maybeSingle();

    const origin = req.headers.get("origin") || req.nextUrl.origin;
    const stripe = getStripe();

    // ---- モックフォールバック（キー未設定でもデモ動作） ----
    if (!stripe) {
      await supabase.from("stays_payments").insert({
        booking_id: bookingId,
        amount: (booking as any).total_price,
        currency: "JPY",
        provider: "mock",
        status: "paid",
      });
      await supabase.from("stays_bookings").update({ payment_status: "paid" }).eq("id", bookingId);
      return NextResponse.json({
        provider: "mock",
        url: `${origin}/stays/pay/result?mock=1&booking=${bookingId}`,
      });
    }

    // ---- Stripe Checkout ----
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "jpy", // JPYはゼロ小数通貨: 金額はそのまま円
            unit_amount: (booking as any).total_price,
            product_data: {
              name: (listing as any)?.title || "宿泊予約",
              description: `${(booking as any).check_in} → ${(booking as any).check_out}・${(booking as any).guests_count}名`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: (booking as any).guest_email,
      metadata: { booking_id: bookingId },
      success_url: `${origin}/stays/pay/result?session_id={CHECKOUT_SESSION_ID}&booking=${bookingId}`,
      cancel_url: `${origin}/stays/pay/result?cancelled=1&booking=${bookingId}`,
    });

    await supabase.from("stays_payments").insert({
      booking_id: bookingId,
      amount: (booking as any).total_price,
      currency: "JPY",
      provider: "stripe",
      status: "pending",
      stripe_session_id: session.id,
    });

    return NextResponse.json({ provider: "stripe", url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "checkout failed" }, { status: 500 });
  }
}
