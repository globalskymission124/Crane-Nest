// =========================================================
// POST /api/transfer/booking-alert
//   送迎予約完了後のpushplus通知。
//   body: { transferRequestId: string }
// =========================================================
import { NextRequest, NextResponse } from "next/server";
import { dispatchTransferBookingAlert } from "@/lib/transferBookingAlerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COOLDOWN_MS = 60_000;
const g = globalThis as unknown as { __transferBookingAlertSentAt?: Record<string, number> };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const transferRequestId = typeof body?.transferRequestId === "string" ? body.transferRequestId : "";

  if (!UUID_RE.test(transferRequestId)) {
    return NextResponse.json({ error: "transferRequestId が不正です" }, { status: 400 });
  }

  const now = Date.now();
  const sentAt = g.__transferBookingAlertSentAt ?? {};
  if (now - (sentAt[transferRequestId] || 0) < COOLDOWN_MS) {
    return NextResponse.json(
      { error: "この送迎予約の通知は送信直後です。少し待ってから再実行してください。" },
      { status: 429 }
    );
  }

  const alert = await dispatchTransferBookingAlert(transferRequestId);
  if (alert.pushplus.ok) {
    g.__transferBookingAlertSentAt = { ...sentAt, [transferRequestId]: now };
  }

  return NextResponse.json({ alertDispatched: alert });
}
