// =========================================================
// POST /api/stays/refund
// { bookingId, amount } — キャンセルポリシーに基づく返金を実行。
// Stripe決済は実返金、モック決済はDB上で返金扱いにする。
// =========================================================
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getStripe } from "@/lib/stays/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { bookingId, amount } = await req.json();
    if (!bookingId || amount == null)
      return NextResponse.json({ error: "bookingId and amount required" }, { status: 400 });

    const { data: payment } = await supabase
      .from("stays_payments")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("status", "paid")
      .maybeSingle();

    if (!payment) {
      // 未決済予約のキャンセル: 返金なしで成功扱い
      return NextResponse.json({ refunded: 0 });
    }

    const p = payment as any;
    const refundAmount = Math.min(amount, p.amount);

    if (refundAmount > 0 && p.provider === "stripe" && p.stripe_payment_intent) {
      const stripe = getStripe();
      if (!stripe) return NextResponse.json({ error: "stripe not configured" }, { status: 400 });
      await stripe.refunds.create({
        payment_intent: p.stripe_payment_intent,
        amount: refundAmount, // JPY: そのまま円
      });
    }

    const newStatus = refundAmount >= p.amount ? "refunded" : refundAmount > 0 ? "partially_refunded" : "paid";
    await supabase
      .from("stays_payments")
      .update({ status: newStatus, refund_amount: refundAmount })
      .eq("id", p.id);
    if (refundAmount > 0) {
      await supabase
        .from("stays_bookings")
        .update({ payment_status: refundAmount >= p.amount ? "refunded" : "partially_refunded" })
        .eq("id", bookingId);
    }
    return NextResponse.json({ refunded: refundAmount });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "refund failed" }, { status: 500 });
  }
}
