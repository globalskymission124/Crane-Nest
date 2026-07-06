"use client";

// =========================================================
// オーナー：物件管理（作成 / 編集 / 公開切替 / 削除）
// =========================================================
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { fetchAllListings, fetchHost } from "@/lib/stays/queries";
import { supabase } from "@/lib/supabase";
import { deleteListing, upsertListing } from "@/lib/stays/host";
import { ALL_AMENITIES, AMENITY_LABELS, CANCELLATION_POLICY_LABELS, PROPERTY_TYPE_LABELS, formatJPY } from "@/lib/stays/types";
import type { CancellationPolicy, Host, Listing, PropertyType } from "@/lib/stays/types";

const empty: Partial<Listing> = {
  title: "",
  description: "",
  address: "",
  city: "",
  country: "Japan",
  price_per_night: 10000,
  cleaning_fee: 0,
  max_guests: 2,
  bedrooms: 1,
  beds: 1,
  baths: 1,
  amenities: [],
  photos: [],
  lat: null,
  lng: null,
  is_published: true,
  instant_book: false,
  cancellation_policy: "moderate",
  property_type: "house",
  min_nights: 1,
  weekly_discount_pct: 0,
  monthly_discount_pct: 0,
};

export default function HostListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [host, setHost] = useState<Host | null>(null);
  const [editing, setEditing] = useState<Partial<Listing> | null>(null);
  const [photosText, setPhotosText] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const ls = await fetchAllListings();
    setListings(ls);
    if (ls[0]) setHost(await fetchHost(ls[0].host_id));
    else {
      const { data } = await supabase.from("stays_hosts").select("*").limit(1).maybeSingle();
      setHost((data as Host) || null);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditing({ ...empty });
    setPhotosText("");
  }
  function startEdit(l: Listing) {
    setEditing({ ...l });
    setPhotosText(l.photos.join("\n"));
  }

  function toggleAmenity(a: string) {
    setEditing((e) => {
      if (!e) return e;
      const set = new Set(e.amenities || []);
      set.has(a) ? set.delete(a) : set.add(a);
      return { ...e, amenities: Array.from(set) };
    });
  }

  async function save() {
    if (!editing) return;
    if (!editing.title?.trim()) return alert("タイトルを入力してください");
    if (!host) return alert("ホストが存在しません。シードデータを投入してください。");
    setSaving(true);
    try {
      const photos = photosText.split("\n").map((s) => s.trim()).filter(Boolean);
      await upsertListing({ ...editing, photos, host_id: editing.host_id || host.id });
      setEditing(null);
      await load();
    } catch (e: any) {
      alert("保存に失敗しました: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(l: Listing) {
    await upsertListing({ id: l.id, is_published: !l.is_published });
    setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, is_published: !x.is_published } : x)));
  }

  async function remove(l: Listing) {
    if (!confirm(`「${l.title}」を削除しますか？`)) return;
    await deleteListing(l.id);
    setListings((prev) => prev.filter((x) => x.id !== l.id));
  }

  const field = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">物件管理</h1>
        <button onClick={startNew} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> 新規物件
        </button>
      </div>

      {editing && (
        <div className="mb-6 rounded-2xl border border-brand-200 bg-white p-5">
          <h2 className="mb-3 font-bold">{editing.id ? "物件を編集" : "新規物件"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-xs font-semibold text-slate-500">タイトル
              <input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={field} />
            </label>
            <label className="sm:col-span-2 text-xs font-semibold text-slate-500">説明
              <textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">市区町村
              <input value={editing.city || ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">住所
              <input value={editing.address || ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">緯度 (lat)
              <input type="number" step="0.0001" value={editing.lat ?? ""} onChange={(e) => setEditing({ ...editing, lat: e.target.value === "" ? null : Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">経度 (lng)
              <input type="number" step="0.0001" value={editing.lng ?? ""} onChange={(e) => setEditing({ ...editing, lng: e.target.value === "" ? null : Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">1泊料金(円)
              <input type="number" value={editing.price_per_night ?? 0} onChange={(e) => setEditing({ ...editing, price_per_night: Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">清掃料(円)
              <input type="number" value={editing.cleaning_fee ?? 0} onChange={(e) => setEditing({ ...editing, cleaning_fee: Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">定員
              <input type="number" value={editing.max_guests ?? 1} onChange={(e) => setEditing({ ...editing, max_guests: Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">寝室
              <input type="number" value={editing.bedrooms ?? 1} onChange={(e) => setEditing({ ...editing, bedrooms: Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">ベッド
              <input type="number" value={editing.beds ?? 1} onChange={(e) => setEditing({ ...editing, beds: Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">バス
              <input type="number" step="0.5" value={editing.baths ?? 1} onChange={(e) => setEditing({ ...editing, baths: Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">物件タイプ
              <select value={editing.property_type || "house"} onChange={(e) => setEditing({ ...editing, property_type: e.target.value as PropertyType })} className={field}>
                {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
                  <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">キャンセルポリシー
              <select value={editing.cancellation_policy || "moderate"} onChange={(e) => setEditing({ ...editing, cancellation_policy: e.target.value as CancellationPolicy })} className={field}>
                {(Object.keys(CANCELLATION_POLICY_LABELS) as CancellationPolicy[]).map((p) => (
                  <option key={p} value={p}>{CANCELLATION_POLICY_LABELS[p]}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">最低泊数
              <input type="number" min={1} value={editing.min_nights ?? 1} onChange={(e) => setEditing({ ...editing, min_nights: Number(e.target.value) })} className={field} />
            </label>
            <label className="flex items-end gap-2 pb-2 text-xs font-semibold text-slate-500">
              <input type="checkbox" checked={editing.instant_book || false} onChange={(e) => setEditing({ ...editing, instant_book: e.target.checked })} />
              即時予約を有効にする（承認不要で自動確定）
            </label>
            <label className="text-xs font-semibold text-slate-500">週割引（7泊以上・%）
              <input type="number" min={0} max={90} value={editing.weekly_discount_pct ?? 0} onChange={(e) => setEditing({ ...editing, weekly_discount_pct: Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">月割引（28泊以上・%）
              <input type="number" min={0} max={90} value={editing.monthly_discount_pct ?? 0} onChange={(e) => setEditing({ ...editing, monthly_discount_pct: Number(e.target.value) })} className={field} />
            </label>
            <label className="sm:col-span-2 text-xs font-semibold text-slate-500">写真URL（1行に1つ）
              <textarea value={photosText} onChange={(e) => setPhotosText(e.target.value)} rows={3} placeholder="https://..." className={field} />
            </label>
          </div>

          <div className="mt-3">
            <span className="text-xs font-semibold text-slate-500">アメニティ</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {ALL_AMENITIES.map((a) => {
                const on = (editing.amenities || []).includes(a);
                return (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)} className={`rounded-full px-3 py-1 text-xs font-medium ${on ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {AMENITY_LABELS[a]}
                  </button>
                );
              })}
            </div>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => (
          <div key={l.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="aspect-[4/3] bg-slate-100">
              {l.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.photos[0]} alt={l.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-300">No Image</div>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 font-semibold">{l.title}</h3>
                {!l.is_published && <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">非公開</span>}
              </div>
              <p className="text-xs text-slate-500">{l.city}・{formatJPY(l.price_per_night)}/泊</p>
              <div className="mt-3 flex gap-1.5">
                <button onClick={() => startEdit(l)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                  <Pencil className="h-3.5 w-3.5" /> 編集
                </button>
                <button onClick={() => togglePublish(l)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                  {l.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {l.is_published ? "非公開" : "公開"}
                </button>
                <button onClick={() => remove(l)} className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
