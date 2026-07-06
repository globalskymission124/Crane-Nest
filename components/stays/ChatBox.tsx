"use client";

// =========================================================
// ゲスト⇔オーナー 相互チャット（共通コンポーネント）。
// 数秒間隔のポーリングで簡易リアルタイム表示。
// =========================================================
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { Message, SenderRole } from "@/lib/stays/types";
import { fetchMessages, sendMessage } from "@/lib/stays/queries";

interface Props {
  conversationId: string;
  role: SenderRole; // 自分の立場
  heightClass?: string;
}

export default function ChatBox({ conversationId, role, heightClass = "h-72" }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const m = await fetchMessages(conversationId);
      setMessages(m);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(conversationId, role, body);
      setMessages((prev) => [...prev, msg]);
      setText("");
    } catch {
      alert("送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white">
      <div ref={scrollRef} className={`${heightClass} overflow-y-auto p-3 space-y-2`}>
        {messages.length === 0 && (
          <p className="pt-8 text-center text-sm text-slate-400">
            まだメッセージはありません。最初のメッセージを送ってみましょう。
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_role === role;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-brand-600 text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}
              >
                <div className="mb-0.5 text-[10px] opacity-70">
                  {m.sender_role === "host" ? "オーナー" : "ゲスト"}
                </div>
                {m.body}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-slate-100 p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="メッセージを入力…"
          className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white disabled:opacity-40"
          aria-label="送信"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
