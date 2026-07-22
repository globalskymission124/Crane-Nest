// =========================================================
// 出発推奨時刻の算出ロジック
// 関西国際空港（KIX）行きの場合のみ「フライト時刻の2.5時間前」を提案する。
// =========================================================

const KIX_LEAD_TIME_MINUTES = 2.5 * 60; // 2.5時間 = 150分
const KIX_NAME_KEYWORDS = ["関西国際空港", "関空", "kix", "kansai"];
export const TRANSFER_SERVICE_END_TIME = "10:00";
const TRANSFER_SERVICE_END_MINUTES = 10 * 60;

export const TRANSFER_DEPARTURE_TIME_OPTIONS: string[] = Array.from(
  { length: 11 },
  (_, h) => `${String(h).padStart(2, "0")}:00`
);

export function isKansaiAirport(destinationName: string): boolean {
  const normalized = destinationName.toLowerCase();
  return KIX_NAME_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

/**
 * "HH:mm" 形式のフライト時刻から、出発推奨時刻を "HH:mm" 形式で返す。
 * 日付をまたぐ場合（深夜便など）は前日扱いとして時刻のみを表示する。
 */
export function calculateSuggestedDepartureTime(flightTime: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(flightTime.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const totalMinutes = hours * 60 + minutes - KIX_LEAD_TIME_MINUTES;
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);

  const suggestedHours = Math.floor(normalized / 60);
  const suggestedMinutes = normalized % 60;

  return `${String(suggestedHours).padStart(2, "0")}:${String(suggestedMinutes).padStart(2, "0")}`;
}

export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

export function isWithinTransferServiceHours(time: string | null | undefined): time is string {
  const minutes = timeToMinutes(time);
  return minutes !== null && minutes <= TRANSFER_SERVICE_END_MINUTES;
}
