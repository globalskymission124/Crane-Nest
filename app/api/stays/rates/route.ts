import { NextResponse } from "next/server";

// =========================================================
// 為替レート取得（JPY基準）
//
// Frankfurter（ECB由来・APIキー不要）から最新レートを取得して返す。
// Next.jsのfetchキャッシュで12時間ごとに再取得（過度なAPI呼び出しを防止）。
// 取得失敗時は固定フォールバックレートを返すため、表示は必ず動く。
// =========================================================

export const revalidate = 43200; // 12時間

const SYMBOLS = ["USD", "EUR", "KRW", "CNY"] as const;

// 取得失敗時のフォールバック（currency.ts の初期値と一致）
const FALLBACK: Record<string, number> = {
  JPY: 1,
  USD: 0.0064,
  EUR: 0.0059,
  KRW: 9.2,
  CNY: 0.046,
};

export async function GET() {
  try {
    const url = `https://api.frankfurter.app/latest?base=JPY&symbols=${SYMBOLS.join(",")}`;
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) throw new Error(`frankfurter ${res.status}`);
    const data = await res.json();
    const rates: Record<string, number> = { JPY: 1, ...(data?.rates || {}) };
    // 必要な通貨が欠けていたらフォールバックで補完
    for (const s of SYMBOLS) if (typeof rates[s] !== "number") rates[s] = FALLBACK[s];
    return NextResponse.json({
      base: "JPY",
      date: data?.date ?? null,
      rates,
      source: "frankfurter",
    });
  } catch (err) {
    console.warn("rates fetch failed, using fallback:", err);
    return NextResponse.json({
      base: "JPY",
      date: null,
      rates: FALLBACK,
      source: "fallback",
    });
  }
}
