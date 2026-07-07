"use client";

// =========================================================
// オーナー：予約ダッシュボード
// =========================================================
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Check, X, Clock, QrCode, Rocket, Tag } from "lucide-react";
import { fetchAllBookings, fetchAllListings } from "@/lib/stays/queries";
import { updateBookingStatus } from "@/lib/stays/host";
import { notify, audit } from "@/lib/stays/v2";
import { useStaysSession } from "@/lib/stays/auth";
import { formatJPY } from "@/lib/stays/types";
import type { Booking, BookingStatus, Listing } from "@/lib/stays/types";

const PAY_BADGE: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "未払い", cls: "bg-slate-100 text-slate-500" },
  paid: { label: "支払済", cls: "bg-emerald-100 text-emerald-700" },
  refunded: { label: "返金済", cls: "bg-sky-100 text-sky-700" },
  partially_refunded: { label: "一部返金", cls: "bg-sky-100 text-sky-700" },
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "承認待ち",
  confirmed: "確定",
  cancelled: "キャンセル",
  completed: "完了",
};
const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-200 text-slate-500",
  completed: "bg-blue-100 text-blue-700",
};

export default function HostBookingsPage() {
  const { session } = useStaysSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");

  async function load() {
    const [bk, ls] = await Promise.all([fetchAllBookings(), fetchAllListings()]);
    setBookings(bk);
    setListings(ls);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const listingMap = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);
  const filtered = bookings.filter((b) => filter === "all" || b.status === filter);

  async function setStatus(b: Booking, status: BookingStatus) {
    await updateBookingStatus(b.id, status);
    const title = listingMap.get(b.listing_id)?.title || "宿";
    await notify(
      b.guest_email,
      status === "confirmed" ? "予約が承認されました" : status === "completed" ? "ご宿泊ありがとうございました" : "予約がキャンセルされました",
      `${title}（${b.check_in}〜${b.check_out}）`,
      "/stays/trips"
    );
    await audit(session?.email || "host", session?.role || "host", `booking.${status}`, b.id, title);
    setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, status } : x)));
  }

  // 今日やることが一目でわかるサマリー（行動を促す設計）
  const today = new Date().toISOString().slice(0, 10);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const todayCheckins = bookings.filter((b) => b.status === "confirmed" && b.check_in === today);
  const unpaidConfirmed = bookings.filter((b) => b.status === "confirmed" && b.payment_status === "unpaid").length;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">おかえりなさい 👋</h1>
      <p className="mb-4 text-sm text-slate-500">今日の状況とやることをまとめました。</p>

      {/* 今日のサマリー */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <button onClick={() => setFilter("pending")} className={`rounded-2xl border p-4 text-left transition hover:shadow-md ${pendingCount > 0 ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <p className="text-2xl font-extrabold text-slate-900">{pendingCount}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">承認待ち{pendingCount > 0 && " ←要対応"}</p>
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-extrabold text-slate-900">{todayCheckins.length}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">本日チェックイン</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-extrabold text-slate-900">{unpaidConfirmed}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">確定・未払い</p>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ["/host/checkin", QrCode, "パスポートQR"],
          ["/host/analytics", BarChart3, "売上を見る"],
          ["/host/promotions", Tag, "クーポン発行"],
          ["/host/listings", Rocket, "掲載ブースト"],
        ] as const).map(([href, Icon, label]) => (
          <Link key={href} href={href} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-700">
            <Icon className="h-3.5 w-3.5" /> {label}
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"
            }`}
          >
            {f === "all" ? "すべて" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-slate-400">読み込み中…</p>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-slate-400">予約はありません。</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">物件</th>
                <th className="px-4 py-3">ゲスト</th>
                <th className="px-4 py-3">日程</th>
                <th className="px-4 py-3">人数</th>
                <th className="px-4 py-3">料金</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium">{listingMap.get(b.listing_id)?.title || "—"}</td>
                  <td className="px-4 py-3">
                    <div>{b.guest_name}</div>
                    <div className="text-xs text-slate-400">{b.guest_email}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {b.check_in}
                    <br />→ {b.check_out}
                  </td>
                  <td className="px-4 py-3">{b.guests_count}名</td>
                  <td className="px-4 py-3 font-semibold">{formatJPY(b.total_price)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>
                      {STATUS_LABEL[b.status]}
                    </span>
                    <span className={`ml-1 rounded-full px-2 py-1 text-[10px] font-semibold ${(PAY_BADGE[b.payment_status] || PAY_BADGE.unpaid).cls}`}>
                      {(PAY_BADGE[b.payment_status] || PAY_BADGE.unpaid).label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {b.status === "pending" && (
                        <button
                          onClick={() => setStatus(b, "confirmed")}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                        >
                          <Check className="h-3.5 w-3.5" /> 承認
                        </button>
                      )}
                      {b.status === "confirmed" && (
                        <button
                          onClick={() => setStatus(b, "completed")}
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                        >
                          <Clock className="h-3.5 w-3.5" /> 完了
                        </button>
                      )}
                      {b.status !== "cancelled" && b.status !== "completed" && (
                        <button
                          onClick={() => setStatus(b, "cancelled")}
                          className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" /> 取消
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
