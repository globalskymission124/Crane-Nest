// =========================================================
// POST /api/stays/webhook — Stripe Webhook
// checkout.session.completed で決済完了をDBへ反映。
// STRIPE_WEBHOOK_SECRET 設定時は署名検証を行う。
// =========================================================
import { NextRequest, NextResponse } from "next/server";
import { getStripe, markPaid } from "@/lib/stays/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "stripe not configured" }, { status: 400 });

  const payload = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: any;

  try {
    if (secret) {
      const sig = req.headers.get("stripe-signature") || "";
      event = stripe.webhooks.constructEvent(payload, sig, secret);
    } else {
      event = JSON.parse(payload); // 開発用: 署名検証なし
    }
  } catch (e: any) {
    return NextResponse.json({ error: `webhook error: ${e?.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    await markPaid(session.id, (session.payment_intent as string) || null);
  }
  return NextResponse.json({ received: true });
}
