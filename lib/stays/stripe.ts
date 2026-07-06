// =========================================================
// Stripe サーバーサイドヘルパー
// STRIPE_SECRET_KEY 未設定時は null を返し、モック決済にフォールバック。
// =========================================================
import Stripe from "stripe";

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

// 決済完了をDBへ反映（confirm / webhook 共用）
import { supabase } from "@/lib/supabase";

export async function markPaid(sessionId: string, paymentIntent: string | null) {
  const { data: payment } = await supabase
    .from("stays_payments")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (!payment) return null;
  await supabase
    .from("stays_payments")
    .update({ status: "paid", stripe_payment_intent: paymentIntent })
    .eq("id", (payment as any).id);
  await supabase
    .from("stays_bookings")
    .update({ payment_status: "paid" })
    .eq("id", (payment as any).booking_id);
  return payment as any;
}
