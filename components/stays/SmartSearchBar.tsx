"use client";

// AI自然文検索バー: 文章で書くと条件を自動抽出してフィルターに反映
import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { parseSmartQuery, type ParsedQuery } from "@/lib/stays/smartSearch";
import { useStaysT } from "@/lib/stays/i18n";

export default function SmartSearchBar({ onParsed }: { onParsed: (p: ParsedQuery) => void }) {
  const { t } = useStaysT();
  const [text, setText] = useState("");
  const [chips, setChips] = useState<string[]>([]);

  function run() {
    if (!text.trim()) return;
    const parsed = parseSmartQuery(text);
    setChips(parsed.understood);
    onParsed(parsed);
  }

  return (
    <div className="mb-3 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-brand-600" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder={t.aiPlaceholder}
          className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-slate-400"
        />
        <button
          onClick={run}
          className="shrink-0 rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
        >
          {t.aiButton}
        </button>
      </div>
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold text-slate-400">{t.aiUnderstood}</span>
          {chips.map((c) => (
            <span key={c} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-700 shadow-sm">
              {c}
            </span>
          ))}
          <button onClick={() => setChips([])} aria-label="クリア">
            <X className="h-3 w-3 text-slate-400" />
          </button>
        </div>
      )}
    </div>
  );
}
