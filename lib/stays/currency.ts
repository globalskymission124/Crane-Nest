"use client";

// =========================================================
// 多通貨表示（デモ用固定レート・JPY基準）
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
  const v = jpy * cur.rate;
  return cur.symbol + Math.round(v).toLocaleString();
}

// 通貨設定を購読し、JPY金額のフォーマッタを返すフック
export function useCurrency(): { code: CurrencyCode; fmt: (jpy: number) => string } {
  const [code, setCode] = useState<CurrencyCode>("JPY");
  useEffect(() => {
    const sync = () => setCode(getCurrency());
    sync();
    window.addEventListener("stays-currency", sync);
    return () => window.removeEventListener("stays-currency", sync);
  }, []);
  return { code, fmt: (jpy: number) => formatPrice(jpy, code) };
}
