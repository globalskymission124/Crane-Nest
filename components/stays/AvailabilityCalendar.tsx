"use client";

// =========================================================
// 空室カレンダー（Airbnb風）
//  予約不可日（他予約・オーナーブロック・過去日）をグレーアウトし、
//  チェックイン→チェックアウトの範囲選択を行う。多言語対応。
// =========================================================
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, todayStr } from "@/lib/stays/availability";
import { useStaysT, type StaysLang } from "@/lib/stays/i18n";

const LOCALES: Record<StaysLang, string> = { en: "en-US", ja: "ja-JP", tw: "zh-TW", zh: "zh-CN" };

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function AvailabilityCalendar({
  blockedNights,
  checkIn,
  checkOut,
  onChange,
}: {
  blockedNights: Set<string>;
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
}) {
  const { t, lang } = useStaysT();
  const locale = LOCALES[lang] || "en-US";
  const today = todayStr();

  const thisMonthFirst = useMemo(() => {
    const d = new Date(today + "T00:00:00");
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [today]);
  const [view, setView] = useState<Date>(thisMonthFirst);

  const year = view.getFullYear();
  const month = view.getMonth();
  const monthLabel = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(view);
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(Date.UTC(2023, 0, 1 + i)))
      ),
    [locale]
  );

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(ymd(year, month, d));

  function rangeHasBlocked(a: string, b: string): boolean {
    for (let d = a; d < b; d = addDays(d, 1)) if (blockedNights.has(d)) return true;
    return false;
  }
  function pick(dateStr: string) {
    if (dateStr < today || blockedNights.has(dateStr)) return;
    if (!checkIn || (checkIn && checkOut)) return onChange(dateStr, "");
    if (dateStr <= checkIn) return onChange(dateStr, "");
    if (rangeHasBlocked(checkIn, dateStr)) return onChange(dateStr, "");
    onChange(checkIn, dateStr);
  }

  const atCurrentMonth = year === thisMonthFirst.getFullYear() && month === thisMonthFirst.getMonth();
  const inRange = (d: string) => !!checkIn && !!checkOut && d >= checkIn && d <= checkOut;
  const isEnd = (d: string) => d === checkIn || d === checkOut;

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => !atCurrentMonth && setView(new Date(year, month - 1, 1))}
          disabled={atCurrentMonth}
          className="rounded-full p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          aria-label="prev month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-slate-700">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
          aria-label="next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-slate-400">
        {weekdays.map((w, i) => (
          <div key={i} className="py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const disabled = d < today || blockedNights.has(d);
          const selected = isEnd(d);
          const between = inRange(d) && !selected;
          return (
            <button
              key={d}
              type="button"
              onClick={() => pick(d)}
              disabled={disabled}
              className={[
                "aspect-square rounded-md text-xs transition",
                disabled ? "cursor-not-allowed text-slate-300 line-through" : "text-slate-700 hover:bg-brand-100",
                selected ? "bg-brand-600 font-bold text-white hover:bg-brand-600" : "",
                between ? "bg-brand-50 text-brand-700" : "",
              ].join(" ")}
            >
              {Number(d.slice(8, 10))}
            </button>
          );
        })}
      </div>

      {(checkIn || checkOut) && (
        <button
          type="button"
          onClick={() => onChange("", "")}
          className="mt-2 text-[11px] font-semibold text-slate-400 underline"
        >
          {t.clearDates}
        </button>
      )}
    </div>
  );
}
