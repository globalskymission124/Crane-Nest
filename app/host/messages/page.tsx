"use client";

// =========================================================
// オーナー：メッセージ受信箱（ゲストとの相互チャット）
// =========================================================
import { useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import ChatBox from "@/components/stays/ChatBox";
import { supabase } from "@/lib/supabase";
import { fetchConversations, fetchAllListings } from "@/lib/stays/queries";
import type { Conversation, Host, Listing } from "@/lib/stays/types";

export default function HostMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // シードの単一ホストを対象にする（Auth導入時はログインホストで絞る）
      const { data: host } = await supabase.from("stays_hosts").select("*").limit(1).maybeSingle();
      const [convs, ls] = await Promise.all([
        fetchConversations((host as Host)?.id),
        fetchAllListings(),
      ]);
      setConversations(convs);
      setListings(ls);
      if (convs[0]) setSelected(convs[0]);
      setLoading(false);
    })();
  }, []);

  const listingMap = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">メッセージ</h1>
      <p className="mb-5 text-sm text-slate-500">ゲストからの問い合わせに返信します。</p>

      {loading ? (
        <p className="py-16 text-center text-slate-400">読み込み中…</p>
      ) : conversations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-slate-400">
          <MessageSquare className="mx-auto mb-2 h-8 w-8" />
          まだ会話はありません。
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selected?.id === c.id ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="font-semibold text-slate-800">{c.guest_name}</p>
                <p className="text-xs text-slate-500">{listingMap.get(c.listing_id)?.title || "—"}</p>
                <p className="text-[11px] text-slate-400">{c.guest_email}</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2">
            {selected ? (
              <div>
                <div className="mb-2 rounded-xl bg-white px-4 py-3 shadow-sm">
                  <p className="font-semibold">{selected.guest_name}</p>
                  <p className="text-xs text-slate-500">{listingMap.get(selected.listing_id)?.title}</p>
                </div>
                <ChatBox conversationId={selected.id} role="host" heightClass="h-[420px]" />
              </div>
            ) : (
              <p className="py-16 text-center text-slate-400">会話を選択してください。</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
