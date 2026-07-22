// =========================================================
// 送迎予約 — WxPusher 通知（サーバ専用）
//   新しい送迎予約が保存されたあと、管理者/家族のWeChatへ通知する。
//   WxPusher appToken と UID はサーバ環境変数からのみ読む。
// =========================================================
import { supabase } from "./supabase";
import { formatTime } from "./adminSchedule";
import { sendWxPusher, type WxPusherSendResult } from "./wxpusher";

export interface TransferBookingAlertResult {
  wxpusher: WxPusherSendResult;
}

interface TransferAlertRow {
  id: string;
  room_number: string;
  transfer_date: string | null;
  flight_time: string | null;
  preferred_departure_time: string | null;
  passenger_count: number;
  luggage_large: number;
  luggage_small: number;
  luggage_special: number;
  guests: { full_name: string | null; phone_number: string | null } | { full_name: string | null; phone_number: string | null }[] | null;
  destinations: { name: string | null } | { name: string | null }[] | null;
}

function pickOne<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function bookingReference(id: string): string {
  return `TRF-${id.slice(0, 8).toUpperCase()}`;
}

function buildTitle(): string {
  return "【送迎予約】新しい予約が入りました";
}

function buildContent(row: TransferAlertRow): string {
  const guest = pickOne(row.guests);
  const destination = pickOne(row.destinations);
  const luggageTotal = row.luggage_large + row.luggage_small + row.luggage_special;

  return [
    buildTitle(),
    "",
    `予約番号：${bookingReference(row.id)}`,
    `送迎日：${row.transfer_date || "未設定"}`,
    `希望出発時刻：${row.preferred_departure_time || "未設定"}`,
    `行き先：${destination?.name || "未設定"}`,
    `部屋：${row.room_number}`,
    `ゲスト名：${guest?.full_name || "未登録"}`,
    `連絡先：${guest?.phone_number || "未登録"}`,
    `乗車人数：${row.passenger_count}名`,
    `荷物：大型${row.luggage_large} / 小型${row.luggage_small} / 特殊${row.luggage_special}（計${luggageTotal}）`,
    `フライト時刻：${formatTime(row.flight_time)}`,
  ].join("\n");
}

async function getTransferRequest(id: string): Promise<TransferAlertRow | null> {
  const { data, error } = await supabase
    .from("transfer_requests")
    .select(
      `id, room_number, transfer_date, flight_time, preferred_departure_time,
       passenger_count, luggage_large, luggage_small, luggage_special,
       guests ( full_name, phone_number ),
       destinations ( name )`
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as TransferAlertRow;
}

async function sendTransferWxPusher(row: TransferAlertRow): Promise<TransferBookingAlertResult["wxpusher"]> {
  return sendWxPusher({
    title: buildTitle(),
    content: buildContent(row),
    uids: process.env.TRANSFER_WXPUSHER_UIDS || process.env.WXPUSHER_UIDS,
    spt: process.env.TRANSFER_WXPUSHER_SPT || process.env.WXPUSHER_SPT,
  });
}

export async function dispatchTransferBookingAlert(id: string): Promise<TransferBookingAlertResult> {
  const row = await getTransferRequest(id);
  if (!row) return { wxpusher: { ok: false, error: "送迎予約が見つかりません" } };
  return { wxpusher: await sendTransferWxPusher(row) };
}
