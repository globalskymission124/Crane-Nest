import type { TransferStatus } from "./types";

// =========================================================
// 管理画面 送迎カンバンボード用のヘルパー
// =========================================================

// カンバンの列となる時間帯レーン
export interface TimeLane {
  id: string;
  label: string;
  startHour: number; // 含む
  endHour: number; // 含まない
}

export const TIME_LANES: TimeLane[] = [
  { id: "early", label: "早朝（00:00〜06:00）", startHour: 0, endHour: 6 },
  { id: "morning", label: "午前（06:00〜12:00）", startHour: 6, endHour: 12 },
  { id: "afternoon", label: "午後（12:00〜18:00）", startHour: 12, endHour: 18 },
  { id: "night", label: "夜間（18:00〜24:00）", startHour: 18, endHour: 24 },
];

// Supabaseの結合結果を画面表示用に整形したカードデータ
export interface KanbanCard {
  id: string;
  roomNumber: string;
  guestName: string;
  destinationName: string;
  flightTime: string; // ISO文字列
  departureTime: string | null; // ISO文字列（提案出発時刻。無ければflightTimeで代用）
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

// 出発予定時刻（無ければフライト時刻）の「時」をもとにレーンを判定
export function assignLane(card: KanbanCard): TimeLane {
  const target = card.departureTime ?? card.flightTime;
  const hour = new Date(target).getHours();
  return (
    TIME_LANES.find((lane) => hour >= lane.startHour && hour < lane.endHour) ??
    TIME_LANES[TIME_LANES.length - 1]
  );
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDateLabel(date: Date) {
  return date.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });
}
