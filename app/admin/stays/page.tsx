"use client";

// =========================================================
// 管理者：宿泊プラットフォーム全体分析ダッシュボード
// GMV / 予約数 / 決済 / トップ物件 / 月次チャート
// =========================================================
import { useEffect, useMemo, useState } from "react";
import { BadgeJapaneseYen, BarChart3, CalendarCheck2, CreditCard, Download, Home, ScrollText } from "lucide-react";
import AuthGuard from "@/components/stays/AuthGuard";
import { BarChart, StatCard } from "@/components/stays/MiniChart";
import Link from "next/link";
import { fetchAllBookings, fetchAllListings, fetchAllReviews, averageRating } from "@/lib/stays/queries";
import { fetchAllPayments, fetchAuditLogs, fetchReports, monthlyStats } from "@/lib/stays/v2";
import { setListingModeration } from "@/lib/stays/host";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";
import { formatJPY } from "@/lib/stays/types";
import type { AuditLog, Booking, Listing, Payment, Review } from "@/lib/stays/types";

type Period = "all" | "this" | "last";

function periodBounds(period: Period): [Date, Date] | null {
  if (period === "all") return null;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === "this") return [new Date(y, m, 1), new Date(y, m + 1, 1)];
  return [new Date(y, m - 1, 1), new Date(y, m, 1)];
}
function inPeriod(dateStr: string | undefined, bounds: [Date, Date] | null): boolean {
  if (!bounds) return true;
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  return d >= bounds[0].getTime() && d < bounds[1].getTime();
}

function AdminStaysBody() {
  const { t: adminT } = useAdminTranslation();
  const s = adminT.stays;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [openReports, setOpenReports] = useState(0);
  const [period, setPeriod] = useState<Period>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [bk, ls, ps, rv, lg, rp] = await Promise.all([
        fetchAllBookings(),
        fetchAllListings(),
        fetchAllPayments(),
        fetchAllReviews(),
        fetchAuditLogs(50),
        fetchReports(),
      ]);
      setBookings(bk);
      setListings(ls);
      setPayments(ps);
      setReviews(rv);
      setLogs(lg);
      setOpenReports(rp.filter((r) => r.status === "open" || r.status === "in_review").length);
      setLoading(false);
    })();
  }, []);

  const bounds = useMemo(() => periodBounds(period), [period]);
  const active = useMemo(
    () => bookings.filter((b) => b.status !== "cancelled" && inPeriod(b.created_at, bounds)),
    [bookings, bounds]
  );
  const paymentsInPeriod = useMemo(() => payments.filter((pm) => inPeriod(pm.created_at, bounds)), [payments, bounds]);
  const gmv = active.reduce((acc, b) => acc + b.total_price, 0);
  const paidTotal = paymentsInPeriod.filter((pm) => pm.status === "paid" || pm.status === "partially_refunded").reduce((acc, pm) => acc + pm.amount - pm.refund_amount, 0);
  const refundTotal = paymentsInPeriod.reduce((acc, pm) => acc + pm.refund_amount, 0);
  const monthly = useMemo(() => monthlyStats(bookings), [bookings]);

  function exportCsv() {
    const header = ["listing", "guest", "email", "check_in", "check_out", "guests", "total", "status", "payment", "created_at"];
    const listingTitle = (id: string) => listings.find((l) => l.id === id)?.title || id;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = active.map((b) => [
      listingTitle(b.listing_id), b.guest_name, b.guest_email, b.check_in, b.check_out,
      b.guests_count, b.total_price, b.status, b.payment_status, b.created_at || "",
    ].map(esc).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stays-bookings-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

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

  const pendingListings = useMemo(() => listings.filter((l) => l.moderation_status === "pending"), [listings]);

  async function moderate(id: string, status: "approved" | "rejected") {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, moderation_status: status } : l)));
    try {
      await setListingModeration(id, status);
    } catch {
      // 失敗時は再取得で整合
      setListings(await fetchAllListings());
    }
  }

  if (loading) return <p className="py-20 text-center text-slate-400">{s.loading}</p>;

  return (
    <div className="pb-20 sm:pb-6">
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-extrabold">
        <BarChart3 className="h-6 w-6 text-brand-600" /> {s.title}
      </h1>

      {/* 運営タスク（未対応の審査・通報を集約） */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-bold text-slate-700">{s.tasksTitle}</p>
        {pendingListings.length === 0 && openReports === 0 ? (
          <p className="text-sm text-slate-500">{s.allClear}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pendingListings.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                {s.taskPending}
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">{pendingListings.length}</span>
              </span>
            )}
            {openReports > 0 && (
              <Link href="/admin/reports" className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                {s.taskReports}
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">{openReports}</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* 期間フィルタ + CSV書き出し */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {([["all", s.periodAll], ["this", s.periodThisMonth], ["last", s.periodLastMonth]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${period === key ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-500"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
          <Download className="h-3.5 w-3.5" /> {s.exportCsv}
        </button>
      </div>

      {/* 物件の審査（承認待ち） */}
      {pendingListings.length > 0 && (
        <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800">
            {s.modTitle}
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">{pendingListings.length}</span>
          </h2>
          <div className="grid gap-2">
            {pendingListings.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{l.title || s.untitled}</p>
                  <p className="text-xs text-slate-500">{l.city}・{formatJPY(l.price_per_night)}{s.perNight}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => moderate(l.id, "approved")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">{s.approve}</button>
                  <button onClick={() => moderate(l.id, "rejected")} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600">{s.reject}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={s.gmv} value={formatJPY(gmv)} sub={`${s.activeBookings} ${active.length}${s.unit}`} icon={<BadgeJapaneseYen className="h-4 w-4 text-slate-300" />} />
        <StatCard label={s.paid} value={formatJPY(paidTotal)} sub={`${s.refundLabel} ${formatJPY(refundTotal)}`} icon={<CreditCard className="h-4 w-4 text-slate-300" />} />
        <StatCard label={s.listings} value={`${listings.length}${s.unit}`} sub={`${s.publishedLabel} ${listings.filter((l) => l.is_published).length}${s.unit}`} icon={<Home className="h-4 w-4 text-slate-300" />} />
        <StatCard label={s.reviews} value={`${reviews.length}${s.unit}`} sub={`${s.avgLabel} ${averageRating(reviews).toFixed(1)}`} icon={<CalendarCheck2 className="h-4 w-4 text-slate-300" />} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-slate-700">{s.monthlyGmv}</p>
          <BarChart
            data={monthly.map((m) => ({ label: m.month.slice(5) + s.monthSuffix, value: m.revenue }))}
            format={(v) => (v >= 10000 ? `${Math.round(v / 10000)}万` : v.toLocaleString())}
          />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-slate-700">{s.monthlyBookings}</p>
          <BarChart data={monthly.map((m) => ({ label: m.month.slice(5) + s.monthSuffix, value: m.bookings }))} />
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">{s.topTitle}</h2>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">{s.thProperty}</th>
              <th className="px-4 py-3">{s.thArea}</th>
              <th className="px-4 py-3">{s.thBookings}</th>
              <th className="px-4 py-3">{s.thRevenue}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topListings.map((row) => (
              <tr key={row.listing!.id}>
                <td className="px-4 py-3 font-medium">{row.listing!.title}</td>
                <td className="px-4 py-3 text-slate-500">{row.listing!.city}</td>
                <td className="px-4 py-3">{row.count}{s.unit}</td>
                <td className="px-4 py-3 font-semibold">{formatJPY(row.revenue)}</td>
              </tr>
            ))}
            {topListings.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{s.noData}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 操作ログ（監査ログ） */}
      <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-bold">
        <ScrollText className="h-5 w-5 text-slate-500" /> {s.auditTitle}
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">{s.auditTime}</th>
              <th className="px-4 py-3">{s.auditActor}</th>
              <th className="px-4 py-3">{s.auditAction}</th>
              <th className="px-4 py-3">{s.auditDetail}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((lg) => (
              <tr key={lg.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-400">{lg.created_at?.slice(0, 16).replace("T", " ")}</td>
                <td className="px-4 py-2.5 text-xs">{lg.actor_email}<span className="ml-1 text-slate-400">({lg.actor_role})</span></td>
                <td className="px-4 py-2.5"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{lg.action}</span></td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{lg.detail}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{s.auditEmpty}</td></tr>
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
