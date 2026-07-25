"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, Search, Settings2 } from "lucide-react";
import AuthGuard from "@/components/stays/AuthGuard";
import ChatBox from "@/components/stays/ChatBox";
import { useStaysSession } from "@/lib/stays/auth";
import { fetchAllListings, fetchGuestConversations } from "@/lib/stays/queries";
import type { Conversation, Listing } from "@/lib/stays/types";

function MessagesBody() {
  const { session } = useStaysSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState("全部");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const [convs, ls] = await Promise.all([fetchGuestConversations(session.email), fetchAllListings()]);
      setConversations(convs);
      setListings(ls);
      setSelected(convs[0] || null);
      setLoading(false);
    })();
  }, [session?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const listingMap = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);
  const visible = conversations.filter((c) => {
    if (filter === "全部") return true;
    const listing = listingMap.get(c.listing_id);
    if (filter === "房源") return !!listing;
    if (filter === "用户支持") return !listing;
    return true;
  });

  if (loading) return <p className="py-20 text-center text-slate-400">読み込み中…</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between pt-4 sm:pt-0">
        <div>
          <h1 className="text-5xl font-black text-slate-950 sm:text-3xl">消息</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">预订、入住、机场接送都可以从这里继续沟通。</p>
        </div>
        <div className="flex gap-3">
          <button aria-label="検索" className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Search className="h-6 w-6" />
          </button>
          <button aria-label="設定" className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Settings2 className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="-mx-4 mb-5 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {["全部", "房源", "体验", "旅行模式", "用户支持"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`shrink-0 rounded-full px-6 py-4 text-base font-black transition sm:px-4 sm:py-2 sm:text-sm ${
              filter === tab ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white py-16 text-center shadow-sm">
          <MessageSquare className="mx-auto mb-3 h-9 w-9 text-slate-300" />
          <p className="font-black text-slate-800">还没有消息</p>
          <p className="mt-1 text-sm text-slate-500">打开房源详情，向房东发送第一条咨询。</p>
          <Link href="/stays" className="mt-5 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white">
            探索房源
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
          <div className="space-y-3">
            {visible.map((c) => {
              const listing = listingMap.get(c.listing_id);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`grid w-full grid-cols-[4.5rem_1fr_auto] items-center gap-4 rounded-[1.4rem] p-3 text-left transition ${
                    selected?.id === c.id ? "bg-rose-50 ring-2 ring-rose-200" : "bg-white shadow-sm"
                  }`}
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
                    {listing?.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listing.photos[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <MessageSquare className="m-5 h-6 w-6 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black text-slate-950 sm:text-base">{listing?.title || "用户支持"}</p>
                    <p className="truncate text-base font-semibold text-slate-500 sm:text-sm">{c.guest_name}: 继续咨询住宿细节</p>
                    <p className="truncate text-sm font-semibold text-slate-400">已确认 · {listing?.city || "Crane Nest"}</p>
                  </div>
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                </button>
              );
            })}
          </div>
          <div>
            {selected ? (
              <>
                <div className="mb-3 rounded-[1.4rem] bg-white p-4 shadow-sm">
                  <p className="text-lg font-black text-slate-950">{listingMap.get(selected.listing_id)?.title || "Crane Nest Support"}</p>
                  <p className="text-sm font-semibold text-slate-500">{selected.guest_email}</p>
                </div>
                <ChatBox conversationId={selected.id} role="guest" heightClass="h-[58vh] min-h-[22rem]" />
              </>
            ) : (
              <p className="py-20 text-center text-slate-400">请选择一个对话。</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuestMessagesPage() {
  return (
    <AuthGuard roles={["guest", "host", "admin"]}>
      <MessagesBody />
    </AuthGuard>
  );
}
