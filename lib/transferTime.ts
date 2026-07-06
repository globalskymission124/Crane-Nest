// =========================================================
// 出発推奨時刻の算出ロジック
// 関西国際空港（KIX）行きの場合のみ「フライト時刻の2.5時間前」を提案する。
// =========================================================

const KIX_LEAD_TIME_MINUTES = 2.5 * 60; // 2.5時間 = 150分
const KIX_NAME_KEYWORDS = ["関西国際空港", "関空", "kix", "kansai"];

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
