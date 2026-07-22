import type { TransferStatus } from "./types";
import { TRANSFER_SERVICE_END_TIME, timeToMinutes } from "./transferTime";

// =========================================================
// 管理画面 送迎カンバンボード用のヘルパー
// =========================================================

// カンバンの列となる時間帯レーン
export interface TimeLane {
  id: string;
  label: string;
  startMinute: number; // 含む
  endMinute: number; // 含まない
}

export const TIME_LANES: TimeLane[] = [
  { id: "early", label: "早朝（00:00〜05:59）", startMinute: 0, endMinute: 6 * 60 },
  { id: "morning", label: `朝（06:00〜${TRANSFER_SERVICE_END_TIME}）`, startMinute: 6 * 60, endMinute: 10 * 60 + 1 },
];

// Supabaseの結合結果を画面表示用に整形したカードデータ
export interface KanbanCard {
  id: string;
  roomNumber: string;
  roomPhotoUrl: string | null;
  guestName: string;
  passportImageUrl: string | null;
  destinationName: string;
  destinationImageUrl: string | null;
  flightTime: string | null; // ISO文字列
  departureTime: string | null; // ISO文字列（suggested_departure_time）
  preferredDepartureTime: string | null; // "HH:mm" 形式（ゲスト入力値）
  passengerCount: number;
  luggageLarge: number;
  luggageSmall: number;
  luggageSpecial: number;
  status: TransferStatus;
}

// 「荷物が多い」とみなす合計個数のしきい値（送迎車両の手配判断の目安）
export const HEAVY_LUGGAGE_THRESHOLD = 4;

export function luggageTotal(
  card: Pick<KanbanCard, "luggageLarge" | "luggageSmall" | "luggageSpecial">
) {
  return card.luggageLarge + card.luggageSmall + card.luggageSpecial;
}

export function isHeavyLuggage(
  card: Pick<KanbanCard, "luggageLarge" | "luggageSmall" | "luggageSpecial">
) {
  return luggageTotal(card) >= HEAVY_LUGGAGE_THRESHOLD;
}

// 「明日」の00:00〜翌々日00:00（ローカルタイム基準）の範囲
export function getTomorrowRange(base: Date = new Date()) {
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1, 0, 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 0, 0, 0, 0);
  return { start, end };
}

// 任意の日付の00:00〜翌日00:00（ローカルタイム基準）の範囲
export function getDateRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 0, 0, 0, 0);
  return { start, end };
}

// YYYY-MM-DD 文字列 → Date（ローカルタイム基準）
export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// Date → YYYY-MM-DD 文字列（ローカルタイム基準）
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 出発予定時刻をもとにレーンを判定
// 優先順位: preferred_departure_time（ゲスト希望）→ suggested_departure_time（算出値）→ flight_time
export function departureMinutes(card: KanbanCard): number | null {
  if (card.preferredDepartureTime) {
    // ゲストが指定した希望出発時刻（"HH:mm" 形式）を最優先
    return timeToMinutes(card.preferredDepartureTime);
  }

  if (card.departureTime) {
    // システム算出の提案時刻（ISO文字列）
    const d = new Date(card.departureTime);
    return Number.isNaN(d.getTime()) ? null : d.getHours() * 60 + d.getMinutes();
  }

  if (card.flightTime) {
    // フライト時刻にフォールバック
    const d = new Date(card.flightTime);
    return Number.isNaN(d.getTime()) ? null : d.getHours() * 60 + d.getMinutes();
  }

  return null;
}

export function isWithinMorningTransferBoard(card: KanbanCard): boolean {
  const minutes = departureMinutes(card);
  return minutes !== null && minutes <= 10 * 60;
}

export function assignLane(card: KanbanCard): TimeLane {
  const minutes = departureMinutes(card) ?? 0;
  return (
    TIME_LANES.find((lane) => minutes >= lane.startMinute && minutes < lane.endMinute) ??
    TIME_LANES[TIME_LANES.length - 1]
  );
}

// 表示用の希望出発時刻を返す（優先順位: preferred → suggested → null）
export function getDisplayDepartureLabel(card: KanbanCard): string | null {
  if (card.preferredDepartureTime) return card.preferredDepartureTime;
  if (card.departureTime) return formatTime(card.departureTime);
  return null;
}

export function formatTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDateLabel(date: Date) {
  return date.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });
}
