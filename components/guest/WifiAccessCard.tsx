"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Wifi } from "lucide-react";
import { GUEST_WIFI, buildWifiQrPayload } from "@/lib/guestWifi";

export interface WifiAccessCardLabels {
  title: string;
  description: string;
  networkNameLabel: string;
  passwordLabel: string;
  copyPassword: string;
  copied: string;
  scanHint: string;
  sameDeviceHint: string;
  androidConnect: string;
  androidHint: string;
}

interface WifiAccessCardProps {
  labels: WifiAccessCardLabels;
  className?: string;
  qrSize?: number;
}

export default function WifiAccessCard({ labels, className = "", qrSize = 168 }: WifiAccessCardProps) {
  const wifiQrPayload = useMemo(() => buildWifiQrPayload(GUEST_WIFI), []);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(/Android/.test(navigator.userAgent || ""));
  }, []);

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(GUEST_WIFI.password);
      setPasswordCopied(true);
      window.setTimeout(() => setPasswordCopied(false), 2000);
    } catch {
      // The password is visible, so guests can still enter it manually.
    }
  };

  const handleAndroidConnect = async () => {
    await handleCopyPassword();
    try {
      window.location.href = "intent:#Intent;action=android.settings.WIFI_SETTINGS;end";
    } catch {
      // Unsupported browsers keep the copied password and visible QR code.
    }
  };

  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm ${className}`}>
      <div className="flex items-center gap-2 bg-slate-900 px-5 py-3 text-white">
        <Wifi className="h-4 w-4 shrink-0 text-emerald-300" />
        <div className="min-w-0">
          <p className="text-sm font-bold">{labels.title}</p>
          <p className="text-[11px] text-slate-300">{labels.description}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 px-5 py-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <QRCodeSVG value={wifiQrPayload} size={qrSize} includeMargin />
        </div>
        <p className="max-w-[16rem] text-center text-sm font-medium text-slate-600">{labels.scanHint}</p>

        <div className="w-full rounded-xl bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <span className="shrink-0 text-xs text-slate-400">{labels.networkNameLabel}</span>
            <span className="min-w-0 break-all text-right text-sm font-semibold text-slate-700">{GUEST_WIFI.ssid}</span>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2.5">
            <span className="shrink-0 text-xs text-slate-400">{labels.passwordLabel}</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 break-all text-right font-mono text-sm font-semibold text-slate-700">
                {GUEST_WIFI.password}
              </span>
              <button
                type="button"
                onClick={handleCopyPassword}
                aria-label={labels.copyPassword}
                className={`flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition active:scale-[0.97] ${
                  passwordCopied
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                    : "border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:text-brand-600"
                }`}
              >
                {passwordCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {passwordCopied ? labels.copied : labels.copyPassword}
              </button>
            </div>
          </div>
        </div>

        {isAndroid ? (
          <div className="w-full">
            <button
              type="button"
              onClick={handleAndroidConnect}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 transition active:scale-[0.99]"
            >
              {passwordCopied ? <Check className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
              {labels.androidConnect}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">{labels.androidHint}</p>
          </div>
        ) : (
          <p className="text-center text-[11px] text-slate-400">{labels.sameDeviceHint}</p>
        )}
      </div>
    </section>
  );
}
