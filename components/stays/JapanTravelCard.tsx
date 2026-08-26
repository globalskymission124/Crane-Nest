"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  Copy,
  Download,
  Eye,
  EyeOff,
  Hotel,
  IdCard,
  LockKeyhole,
  MapPin,
  Plane,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
  X,
} from "lucide-react";
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
            aria-label={`${label}をコピー`}
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

  return (
    <div className={screenshotMode ? "fixed inset-0 z-50 overflow-y-auto bg-[#f8f5ef] px-3 py-4 sm:px-8 sm:py-8" : "mx-auto max-w-5xl"}>
      {screenshotMode && (
        <button
          type="button"
          onClick={closeScreenshotMode}
          className="fixed right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg"
          aria-label="スクショ表示を閉じる"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {!presentation && !screenshotMode && (
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-red-700">
              <Sparkles className="h-4 w-4" />
              Crane Nest Passport Companion
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
              {revealed ? "隠す" : "表示"}
            </button>
            <button
              type="button"
              onClick={openScreenshotMode}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm"
            >
              <Camera className="h-4 w-4" />
              スクショ
            </button>
            <button
              type="button"
              onClick={installShortcut}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm"
            >
              {installPrompt ? <Download className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              ホームに追加
            </button>
            <button
              type="button"
              onClick={openPresentation}
              className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm"
            >
              <Hotel className="h-4 w-4" />
              宿に見せる
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
          通常表示へ戻る
        </button>
      )}

      {copied && !screenshotMode && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
          {copied}をコピーしました
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
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Passport</p>
                <p className="mt-1 font-mono text-lg font-black">{passportDisplay}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Contact</p>
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
                  <span className="text-xs font-bold">{profile.passportImageUrl ? "Passport photo hidden" : "No passport photo"}</span>
                </div>
              )}
            </div>

            <div>
              <div className="rounded-lg border border-slate-200 px-4">
                <DetailRow label="Name" value={valueOrDash(profile.name)} copyValue={profile.name} onCopied={onCopied} />
                <DetailRow
                  label="Passport"
                  value={passportDisplay}
                  copyValue={revealed ? profile.passportNumber : null}
                  onCopied={onCopied}
                />
                <DetailRow label="Nationality" value={valueOrDash(profile.nationality)} copyValue={profile.nationality} onCopied={onCopied} />
                <DetailRow label="Phone" value={valueOrDash(profile.phone)} copyValue={profile.phone} onCopied={onCopied} />
                <DetailRow label="Email" value={valueOrDash(profile.email)} copyValue={profile.email} onCopied={onCopied} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => (revealed ? copyText(hotelFormText, onCopied, "宿泊施設用フォーム") : setRevealed(true))}
                  className="flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-black text-white shadow-sm"
                >
                  <Copy className="h-4 w-4" />
                  {revealed ? "宿泊施設用にコピー" : "表示してコピー"}
                </button>
                <Link
                  href="/stays"
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800"
                >
                  <Plane className="h-4 w-4" />
                  次の宿を探す
                </Link>
              </div>

              <p className="mt-4 flex items-start gap-2 text-xs font-semibold leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                Official IDではありません。宿泊台帳への入力補助として本人の端末上で提示してください。
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-black text-slate-900">
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
                Current stay
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
                  Guests {valueOrDash(latestTransfer.passengers)} / Luggage {latestTransfer.luggageTotal}
                </p>
              </div>
            ) : (
              <p className="text-sm font-semibold leading-6 text-slate-500">送迎予約が保存されると、ここに最新の滞在情報が表示されます。</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
              <Wifi className="h-5 w-5 text-red-700" />
              Crane Nest Guest WiFi
            </p>
            <div className="grid grid-cols-[116px_1fr] gap-4">
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <QRCodeSVG value={wifiPayload} size={96} includeMargin />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Network</p>
                <p className="truncate font-bold text-slate-900">{wifi.ssid}</p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Password</p>
                <button
                  type="button"
                  onClick={() => copyText(wifi.password, onCopied, "WiFi password")}
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
