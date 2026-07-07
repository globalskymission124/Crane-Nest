"use client";

// =========================================================
// オーナー: パスポート登録ページ管理
//  ページ作成・編集 → QRポスター印刷 → 登録ゲスト一覧 → CSVダウンロード
// =========================================================
import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Download, ExternalLink, Pencil, Plus, Printer, QrCode, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  deleteCheckinPage,
  fetchCheckinGuests,
  fetchCheckinPages,
  genSlug,
  guestsToCsv,
  upsertCheckinPage,
  type CheckinGuest,
  type CheckinPage,
} from "@/lib/stays/checkin";
import { useStaysSession } from "@/lib/stays/auth";
import { audit } from "@/lib/stays/v2";

export default function HostCheckinPage() {
  const { session } = useStaysSession();
  const [hostId, setHostId] = useState<string | null>(null);
  const [pages, setPages] = useState<CheckinPage[]>([]);
  const [guests, setGuests] = useState<CheckinGuest[]>([]);
  const [editing, setEditing] = useState<Partial<CheckinPage> | null>(null);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    (async () => {
      // ログインユーザーのhost_id、無ければ最初のホスト（デモ）
      let hid = session?.host_id || null;
      if (!hid) {
        const { data } = await supabase.from("stays_hosts").select("id").limit(1).maybeSingle();
        hid = (data as any)?.id || null;
      }
      setHostId(hid);
      if (hid) {
        const [ps, gs] = await Promise.all([fetchCheckinPages(hid), fetchCheckinGuests(hid)]);
        setPages(ps);
        setGuests(gs);
      }
    })();
  }, [session?.host_id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!editing || !hostId) return;
    if (!editing.title?.trim()) return alert("タイトルを入力してください");
    setSaving(true);
    try {
      const saved = await upsertCheckinPage({
        ...editing,
        host_id: hostId,
        slug: editing.slug || genSlug(editing.title),
      });
      setPages((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
      });
      await audit(session?.email || "", session?.role || "host", editing.id ? "checkin_page.update" : "checkin_page.create", saved.id, saved.slug);
      setEditing(null);
    } catch (e: any) {
      alert("保存に失敗しました: " + (e?.message || e) + "\n（0024マイグレーション未適用の可能性があります）");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: CheckinPage) {
    const saved = await upsertCheckinPage({ id: p.id, is_active: !p.is_active });
    setPages((prev) => prev.map((x) => (x.id === p.id ? saved : x)));
  }

  async function remove(p: CheckinPage) {
    if (!confirm(`「${p.title}」を削除しますか？（登録済みゲスト情報も削除されます）`)) return;
    await deleteCheckinPage(p.id);
    setPages((prev) => prev.filter((x) => x.id !== p.id));
  }

  function downloadCsv() {
    const csv = guestsToCsv(guests);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `checkin-guests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const field = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <QrCode className="h-6 w-6 text-brand-600" /> パスポート登録ページ
        </h1>
        <button
          onClick={() => setEditing({ title: "Guest Check-in", welcome_message: "", require_phone: true, require_photo: true, is_active: true })}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> ページを作成
        </button>
      </div>
      <p className="mb-5 text-sm text-slate-500">
        自分専用のパスポート登録ページを作り、QRポスターを印刷して宿に掲示。ゲストがスキャンして登録した情報をCSVでダウンロードできます。
      </p>

      {editing && (
        <div className="mb-6 rounded-2xl border border-brand-200 bg-white p-5">
          <h2 className="mb-3 font-bold">{editing.id ? "ページを編集" : "新規ページ"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-500">ページタイトル（ゲストに表示）
              <input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Crane Nest Osaka — Check-in" className={field} />
            </label>
            <label className="text-xs font-semibold text-slate-500">URL名（半角英数・空欄で自動生成）
              <input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="osaka-house" className={`${field} font-mono`} />
            </label>
            <label className="sm:col-span-2 text-xs font-semibold text-slate-500">ウェルカムメッセージ（英語推奨・任意）
              <textarea value={editing.welcome_message || ""} onChange={(e) => setEditing({ ...editing, welcome_message: e.target.value })} rows={2} placeholder="Welcome! Please register your passport before check-in." className={field} />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={editing.require_phone ?? true} onChange={(e) => setEditing({ ...editing, require_phone: e.target.checked })} />
              電話番号を必須にする
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={editing.require_photo ?? true} onChange={(e) => setEditing({ ...editing, require_photo: e.target.checked })} />
              パスポート写真を必須にする
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

      <div className="grid gap-4 sm:grid-cols-2">
        {pages.length === 0 && !editing && (
          <p className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            まだページがありません。「ページを作成」から1分で作れます。
          </p>
        )}
        {pages.map((p) => (
          <div key={p.id} className={`rounded-2xl border bg-white p-5 ${p.is_active ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-800">{p.title}</p>
                <p className="mt-0.5 truncate font-mono text-xs text-slate-400">/checkin/{p.slug}</p>
              </div>
              <div className="shrink-0 rounded-xl border border-slate-100 p-1.5">
                {origin && <QRCodeSVG value={`${origin}/checkin/${p.slug}`} size={72} />}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Link href={`/checkin/${p.slug}/poster`} target="_blank" className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                <Printer className="h-3.5 w-3.5" /> QRポスター印刷
              </Link>
              <Link href={`/checkin/${p.slug}`} target="_blank" className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <ExternalLink className="h-3.5 w-3.5" /> プレビュー
              </Link>
              <button onClick={() => setEditing({ ...p })} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <Pencil className="h-3.5 w-3.5" /> 編集
              </button>
              <button onClick={() => toggle(p)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {p.is_active ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4" />}
                {p.is_active ? "公開中" : "停止中"}
              </button>
              <button onClick={() => remove(p)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 登録ゲスト一覧 */}
      <div className="mb-3 mt-10 flex items-center justify-between">
        <h2 className="text-lg font-bold">登録されたゲスト（{guests.length}件）</h2>
        <button
          onClick={downloadCsv}
          disabled={guests.length === 0}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          <Download className="h-4 w-4" /> CSVダウンロード
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">登録日時</th>
              <th className="px-4 py-3">氏名</th>
              <th className="px-4 py-3">旅券番号</th>
              <th className="px-4 py-3">国籍</th>
              <th className="px-4 py-3">電話</th>
              <th className="px-4 py-3">C/I日</th>
              <th className="px-4 py-3">写真</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {guests.map((g) => (
              <tr key={g.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-400">{g.created_at?.slice(0, 16).replace("T", " ")}</td>
                <td className="px-4 py-2.5 font-medium">{g.full_name}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{g.passport_number}</td>
                <td className="px-4 py-2.5">{g.nationality}</td>
                <td className="px-4 py-2.5 text-xs">{g.phone || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{g.checkin_date || "—"}</td>
                <td className="px-4 py-2.5">
                  {g.passport_image_url ? (
                    <a href={g.passport_image_url} target="_blank" className="text-xs font-semibold text-brand-600 underline">表示</a>
                  ) : "—"}
                </td>
              </tr>
            ))}
            {guests.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">まだ登録はありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
