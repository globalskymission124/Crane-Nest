"use client";

// =========================================================
// オーナー：分析ダッシュボード
// 売上・稼働率・ADR・レビュー平均 + 月次チャート + スマート価格提案
// =========================================================
import { useEffect, useMemo, useState } from "react";
import { BadgeJapaneseYen, BarChart3, CalendarCheck2, Lightbulb, Star, TrendingUp } from "lucide-react";
import { BarChart, StatCard } from "@/components/stays/MiniChart";
import { fetchAllListings, fetchAllReviews, fetchBlocks, fetchBookings, averageRating } from "@/lib/stays/queries";
import { upsertListing } from "@/lib/stays/host";
import { monthlyStats } from "@/lib/stays/v2";
import { suggestPrice, type PriceSuggestion } from "@/lib/stays/pricing";
import { buildBlockedNights, addDays, todayStr } from "@/lib/stays/availability";
import { formatJPY, nightsBetween } from "@/lib/stays/types";
import type { Booking, CalendarBlock, Listing, Review } from "@/lib/stays/types";

interface PerListing {
  listing: Listing;
  bookings: Booking[];
  blocks: CalendarBlock[];
  occupancy: number;
  suggestion: PriceSuggestion;
}

export default function HostAnalyticsPage() {
  const [rows, setRows] = useState<PerListing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  async function load() {
    const [listings, rv] = await Promise.all([fetchAllListings(), fetchAllReviews()]);
    setReviews(rv);
    const data = await Promise.all(
      listings.map(async (l) => {
        const [bk, bl] = await Promise.all([fetchBookings(l.id), fetchBlocks(l.id)]);
        const blocked = buildBlockedNights(bl, bk);
        let occ = 0;
        for (let i = 0; i < 30; i++) if (blocked.has(addDays(todayStr(), i))) occ++;
        return {
          listing: l,
          bookings: bk,
          blocks: bl,
          occupancy: Math.round((occ / 30) * 100),
          suggestion: suggestPrice(l, bl, bk),
        };
      })
    );
    setRows(data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const allBookings = useMemo(() => rows.flatMap((r) => r.bookings), [rows]);
  const active = useMemo(() => allBookings.filter((b) => b.status !== "cancelled"), [allBookings]);
  const totalRevenue = active.reduce((s, b) => s + b.total_price, 0);
  const totalNights = active.reduce((s, b) => s + nightsBetween(b.check_in, b.check_out), 0);
  const adr = totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0;
  const avgOcc = rows.length ? Math.round(rows.reduce((s, r) => s + r.occupancy, 0) / rows.length) : 0;
  const avgRating = averageRating(reviews);
  const monthly = useMemo(() => monthlyStats(allBookings), [allBookings]);

  async function applySuggestion(r: PerListing) {
    if (!confirm(`「${r.listing.title}」の料金を ${formatJPY(r.listing.price_per_night)} → ${formatJPY(r.suggestion.suggested)} に変更しますか?`)) return;
    setApplying(r.listing.id);
    try {
      await upsertListing({ id: r.listing.id, price_per_night: r.suggestion.suggested });
      await load();
    } finally {
      setApplying(null);
    }
  }

  if (loading) return <p className="py-20 text-center text-slate-400">読み込み中…</p>;

  return (
    <div>
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-extrabold">
        <BarChart3 className="h-6 w-6 text-brand-600" /> 分析ダッシュボード
      </h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="累計売上（有効予約）" value={formatJPY(totalRevenue)} icon={<BadgeJapaneseYen className="h-4 w-4 text-slate-300" />} />
        <StatCard label="今後30日の平均稼働率" value={`${avgOcc}%`} icon={<CalendarCheck2 className="h-4 w-4 text-slate-300" />} />
        <StatCard label="平均宿泊単価 (ADR)" value={formatJPY(adr)} icon={<TrendingUp className="h-4 w-4 text-slate-300" />} />
        <StatCard label="レビュー平均" value={avgRating ? avgRating.toFixed(1) : "—"} sub={`${reviews.length}件`} icon={<Star className="h-4 w-4 text-slate-300" />} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-slate-700">月別売上（チェックイン月ベース）</p>
          <BarChart
            data={monthly.map((m) => ({ label: m.month.slice(5) + "月", value: m.revenue }))}
            format={(v) => (v >= 10000 ? `${Math.round(v / 10000)}万` : v.toLocaleString())}
          />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-slate-700">月別予約数</p>
          <BarChart data={monthly.map((m) => ({ label: m.month.slice(5) + "月", value: m.bookings }))} />
        </div>
      </div>

      <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-bold">
        <Lightbulb className="h-5 w-5 text-amber-500" /> スマート価格提案
      </h2>
      <div className="grid gap-3">
        {rows.map((r) => {
          const diff = r.suggestion.suggested - r.listing.price_per_night;
          return (
            <div key={r.listing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{r.listing.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{r.suggestion.reason}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm">
                  <p className="text-slate-400 line-through">{formatJPY(r.listing.price_per_night)}</p>
                  <p className={`font-bold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-rose-500" : "text-slate-600"}`}>
                    {formatJPY(r.suggestion.suggested)}
                    {diff !== 0 && <span className="ml-1 text-xs">({diff > 0 ? "+" : ""}{Math.round((diff / r.listing.price_per_night) * 100)}%)</span>}
                  </p>
                </div>
                {diff !== 0 && (
                  <button
                    onClick={() => applySuggestion(r)}
                    disabled={applying === r.listing.id}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    適用
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
