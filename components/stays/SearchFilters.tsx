"use client";

// 高度な検索フィルター（価格帯・タイプ・アメニティ・評価・即時予約・並び替え）
import { SlidersHorizontal, X, Zap } from "lucide-react";
import { useState } from "react";
import { ALL_AMENITIES, PROPERTY_TYPE_LABELS } from "@/lib/stays/types";
import { useStaysT } from "@/lib/stays/i18n";
import type { PropertyType } from "@/lib/stays/types";

export interface Filters {
  priceMin: number | null;
  priceMax: number | null;
  propertyTypes: PropertyType[];
  amenities: string[];
  minRating: number;
  instantOnly: boolean;
  sort: "recommended" | "price_asc" | "price_desc" | "rating";
}

export const DEFAULT_FILTERS: Filters = {
  priceMin: null,
  priceMax: null,
  propertyTypes: [],
  amenities: [],
  minRating: 0,
  instantOnly: false,
  sort: "recommended",
};

export function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.priceMin != null || f.priceMax != null) n++;
  if (f.propertyTypes.length) n++;
  if (f.amenities.length) n++;
  if (f.minRating > 0) n++;
  if (f.instantOnly) n++;
  return n;
}

export default function SearchFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useStaysT();
  const active = countActiveFilters(filters);

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            active > 0 ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t.filters}{active > 0 ? ` (${active})` : ""}
        </button>
        <select
          value={filters.sort}
          onChange={(e) => set({ sort: e.target.value as Filters["sort"] })}
          className="rounded-full border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none"
        >
          <option value="recommended">{t.sortRecommended}</option>
          <option value="price_asc">{t.sortPriceAsc}</option>
          <option value="price_desc">{t.sortPriceDesc}</option>
          <option value="rating">{t.sortRating}</option>
        </select>
      </div>

      {open && (
        <div className="absolute left-0 top-10 z-30 w-[min(92vw,26rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">{t.filters}</p>
            <div className="flex gap-2">
              <button onClick={() => onChange(DEFAULT_FILTERS)} className="text-xs text-slate-400 underline">
                {t.reset}
              </button>
              <button onClick={() => setOpen(false)} aria-label="閉じる">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500">{t.priceRange}</p>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              placeholder={t.priceMin}
              value={filters.priceMin ?? ""}
              onChange={(e) => set({ priceMin: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
            <span className="text-slate-400">〜</span>
            <input
              type="number"
              placeholder={t.priceMax}
              value={filters.priceMax ?? ""}
              onChange={(e) => set({ priceMax: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </div>

          <p className="mt-3 text-xs font-semibold text-slate-500">{t.propertyType}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((pt) => {
              const on = filters.propertyTypes.includes(pt);
              return (
                <button
                  key={pt}
                  onClick={() =>
                    set({
                      propertyTypes: on
                        ? filters.propertyTypes.filter((x) => x !== pt)
                        : [...filters.propertyTypes, pt],
                    })
                  }
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    on ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  {t.ptype[pt]}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs font-semibold text-slate-500">{t.amenities}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ALL_AMENITIES.map((a) => {
              const on = filters.amenities.includes(a);
              return (
                <button
                  key={a}
                  onClick={() =>
                    set({ amenities: on ? filters.amenities.filter((x) => x !== a) : [...filters.amenities, a] })
                  }
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    on ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  {t.amenity[a] || a}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span>{t.rating}</span>
              <select
                value={filters.minRating}
                onChange={(e) => set({ minRating: Number(e.target.value) })}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
              >
                <option value={0}>{t.ratingAny}</option>
                <option value={3}>3.0+</option>
                <option value={4}>4.0+</option>
                <option value={4.5}>4.5+</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={filters.instantOnly}
                onChange={(e) => set({ instantOnly: e.target.checked })}
              />
              <Zap className="h-3.5 w-3.5 text-amber-500" /> {t.instantOnly}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
