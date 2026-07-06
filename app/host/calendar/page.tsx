"use client";

// =========================================================
// オーナー：カレンダー & Airbnb iCal 双方向同期
//  - エクスポート: /api/stays/listings/[id]/calendar のURLをAirbnbに登録
//  - インポート:   AirbnbのiCal URLを保存し「今すぐ同期」で取り込み
//  - 手動ブロックの追加/削除
// =========================================================
import { useEffect, useState } from "react";
import { Copy, RefreshCw, Plus, Trash2, Link2 } from "lucide-react";
import { fetchAllListings, fetchBlocks } from "@/lib/stays/queries";
import { addManualBlock, deleteBlock, upsertListing } from "@/lib/stays/host";
import type { CalendarBlock, Listing } from "@/lib/stays/types";

const SOURCE_LABEL: Record<string, string> = {
  manual: "手動",
  airbnb: "Airbnb",
  booking: "サイト予約",
};
const SOURCE_STYLE: Record<string, string> = {
  manual: "bg-slate-100 text-slate-600",
  airbnb: "bg-rose-100 text-rose-600",
  booking: "bg-emerald-100 text-emerald-700",
};

export default function HostCalendarPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [icalUrl, setIcalUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetchAllListings().then((ls) => {
      setListings(ls);
      if (ls[0]) setSelectedId(ls[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const l = listings.find((x) => x.id === selectedId);
    setIcalUrl(l?.airbnb_ical_url || "");
    fetchBlocks(selectedId).then((b) =>
      setBlocks(b.sort((x, y) => x.start_date.localeCompare(y.start_date)))
    );
  }, [selectedId, listings]);

  const exportUrl = origin && selectedId ? `${origin}/api/stays/listings/${selectedId}/calendar` : "";

  async function reloadBlocks() {
    const b = await fetchBlocks(selectedId);
    setBlocks(b.sort((x, y) => x.start_date.localeCompare(y.start_date)));
  }

  async function saveIcalUrl() {
    await upsertListing({ id: selectedId, airbnb_ical_url: icalUrl || null });
    setListings((prev) => prev.map((l) => (l.id === selectedId ? { ...l, airbnb_ical_url: icalUrl } : l)));
    setSyncMsg("iCal URLを保存しました。");
  }

  async function syncNow() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/stays/listings/${selectedId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ical_url: icalUrl || undefined }),
      });
      const json = await res.json();
      if (json.ok) {
        setSyncMsg(`同期完了：追加${json.inserted}・更新${json.updated}・削除${json.removed}件`);
        await reloadBlocks();
      } else {
        setSyncMsg("同期エラー：" + json.error);
      }
    } catch (e: any) {
      setSyncMsg("同期エラー：" + (e?.message || e));
    } finally {
      setSyncing(false);
    }
  }

  async function addBlock() {
    if (!newStart || !newEnd || !(newEnd > newStart)) return alert("開始日 < 終了日で入力してください");
    await addManualBlock(selectedId, newStart, newEnd, "オーナー手動ブロック");
    setNewStart("");
    setNewEnd("");
    await reloadBlocks();
  }

  async function removeBlock(id: string) {
    await deleteBlock(id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    setSyncMsg("コピーしました。");
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">カレンダー & Airbnb同期</h1>
      <p className="mb-5 text-sm text-slate-500">
        AirbnbのiCal（.ics）と双方向で空室を同期します。
      </p>

      <label className="mb-5 block">
        <span className="text-xs font-semibold text-slate-500">物件を選択</span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </label>

      {syncMsg && (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-700">
          {syncMsg}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* エクスポート */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 flex items-center gap-2 font-bold">
            <Link2 className="h-4 w-4 text-brand-600" /> ① Airbnbへエクスポート
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            このURLをAirbnbの「カレンダーを同期 → 別のサイトを接続」に貼り付けると、当サイトの予約がAirbnbに反映されます。
          </p>
          <div className="flex items-center gap-2">
            <input readOnly value={exportUrl} className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs" />
            <button onClick={() => copy(exportUrl)} className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
              <Copy className="h-3.5 w-3.5" /> コピー
            </button>
          </div>
        </div>

        {/* インポート */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 flex items-center gap-2 font-bold">
            <RefreshCw className="h-4 w-4 text-rose-600" /> ② Airbnbからインポート
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Airbnbで発行したiCalエクスポートURL（.ics）を貼り付けて保存し、「今すぐ同期」で予約済み日を取り込みます。
          </p>
          <input
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
            placeholder="https://www.airbnb.com/calendar/ical/xxxxx.ics"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={saveIcalUrl} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
              URLを保存
            </button>
            <button
              onClick={syncNow}
              disabled={syncing || !icalUrl}
              className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} /> 今すぐ同期
            </button>
          </div>
        </div>
      </div>

      {/* ブロック一覧 + 手動追加 */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-bold">予約不可日（ブロック）</h2>
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-slate-500">
            開始
            <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            終了（排他）
            <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
          </label>
          <button onClick={addBlock} className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white">
            <Plus className="h-3.5 w-3.5" /> 手動ブロック追加
          </button>
        </div>
        {blocks.length === 0 ? (
          <p className="text-sm text-slate-400">ブロックはありません。</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {b.start_date} → {b.end_date}{" "}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${SOURCE_STYLE[b.source]}`}>
                    {SOURCE_LABEL[b.source]}
                  </span>
                  {b.summary && <span className="ml-2 text-xs text-slate-400">{b.summary}</span>}
                </span>
                {b.source !== "booking" && (
                  <button onClick={() => removeBlock(b.id)} className="text-slate-400 hover:text-rose-600" aria-label="削除">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
