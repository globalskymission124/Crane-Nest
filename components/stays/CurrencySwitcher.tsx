"use client";

// 表示通貨切替（デモ用固定レート）
import { CURRENCIES, getCurrency, setCurrency, type CurrencyCode } from "@/lib/stays/currency";
import { useEffect, useState } from "react";

export default function CurrencySwitcher() {
  const [code, setCode] = useState<CurrencyCode>("JPY");
  useEffect(() => setCode(getCurrency()), []);
  return (
    <select
      value={code}
      onChange={(e) => {
        const c = e.target.value as CurrencyCode;
        setCode(c);
        setCurrency(c);
      }}
      className="rounded-full border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none"
      aria-label="表示通貨"
    >
      {Object.entries(CURRENCIES).map(([k, v]) => (
        <option key={k} value={k}>
          {v.label}
        </option>
      ))}
    </select>
  );
}
