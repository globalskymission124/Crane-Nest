"use client";

// =========================================================
// JAPAN TRAVEL CARD（プロトタイプ v2）
//
// 来日中の旅行者が、宿のフロントでパスポートを毎回取り出さなくて済むよう、
// 宿泊者名簿に必要な情報と日本の緊急連絡先を「スクショ1枚」にまとめたカード。
//   - 代表者＋同行者を1人1枚。スワイプ / ボタンで切り替え
//   - 項目名はゲストの言語を大きく、日本語を小さく（フロントのスタッフ用）
//   - パスポート写真は透かし入り・MRZ（下部の読み取り欄）を隠して表示
//   - 緊急連絡先は色とアイコンで区別し、タップで発信（+81 形式）
//   - 公的な身分証明書ではない旨と有効期限（出国予定日 + 3日）を表示
// =========================================================

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import type { JapanTravelCardData, JapanTravelPerson } from "@/lib/stays/travelCard";
import { buildWifiQrPayload } from "@/lib/guestWifi";
import { embassyFor, MOFA_EMBASSY_LIST_URL, toInternationalDial } from "@/lib/stays/embassies";
import s from "./JapanTravelCard.module.css";

interface Props {
  data: JapanTravelCardData;
}

type Lang = "en" | "zh-Hans" | "zh-Hant" | "ko" | "ja";
type FieldKey = "name" | "pp" | "nat" | "addr" | "tel" | "mail";

const JA: Record<FieldKey, string> = { name: "氏名", pp: "旅券番号", nat: "国籍", addr: "本国住所", tel: "電話", mail: "メール" };
const EN: Record<FieldKey, string> = { name: "Name", pp: "Passport No.", nat: "Nationality", addr: "Home address", tel: "Phone", mail: "Email" };

const L: Record<Lang, Record<FieldKey, string> & Record<string, string>> = {
  en: { chip: "English", ...EN, opt: "optional", photo: "Passport photo", lead: "Lead guest", comp: "Companion", sos: "EMERGENCY",
    free: "110 · 119 · 118 free, 24h", police: "Police", fire: "Ambulance / Fire", advice: "Not sure if urgent?", coast: "At sea",
    hotline: "Visitor hotline 24h · EN/中文/한국어", embassy: "Embassy", embassyList: "Find your embassy",
    notId: "Not an official ID. Show your passport if asked.", valid: "Valid until", lost: "Lost passport: 110 → Embassy",
    hide: "Hide No.", photoBtn: "Photo", shot: "Screenshot view", back: "Back", copied: "Copied", tip: "Tap a value to copy it." },
  "zh-Hans": { chip: "简体中文", name: "姓名", pp: "护照号码", nat: "国籍", addr: "本国住址", tel: "电话", mail: "电子邮箱", opt: "选填",
    photo: "护照照片", lead: "主要入住人", comp: "同行者", sos: "紧急联系", free: "110·119·118 免费·24小时",
    police: "警察", fire: "救护车 / 消防", advice: "急救咨询", coast: "海上事故", hotline: "访日游客热线 24小时 · 中文",
    embassy: "大使馆", embassyList: "查找大使馆", notId: "本卡并非官方身份证件，如被要求请出示护照。", valid: "有效期至",
    lost: "护照遗失：110 → 大使馆", hide: "隐藏号码", photoBtn: "照片", shot: "截图模式", back: "返回", copied: "已复制", tip: "点击内容即可复制。" },
  "zh-Hant": { chip: "繁體中文", name: "姓名", pp: "護照號碼", nat: "國籍", addr: "本國地址", tel: "電話", mail: "電子郵件", opt: "選填",
    photo: "護照照片", lead: "主要住宿人", comp: "同行者", sos: "緊急聯絡", free: "110·119·118 免費·24小時",
    police: "警察", fire: "救護車 / 消防", advice: "急救諮詢", coast: "海上事故", hotline: "訪日旅客熱線 24小時 · 中文",
    embassy: "大使館", embassyList: "查詢駐日機構", notId: "本卡並非官方身分證件，如被要求請出示護照。", valid: "有效期限",
    lost: "護照遺失：110 → 大使館", hide: "隱藏號碼", photoBtn: "照片", shot: "截圖模式", back: "返回", copied: "已複製", tip: "點選內容即可複製。" },
  ko: { chip: "한국어", name: "성명", pp: "여권 번호", nat: "국적", addr: "본국 주소", tel: "전화", mail: "이메일", opt: "선택",
    photo: "여권 사진", lead: "대표자", comp: "동행자", sos: "긴급 연락처", free: "110·119·118 무료·24시간",
    police: "경찰", fire: "구급차 / 소방", advice: "구급 상담", coast: "해상 사고", hotline: "방일 외국인 핫라인 24시간 · 한국어",
    embassy: "대사관", embassyList: "대사관 찾기", notId: "공식 신분증이 아닙니다. 요청 시 여권을 제시해 주세요.", valid: "유효기간",
    lost: "여권 분실: 110 → 대사관", hide: "번호 숨기기", photoBtn: "사진", shot: "스크린샷 보기", back: "돌아가기", copied: "복사됨", tip: "값을 누르면 복사됩니다." },
  ja: { chip: "日本語", ...JA, opt: "任意", photo: "旅券写真", lead: "代表者", comp: "同行者", sos: "緊急連絡先",
    free: "110・119・118 無料・24時間", police: "警察", fire: "救急・消防", advice: "救急相談", coast: "海上の事故",
    hotline: "訪日外国人ホットライン 24時間", embassy: "大使館", embassyList: "大使館を探す",
    notId: "公的な身分証明書ではありません。求められたらパスポートを提示してください。", valid: "有効期限",
    lost: "パスポート紛失：110 → 大使館", hide: "番号を隠す", photoBtn: "写真", shot: "スクショ用表示", back: "戻る", copied: "コピーしました", tip: "値をタップするとコピーできます。" },
};
const LANGS: Lang[] = ["en", "zh-Hans", "zh-Hant", "ko", "ja"];

function detectLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const n = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
  if (/^zh-(TW|HK|MO|Hant)/i.test(n)) return "zh-Hant";
  if (/^zh/i.test(n)) return "zh-Hans";
  if (/^ko/i.test(n)) return "ko";
  return "en"; // 日本語端末はスタッフの確認用が多いので、ゲスト向けの英語を既定にする
}

const mask = (v: string) => (v.length <= 4 ? "****" : v.slice(0, 2) + "•".repeat(Math.max(v.length - 4, 2)) + v.slice(-2));

const ICON: Record<string, JSX.Element> = {
  police: <path d="M12 2 4 5v6c0 5.2 3.4 9.7 8 11 4.6-1.3 8-5.8 8-11V5z" />,
  fire: <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" />,
  advice: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2zm2.1-7.7-.9.9A3.4 3.4 0 0 0 13 13h-2v-.5a4 4 0 0 1 1.2-2.8l1.2-1.3A2 2 0 1 0 10 7H8a4 4 0 1 1 7.1 2.3z" />,
  coast: <path d="M12 2a3 3 0 0 0-1 5.8V10H8v2h3v7.9A7 7 0 0 1 5 13H3a9 9 0 0 0 18 0h-2a7 7 0 0 1-6 6.9V12h3v-2h-3V7.8A3 3 0 0 0 12 2zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />,
  hotline: <path d="M3 4h18v12H9l-6 4.5zm4 5v2h2V9zm4 0v2h2V9zm4 0v2h2V9z" />,
  embassy: <path d="M12 2 2 7v2h20V7zM4 10v8h3v-8zm6.5 0v8h3v-8zM17 10v8h3v-8zM2 19.5V22h20v-2.5z" />,
};
const PHONE_PATH =
  "M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z";

function Tile({ kind, num, href, label, wide }: { kind: string; num: string; href: string; label: React.ReactNode; wide?: boolean }) {
  const external = href.startsWith("http");
  return (
    <a
      className={`${s.t} ${s[kind]} ${wide ? s.w2 : ""}`}
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      aria-label={`${num} — call`}
    >
      <div className={s.top}>
        <span className={`${s.num} ${wide ? s.numSm : ""}`}>{num}</span>
        <span className={s.ico}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{ICON[kind]}</svg>
        </span>
      </div>
      <div className={s.what}>
        <svg className={s.call} viewBox="0 0 24 24" aria-hidden="true"><path d={PHONE_PATH} /></svg>
        <span>{label}</span>
      </div>
    </a>
  );
}

export default function JapanTravelCard({ data }: Props) {
  const [lang, setLang] = useState<Lang>("en");
  const [idx, setIdx] = useState(0);
  const [masked, setMasked] = useState(false);
  const [photoOn, setPhotoOn] = useState(true);
  const [shot, setShot] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => setLang(detectLang()), []);

  const people: JapanTravelPerson[] = useMemo(() => {
    if (data.travelers?.length) return data.travelers;
    const p = data.profile;
    return [{
      name: p.name, passportNumber: p.passportNumber, nationality: p.nationality, phone: p.phone,
      email: p.email, address: null, passportImageUrl: p.passportImageUrl, isPrimary: true,
    }];
  }, [data]);

  const t = L[lang];
  const g = people[Math.min(idx, people.length - 1)];
  const pp = g.passportNumber ? (masked ? mask(g.passportNumber) : g.passportNumber) : "";
  const embassy = embassyFor(g.nationality);
  const arrive = null as string | null; // 入国日はまだ保存していない（今後追加）
  const depart = data.departureDate ?? data.latestTransfer?.transferDate ?? null;
  const validUntil = data.validUntil ?? null;
  const wifiPayload = useMemo(() => buildWifiQrPayload(data.wifi), [data.wifi]);

  const go = (d: number) => setIdx((i) => (i + d + people.length) % people.length);

  function copy(value: string | null | undefined) {
    const v = value?.trim();
    if (!v) return;
    const done = () => {
      setToast(t.copied);
      window.setTimeout(() => setToast(null), 1400);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(v).then(done, () => undefined);
  }

  const field = (key: FieldKey, value: string | null | undefined, cls = "", wide = false, optional = false, sub?: string) => (
    <div className={`${s.f} ${wide ? s.wide : ""}`}>
      <div className={s.lab}>
        <span className={s.pri}>{t[key]}</span>
        <span>{lang === "ja" ? EN[key] : JA[key]}</span>
        {optional && <span className={s.opt}>{t.opt}</span>}
      </div>
      <button type="button" className={s.copy} onClick={() => copy(value)} aria-label={t[key]}>
        <span className={`${s.v} ${cls}`}>
          {value?.trim() ? value : "—"}
          {sub && <span className={s.sub}>{sub}</span>}
        </span>
      </button>
    </div>
  );

  const showPhoto = photoOn && Boolean(g.passportImageUrl);
  const wm = Array(9).fill(`CRANE TRAVEL CARD · HOTEL REGISTRATION ONLY${validUntil ? ` · VALID UNTIL ${validUntil}` : ""}`);

  const card = (
    <article
      className={s.card}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null || people.length < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <header className={s.hero}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/travel-card-hero-ink.webp" alt="Crane Feather International — Japan Travel Card" />
        <div className={s.heroMeta}>
          <span className={s.pill}>
            <b>{idx + 1}/{people.length}</b> {g.isPrimary ? t.lead : t.comp}
          </span>
          {(arrive || depart) && (
            <span className={s.pill}>
              {arrive && <>IN <b>{arrive.slice(5)}</b> </>}
              {depart && <>OUT <b>{depart.slice(5)}</b></>}
            </span>
          )}
        </div>
      </header>

      <div className={s.staff}>
        <span className={s.staffTag}>受付</span>
        宿泊者名簿の記入用に、パスポートの内容を転記したカードです。原本の確認が必要な場合はお申し付けください。
      </div>

      <div className={s.fields}>
        {field("name", g.name, s.vName, true)}
        {field("pp", pp, s.vPp, true)}
        {showPhoto ? (
          <div className={s.idrow}>
            <div>
              <div className={s.photo} role="img" aria-label={t.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.passportImageUrl!} alt="" />
                <div className={s.mrz}>MRZ hidden</div>
                <div className={s.wm}><p>{wm.map((line, i) => <span key={i}>{line}<br /></span>)}</p></div>
              </div>
              <div className={s.photoCap}>{t.photo} · {t.opt}</div>
            </div>
            <div className={s.stack}>
              {field("nat", g.nationality, s.vSmall)}
              {field("tel", g.phone, s.vSmall, false, true)}
            </div>
          </div>
        ) : (
          <>
            {field("nat", g.nationality, s.vSmall)}
            {field("tel", g.phone, s.vSmall, false, true)}
          </>
        )}
        {field("addr", g.address, s.vSmall, true, true)}
        {g.email ? field("mail", g.email, s.vSmall, true, true) : null}
      </div>

      <section className={s.sos} aria-label="Emergency in Japan">
        <h2 className={s.sosHead}>{t.sos} <span>{t.free}</span></h2>
        <div className={s.sosGrid}>
          <Tile kind="police" num="110" href="tel:110" label={<b>{t.police}</b>} />
          <Tile kind="fire" num="119" href="tel:119" label={<b>{t.fire}</b>} />
          <Tile kind="advice" num="#7119" href="tel:%237119" label={<b>{t.advice}</b>} />
          <Tile kind="coast" num="118" href="tel:118" label={<b>{t.coast}</b>} />
          <Tile kind="hotline" num="050-3816-2787" href="tel:+815038162787" wide label={<><b>JNTO</b> {t.hotline}</>} />
          {embassy?.tel ? (
            <Tile kind="embassy" num={embassy.tel} href={`tel:${toInternationalDial(embassy.tel)}`} wide label={<><b>{t.embassy}</b> {embassy.name}</>} />
          ) : (
            <Tile kind="embassy" num={t.embassyList} href={embassy?.url || MOFA_EMBASSY_LIST_URL} wide label={<><b>{t.embassy}</b> {embassy?.name || "MOFA list"}</>} />
          )}
        </div>
      </section>

      <footer className={s.foot}>
        <span>
          {t.notId}
          <br />
          {t.lost}
          {validUntil && <> · {t.valid} <b>{validUntil}</b></>}
        </span>
        <span className={s.tag}>EXPERIENCE JAPAN.<span>BEYOND LIMITS.</span></span>
      </footer>
    </article>
  );

  if (shot) {
    return (
      <div className={s.shot}>
        {card}
        <button type="button" className={s.exit} onClick={() => setShot(false)}>{t.back}</button>
        {toast && <div className={s.toast}>{toast}</div>}
      </div>
    );
  }

  return (
    <div className={s.root}>
      <div className={s.controls}>
        <div className={s.row} role="group" aria-label="Language">
          {LANGS.map((k) => (
            <button key={k} type="button" className={s.chip} aria-pressed={k === lang} onClick={() => setLang(k)}>
              {L[k].chip}
            </button>
          ))}
        </div>
        {people.length > 1 && (
          <div className={s.row} role="group" aria-label="Traveler">
            {people.map((p, i) => (
              <button key={i} type="button" className={s.chip} aria-pressed={i === idx} onClick={() => setIdx(i)}>
                {/* パスポート表記は「姓 名」なので、2語目（名）を出す */}
                {p.name.trim().split(/\s+/)[1] || p.name.trim().split(/\s+/)[0] || `#${i + 1}`}
              </button>
            ))}
          </div>
        )}
        <div className={s.row}>
          <button type="button" className={s.chip} aria-pressed={masked} onClick={() => setMasked((m) => !m)}>{t.hide}</button>
          {g.passportImageUrl && (
            <button type="button" className={s.chip} aria-pressed={photoOn} onClick={() => setPhotoOn((v) => !v)}>{t.photoBtn}</button>
          )}
          <span className={s.spacer} />
          <button type="button" className={s.chip} onClick={() => { setShot(true); window.scrollTo(0, 0); }}>📸 {t.shot}</button>
        </div>
        <p className={s.note}>{t.tip}</p>
      </div>

      {card}

      <div className={s.extras}>
        <div className={s.panel}>
          <div>
            <h3>鶴印帳 Tsuru-in Stamp Book</h3>
            <p>Collect a seal at every Crane Feather stay. (Prototype)</p>
          </div>
          <Link className={s.panelLink} href="/stays/tsuru-in">Open</Link>
        </div>
        <div className={s.panel}>
          <QRCodeSVG value={wifiPayload} size={72} />
          <div>
            <h3>Wi-Fi · {data.wifi.ssid}</h3>
            <p>Scan to connect (at Crane Nest).</p>
          </div>
        </div>
      </div>
      {toast && <div className={s.toast}>{toast}</div>}
    </div>
  );
}
