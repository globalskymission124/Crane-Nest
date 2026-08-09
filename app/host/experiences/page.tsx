"use client";

// =========================================================
// オーナー：体験（Experiences）管理（作成/編集/公開切替/削除 + 予約管理）
// ログイン中オーナーの体験のみを対象（マルチテナント）。
// =========================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, ImagePlus, X, Star, Loader2, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchHost, hostScope } from "@/lib/stays/queries";
import { uploadListingPhoto } from "@/lib/stays/image";
import { useStaysSession } from "@/lib/stays/auth";
import { notify } from "@/lib/stays/v2";
import {
  fetchAllExperiences,
  upsertExperience,
  deleteExperience,
  fetchExperienceBookingsForHost,
  updateExperienceBookingStatus,
} from "@/lib/stays/experiences";
import {
  EXPERIENCE_CATEGORY_LABELS,
  formatJPY,
  type Experience,
  type ExperienceBooking,
  type ExperienceCategory,
  type Host,
} from "@/lib/stays/types";

const empty: Partial<Experience> = {
  title: "",
  description: "",
  category: "food",
  city: "",
  meeting_point: "",
  lat: null,
  lng: null,
  price_per_person: 5000,
  currency: "JPY",
  duration_minutes: 120,
  max_guests: 8,
  photos: [],
  is_published: true,
};

const STATUS_LABEL: Record<ExperienceBooking["status"], { label: string; cls: string }> = {
  pending: { label: "承認待ち", cls: "bg-amber-50 text-amber-700" },
  confirmed: { label: "確定", cls: "bg-emerald-50 text-emerald-700" },
  completed: { label: "実施済み", cls: "bg-slate-100 text-slate-600" },
  cancelled: { label: "キャンセル", cls: "bg-rose-50 text-rose-600" },
};

export default function HostExperiencesPage() {
  const { session } = useStaysSession();
  const [items, setItems] = useState<Experience[]>([]);
  const [bookings, setBookings] = useState<ExperienceBooking[]>([]);
  const [host, setHost] = useState<Host | null>(null);
  const [editing, setEditing] = useState<Partial<Experience> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  async function load() {
    const scope = hostScope(session);
    const all = await fetchAllExperiences();
    const mine = scope ? all.filter((e) => e.host_id === scope) : all;
    setItems(mine);
    setBookings(await fetchExperienceBookingsForHost(mine.map((e) => e.id)));
    if (session?.host_id) setHost(await fetchHost(session.host_id));
    else if (mine[0]) setHost(await fetchHost(mine[0].host_id));
    else {
      const { data } = await supabase.from("stays_hosts").select("*").limit(1).maybeSingle();
      setHost((data as Host) || null);
    }
  }
  useEffect(() => {
    load();
  }, [session?.host_id, session?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const expMap = useMemo(() => new Map(items.map((e) => [e.id, e])), [items]);

  function setPhotos(next: string[]) {
    setEditing((e) => (e ? { ...e, photos: next } : e));
  }
  async function addPhotoFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of list) {
        try {
          urls.push(await uploadListingPhoto(f));
        } catch (e: any) {
          alert(`「${f.name}」のアップロードに失敗: ${e?.message || e}`);
        }
      }
      if (urls.length) setPhotos([...(editing?.photos || []), ...urls]);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!editing) return;
    if (!editing.title?.trim()) return alert("タイトルを入力してください");
    if (!host) return alert("ホストが存在しません。オーナー登録を先に行ってください。");
    setSaving(true);
    try {
      const photos = (editing.photos || []).map((s) => s.trim()).filter(Boolean);
      await upsertExperience({ ...editing, photos, host_id: editing.host_id || session?.host_id || host.id });
      setEditing(null);
      await load();
    } catch (e: any) {
      alert("保存に失敗しました: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(e: Experience) {
    await upsertExperience({ id: e.id, is_published: !e.is_published });
    await load();
  }
  async function remove(e: Experience) {
    if (!confirm(`「${e.title}」を削除しますか?`)) return;
    await deleteExperience(e.id);
    await load();
  }
  async function setBookingStatus(b: ExperienceBooking, status: ExperienceBooking["status"]) {
    await updateExperienceBookingStatus(b.id, status);
    const title = expMap.get(b.experience_id)?.title || "体験";
    await notify(
      b.guest_email,
      status === "confirmed" ? "体験予約が承認されました" : status === "completed" ? "ご参加ありがとうございました" : "体験予約がキャンセルされました",
      `${title}（${b.date} ${b.time || ""}）`,
      "/stays/experiences"
    );
    setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, status } : x)));
  }

  const field = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm";
  const pending = bookings.filter((b) => b.status === "pending");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">体験の管理</h1>
        {!editing && (
          <button onClick={() => setEditing({ ...empty })} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> 体験を追加
          </button>
        )}
      </div>

      {/* 編集フォーム */}
      {editing && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-xs font-semibold text-slate-500">タイトル
              <input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={field} />
            </label>
            <label className="sm:col-span-2 text-xs font-semibold text-slate-500">説明
              <textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={4} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">カテゴリ
              <select value={editing.category || "food"} onChange={(e) => setEditing({ ...editing, category: e.target.value as ExperienceCategory })} className={field}>
                {(Object.keys(EXPERIENCE_CATEGORY_LABELS) as ExperienceCategory[]).map((c) => (
                  <option key={c} value={c}>{EXPERIENCE_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">都市
              <input value={editing.city || ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">1名あたり料金（円）
              <input type="number" min={0} value={editing.price_per_person ?? 0} onChange={(e) => setEditing({ ...editing, price_per_person: Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">所要時間（分）
              <input type="number" min={30} step={30} value={editing.duration_minutes ?? 120} onChange={(e) => setEditing({ ...editing, duration_minutes: Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">最大人数
              <input type="number" min={1} value={editing.max_guests ?? 8} onChange={(e) => setEditing({ ...editing, max_guests: Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">集合場所
              <input value={editing.meeting_point || ""} onChange={(e) => setEditing({ ...editing, meeting_point: e.target.value })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">緯度（任意）
              <input type="number" value={editing.lat ?? ""} onChange={(e) => setEditing({ ...editing, lat: e.target.value === "" ? null : Number(e.target.value) })} className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">経度（任意）
              <input type="number" value={editing.lng ?? ""} onChange={(e) => setEditing({ ...editing, lng: e.target.value === "" ? null : Number(e.target.value) })} className={field} />
            </label>
          </div>

          {/* 写真 */}
          <div className="mt-3">
            <span className="text-xs font-semibold text-slate-500">写真</span>
            <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) addPhotoFiles(e.target.files); e.target.value = ""; }} />
            <div
              role="button"
              tabIndex={0}
              onClick={() => photoRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) addPhotoFiles(e.dataTransfer.files); }}
              className={`mt-1 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed py-5 text-sm transition ${dragOver ? "border-brand-500 bg-brand-50 text-brand-600" : "border-slate-300 text-slate-500 hover:bg-slate-50"}`}
            >
              {uploading ? (<><Loader2 className="h-5 w-5 animate-spin" /> アップロード中…</>) : (<><ImagePlus className="h-5 w-5" /> ドラッグ、またはクリックして写真を選択</>)}
            </div>
            {(editing.photos || []).length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {(editing.photos || []).map((url, i) => (
                  <div key={`${url}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-bold text-white"><Star className="h-2.5 w-2.5 fill-white" /> カバー</span>}
                    <button type="button" onClick={() => setPhotos((editing.photos || []).filter((_, k) => k !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100" aria-label="削除"><X className="h-3.5 w-3.5" /></button>
                    {i !== 0 && <button type="button" onClick={() => { const p = [...(editing.photos || [])]; const [pic] = p.splice(i, 1); setPhotos([pic, ...p]); }} className="absolute inset-x-1 bottom-1 rounded-md bg-white/90 py-0.5 text-[10px] font-semibold text-slate-700 opacity-0 transition group-hover:opacity-100">カバーにする</button>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={save} disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "保存中…" : "保存"}</button>
            <button onClick={() => setEditing(null)} className="rounded-lg bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-600">キャンセル</button>
          </div>
        </div>
      )}

      {/* 体験一覧 */}
      <div className="grid gap-3">
        {items.length === 0 && !editing && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-sm text-slate-400">まだ体験がありません。「体験を追加」から作成できます。</p>
        )}
        {items.map((e) => (
          <div key={e.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="hidden h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:block">
              {e.photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.photos[0]} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">{e.title}</span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">{EXPERIENCE_CATEGORY_LABELS[e.category]}</span>
                {!e.is_published && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">非公開</span>}
              </div>
              <p className="mt-1 text-xs text-slate-500">{e.city}・{formatJPY(e.price_per_person)}/名・最大{e.max_guests}名</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => setEditing({ ...e })} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /> 編集</button>
                <button onClick={() => togglePublish(e)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">{e.is_published ? <><EyeOff className="h-3.5 w-3.5" /> 非公開に</> : <><Eye className="h-3.5 w-3.5" /> 公開する</>}</button>
                <button onClick={() => remove(e)} className="flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> 削除</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 予約リクエスト */}
      <section className="mt-8">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
          <CalendarDays className="h-5 w-5 text-slate-500" /> 体験の予約
          {pending.length > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{pending.length}件 承認待ち</span>}
        </h2>
        {bookings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm text-slate-400">予約リクエストはまだありません。</p>
        ) : (
          <div className="grid gap-2">
            {bookings.map((b) => {
              const st = STATUS_LABEL[b.status];
              return (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{expMap.get(b.experience_id)?.title || "体験"}</p>
                    <p className="text-xs text-slate-500">{b.date} {b.time || ""}・{b.guests_count}名・{b.guest_name}・{formatJPY(b.total_price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                    {b.status === "pending" && (
                      <>
                        <button onClick={() => setBookingStatus(b, "confirmed")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">承認</button>
                        <button onClick={() => setBookingStatus(b, "cancelled")} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600">却下</button>
                      </>
                    )}
                    {b.status === "confirmed" && (
                      <button onClick={() => setBookingStatus(b, "completed")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">実施済みにする</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
