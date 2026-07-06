"use client";

// =========================================================
// ゲスト→オーナー チャット開始カード。
// 名前とメールで会話を作成/取得し、ChatBoxを表示する。
// =========================================================
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import ChatBox from "./ChatBox";
import type { Conversation, Host, Listing } from "@/lib/stays/types";
import { getOrCreateConversation } from "@/lib/stays/queries";

interface Props {
  listing: Listing;
  host: Host | null;
}

export default function ContactHostCard({ listing, host }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);

  async function startChat() {
    if (!name.trim() || !email.trim()) return alert("お名前とメールを入力してください");
    setLoading(true);
    try {
      const c = await getOrCreateConversation(listing, name.trim(), email.trim());
      setConversation(c);
    } catch (e: any) {
      alert("チャットを開始できませんでした: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <MessageCircle className="h-5 w-5 text-brand-600" />
        オーナーに問い合わせる
      </h2>
      <p className="mb-3 text-sm text-slate-500">
        {host ? `${host.name} さんとチャットできます。` : "オーナーとチャットできます。"}
      </p>

      {conversation ? (
        <ChatBox conversationId={conversation.id} role="guest" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="お名前"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            onClick={startChat}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
          >
            {loading ? "準備中…" : "チャットを開始"}
          </button>
        </div>
      )}
    </section>
  );
}
