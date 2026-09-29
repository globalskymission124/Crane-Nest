export type TransferRouteIntent = "nankai" | "airport";

const KIX_NAME_KEYWORDS = ["関西国際空港", "関空", "kix", "kansai"];
const RINKU_NAME_KEYWORDS = ["りんくう", "rinku"];

function includesAnyKeyword(value: string, keywords: string[]): boolean {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export function isKansaiAirportDestination(destinationName: string): boolean {
  return includesAnyKeyword(destinationName, KIX_NAME_KEYWORDS);
}

export function isRinkuTown(destinationName: string): boolean {
  return includesAnyKeyword(destinationName, RINKU_NAME_KEYWORDS);
}

export function requiresTerminalSelection(
  destinationName: string,
  routeIntent: TransferRouteIntent | null
): boolean {
  return isKansaiAirportDestination(destinationName) || (isRinkuTown(destinationName) && routeIntent === "airport");
}

export function formatTransferRouteIntent(
  routeIntent: TransferRouteIntent | null,
  terminal: string | null
): string | null {
  if (routeIntent === "nankai") return "南海線に乗車";
  if (routeIntent === "airport") {
    return terminal ? `空港へ移動（ターミナル${terminal}）` : "空港へ移動（ターミナル未設定）";
  }
  return null;
}
