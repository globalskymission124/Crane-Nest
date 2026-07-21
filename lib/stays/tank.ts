// =========================================================
// し尿タンク（便槽）モニタリング — 共有ロジック
//   型定義・定数・純粋な計算関数のみを置く。
//   Node固有APIに依存しないため、クライアント/サーバの両方から import 可能。
//   （通知やDBアクセスは tankAlerts.ts / tankStore.ts 側に分離している）
// =========================================================

// ---- 既定値（あとから管理画面や環境変数で上書き可能な想定） ----
export const TANK_DEFAULTS = {
  capacityLiters: 600, // タンク総容量 L
  litersPerGuestPerDay: 3.5, // 簡易水洗トイレ 1人1日あたりの使用量 L
  cautionPct: 0.6, // 🟡 注意ライン（60%）
  alertPct: 0.8, // 🔴 警告ライン（80%）
} as const;

export type TankStatus = "safe" | "caution" | "alert";

// その日の宿泊ログ
export interface DailyLog {
  date: string; // YYYY-MM-DD
  guests: number; // 宿泊人数
  liters: number; // guests * litersPerGuestPerDay（保存時点の値）
}

// タンクの現在状態（GET /api/stays/tank のレスポンス本体）
export interface TankState {
  capacityLiters: number;
  litersPerGuestPerDay: number;
  currentLiters: number; // 前回汲み取り以降の累積水量
  lastEmptiedDate: string; // 前回汲み取り日 YYYY-MM-DD
  logs: DailyLog[]; // 前回汲み取り以降のログ（新しい順）
  alerted: boolean; // 警告通知を既に送ったか（多重通知の抑制）
  updatedAt: string; // ISO 8601
}

// ---- 数値ユーティリティ ----

// 小数第1位で丸める（L表示のブレを防ぐ）
export function roundL(n: number): number {
  return Math.round(n * 10) / 10;
}

// 宿泊人数 → 加算される水量。0人の日は 0L（メーターは進まない）。
export function litersForGuests(
  guests: number,
  perGuest: number = TANK_DEFAULTS.litersPerGuestPerDay
): number {
  const g = Math.max(0, Math.floor(guests || 0));
  return roundL(g * perGuest);
}

// ログ配列から累積水量を再計算する（編集・訂正に強い設計）
export function sumLiters(logs: DailyLog[]): number {
  return roundL(logs.reduce((acc, l) => acc + (l.liters || 0), 0));
}

// 充填率（%）。オーバーフローも見えるよう上限は999%に緩める。
export function tankPct(currentLiters: number, capacityLiters: number): number {
  if (capacityLiters <= 0) return 0;
  return Math.min(999, Math.max(0, (currentLiters / capacityLiters) * 100));
}

// 警告ライン（L）。既定では 600 * 0.8 = 480L。
export function alertLineLiters(
  capacityLiters: number,
  alertPct: number = TANK_DEFAULTS.alertPct
): number {
  return roundL(capacityLiters * alertPct);
}

// 満杯までの残り猶予（L）。マイナスにはしない。
export function remainingLiters(currentLiters: number, capacityLiters: number): number {
  return roundL(Math.max(0, capacityLiters - currentLiters));
}

// 現在の状態区分を判定
export function statusFor(currentLiters: number, capacityLiters: number): TankStatus {
  if (capacityLiters <= 0) return "safe";
  const p = currentLiters / capacityLiters;
  if (p >= TANK_DEFAULTS.alertPct) return "alert";
  if (p >= TANK_DEFAULTS.cautionPct) return "caution";
  return "safe";
}

// 直近ログの平均宿泊人数（予測日数の基礎値）。既定で直近7日分を見る。
export function recentAvgGuests(logs: DailyLog[], window = 7): number {
  if (!logs.length) return 0;
  const recent = logs.slice(0, window);
  const total = recent.reduce((acc, l) => acc + (l.guests || 0), 0);
  return total / recent.length;
}

// 満杯までの残り予測日数。宿泊が0（またはデータ無し）の場合は算出不能として null。
export function forecastDays(
  currentLiters: number,
  capacityLiters: number,
  guestsPerDay: number,
  perGuest: number = TANK_DEFAULTS.litersPerGuestPerDay
): number | null {
  const daily = guestsPerDay * perGuest;
  if (daily <= 0) return null;
  const remain = remainingLiters(currentLiters, capacityLiters);
  return Math.floor(remain / daily);
}

// ---- ステータスの表示メタ（UIと通知文で共通利用） ----
export const STATUS_META: Record<
  TankStatus,
  { emoji: string; label: string; message: string }
> = {
  safe: {
    emoji: "🟢",
    label: "安全",
    message: "まだ余裕があります",
  },
  caution: {
    emoji: "🟡",
    label: "注意",
    message: "そろそろ汲み取りの準備をしてください",
  },
  alert: {
    emoji: "🔴",
    label: "警告",
    message: "【至急】バキュームカーを手配してください",
  },
};
