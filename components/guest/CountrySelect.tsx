"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { COMMON, COUNTRIES, countryName, flagOf, cityToCountry, editDistance, fromText, searchKey } from "@/lib/countries";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import GlobeCanvas from "./GlobeCanvas";

// =========================================================
// 国籍の選択 (パスポート登録)。いろんな国の人が迷わず選べるように:
//  - 国旗 + その人の言語の国名。下に英語名
//  - 検索: どの言語の国名でも (台湾 / Taiwan / 台灣 / 대만)、3 文字コード (TWN)、国番号 (+886) でも
//  - いちばん上に「あなたの国では？」(パスポートの読み取り・電話番号から自動で選んだもの)
//  - よく来る国 → すべての国 (A-Z)
//  - 地球儀: 指で回して国を押しても選べる。検索すると一番目の国へ地球が回る。入力欄の横の小さい地球は選んだ国へ回って光る
// =========================================================

const L: Record<string, { label: string; choose: string; search: string; suggested: string; common: string; all: string; none: string; auto: string; close: string; hint: string; set: string }> = {
  ja: { label: "国籍", choose: "国籍を選んでください", search: "国名・コード・国番号で検索", suggested: "あなたの国では？", common: "よく選ばれる国", all: "すべての国", none: "見つかりません", auto: "自動で選びました（違えば変更してください）", close: "閉じる", hint: "地球を回して国を押す・または下で検索", set: "この国にする" },
  en: { label: "Nationality", choose: "Select your nationality", search: "Search country, code or +dial code", suggested: "Is this your country?", common: "Popular", all: "All countries", none: "No match", auto: "Selected automatically — change it if wrong", close: "Close", hint: "Spin the globe and tap your country · or search below", set: "Choose this country" },
  zh: { label: "国籍", choose: "请选择国籍", search: "搜索国家名称、代码或区号", suggested: "这是您的国家吗？", common: "常用", all: "全部国家/地区", none: "没有找到", auto: "已自动选择（如有误请修改）", close: "关闭", hint: "转动地球点击国家・或在下方搜索", set: "选这个国家" },
  ko: { label: "국적", choose: "국적을 선택해 주세요", search: "국가명·코드·국가번호로 검색", suggested: "이 나라가 맞나요?", common: "자주 선택", all: "모든 국가", none: "찾을 수 없어요", auto: "자동으로 선택했어요 (다르면 바꿔 주세요)", close: "닫기", hint: "지구를 돌려 나라를 누르거나 아래에서 검색", set: "이 나라로" },
  es: { label: "Nacionalidad", choose: "Elige tu nacionalidad", search: "Buscar país, código o prefijo", suggested: "¿Es tu país?", common: "Frecuentes", all: "Todos los países", none: "Sin resultados", auto: "Seleccionado automáticamente — cámbialo si no es correcto", close: "Cerrar", hint: "Gira el globo y toca tu país · o busca abajo", set: "Elegir este país" },
  fr: { label: "Nationalité", choose: "Choisissez votre nationalité", search: "Pays, code ou indicatif", suggested: "Est-ce votre pays ?", common: "Fréquents", all: "Tous les pays", none: "Aucun résultat", auto: "Choisi automatiquement — modifiez si besoin", close: "Fermer", hint: "Faites tourner le globe et touchez votre pays · ou cherchez", set: "Choisir ce pays" },
};
// 検索に使う言葉 (どの言語の国名でも見つかるように)
const SEARCH_LOCALES = ["en", "ja", "zh", "zh-TW", "ko", "es", "fr", "de", "it", "pt", "th", "vi", "id", "ru"];
const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\s.\-'’()]/g, "");

interface Props {
  value: string | null;
  onChange: (a2: string) => void;
  /** 自動で選んだ国 (パスポート・電話番号) */
  suggested?: string | null;
  /** 自動で選んだので、確かめてもらう一言を出す */
  autoPicked?: boolean;
  required?: boolean;
}

export default function CountrySelect({ value, onChange, suggested, autoPicked, required }: Props) {
  const { locale } = useTranslation();
  const t = L[locale] ?? L.en;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  /** 地球で押した国 (まだ決めていない) */
  const [pending, setPending] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 探しやすいように、国ごとに「いろんな言語の国名 + コード + 国番号」をまとめておく
  const index = useMemo(() => COUNTRIES.map((c) => ({
    c,
    name: countryName(c.a2, locale),
    en: countryName(c.a2, "en"),
    key: norm([c.a2, c.a3, `+${c.tel}`, c.tel, ...SEARCH_LOCALES.map((l) => countryName(c.a2, l))].join("|")),
    names: [...new Set(SEARCH_LOCALES.map((l) => searchKey(countryName(c.a2, l))))],
  })).sort((a, b) => a.name.localeCompare(b.name, locale === "zh" ? "zh-CN" : locale)), [locale]);

  useEffect(() => {
    if (!open) return;
    const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    // 地球を見てもらうため、検索欄に自動でカーソルは入れない (キーボードで地球が隠れる)
    return () => { document.body.style.overflow = o; };
  }, [open]);

  const nq = norm(q);
  /* 予測: ① 名前・コードの完全一致 → ② 名前の頭が合う → ③ 途中に含む → ④ 都市名 (Taipei → 台湾) → ⑤ 少しの打ちまちがい (Taiwna → Taiwan) */
  const hits = useMemo(() => {
    if (!nq) return index;
    const k = searchKey(q), sc = new Map<string, number>();
    const put = (a2: string, v: number) => { if (!sc.has(a2) || sc.get(a2)! > v) sc.set(a2, v); };
    for (const x of index) {
      if (x.c.a2.toLowerCase() === k || x.c.a3.toLowerCase() === k || `+${x.c.tel}` === nq || x.names.includes(k)) put(x.c.a2, 0);
      else if (x.names.some((n) => n.startsWith(k))) put(x.c.a2, 1);
      else if (x.key.includes(nq)) put(x.c.a2, 2);
    }
    const city = cityToCountry(q) ?? (k.length >= 4 ? fromText(q) : null); if (city) put(city, 0.5);
    if (k.length >= 4 && sc.size < 3) for (const x of index) { const d = Math.min(...x.names.map((n) => editDistance(k, n.slice(0, Math.max(k.length, Math.min(n.length, k.length + 1))), k.length >= 7 ? 2 : 1))); if (d <= (k.length >= 7 ? 2 : 1)) put(x.c.a2, 3 + d); }
    return index.filter((x) => sc.has(x.c.a2)).sort((a, b) => sc.get(a.c.a2)! - sc.get(b.c.a2)!);
  }, [nq, q, index]);
  const common = COMMON.map((a2) => index.find((x) => x.c.a2 === a2)).filter(Boolean) as typeof index;
  const sug = suggested ? index.find((x) => x.c.a2 === suggested) : null;
  const cur = value ? index.find((x) => x.c.a2 === value) : null;

  const pick = (a2: string) => { onChange(a2); setOpen(false); setQ(""); setPending(null); };
  // 地球に出す国: 地球で押した国 → 検索の一番目 → いま選んでいる国
  const globeSel = pending ?? (nq && hits[0] ? hits[0].c.a2 : value);
  const pend = pending ? index.find((x) => x.c.a2 === pending) : null;
  const Row = ({ x, big }: { x: (typeof index)[number]; big?: boolean }) => (
    <button type="button" onClick={() => pick(x.c.a2)}
      className={`flex w-full items-center gap-3 rounded-xl px-3 text-left transition active:bg-brand-50 ${big ? "py-3" : "py-2.5"} ${value === x.c.a2 ? "bg-brand-50" : ""}`}>
      <span className={big ? "text-3xl" : "text-2xl"}>{flagOf(x.c.a2)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800">{x.name}</span>
        {x.en !== x.name && <span className="block truncate text-xs text-slate-400">{x.en}</span>}
      </span>
      <span className="text-xs text-slate-400">+{x.c.tel}</span>
      {value === x.c.a2 && <Check className="h-4 w-4 text-brand-600" />}
    </button>
  );

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">{t.label}{required && <span className="ml-0.5 text-red-500">*</span>}</span>
      <button type="button" onClick={() => setOpen(true)}
        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 ${cur ? "border-slate-300" : "border-amber-300 bg-amber-50/50"}`}>
        <span className="-my-1 -ml-1 h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#071a36]"><GlobeCanvas value={value} locale={locale} className="h-11 w-11" /></span>
        {cur && <span className="text-xl">{flagOf(cur.c.a2)}</span>}
        <span className={`min-w-0 flex-1 truncate ${cur ? "font-semibold text-slate-800" : "text-slate-400"}`}>
          {cur ? `${cur.name}${cur.en !== cur.name ? ` · ${cur.en}` : ""}` : t.choose}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {cur && autoPicked && <span className="text-[11px] text-emerald-600">✓ {t.auto}</span>}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={() => { setOpen(false); setPending(null); }}>
          <div className="mt-auto flex max-h-[88vh] flex-col rounded-t-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <p className="text-base font-bold">{t.label}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label={t.close} className="rounded-full p-1.5 text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            {/* 地球儀: 回して国を押す */}
            <div className="relative mx-4 mb-2 overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_45%,#0d2a52,#020a18_75%)]">
              <GlobeCanvas big value={globeSel} locale={locale} onPick={(a2) => setPending(a2)} className="h-[min(36vh,300px)] w-full" />
              <div className="absolute inset-x-0 bottom-0 flex min-h-[48px] items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-4">
                {pend ? (
                  <>
                    <span className="text-2xl">{flagOf(pend.c.a2)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{pend.name}{pend.en !== pend.name ? <span className="ml-1 text-xs font-normal text-white/60">{pend.en}</span> : null}</span>
                    <button type="button" onClick={() => pick(pend.c.a2)} className="shrink-0 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 active:bg-amber-300">{t.set}</button>
                  </>
                ) : (
                  <span className="w-full text-center text-[11px] text-sky-100/80">🌏 {t.hint}</span>
                )}
              </div>
            </div>
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setPending(null); }} placeholder={t.search}
                  onKeyDown={(e) => { if (e.key === "Enter" && hits[0] && nq) { e.preventDefault(); pick(hits[0].c.a2); } }}
                  className="w-full bg-transparent py-3 text-base outline-none" autoComplete="off" autoCorrect="off" spellCheck={false} />
                {q && <button type="button" onClick={() => setQ("")} className="text-slate-400"><X className="h-4 w-4" /></button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {nq ? (
                hits.length ? hits.map((x, i) => <Row key={x.c.a2} x={x} big={i === 0} />) : <p className="py-8 text-center text-sm text-slate-400">{t.none}</p>
              ) : (
                <>
                  {sug && (<><p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-brand-600">{t.suggested}</p><Row x={sug} big /></>)}
                  <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t.common}</p>
                  {common.map((x) => <Row key={"c" + x.c.a2} x={x} />)}
                  <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t.all}</p>
                  {index.map((x) => <Row key={x.c.a2} x={x} />)}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
