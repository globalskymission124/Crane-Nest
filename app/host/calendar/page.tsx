"use client";

// =========================================================
// オーナー：カレンダー & Airbnb iCal 双方向同期
//  - エクスポート: /api/stays/listings/[id]/calendar のURLをAirbnbに登録
//  - インポート:   AirbnbのiCal URLを保存し「今すぐ同期」で取り込み
//  - 手動ブロックの追加/削除
// =========================================================
import { useEffect, useState } from "react";
import { Copy, RefreshCw, Plus, Trash2, Link2 } from "lucide-react";
import { fetchAllListings, fetchBlocks, hostScope, ownedListings } from "@/lib/stays/queries";
import { addManualBlock, deleteBlock, upsertListing } from "@/lib/stays/host";
import HostCalendarEditor from "@/components/stays/HostCalendarEditor";
import { useStaysSession } from "@/lib/stays/auth";
import { useHostPagesT } from "@/lib/stays/hostPagesI18n";
import type { CalendarBlock, Listing } from "@/lib/stays/types";

const SOURCE_STYLE: Record<string, string> = {
  manual: "bg-slate-100 text-slate-600",
  airbnb: "bg-rose-100 text-rose-600",
  booking: "bg-emerald-100 text-emerald-700",
};

export default function HostCalendarPage() {
  const { session } = useStaysSession();
  const { p } = useHostPagesT();
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
    fetchAllListings().then((all) => {
      const ls = ownedListings(all, hostScope(session)); // 自分の物件のみ
      setListings(ls);
      if (ls[0]) setSelectedId(ls[0].id);
    });
  }, [session?.host_id, session?.role]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setSyncMsg(p.calendar.urlSaved);
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
    await addManualBlock(selectedId, newStart, newEnd, p.calendar.manualBlockNote);
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
    setSyncMsg(p.calendar.copied);
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">{p.calendar.title}</h1>
      <p className="mb-5 text-sm text-slate-500">
        {p.calendar.subtitle}
      </p>

      <label className="mb-5 block">
        <span className="text-xs font-semibold text-slate-500">{p.calendar.selectListing}</span>
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
            <Link2 className="h-4 w-4 text-brand-600" /> {p.calendar.exportTitle}
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            {p.calendar.exportDesc}
          </p>
          <div className="flex items-center gap-2">
            <input readOnly value={exportUrl} className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs" />
            <button onClick={() => copy(exportUrl)} className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
              <Copy className="h-3.5 w-3.5" /> {p.calendar.copy}
            </button>
          </div>
        </div>

        {/* インポート */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 flex items-center gap-2 font-bold">
            <RefreshCw className="h-4 w-4 text-rose-600" /> {p.calendar.importTitle}
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            {p.calendar.importDesc}
          </p>
          <input
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
            placeholder="https://www.airbnb.com/calendar/ical/xxxxx.ics"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={saveIcalUrl} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
              {p.calendar.saveUrl}
            </button>
            <button
              onClick={syncNow}
              disabled={syncing || !icalUrl}
              className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} /> {p.calendar.syncNow}
            </button>
          </div>
        </div>
      </div>

      {/* 料金・空室の日別編集カレンダー */}
      {selectedId && (
        <div className="mt-6">
          <HostCalendarEditor
            listingId={selectedId}
            basePrice={listings.find((x) => x.id === selectedId)?.price_per_night ?? 0}
            blocks={blocks}
            onBlocksChanged={reloadBlocks}
          />
        </div>
      )}

      {/* ブロック一覧 + 手動追加 */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-bold">{p.calendar.blocksTitle}</h2>
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-slate-500">
            {p.calendar.start}
            <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            {p.calendar.endExclusive}
            <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
          </label>
          <button onClick={addBlock} className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white">
            <Plus className="h-3.5 w-3.5" /> {p.calendar.addBlock}
          </button>
        </div>
        {blocks.length === 0 ? (
          <p className="text-sm text-slate-400">{p.calendar.noBlocks}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {b.start_date} → {b.end_date}{" "}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${SOURCE_STYLE[b.source]}`}>
                    {b.source === "manual" ? p.calendar.srcManual : b.source === "airbnb" ? p.calendar.srcAirbnb : p.calendar.srcBooking}
                  </span>
                  {b.summary && <span className="ml-2 text-xs text-slate-400">{b.summary}</span>}
                </span>
                {b.source !== "booking" && (
                  <button onClick={() => removeBlock(b.id)} className="text-slate-400 hover:text-rose-600" aria-label={p.common.delete}>
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
