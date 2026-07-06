"use client";

// =========================================================
// オーナー：クーポン / プロモーション管理
// =========================================================
import { useEffect, useState } from "react";
import { Plus, Tag, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { fetchAllListings } from "@/lib/stays/queries";
import { deleteCoupon, fetchCoupons, upsertCoupon, audit } from "@/lib/stays/v2";
import { useStaysSession } from "@/lib/stays/auth";
import { formatJPY } from "@/lib/stays/types";
import type { Coupon, Listing } from "@/lib/stays/types";

const emptyCoupon: Partial<Coupon> = {
  code: "",
  discount_type: "percent",
  value: 10,
  valid_from: null,
  valid_to: null,
  max_uses: null,
  is_active: true,
  listing_id: null,
};

export default function HostPromotionsPage() {
  const { session } = useStaysSession();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [cs, ls] = await Promise.all([fetchCoupons(), fetchAllListings()]);
    setCoupons(cs);
    setListings(ls);
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing?.code?.trim()) return alert("クーポンコードを入力してください");
    if (!editing.value || editing.value <= 0) return alert("割引値を入力してください");
    if (editing.discount_type === "percent" && editing.value > 100) return alert("割引率は100%以下にしてください");
    setSaving(true);
    try {
      const hostId = session?.host_id || listings[0]?.host_id || null;
      await upsertCoupon({
        ...editing,
        code: editing.code.trim().toUpperCase(),
        host_id: editing.host_id !== undefined ? editing.host_id : hostId,
      });
      await audit(session?.email || "", session?.role || "host", editing.id ? "coupon.update" : "coupon.create", editing.code || "");
      setEditing(null);
      await load();
    } catch (e: any) {
      alert("保存に失敗しました: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: Coupon) {
    await upsertCoupon({ id: c.id, is_active: !c.is_active });
    setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: !x.is_active } : x)));
  }

  async function remove(c: Coupon) {
    if (!confirm(`クーポン「${c.code}」を削除しますか?`)) return;
    await deleteCoupon(c.id);
    setCoupons((prev) => prev.filter((x) => x.id !== c.id));
  }

  const field = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <Tag className="h-6 w-6 text-brand-600" /> クーポン管理
        </h1>
        <button
          onClick={() => setEditing({ ...emptyCoupon })}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> 新規クーポン
        </button>
      </div>

      {editing && (
        <div className="mb-6 rounded-2xl border border-brand-200 bg-white p-5">
          <h2 className="mb-3 font-bold">{editing.id ? "クーポンを編集" : "新規クーポン"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-500">コード
              <input value={editing.code || ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="SUMMER20" className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">対象物件
              <select
                value={editing.listing_id || ""}
                onChange={(e) => setEditing({ ...editing, listing_id: e.target.value || null })}
                className={field}
              >
                <option value="">すべての物件</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">割引タイプ
              <select
                value={editing.discount_type}
                onChange={(e) => setEditing({ ...editing, discount_type: e.target.value as Coupon["discount_type"] })}
                className={field}
              >
                <option value="percent">％割引</option>
                <option value="fixed">定額割引（円）</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">{editing.discount_type === "percent" ? "割引率（%）" : "割引額（円）"}
              <input type="number" value={editing.value ?? ""} onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">有効開始日
              <input type="date" value={editing.valid_from || ""} onChange={(e) => setEditing({ ...editing, valid_from: e.target.value || null })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">有効終了日
              <input type="date" value={editing.valid_to || ""} onChange={(e) => setEditing({ ...editing, valid_to: e.target.value || null })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">利用上限回数（空欄=無制限）
              <input type="number" value={editing.max_uses ?? ""} onChange={(e) => setEditing({ ...editing, max_uses: e.target.value ? Number(e.target.value) : null })} className={field} />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "保存中…" : "保存"}
            </button>
            <button onClick={() => setEditing(null)} className="rounded-lg bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-600">
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {coupons.length === 0 && <p className="py-10 text-center text-slate-400">クーポンはまだありません。</p>}
        {coupons.map((c) => {
          const target = c.listing_id ? listings.find((l) => l.id === c.listing_id)?.title || "物件" : c.host_id ? "自分の全物件" : "サイト全体";
          return (
            <div key={c.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 ${c.is_active ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
              <div>
                <p className="font-mono text-lg font-extrabold tracking-wide text-slate-800">{c.code}</p>
                <p className="text-xs text-slate-500">
                  {c.discount_type === "percent" ? `${c.value}% OFF` : `${formatJPY(c.value)} OFF`}・{target}
                  {c.valid_to && `・〜${c.valid_to}`}
                  ・利用 {c.used_count}{c.max_uses != null && ` / ${c.max_uses}`}回
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(c)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {c.is_active ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4" />}
                  {c.is_active ? "有効" : "無効"}
                </button>
                <button onClick={() => setEditing({ ...c })} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  編集
                </button>
                <button onClick={() => remove(c)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
