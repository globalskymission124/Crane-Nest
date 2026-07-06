"use client";

// =========================================================
// 管理者：宿泊プラットフォーム全体分析ダッシュボード
// GMV / 予約数 / 決済 / トップ物件 / 月次チャート
// =========================================================
import { useEffect, useMemo, useState } from "react";
import { BadgeJapaneseYen, BarChart3, CalendarCheck2, CreditCard, Home } from "lucide-react";
import AuthGuard from "@/components/stays/AuthGuard";
import { BarChart, StatCard } from "@/components/stays/MiniChart";
import { fetchAllBookings, fetchAllListings, fetchAllReviews, averageRating } from "@/lib/stays/queries";
import { fetchAllPayments, monthlyStats } from "@/lib/stays/v2";
import { formatJPY } from "@/lib/stays/types";
import type { Booking, Listing, Payment, Review } from "@/lib/stays/types";

function AdminStaysBody() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [bk, ls, ps, rv] = await Promise.all([
        fetchAllBookings(),
        fetchAllListings(),
        fetchAllPayments(),
        fetchAllReviews(),
      ]);
      setBookings(bk);
      setListings(ls);
      setPayments(ps);
      setReviews(rv);
      setLoading(false);
    })();
  }, []);

  const active = useMemo(() => bookings.filter((b) => b.status !== "cancelled"), [bookings]);
  const gmv = active.reduce((s, b) => s + b.total_price, 0);
  const paidTotal = payments.filter((p) => p.status === "paid" || p.status === "partially_refunded").reduce((s, p) => s + p.amount - p.refund_amount, 0);
  const refundTotal = payments.reduce((s, p) => s + p.refund_amount, 0);
  const monthly = useMemo(() => monthlyStats(bookings), [bookings]);

  const topListings = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>();
    for (const b of active) {
      const cur = map.get(b.listing_id) || { revenue: 0, count: 0 };
      cur.revenue += b.total_price;
      cur.count += 1;
      map.set(b.listing_id, cur);
    }
    return [...map.entries()]
      .map(([id, v]) => ({ listing: listings.find((l) => l.id === id), ...v }))
      .filter((x) => x.listing)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [active, listings]);

  if (loading) return <p className="py-20 text-center text-slate-400">読み込み中…</p>;

  return (
    <div className="pb-20 sm:pb-6">
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-extrabold">
        <BarChart3 className="h-6 w-6 text-brand-600" /> 宿泊プラットフォーム分析
      </h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="流通総額 (GMV)" value={formatJPY(gmv)} sub={`有効予約 ${active.length}件`} icon={<BadgeJapaneseYen className="h-4 w-4 text-slate-300" />} />
        <StatCard label="決済済み金額（返金控除後）" value={formatJPY(paidTotal)} sub={`返金 ${formatJPY(refundTotal)}`} icon={<CreditCard className="h-4 w-4 text-slate-300" />} />
        <StatCard label="掲載物件" value={`${listings.length}件`} sub={`公開中 ${listings.filter((l) => l.is_published).length}件`} icon={<Home className="h-4 w-4 text-slate-300" />} />
        <StatCard label="レビュー" value={`${reviews.length}件`} sub={`平均 ${averageRating(reviews).toFixed(1)}`} icon={<CalendarCheck2 className="h-4 w-4 text-slate-300" />} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-slate-700">月別GMV</p>
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

      <h2 className="mb-3 mt-8 text-lg font-bold">売上トップ物件</h2>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">物件</th>
              <th className="px-4 py-3">エリア</th>
              <th className="px-4 py-3">予約数</th>
              <th className="px-4 py-3">売上</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topListings.map((t) => (
              <tr key={t.listing!.id}>
                <td className="px-4 py-3 font-medium">{t.listing!.title}</td>
                <td className="px-4 py-3 text-slate-500">{t.listing!.city}</td>
                <td className="px-4 py-3">{t.count}件</td>
                <td className="px-4 py-3 font-semibold">{formatJPY(t.revenue)}</td>
              </tr>
            ))}
            {topListings.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">データがありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminStaysPage() {
  return (
    <AuthGuard roles={["admin"]}>
      <AdminStaysBody />
    </AuthGuard>
  );
}
