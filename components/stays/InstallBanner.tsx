"use client";

// アプリインストール誘導バナー
// Android/Chrome: beforeinstallprompt でワンタップインストール
// iOS/Safari: 「ホーム画面に追加」の手順を案内
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const KEY = "stays_install_dismissed";

export default function InstallBanner() {
  const [deferred, setDeferred] = useState<any>(null);
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (standalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari判定
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua)) {
      setShowIos(true);
      setVisible(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  return (
    <div className="fixed bottom-3 left-1/2 z-40 w-[min(94vw,26rem)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
      <div className="flex items-center gap-3">
        <img src="/icon.png" alt="" className="h-10 w-10 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800">Crane Nest をアプリで使う</p>
          {showIos ? (
            <p className="text-[11px] text-slate-500">
              <Share className="inline h-3 w-3" /> 共有 → 「ホーム画面に追加」でインストール
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">ホーム画面から1タップで予約・旅程確認</p>
          )}
        </div>
        {!showIos && deferred && (
          <button onClick={install} className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">
            <Download className="h-3.5 w-3.5" /> 追加
          </button>
        )}
        <button onClick={dismiss} aria-label="閉じる" className="shrink-0 p-1">
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
