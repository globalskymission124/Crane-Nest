"use client";

// =========================================================
// オーナー：全物件まとめカレンダー（Airbnbのマルチカレンダー）
//  行＝物件 / 列＝当月の各日。予約不可日を塗りつぶして一望できる。
// =========================================================
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildBlockedNights, todayStr } from "@/lib/stays/availability";
import { fetchBlocks, fetchBookings } from "@/lib/stays/queries";
import type { Listing } from "@/lib/stays/types";
import { useHostPagesT } from "@/lib/stays/hostPagesI18n";
import { getStaysLang } from "@/lib/stays/i18n";

const LOCALES: Record<string, string> = { en: "en-US", ja: "ja-JP", tw: "zh-TW", zh: "zh-CN" };

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function HostMultiCalendar({ listings }: { listings: Listing[] }) {
  const { p } = useHostPagesT();
  const locale = LOCALES[getStaysLang()] || "en-US";
  const today = todayStr();
  const [view, setView] = useState<Date>(() => {
    const d = new Date(today + "T00:00:00");
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [blockedByListing, setBlockedByListing] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(
        listings.map(async (l) => {
          const [bl, bk] = await Promise.all([fetchBlocks(l.id), fetchBookings(l.id)]);
          return [l.id, buildBlockedNights(bl, bk)] as const;
        })
      );
      if (alive) setBlockedByListing(Object.fromEntries(entries));
    })();
    return () => { alive = false; };
  }, [listings]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const monthLabel = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(view);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => ymd(year, month, i + 1)), [year, month, daysInMonth]);
  const todayDate = new Date(today + "T00:00:00");
  const atCurrentMonth = year === todayDate.getFullYear() && month === todayDate.getMonth();

  if (listings.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-bold">{p.calendar.overviewTitle}</h2>
          <p className="text-[11px] text-slate-400">{p.calendar.overviewLegend}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => !atCurrentMonth && setView(new Date(year, month - 1, 1))} disabled={atCurrentMonth} className="rounded-full p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="prev"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-[7rem] text-center text-sm font-semibold text-slate-700">{monthLabel}</span>
          <button type="button" onClick={() => setView(new Date(year, month + 1, 1))} className="rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="next"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: "2px" }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-2 text-left text-[10px] font-semibold text-slate-400"></th>
              {days.map((d) => (
                <th key={d} className="w-5 text-center text-[9px] font-semibold text-slate-400">{Number(d.slice(8, 10))}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => {
              const blocked = blockedByListing[l.id] || new Set<string>();
              return (
                <tr key={l.id}>
                  <td className="sticky left-0 z-10 max-w-[9rem] truncate bg-white pr-2 text-xs font-medium text-slate-700">{l.title}</td>
                  {days.map((d) => {
                    const past = d < today;
                    const isBlocked = blocked.has(d);
                    return (
                      <td key={d} className="p-0">
                        <div
                          title={`${l.title} ${d}`}
                          className={`h-5 w-5 rounded-sm ${past ? "bg-slate-50" : isBlocked ? "bg-rose-400" : "bg-emerald-100"}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
