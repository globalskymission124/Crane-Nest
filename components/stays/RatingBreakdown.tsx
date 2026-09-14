"use client";

// =========================================================
// レビューのカテゴリ別評価バー（Airbnb風の評価内訳）
//  清潔さ / 正確さ / チェックイン / コスパ を平均してバー表示。
// =========================================================
import { Star } from "lucide-react";
import type { Review } from "@/lib/stays/types";
import { useStaysT } from "@/lib/stays/i18n";

function avg(nums: number[]): number | null {
  const v = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
  return v.length ? v.reduce((s, n) => s + n, 0) / v.length : null;
}

export default function RatingBreakdown({ reviews }: { reviews: Review[] }) {
  const { t } = useStaysT();
  const visible = reviews.filter((r) => !r.is_hidden);
  if (visible.length < 1) return null;

  const cats: { label: string; value: number | null }[] = [
    { label: t.catCleanliness, value: avg(visible.map((r) => r.rating_cleanliness ?? NaN)) },
    { label: t.catAccuracy, value: avg(visible.map((r) => r.rating_accuracy ?? NaN)) },
    { label: t.catCheckin, value: avg(visible.map((r) => r.rating_checkin ?? NaN)) },
    { label: t.catValue, value: avg(visible.map((r) => r.rating_value ?? NaN)) },
  ].filter((c) => c.value != null);

  if (cats.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-700">
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {t.ratingBreakdown}
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {cats.map((c) => (
          <div key={c.label} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs text-slate-500">{c.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-800" style={{ width: `${((c.value as number) / 5) * 100}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">{(c.value as number).toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
