"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Anchor,
  BadgeCheck,
  CalendarDays,
  Camera,
  Copy,
  Download,
  Eye,
  EyeOff,
  Flame,
  Hotel,
  IdCard,
  Languages,
  LockKeyhole,
  MapPin,
  Phone,
  Plane,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
  X,
} from "lucide-react";
import type { ComponentType } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { JapanTravelCardData } from "@/lib/stays/travelCard";
import { maskPassportNumber } from "@/lib/stays/travelCard";
import { buildWifiQrPayload } from "@/lib/guestWifi";

interface Props {
  data: JapanTravelCardData;
}

function valueOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text || "-";
}

function copyText(value: string | null | undefined, onCopied: (label: string) => void, label: string) {
  const text = value?.trim();
  if (!text || typeof navigator === "undefined" || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(() => {
    onCopied(label);
  });
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

// 日本の緊急連絡先。番号は総務省・観光庁(JNTO)の公式情報に基づく。
// 番号は全言語共通。ラベルのみ言語切替する（カード内蔵トグル）。
// dial はタップ発信用（ハイフンなし）、number は表示用。
type EmergencyKey = "police" | "fire" | "coast" | "hotline";

const EMERGENCY_CONTACTS: {
  key: EmergencyKey;
  icon: ComponentType<{ className?: string }>;
  number: string;
  dial: string;
  accent: string; // アイコン背景色
}[] = [
  { key: "police", icon: ShieldAlert, number: "110", dial: "110", accent: "bg-red-600" },
  { key: "fire", icon: Flame, number: "119", dial: "119", accent: "bg-orange-600" },
  { key: "coast", icon: Anchor, number: "118", dial: "118", accent: "bg-sky-600" },
  { key: "hotline", icon: Languages, number: "050-3816-2787", dial: "05038162787", accent: "bg-emerald-600" },
];

// カードは /stays/travel-card では LanguageProvider の外側で描画されるため、
// アプリの i18n には依存せずカード内で完結する翻訳テーブルを持つ。
// カード全体（本人情報・滞在・WiFi・緊急連絡先）で共通の言語コード。
type CardLang = "ja" | "en" | "zh" | "ko";

const CARD_LANG_ORDER: { code: CardLang; label: string }[] = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
];

const EMERGENCY_STRINGS: Record<
  CardLang,
  {
    title: string;
    subtitle: string;
    footnote: string;
    contacts: Record<EmergencyKey, { label: string; sub: string }>;
  }
> = {
  ja: {
    title: "緊急連絡先",
    subtitle: "タップで発信できます",
    footnote: "110・119・118 は通話無料・24時間対応です。",
    contacts: {
      police: { label: "警察", sub: "事件・事故" },
      fire: { label: "消防・救急", sub: "火事・急病" },
      coast: { label: "海上保安庁", sub: "海の事故" },
      hotline: { label: "JNTO 多言語ホットライン", sub: "24時間 · 英中韓など" },
    },
  },
  en: {
    title: "Emergency in Japan",
    subtitle: "Tap a number to call",
    footnote: "110 / 119 / 118 are toll-free and available 24 hours.",
    contacts: {
      police: { label: "Police", sub: "Crime · Accident" },
      fire: { label: "Fire · Ambulance", sub: "Fire · Sudden illness" },
      coast: { label: "Coast Guard", sub: "Accidents at sea" },
      hotline: { label: "JNTO Visitor Hotline", sub: "24h · Multilingual" },
    },
  },
  zh: {
    title: "日本紧急联络电话",
    subtitle: "点击号码即可拨打",
    footnote: "110 / 119 / 118 免费、24 小时受理。",
    contacts: {
      police: { label: "警察", sub: "案件 · 事故" },
      fire: { label: "消防 · 急救", sub: "火灾 · 急病" },
      coast: { label: "海上保安厅", sub: "海上事故" },
      hotline: { label: "JNTO 多语言热线", sub: "24 小时 · 多语言" },
    },
  },
  ko: {
    title: "일본 긴급 연락처",
    subtitle: "번호를 누르면 전화가 연결됩니다",
    footnote: "110 · 119 · 118 은 무료이며 24시간 대응합니다.",
    contacts: {
      police: { label: "경찰", sub: "사건 · 사고" },
      fire: { label: "소방 · 구급", sub: "화재 · 응급" },
      coast: { label: "해상보안청", sub: "해상 사고" },
      hotline: { label: "JNTO 다국어 핫라인", sub: "24시간 · 다국어" },
    },
  },
};

// カード本体（本人情報・滞在・WiFi・操作ボタン）の翻訳テーブル。
interface CardStrings {
  companion: string;
  show: string;
  hide: string;
  screenshot: string;
  addHome: string;
  showToHotel: string;
  backToNormal: string;
  copiedSuffix: string; // 「〇〇 をコピーしました」の後半
  closeScreenshot: string;
  passportMini: string;
  contactMini: string;
  rowName: string;
  rowPassport: string;
  rowNationality: string;
  rowPhone: string;
  rowEmail: string;
  photoHidden: string;
  photoNone: string;
  copyForHotel: string;
  revealToCopy: string;
  hotelFormLabel: string;
  findStay: string;
  disclaimer: string;
  currentStay: string;
  guests: string;
  luggage: string;
  noTransfer: string;
  wifiTitle: string;
  wifiNetwork: string;
  wifiPassword: string;
  wifiPasswordLabel: string;
}

const CARD_STRINGS: Record<CardLang, CardStrings> = {
  ja: {
    companion: "Crane Nest パスポートコンパニオン",
    show: "表示",
    hide: "隠す",
    screenshot: "スクショ",
    addHome: "ホームに追加",
    showToHotel: "宿に見せる",
    backToNormal: "通常表示へ戻る",
    copiedSuffix: "をコピーしました",
    closeScreenshot: "スクショ表示を閉じる",
    passportMini: "Passport",
    contactMini: "Contact",
    rowName: "氏名",
    rowPassport: "パスポート番号",
    rowNationality: "国籍",
    rowPhone: "電話番号",
    rowEmail: "メール",
    photoHidden: "パスポート写真は非表示",
    photoNone: "パスポート写真なし",
    copyForHotel: "宿泊施設用にコピー",
    revealToCopy: "表示してコピー",
    hotelFormLabel: "宿泊施設用フォーム",
    findStay: "次の宿を探す",
    disclaimer: "公的な身分証ではありません。宿泊台帳への入力補助として、ご本人の端末上で提示してください。",
    currentStay: "現在のご滞在",
    guests: "人数",
    luggage: "荷物",
    noTransfer: "送迎予約が保存されると、ここに最新の滞在情報が表示されます。",
    wifiTitle: "Crane Nest ゲスト WiFi",
    wifiNetwork: "ネットワーク",
    wifiPassword: "パスワード",
    wifiPasswordLabel: "WiFi パスワード",
  },
  en: {
    companion: "Crane Nest Passport Companion",
    show: "Show",
    hide: "Hide",
    screenshot: "Screenshot",
    addHome: "Add to Home",
    showToHotel: "Show to hotel",
    backToNormal: "Back to normal view",
    copiedSuffix: " copied",
    closeScreenshot: "Close screenshot view",
    passportMini: "Passport",
    contactMini: "Contact",
    rowName: "Name",
    rowPassport: "Passport No.",
    rowNationality: "Nationality",
    rowPhone: "Phone",
    rowEmail: "Email",
    photoHidden: "Passport photo hidden",
    photoNone: "No passport photo",
    copyForHotel: "Copy for hotel",
    revealToCopy: "Show & copy",
    hotelFormLabel: "hotel form",
    findStay: "Find your next stay",
    disclaimer: "This is not an official ID. Please present it on your own device to help fill in the hotel guest register.",
    currentStay: "Current stay",
    guests: "Guests",
    luggage: "Luggage",
    noTransfer: "Your latest stay details will appear here once a transfer booking is saved.",
    wifiTitle: "Crane Nest Guest WiFi",
    wifiNetwork: "Network",
    wifiPassword: "Password",
    wifiPasswordLabel: "WiFi password",
  },
  zh: {
    companion: "Crane Nest 护照随行卡",
    show: "显示",
    hide: "隐藏",
    screenshot: "截图",
    addHome: "添加到主屏幕",
    showToHotel: "出示给住宿方",
    backToNormal: "返回普通视图",
    copiedSuffix: " 已复制",
    closeScreenshot: "关闭截图视图",
    passportMini: "护照",
    contactMini: "联系方式",
    rowName: "姓名",
    rowPassport: "护照号码",
    rowNationality: "国籍",
    rowPhone: "电话",
    rowEmail: "邮箱",
    photoHidden: "护照照片已隐藏",
    photoNone: "无护照照片",
    copyForHotel: "复制给住宿方",
    revealToCopy: "显示并复制",
    hotelFormLabel: "住宿登记表",
    findStay: "寻找下一处住宿",
    disclaimer: "这不是官方身份证件。请在本人设备上出示，仅用于协助填写住宿登记表。",
    currentStay: "当前住宿",
    guests: "人数",
    luggage: "行李",
    noTransfer: "保存接送预约后，这里将显示最新的住宿信息。",
    wifiTitle: "Crane Nest 访客 WiFi",
    wifiNetwork: "网络",
    wifiPassword: "密码",
    wifiPasswordLabel: "WiFi 密码",
  },
  ko: {
    companion: "Crane Nest 여권 컴패니언",
    show: "표시",
    hide: "숨기기",
    screenshot: "스크린샷",
    addHome: "홈에 추가",
    showToHotel: "숙소에 보여주기",
    backToNormal: "일반 보기로 돌아가기",
    copiedSuffix: " 복사했습니다",
    closeScreenshot: "스크린샷 보기 닫기",
    passportMini: "여권",
    contactMini: "연락처",
    rowName: "이름",
    rowPassport: "여권 번호",
    rowNationality: "국적",
    rowPhone: "전화",
    rowEmail: "이메일",
    photoHidden: "여권 사진 숨김",
    photoNone: "여권 사진 없음",
    copyForHotel: "숙소용으로 복사",
    revealToCopy: "표시 후 복사",
    hotelFormLabel: "숙소 등록 양식",
    findStay: "다음 숙소 찾기",
    disclaimer: "공식 신분증이 아닙니다. 숙박 대장 작성을 돕기 위해 본인 기기에서 제시해 주세요.",
    currentStay: "현재 숙박",
    guests: "인원",
    luggage: "수하물",
    noTransfer: "픽업 예약이 저장되면 최신 숙박 정보가 여기에 표시됩니다.",
    wifiTitle: "Crane Nest 게스트 WiFi",
    wifiNetwork: "네트워크",
    wifiPassword: "비밀번호",
    wifiPasswordLabel: "WiFi 비밀번호",
  },
};

// アプリ側のロケール（guesthouse_locale）を初期値として尊重する。
// es / fr など未対応の言語は英語にフォールバックする。
function resolveInitialLang(): CardLang {
  if (typeof window === "undefined") return "ja";
  try {
    const saved = window.localStorage.getItem("guesthouse_locale");
    if (saved === "ja" || saved === "en" || saved === "zh" || saved === "ko") return saved;
    if (saved === "es" || saved === "fr") return "en";
  } catch {
    // localStorage が使えない環境では既定値
  }
  return "ja";
}

// 言語はカード全体で共有し、親から prop で受け取る。
function EmergencyContactsCard({ lang }: { lang: CardLang }) {
  const s = EMERGENCY_STRINGS[lang];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-950 px-5 py-3.5 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600/90">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black leading-tight">{s.title}</p>
            <p className="truncate text-[11px] font-semibold text-slate-300">{s.subtitle}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-2 p-4 sm:grid-cols-2">
        {EMERGENCY_CONTACTS.map((contact) => {
          const Icon = contact.icon;
          const text = s.contacts[contact.key];
          return (
            <a
              key={contact.number}
              href={`tel:${contact.dial}`}
              className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition hover:border-slate-400 hover:bg-slate-50"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${contact.accent}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {text.label}
                </span>
                <span className="block truncate font-mono text-lg font-black leading-tight text-slate-900">
                  {contact.number}
                </span>
                <span className="block truncate text-[10px] font-semibold text-slate-400">{text.sub}</span>
              </span>
              <Phone className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-600" />
            </a>
          );
        })}
      </div>
      <p className="border-t border-slate-100 px-4 py-2.5 text-[10px] font-semibold leading-4 text-slate-400">
        {s.footnote}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  copyValue,
  onCopied,
}: {
  label: string;
  value: string;
  copyValue?: string | null;
  onCopied: (label: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 py-3 last:border-b-0">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <span className="flex min-w-0 items-center gap-2 text-right">
        <span className="truncate text-sm font-bold text-slate-900">{value}</span>
        {copyValue && (
          <button
            type="button"
            onClick={() => copyText(copyValue, onCopied, label)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-400 hover:text-slate-900"
            aria-label={label}
          >
            <Copy className="h-4 w-4" />
          </button>
        )}
      </span>
    </div>
  );
}

export default function JapanTravelCard({ data }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [lang, setLang] = useState<CardLang>("ja");

  // 言語の初期値はマウント後に決定する（SSR とクライアントの不一致を避ける）。
  useEffect(() => {
    setLang(resolveInitialLang());
  }, []);

  const c = CARD_STRINGS[lang];

  const { profile, latestTransfer, wifi } = data;
  const passportDisplay = revealed ? valueOrDash(profile.passportNumber) : maskPassportNumber(profile.passportNumber);
  const wifiPayload = useMemo(() => buildWifiQrPayload(wifi), [wifi]);
  const hotelFormText = [
    `Name: ${valueOrDash(profile.name)}`,
    `Passport No: ${valueOrDash(profile.passportNumber)}`,
    `Nationality: ${valueOrDash(profile.nationality)}`,
    `Phone: ${valueOrDash(profile.phone)}`,
    `Email: ${valueOrDash(profile.email)}`,
  ].join("\n");

  const onCopied = (label: string) => {
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1800);
  };

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function installShortcut() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }

    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: "JAPAN TRAVEL CARD", url }).catch(() => undefined);
      return;
    }

    copyText(url, onCopied, "Travel Card URL");
  }

  const openPresentation = () => {
    setRevealed(true);
    setPresentation(true);
  };

  const openScreenshotMode = () => {
    setPresentation(true);
    setScreenshotMode(true);
  };

  const closeScreenshotMode = () => {
    setScreenshotMode(false);
    setPresentation(false);
  };

  // カード全体で共有する言語スイッチャー（緊急連絡先も連動する）。
  const langSwitcher = (
    <div className="flex flex-wrap gap-1.5">
      {CARD_LANG_ORDER.map((option) => {
        const active = option.code === lang;
        return (
          <button
            key={option.code}
            type="button"
            onClick={() => setLang(option.code)}
            aria-pressed={active}
            className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition ${
              active
                ? "bg-slate-950 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:border-slate-500"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={screenshotMode ? "fixed inset-0 z-50 overflow-y-auto bg-[#f8f5ef] px-3 py-4 sm:px-8 sm:py-8" : "mx-auto max-w-5xl"}>
      {screenshotMode && (
        <button
          type="button"
          onClick={closeScreenshotMode}
          className="fixed right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg"
          aria-label={c.closeScreenshot}
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {!screenshotMode && <div className="mb-4 flex justify-end">{langSwitcher}</div>}

      {!presentation && !screenshotMode && (
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-red-700">
              <Sparkles className="h-4 w-4" />
              {c.companion}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">JAPAN TRAVEL CARD</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRevealed((current) => !current)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm"
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {revealed ? c.hide : c.show}
            </button>
            <button
              type="button"
              onClick={openScreenshotMode}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm"
            >
              <Camera className="h-4 w-4" />
              {c.screenshot}
            </button>
            <button
              type="button"
              onClick={installShortcut}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm"
            >
              {installPrompt ? <Download className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              {c.addHome}
            </button>
            <button
              type="button"
              onClick={openPresentation}
              className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm"
            >
              <Hotel className="h-4 w-4" />
              {c.showToHotel}
            </button>
          </div>
        </div>
      )}

      {presentation && !screenshotMode && (
        <button
          type="button"
          onClick={() => setPresentation(false)}
          className="mb-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700"
        >
          {c.backToNormal}
        </button>
      )}

      {copied && !screenshotMode && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
          {copied}
          {c.copiedSuffix}
        </p>
      )}

      <section className={screenshotMode ? "mx-auto grid max-w-4xl gap-4" : "grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"}>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <div className="relative bg-slate-950 px-5 py-5 text-white sm:px-7 sm:py-7">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-600 via-amber-400 to-emerald-500" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-200">Japan Travel Card</p>
                <p className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{profile.name}</p>
                <p className="mt-2 text-sm font-semibold text-slate-300">{valueOrDash(profile.nationality)}</p>
              </div>
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10">
                <IdCard className="h-9 w-9 text-amber-200" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{c.passportMini}</p>
                <p className="mt-1 font-mono text-lg font-black">{passportDisplay}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{c.contactMini}</p>
                <p className="mt-1 truncate text-sm font-bold">{valueOrDash(profile.phone ?? profile.email)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-[180px_1fr] sm:p-7">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {profile.passportImageUrl && revealed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.passportImageUrl} alt="" className="aspect-[3/4] h-full w-full object-cover object-top" />
              ) : (
                <div className="flex aspect-[3/4] h-full w-full flex-col items-center justify-center gap-3 px-5 text-center text-slate-400">
                  <LockKeyhole className="h-9 w-9" />
                  <span className="text-xs font-bold">{profile.passportImageUrl ? c.photoHidden : c.photoNone}</span>
                </div>
              )}
            </div>

            <div>
              <div className="rounded-lg border border-slate-200 px-4">
                <DetailRow label={c.rowName} value={valueOrDash(profile.name)} copyValue={profile.name} onCopied={onCopied} />
                <DetailRow
                  label={c.rowPassport}
                  value={passportDisplay}
                  copyValue={revealed ? profile.passportNumber : null}
                  onCopied={onCopied}
                />
                <DetailRow label={c.rowNationality} value={valueOrDash(profile.nationality)} copyValue={profile.nationality} onCopied={onCopied} />
                <DetailRow label={c.rowPhone} value={valueOrDash(profile.phone)} copyValue={profile.phone} onCopied={onCopied} />
                <DetailRow label={c.rowEmail} value={valueOrDash(profile.email)} copyValue={profile.email} onCopied={onCopied} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => (revealed ? copyText(hotelFormText, onCopied, c.hotelFormLabel) : setRevealed(true))}
                  className="flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-black text-white shadow-sm"
                >
                  <Copy className="h-4 w-4" />
                  {revealed ? c.copyForHotel : c.revealToCopy}
                </button>
                <Link
                  href="/stays"
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800"
                >
                  <Plane className="h-4 w-4" />
                  {c.findStay}
                </Link>
              </div>

              <p className="mt-4 flex items-start gap-2 text-xs font-semibold leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {c.disclaimer}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-black text-slate-900">
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
                {c.currentStay}
              </p>
              {latestTransfer?.bookingReference && (
                <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px] font-black text-slate-600">
                  {latestTransfer.bookingReference}
                </span>
              )}
            </div>

            {latestTransfer ? (
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2 font-bold text-slate-800">
                  <Hotel className="h-4 w-4 text-slate-400" />
                  {latestTransfer.roomNumber}
                </p>
                <p className="flex items-center gap-2 font-bold text-slate-800">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {latestTransfer.destinationName}
                </p>
                <p className="flex items-center gap-2 font-bold text-slate-800">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  {valueOrDash(latestTransfer.transferDate)}
                  {latestTransfer.departureTime ? ` / ${latestTransfer.departureTime}` : ""}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {c.guests} {valueOrDash(latestTransfer.passengers)} / {c.luggage} {latestTransfer.luggageTotal}
                </p>
              </div>
            ) : (
              <p className="text-sm font-semibold leading-6 text-slate-500">{c.noTransfer}</p>
            )}
          </div>

          <EmergencyContactsCard lang={lang} />

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
              <Wifi className="h-5 w-5 text-red-700" />
              {c.wifiTitle}
            </p>
            <div className="grid grid-cols-[116px_1fr] gap-4">
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <QRCodeSVG value={wifiPayload} size={96} includeMargin />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{c.wifiNetwork}</p>
                <p className="truncate font-bold text-slate-900">{wifi.ssid}</p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{c.wifiPassword}</p>
                <button
                  type="button"
                  onClick={() => copyText(wifi.password, onCopied, c.wifiPasswordLabel)}
                  className="mt-1 flex max-w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left font-mono text-xs font-black text-slate-800"
                >
                  <Copy className="h-4 w-4 shrink-0" />
                  <span className="truncate">{wifi.password}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
