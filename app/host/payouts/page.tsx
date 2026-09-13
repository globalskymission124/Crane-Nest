"use client";

// =========================================================
// オーナー：受取（payout）ダッシュボード
//  - 収益サマリ（総受取・今月・振込済み・未振込）
//  - 予約ごとの受取明細
//  - 受取口座情報の登録（本人が入力）
//  - 振込履歴（管理者が作成した記録を閲覧）
// =========================================================
import { useEffect, useMemo, useState } from "react";
import { BadgeJapaneseYen, Wallet, Landmark, Clock, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/stays/MiniChart";
import {
  fetchAllBookings,
  fetchAllListings,
  fetchHost,
  hostScope,
  ownedListings,
  byListingIds,
} from "@/lib/stays/queries";
import { fetchPayouts, hostNetFromBooking, saveHostPayoutInfo } from "@/lib/stays/host";
import { supabase } from "@/lib/supabase";
import { useStaysSession } from "@/lib/stays/auth";
import { useHostPagesT } from "@/lib/stays/hostPagesI18n";
import { formatJPY } from "@/lib/stays/types";
import type { Booking, Host, Listing, Payout } from "@/lib/stays/types";

function isThisMonth(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function HostPayoutsPage() {
  const { session } = useStaysSession();
  const { p } = useHostPagesT();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [host, setHost] = useState<Host | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountInfo, setAccountInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const scope = hostScope(session);
    const [bk, ls] = await Promise.all([fetchAllBookings(), fetchAllListings()]);
    const myListings = ownedListings(ls, scope);
    const ids = new Set(myListings.map((l) => l.id));
    setListings(myListings);
    setBookings(scope ? byListingIds(bk, ids) : bk);

    // ホスト（口座情報）
    let h: Host | null = null;
    if (session?.host_id) h = await fetchHost(session.host_id);
    else if (myListings[0]) h = await fetchHost(myListings[0].host_id);
    else {
      const { data } = await supabase.from("stays_hosts").select("*").limit(1).maybeSingle();
      h = (data as Host) || null;
    }
    setHost(h);
    if (h) {
      setBankName(h.payout_bank_name || "");
      setAccountName(h.payout_account_name || "");
      setAccountInfo(h.payout_account_info || "");
      setPayouts(await fetchPayouts(h.id));
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [session?.host_id, session?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const listingMap = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);

  // 受取対象: 支払済み かつ キャンセルでない予約
  const earning = useMemo(
    () => bookings.filter((b) => b.status !== "cancelled" && b.payment_status === "paid"),
    [bookings]
  );
  const totalNet = useMemo(() => earning.reduce((s, b) => s + hostNetFromBooking(b), 0), [earning]);
  const monthNet = useMemo(
    () =>
      earning
        .filter((b) => isThisMonth(b.check_in) || isThisMonth(b.created_at))
        .reduce((s, b) => s + hostNetFromBooking(b), 0),
    [earning]
  );
  const paidOut = useMemo(
    () => payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0),
    [payouts]
  );
  const pending = Math.max(0, totalNet - paidOut);

  async function savePayoutInfo() {
    if (!host) return setMsg("ホストが見つかりません");
    setSaving(true);
    setMsg(null);
    try {
      await saveHostPayoutInfo(host.id, {
        bank_name: bankName,
        account_name: accountName,
        account_info: accountInfo,
      });
      setMsg(p.payouts.saveMsgOk);
    } catch (e: any) {
      setMsg(e?.message || "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="py-20 text-center text-slate-400">{p.common.loading}</p>;

  const field = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm";

  return (
    <div>
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-extrabold">
        <Wallet className="h-6 w-6 text-brand-600" /> {p.payouts.title}
      </h1>
      <p className="mb-5 text-sm text-slate-500">
        {p.payouts.subtitle}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={p.payouts.scTotal} value={formatJPY(totalNet)} sub={`${earning.length}${p.payouts.scTotalSub}`} />
        <StatCard label={p.payouts.scMonth} value={formatJPY(monthNet)} sub={p.payouts.scMonthSub} />
        <StatCard label={p.payouts.scPaid} value={formatJPY(paidOut)} sub={`${payouts.filter((x) => x.status === "paid").length}${p.payouts.scPaidSub}`} />
        <StatCard label={p.payouts.scPending} value={formatJPY(pending)} sub={p.payouts.scPendingSub} />
      </div>

      {/* 受取口座 */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <Landmark className="h-5 w-5 text-slate-500" /> {p.payouts.accountTitle}
        </h2>
        <p className="mb-3 text-xs text-slate-500">{p.payouts.accountDesc}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-500">
            {p.payouts.bankName}
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder={p.payouts.bankNamePh} className={field} />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            {p.payouts.accountName}
            <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder={p.payouts.accountNamePh} className={field} />
          </label>
          <label className="sm:col-span-2 text-xs font-semibold text-slate-500">
            {p.payouts.accountInfo}
            <input value={accountInfo} onChange={(e) => setAccountInfo(e.target.value)} placeholder={p.payouts.accountInfoPh} className={field} />
          </label>
        </div>
        {msg && <p className="mt-2 text-xs font-semibold text-brand-600">{msg}</p>}
        <button
          onClick={savePayoutInfo}
          disabled={saving}
          className="mt-3 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? p.common.loading : p.payouts.saveAccount}
        </button>
      </section>

      {/* 予約ごとの受取明細 */}
      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
          <BadgeJapaneseYen className="h-5 w-5 text-slate-500" /> {p.payouts.detailTitle}
        </h2>
        {earning.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-400">
            {p.payouts.noEarnings}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">{p.payouts.thPropertyPeriod}</th>
                  <th className="px-4 py-2 text-right font-semibold">{p.payouts.thTotal}</th>
                  <th className="px-4 py-2 text-right font-semibold">{p.payouts.thFee}</th>
                  <th className="px-4 py-2 text-right font-semibold">{p.payouts.thNet}</th>
                </tr>
              </thead>
              <tbody>
                {earning.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <div className="font-medium text-slate-700">{listingMap.get(b.listing_id)?.title || "—"}</div>
                      <div className="text-xs text-slate-400">{b.check_in} → {b.check_out}・{b.guest_name}</div>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">{formatJPY(b.total_price)}</td>
                    <td className="px-4 py-2 text-right text-slate-400">
                      -{formatJPY((b.guest_fee || 0) + (b.host_commission || 0))}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-slate-800">{formatJPY(hostNetFromBooking(b))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-bold">
                  <td className="px-4 py-2 text-right" colSpan={3}>{p.payouts.totalNet}</td>
                  <td className="px-4 py-2 text-right text-brand-700">{formatJPY(totalNet)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* 振込履歴 */}
      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
          <Clock className="h-5 w-5 text-slate-500" /> {p.payouts.historyTitle}
        </h2>
        {payouts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm text-slate-400">
            {p.payouts.noHistory}
          </p>
        ) : (
          <div className="grid gap-2">
            {payouts.map((po) => (
              <div key={po.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="flex items-center gap-1.5 font-semibold text-slate-700">
                    {po.status === "paid" ? (
                      <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {p.payouts.paid}</>
                    ) : (
                      <><Clock className="h-4 w-4 text-amber-500" /> {p.payouts.processing}</>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {po.period_start && po.period_end ? `${po.period_start} 〜 ${po.period_end}` : ""}
                    {po.note ? `・${po.note}` : ""}
                  </p>
                </div>
                <span className="text-lg font-bold text-slate-800">{formatJPY(po.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
