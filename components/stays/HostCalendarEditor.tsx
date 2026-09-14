"use client";

// =========================================================
// オーナー：料金・空室の日別／期間まとめて編集カレンダー
//  各日または期間（2回クリックで範囲選択）に対して
//  料金の上書き（stays_daily_prices）と手動ブロックを編集する。多言語対応。
// =========================================================
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { addDays, nightsInRange, todayStr } from "@/lib/stays/availability";
import { addManualBlock, clearDailyPrice, deleteBlock, fetchDailyPrices, setDailyPrice } from "@/lib/stays/host";
import { formatJPY } from "@/lib/stays/types";
import type { CalendarBlock } from "@/lib/stays/types";
import { useHostPagesT } from "@/lib/stays/hostPagesI18n";
import { getStaysLang } from "@/lib/stays/i18n";

const LOCALES: Record<string, string> = { en: "en-US", ja: "ja-JP", tw: "zh-TW", zh: "zh-CN" };

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function HostCalendarEditor({
  listingId,
  basePrice,
  blocks,
  onBlocksChanged,
}: {
  listingId: string;
  basePrice: number;
  blocks: CalendarBlock[];
  onBlocksChanged: () => void | Promise<void>;
}) {
  const { p } = useHostPagesT();
  const locale = LOCALES[getStaysLang()] || "en-US";
  const today = todayStr();

  const [prices, setPrices] = useState<Record<string, number>>({});
  const [view, setView] = useState<Date>(() => {
    const d = new Date(today + "T00:00:00");
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadPrices() {
    const rows = await fetchDailyPrices(listingId);
    const map: Record<string, number> = {};
    for (const r of rows) map[r.date] = r.price;
    setPrices(map);
  }
  useEffect(() => {
    if (listingId) loadPrices();
    setSelStart(null);
    setSelEnd(null);
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { manualByNight, otherBlocked } = useMemo(() => {
    const manual: Record<string, string> = {};
    const other = new Set<string>();
    for (const b of blocks) {
      for (const n of nightsInRange(b.start_date, b.end_date)) {
        if (b.source === "manual") manual[n] = b.id;
        else other.add(n);
      }
    }
    return { manualByNight: manual, otherBlocked: other };
  }, [blocks]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const monthLabel = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(view);
  const weekdays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(Date.UTC(2023, 0, 1 + i)))),
    [locale]
  );
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(ymd(year, month, d));
  const todayDate = new Date(today + "T00:00:00");
  const atCurrentMonth = year === todayDate.getFullYear() && month === todayDate.getMonth();

  // 選択中の日（範囲）
  const selDays = useMemo(() => {
    if (!selStart) return [] as string[];
    const end = selEnd || selStart;
    return nightsInRange(selStart, addDays(end, 1));
  }, [selStart, selEnd]);
  const inSel = (d: string) => selDays.includes(d);

  function pick(d: string) {
    if (d < today) return;
    if (!selStart || (selStart && selEnd)) {
      setSelStart(d);
      setSelEnd(null);
      setPriceInput(String(prices[d] ?? basePrice));
    } else if (d < selStart) {
      setSelStart(d);
      setSelEnd(null);
      setPriceInput(String(prices[d] ?? basePrice));
    } else {
      setSelEnd(d);
    }
  }

  const selHasOther = selDays.some((d) => otherBlocked.has(d));
  const selAllManual = selDays.length > 0 && selDays.every((d) => manualByNight[d]);

  async function savePrice() {
    if (selDays.length === 0) return;
    const v = Number(priceInput);
    if (!(v >= 0)) return;
    setBusy(true);
    try {
      for (const d of selDays) await setDailyPrice(listingId, d, Math.round(v));
      await loadPrices();
    } finally { setBusy(false); }
  }
  async function resetPrice() {
    if (selDays.length === 0) return;
    setBusy(true);
    try {
      for (const d of selDays) await clearDailyPrice(listingId, d);
      await loadPrices();
      setPriceInput(String(basePrice));
    } finally { setBusy(false); }
  }
  async function toggleBlock() {
    if (selDays.length === 0 || selHasOther) return;
    setBusy(true);
    try {
      if (selAllManual) {
        // 範囲に重なる手動ブロックを削除
        const ids = new Set(selDays.map((d) => manualByNight[d]).filter(Boolean));
        for (const id of ids) await deleteBlock(id);
      } else {
        const end = selEnd || selStart!;
        await addManualBlock(listingId, selStart!, addDays(end, 1), p.calendar.manualBlockNote);
      }
      await onBlocksChanged();
    } finally { setBusy(false); }
  }

  const rangeLabel = selStart ? (selEnd && selEnd !== selStart ? `${selStart} 〜 ${selEnd}・${selDays.length}${p.calendar.daysUnit}` : selStart) : "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">{p.calendar.gridTitle}</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => !atCurrentMonth && setView(new Date(year, month - 1, 1))} disabled={atCurrentMonth} className="rounded-full p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="prev">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[7rem] text-center text-sm font-semibold text-slate-700">{monthLabel}</span>
          <button type="button" onClick={() => setView(new Date(year, month + 1, 1))} className="rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="next">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mb-2 text-xs text-slate-400">{p.calendar.selectDayHint}</p>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
        {weekdays.map((w, i) => <div key={i} className="py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const past = d < today;
          const isManual = !!manualByNight[d];
          const isOther = otherBlocked.has(d);
          const blocked = isManual || isOther;
          const override = prices[d];
          const sel = inSel(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => pick(d)}
              disabled={past}
              className={[
                "flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition",
                past ? "cursor-not-allowed border-transparent text-slate-300" : "border-slate-200 hover:border-brand-400",
                sel ? "bg-brand-50 ring-2 ring-brand-500" : "",
                blocked ? "bg-slate-100 text-slate-400" : "",
              ].join(" ")}
            >
              <span className={blocked ? "line-through" : "font-semibold text-slate-700"}>{Number(d.slice(8, 10))}</span>
              {!past && !blocked && (
                <span className={`mt-0.5 text-[8px] leading-none ${override != null ? "font-bold text-brand-600" : "text-slate-400"}`}>
                  {override != null ? `¥${(override / 1000).toFixed(override % 1000 ? 1 : 0)}k` : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selStart && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-bold text-slate-700">
            <span className="mr-1 text-xs font-normal text-slate-400">{p.calendar.selectedRange}:</span>{rangeLabel}
          </p>
          {selHasOther ? (
            <p className="text-xs text-slate-500">{p.calendar.srcBooking} / {p.calendar.srcAirbnb}</p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-semibold text-slate-500">
                {p.calendar.priceOverride}
                <input type="number" min={0} value={priceInput} onChange={(e) => setPriceInput(e.target.value)} className="mt-1 block w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <button type="button" onClick={savePrice} disabled={busy} className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.calendar.savePrice}
              </button>
              <button type="button" onClick={resetPrice} disabled={busy} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">
                {p.calendar.clearOverride}
              </button>
              <button type="button" onClick={toggleBlock} disabled={busy} className={`rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50 ${selAllManual ? "border border-slate-200 bg-white text-slate-600" : "bg-rose-600 text-white"}`}>
                {selAllManual ? p.calendar.unblockDay : p.calendar.blockDay}
              </button>
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate-400">{p.calendar.baseLabel}: {formatJPY(basePrice)}</p>
        </div>
      )}
    </div>
  );
}
