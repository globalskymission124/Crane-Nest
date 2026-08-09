"use client";

// =========================================================
// 多通貨表示（JPY基準）
// レートは /api/stays/rates（Frankfurter・ECB由来）から自動取得し、
// localStorageに12時間キャッシュする。取得前・失敗時は下記の初期値を使用。
// 表示のみ変換し、決済・DBは常にJPYで行う。
// =========================================================
import { useEffect, useState } from "react";

export const CURRENCIES = {
  JPY: { label: "¥ JPY", rate: 1, decimals: 0, symbol: "¥" },
  USD: { label: "$ USD", rate: 0.0064, decimals: 0, symbol: "$" },
  EUR: { label: "€ EUR", rate: 0.0059, decimals: 0, symbol: "€" },
  KRW: { label: "₩ KRW", rate: 9.2, decimals: 0, symbol: "₩" },
  CNY: { label: "¥ CNY", rate: 0.046, decimals: 0, symbol: "CN¥" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
const KEY = "stays_currency";
const RATES_KEY = "stays_rates_v1";
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12時間

interface RatesCache {
  rates: Partial<Record<CurrencyCode, number>>;
  date: string | null; // レート基準日（ECB）
  fetchedAt: number; // 取得時刻(ms)
}

// 実行中に参照するライブレート（初期値は固定レート）
let liveRates: Record<CurrencyCode, number> = {
  JPY: CURRENCIES.JPY.rate,
  USD: CURRENCIES.USD.rate,
  EUR: CURRENCIES.EUR.rate,
  KRW: CURRENCIES.KRW.rate,
  CNY: CURRENCIES.CNY.rate,
};
let ratesDate: string | null = null;

function readCache(): RatesCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RATES_KEY);
    return raw ? (JSON.parse(raw) as RatesCache) : null;
  } catch {
    return null;
  }
}

// 起動時にキャッシュがあれば即反映（ちらつき防止）
(function hydrateFromCache() {
  const c = readCache();
  if (c?.rates) {
    liveRates = { ...liveRates, ...c.rates };
    ratesDate = c.date;
  }
})();

// レートを取得して反映。stale（12時間超）またはキャッシュ無しのときだけ通信する。
export async function refreshRates(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  const c = readCache();
  if (!force && c && Date.now() - c.fetchedAt < MAX_AGE_MS) {
    liveRates = { ...liveRates, ...c.rates };
    ratesDate = c.date;
    return;
  }
  try {
    const res = await fetch("/api/stays/rates");
    if (!res.ok) return;
    const data = await res.json();
    const rates = data?.rates as Partial<Record<CurrencyCode, number>> | undefined;
    if (!rates) return;
    liveRates = { ...liveRates, ...rates };
    ratesDate = data?.date ?? null;
    const cache: RatesCache = { rates: liveRates, date: ratesDate, fetchedAt: Date.now() };
    localStorage.setItem(RATES_KEY, JSON.stringify(cache));
    window.dispatchEvent(new Event("stays-rates"));
  } catch {
    // 通信失敗時は既存レート（キャッシュ or 固定値）を使い続ける
  }
}

export function getRatesDate(): string | null {
  return ratesDate;
}

export function getCurrency(): CurrencyCode {
  if (typeof window === "undefined") return "JPY";
  const c = localStorage.getItem(KEY) as CurrencyCode | null;
  return c && c in CURRENCIES ? c : "JPY";
}

export function setCurrency(c: CurrencyCode) {
  localStorage.setItem(KEY, c);
  window.dispatchEvent(new Event("stays-currency"));
}

export function formatPrice(jpy: number, code: CurrencyCode): string {
  const cur = CURRENCIES[code];
  const rate = liveRates[code] ?? cur.rate;
  const v = jpy * rate;
  return cur.symbol + Math.round(v).toLocaleString();
}

// 通貨設定を購読し、JPY金額のフォーマッタを返すフック。
// マウント時にレートを（必要なら）自動更新する。
export function useCurrency(): {
  code: CurrencyCode;
  fmt: (jpy: number) => string;
  ratesDate: string | null;
} {
  const [code, setCode] = useState<CurrencyCode>("JPY");
  const [date, setDate] = useState<string | null>(ratesDate);
  useEffect(() => {
    const sync = () => setCode(getCurrency());
    const syncRates = () => setDate(getRatesDate());
    sync();
    syncRates();
    refreshRates().then(syncRates); // 12時間ごとに最新レートへ
    window.addEventListener("stays-currency", sync);
    window.addEventListener("stays-rates", syncRates);
    return () => {
      window.removeEventListener("stays-currency", sync);
      window.removeEventListener("stays-rates", syncRates);
    };
  }, []);
  return { code, fmt: (jpy: number) => formatPrice(jpy, code), ratesDate: date };
}
