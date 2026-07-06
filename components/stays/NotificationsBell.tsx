"use client";

// アプリ内通知ベル（20秒ポーリング）
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useStaysSession } from "@/lib/stays/auth";
import { fetchNotifications, markNotificationsRead } from "@/lib/stays/v2";
import type { Notification } from "@/lib/stays/types";

export default function NotificationsBell() {
  const { session } = useStaysSession();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) {
      setItems([]);
      return;
    }
    let alive = true;
    const load = async () => {
      const n = await fetchNotifications(session.email);
      if (alive) setItems(n);
    };
    load();
    const t = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [session?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  if (!session) return null;
  const unread = items.filter((n) => !n.is_read).length;

  async function toggle() {
    setOpen((o) => !o);
    if (!open && unread > 0 && session) {
      await markNotificationsRead(session.email);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative rounded-full p-2 hover:bg-slate-100" aria-label="通知">
        <Bell className="h-4 w-4 text-slate-600" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-40 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <p className="px-3 py-2 text-xs font-bold text-slate-500">通知</p>
          {items.length === 0 && <p className="px-3 pb-3 text-sm text-slate-400">通知はありません</p>}
          <div className="max-h-80 overflow-y-auto">
            {items.map((n) =>
              n.link ? (
                <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-slate-50">
                  <p className="text-sm font-semibold text-slate-700">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.body}</p>
                </Link>
              ) : (
                <div key={n.id} className="rounded-xl px-3 py-2">
                  <p className="text-sm font-semibold text-slate-700">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.body}</p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
