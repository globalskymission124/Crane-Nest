// =========================================================
// GET /api/stays/checkout/confirm?session_id=...
// Stripe Checkout から戻ってきた際に決済状態を確認しDBへ反映。
// （Webhookが届かないローカル環境でも決済完了を反映できる）
// =========================================================
import { NextRequest, NextResponse } from "next/server";
import { getStripe, markPaid } from "@/lib/stays/stripe";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 });
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: "stripe not configured" }, { status: 400 });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      await markPaid(session.id, (session.payment_intent as string) || null);
      return NextResponse.json({ paid: true });
    }
    return NextResponse.json({ paid: false, status: session.payment_status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "confirm failed" }, { status: 500 });
  }
}
