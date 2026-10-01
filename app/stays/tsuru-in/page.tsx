"use client";

// =========================================================
// 鶴印帳（つるいんちょう）— デジタル御朱印のプロトタイプ
//
// Crane Feather 系列・提携の宿に泊まるたびに、その宿だけの朱印が1つ増え、
// 数がたまると特典がもらえる。今は見た目と体験を確かめるためのデモで、
// 宿・日付・特典はすべて仮のデータ（DB には保存しない）。
// 本番では「宿 + 日付 + 予約」に1つだけ押印できるよう、サーバー側で記録する想定。
// =========================================================

import { useState } from "react";
import { useStaysSession } from "@/lib/stays/auth";
import s from "./tsuru-in.module.css";

interface Stay {
  inn: string;
  jp: string;
  kanji: string;
  city: string;
  date: string;
  style: "double" | "square" | "dots";
}

const STAYS: Stay[] = [
  { inn: "CRANE NEST", jp: "鶴巣", kanji: "鶴", city: "Osaka", date: "2026.10.01", style: "double" },
  { inn: "CRANE FEATHER KYOTO", jp: "京", kanji: "京", city: "Kyoto", date: "2026.10.04", style: "square" },
  { inn: "CRANE FEATHER HAKONE", jp: "箱根", kanji: "湯", city: "Hakone", date: "2026.10.07", style: "dots" },
  { inn: "CRANE FEATHER KANAZAWA", jp: "金沢", kanji: "金", city: "Kanazawa", date: "2026.10.10", style: "double" },
  { inn: "CRANE FEATHER TOKYO", jp: "東京", kanji: "東", city: "Tokyo", date: "2026.10.13", style: "square" },
  { inn: "CRANE FEATHER NARA", jp: "奈良", kanji: "鹿", city: "Nara", date: "2026.10.16", style: "dots" },
  { inn: "CRANE FEATHER HIROSHIMA", jp: "広島", kanji: "宮", city: "Hiroshima", date: "2026.10.19", style: "double" },
  { inn: "CRANE FEATHER NIKKO", jp: "日光", kanji: "光", city: "Nikko", date: "2026.10.22", style: "square" },
  { inn: "CRANE FEATHER SAPPORO", jp: "札幌", kanji: "雪", city: "Sapporo", date: "2026.10.25", style: "dots" },
];
const TIERS = [
  { at: 3, what: "レイトチェックアウト無料", en: "Free late check-out" },
  { at: 5, what: "次回 10% OFF", en: "10% off next stay" },
  { at: 9, what: "1泊無料", en: "One free night" },
];
const START = 3;
const ROT = [-7, 5, -3, 8, -5, 3, -8, 6, -2];

function Seal({ stay, i }: { stay: Stay; i: number }) {
  const sq = stay.style === "square";
  const arcId = `arc${i}`;
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={`${stay.inn} ${stay.date}`} style={{ transform: `rotate(${ROT[i % 9]}deg)` }}>
      <defs>
        <path id={arcId} d="M 24 60 A 36 36 0 0 1 96 60" />
      </defs>
      <g filter="url(#tsuru-ink)" fill="currentColor">
        {sq ? (
          <>
            <rect x="14" y="14" width="92" height="92" rx="10" fill="none" stroke="currentColor" strokeWidth="5" />
            <rect x="21" y="21" width="78" height="78" rx="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <text x="60" y="35" textAnchor="middle" fontFamily="monospace" fontWeight="600" fontSize="7.5" letterSpacing="1">
              {stay.city.toUpperCase()}
            </text>
          </>
        ) : (
          <>
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="5" />
            <circle cx="60" cy="60" r={stay.style === "dots" ? 44 : 45} fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray={stay.style === "dots" ? "1.5 4" : undefined} />
            <text fontFamily="monospace" fontWeight="600" fontSize="7.5" letterSpacing="1.4">
              <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
                {stay.city.toUpperCase()} · CRANE
              </textPath>
            </text>
          </>
        )}
        <text x="60" y={sq ? 76 : 74} textAnchor="middle" fontFamily="serif" fontWeight="800" fontSize="40">
          {stay.kanji}
        </text>
        <text x="60" y={sq ? 93 : 92} textAnchor="middle" fontFamily="monospace" fontWeight="600" fontSize="7.5" letterSpacing=".6">
          {stay.date}
        </text>
        <path d={sq ? "M 36 82 h 52" : "M 34 80 h 52"} stroke="currentColor" strokeWidth="1" />
      </g>
    </svg>
  );
}

export default function TsuruInPage() {
  const { session } = useStaysSession();
  const [have, setHave] = useState(START);
  const [fresh, setFresh] = useState(-1);
  const [toast, setToast] = useState<string | null>(null);
  const max = STAYS.length;
  const nextTier = TIERS.find((t) => have < t.at);

  function checkIn() {
    if (have >= max) return;
    const i = have;
    setFresh(i);
    setHave(i + 1);
    const tier = TIERS.find((t) => t.at === i + 1);
    setToast(tier ? `🎁 特典獲得：${tier.what}` : `鶴印を押しました：${STAYS[i].jp}`);
    window.setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className={s.wrap}>
      {/* 朱肉のかすれ（印の輪郭を少し揺らし、インクのむらを出す） */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="tsuru-ink" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={1.4} result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves={1} seed={3} result="blot" />
          <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.55" result="mask" />
          <feComposite in="d" in2="mask" operator="in" />
        </filter>
      </svg>

      <p className={s.note}>
        鶴印帳のプロトタイプです。宿の名前・日付・特典は仮のものです。「チェックイン（デモ）」を押すと押印の様子が見られます。
      </p>
      <div className={s.row}>
        <button type="button" className={`${s.chip} ${s.primary}`} onClick={checkIn} disabled={have >= max}>
          🏮 チェックイン（デモ）
        </button>
        <button type="button" className={s.chip} onClick={() => { setHave(START); setFresh(-1); }}>
          最初に戻す
        </button>
      </div>

      <article className={s.book}>
        <header className={s.cover}>
          <div className={s.coverTop}>
            <h1 className={s.title}>
              鶴印帳<small>TSURU-IN STAMP BOOK</small>
            </h1>
            <div className={s.brand}>
              <b>CRANE FEATHER</b>INTERNATIONAL
            </div>
          </div>
          <div className={s.owner}>
            <div className={s.ownerName}>
              <span>TRAVELER</span>
              {(session?.name || "GUEST").toUpperCase()}
            </div>
            <div className={s.count}>
              <b>{have}</b>
              <span> / {max}</span>
              <small>STAMPS</small>
            </div>
          </div>
        </header>

        <section className={s.page} aria-label="Stamps">
          <div className={s.grid}>
            {STAYS.map((stay, i) => {
              const tier = TIERS.find((t) => t.at === i + 1);
              return (
                <div key={stay.inn} className={`${s.slot} ${i === fresh ? s.fresh : ""}`}>
                  {tier && <span className={s.reward}>🎁 {tier.at}</span>}
                  {i < have ? (
                    <div className={s.seal}><Seal stay={stay} i={i} /></div>
                  ) : (
                    <div className={`${s.seal} ${s.empty} ${i === have ? s.next : ""}`}>{i === have ? "次" : "鶴"}</div>
                  )}
                  <div className={s.cap}>
                    <b>{i < have ? stay.jp : i === have ? "Next stay" : "—"}</b>
                    <span>{i < have ? stay.date.slice(5) : " "}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={s.rewards} aria-label="Rewards">
          <h2 className={s.rewardsHead}>
            REWARDS 特典
            <span>{nextTier ? `あと ${nextTier.at - have} 泊で「${nextTier.what}」` : "全特典を獲得しました"}</span>
          </h2>
          <div className={s.bar}>
            <i className={s.fill} style={{ width: `${((have - 1) / (max - 1)) * 100}%` }} />
            {TIERS.map((t) => (
              <span key={t.at} className={`${s.dot} ${have >= t.at ? s.dotOn : ""}`} style={{ left: `${((t.at - 1) / (max - 1)) * 100}%` }} />
            ))}
          </div>
          <div className={s.tiers}>
            {TIERS.map((t) => (
              <div key={t.at} className={`${s.tier} ${have >= t.at ? s.got : ""}`}>
                <div className={s.tierN}>{t.at} 印</div>
                <div className={s.tierW}>{t.what}</div>
                <div className={s.tierS}>{have >= t.at ? "✓ 獲得 Unlocked" : t.en}</div>
              </div>
            ))}
          </div>
        </section>

        <div className={s.how}>
          <div>
            <b>集め方</b>　Crane Feather 系列・提携の宿でチェックインすると自動で押印されます。フロントのNFCタグにスマホをかざしても押せます。
          </div>
          <div>
            <b>How it works</b>　Check in at any Crane Feather stay and a new seal is added. Each seal is unique to the inn and the date.
          </div>
        </div>
      </article>
      {toast && <div className={s.toast}>{toast}</div>}
    </div>
  );
}
