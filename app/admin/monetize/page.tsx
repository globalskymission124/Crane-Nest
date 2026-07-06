"use client";

// =========================================================
// 管理者：収益化設定
// 料率（サービス料/成約手数料/ブースト単価）の変更、機能ON/OFF、
// プラットフォーム収益の確認、PR掲載の管理
// =========================================================
import { useEffect, useMemo, useState } from "react";
import { BadgeJapaneseYen, Percent, Rocket, Save } from "lucide-react";
import AuthGuard from "@/components/stays/AuthGuard";
import { StatCard } from "@/components/stays/MiniChart";
import { fetchAllBookings, fetchAllListings } from "@/lib/stays/queries";
import { audit, fetchPlatformSettings, isFeatured, setFeatured, updatePlatformSettings } from "@/lib/stays/v2";
import { useStaysSession } from "@/lib/stays/auth";
import { DEFAULT_PLATFORM_SETTINGS, formatJPY } from "@/lib/stays/types";
import type { Booking, Listing, PlatformSettings } from "@/lib/stays/types";

function MonetizeBody() {
  const { session } = useStaysSession();
  const [s, setS] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [st, bk, ls] = await Promise.all([fetchPlatformSettings(), fetchAllBookings(), fetchAllListings()]);
      setS(st);
      setBookings(bk);
      setListings(ls);
    })();
  }, []);

  const active = useMemo(() => bookings.filter((b) => b.status !== "cancelled"), [bookings]);
  const feeRevenue = active.reduce((sum, b) => sum + (b.guest_fee || 0), 0);
  const commissionRevenue = active.reduce((sum, b) => sum + (b.host_commission || 0), 0);
  const platformRevenue = feeRevenue + commissionRevenue;

  async function save() {
    setSaving(true);
    try {
      await updatePlatformSettings({
        guest_fee_pct: s.guest_fee_pct,
        host_commission_pct: s.host_commission_pct,
        featured_price_per_day: s.featured_price_per_day,
        enable_guest_fee: s.enable_guest_fee,
        enable_host_commission: s.enable_host_commission,
        enable_featured: s.enable_featured,
        enable_addons: s.enable_addons,
        points_earn_pct: s.points_earn_pct,
        referral_bonus_points: s.referral_bonus_points,
      });
      await audit(session?.email || "", "admin", "platform_settings.update", "", JSON.stringify(s));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert("保存に失敗しました: " + (e?.message || e) + "\n（0021マイグレーションが未適用の可能性があります）");
    } finally {
      setSaving(false);
    }
  }

  const field = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";
  const featured = listings.filter(isFeatured);

  return (
    <div className="pb-20 sm:pb-6">
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-extrabold">
        <BadgeJapaneseYen className="h-6 w-6 text-brand-600" /> 収益化設定
      </h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="プラットフォーム総収益" value={formatJPY(platformRevenue)} sub="サービス料 + 成約手数料" />
        <StatCard label="ゲストサービス料収益" value={formatJPY(feeRevenue)} sub={`${active.length}件の有効予約`} />
        <StatCard label="オーナー手数料収益" value={formatJPY(commissionRevenue)} />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
          <Percent className="h-4 w-4" /> 料率設定（保存すると即時反映）
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-xs font-semibold text-slate-500">
            ゲストサービス料（%）
            <input type="number" step="0.5" min={0} max={30} value={s.guest_fee_pct}
              onChange={(e) => setS({ ...s, guest_fee_pct: Number(e.target.value) })} className={field} />
            <span className="mt-1 flex items-center gap-1.5 text-[11px] font-normal">
              <input type="checkbox" checked={s.enable_guest_fee} onChange={(e) => setS({ ...s, enable_guest_fee: e.target.checked })} />
              有効にする
            </span>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            オーナー成約手数料（%）
            <input type="number" step="0.5" min={0} max={30} value={s.host_commission_pct}
              onChange={(e) => setS({ ...s, host_commission_pct: Number(e.target.value) })} className={field} />
            <span className="mt-1 flex items-center gap-1.5 text-[11px] font-normal">
              <input type="checkbox" checked={s.enable_host_commission} onChange={(e) => setS({ ...s, enable_host_commission: e.target.checked })} />
              有効にする
            </span>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            掲載ブースト料金（円/日）
            <input type="number" step={100} min={0} value={s.featured_price_per_day}
              onChange={(e) => setS({ ...s, featured_price_per_day: Number(e.target.value) })} className={field} />
            <span className="mt-1 flex items-center gap-1.5 text-[11px] font-normal">
              <input type="checkbox" checked={s.enable_featured} onChange={(e) => setS({ ...s, enable_featured: e.target.checked })} />
              有効にする
            </span>
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={s.enable_addons} onChange={(e) => setS({ ...s, enable_addons: e.target.checked })} />
          オプション商品（アップセル）を有効にする
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-500">
            ポイント還元率（予約額の%）
            <input type="number" step="0.5" min={0} max={20} value={s.points_earn_pct ?? 1}
              onChange={(e) => setS({ ...s, points_earn_pct: Number(e.target.value) })} className={field} />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            友達紹介ボーナス（pt / 双方に付与）
            <input type="number" step={100} min={0} value={s.referral_bonus_points ?? 500}
              onChange={(e) => setS({ ...s, referral_bonus_points: Number(e.target.value) })} className={field} />
          </label>
        </div>
        <button onClick={save} disabled={saving}
          className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "保存中…" : saved ? "保存しました ✓" : "保存"}
        </button>
      </div>

      <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-bold">
        <Rocket className="h-5 w-5 text-amber-500" /> PR掲載中の物件
      </h2>
      {featured.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-400">現在PR掲載中の物件はありません。</p>
      ) : (
        <div className="grid gap-2">
          {featured.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-semibold text-slate-800">{l.title}</p>
                <p className="text-xs text-slate-500">〜{l.featured_until} まで</p>
              </div>
              <button
                onClick={async () => {
                  if (!confirm("PR掲載を停止しますか?")) return;
                  await setFeatured(l.id, null);
                  setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, featured_until: null } : x)));
                }}
                className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600"
              >
                停止
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminMonetizePage() {
  return (
    <AuthGuard roles={["admin"]}>
      <MonetizeBody />
    </AuthGuard>
  );
}
