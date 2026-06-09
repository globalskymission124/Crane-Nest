"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, CheckCircle2, RotateCcw, AlertCircle } from "lucide-react";
import type { PassportFormData } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import BannerCarousel from "./BannerCarousel";

// =========================================================
// パスポートMRZ（機械読取領域）のパース
//
// MRZ形式（TD3 旅券）:
//   Line1: P<COUNTRY<SURNAME<<GIVENNAME<<<<...  (44文字)
//   Line2: PASSPORT_NO+CHECK+COUNTRY+DOB+CHK+SEX+EXPIRY+CHK+PERSONAL+CHK (44文字)
// =========================================================
function parseMrzLines(lines: string[]): { fullName: string; passportNumber: string } {
  let fullName = "";
  let passportNumber = "";

  for (const raw of lines) {
    // OCRのノイズを除去し大文字英数字と < のみ残す
    const line = raw.replace(/[^A-Z0-9<]/g, "").toUpperCase();

    // Line1 判定: P< で始まる 40文字以上
    if ((line.startsWith("P<") || line.startsWith("PC")) && line.length >= 40) {
      // 3文字の国コードをスキップして名前フィールドを取得
      const nameField = line.slice(5); // "P<JPN" の5文字をスキップ
      const nameParts = nameField.split("<<");
      const surname = (nameParts[0] ?? "").replace(/</g, " ").trim();
      const given = nameParts
        .slice(1)
        .join(" ")
        .replace(/</g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (surname) {
        fullName = given ? `${surname} ${given}` : surname;
      }
    }

    // Line2 判定: 先頭9文字が英数字（パスポート番号）+ チェックディジット
    if (!passportNumber && line.length >= 28 && /^[A-Z0-9]{9}[0-9]/.test(line)) {
      passportNumber = line.slice(0, 9).replace(/<+$/, "");
    }
  }

  return { fullName, passportNumber };
}

// Tesseract.js を動的インポートしてパスポート画像からMRZを読み取る
async function runOcr(imageUrl: string): Promise<{ fullName: string; passportNumber: string }> {
  try {
    // tesseract.js を動的インポート（バンドルサイズ削減）
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");

    // MRZ 用の文字集合に絞り込んで精度向上
    await worker.setParameters({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<" as any,
    });

    const { data } = await worker.recognize(imageUrl);
    await worker.terminate();

    // 行ごとに分割してMRZ候補を探す
    const lines = data.text
      .split("\n")
      .map((l) => l.replace(/\s/g, "").toUpperCase())
      .filter((l) => l.length >= 20);

    return parseMrzLines(lines);
  } catch (err) {
    console.warn("OCR failed:", err);
    return { fullName: "", passportNumber: "" };
  }
}

type Phase = "idle" | "processing" | "done" | "ocr_failed";

interface PassportUploadStepProps {
  onNext: (data: PassportFormData) => void;
}

export default function PassportUploadStep({ onNext }: PassportUploadStepProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleFileSelected = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setPhase("processing");

    const result = await runOcr(objectUrl);

    // OCRが何かしら読み取れた場合のみセット
    setFullName(result.fullName);
    setPassportNumber(result.passportNumber);
    setPhase(result.fullName || result.passportNumber ? "done" : "ocr_failed");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFullName("");
    setPassportNumber("");
    setPhoneNumber("");
    setPhase("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // OCR失敗でも手入力で次に進める（name・number・phone が揃えばOK）
  const canProceed =
    (phase === "done" || phase === "ocr_failed") &&
    fullName.trim() !== "" &&
    passportNumber.trim() !== "" &&
    phoneNumber.trim() !== "";

  return (
    <div className="flex h-full flex-col px-5 py-6">
      <BannerCarousel />

      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-brand-600">{t.stepLabel(1, 3)}</p>
          <LanguageSwitcher />
        </div>
        <h1 className="mt-1 text-xl font-bold">{t.passport.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{t.passport.description}</p>
      </header>

      {/* アップロードエリア */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />

      {!previewUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-1 min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-brand-100 bg-gradient-to-b from-brand-50/80 to-white text-brand-500 transition active:scale-[0.99] active:bg-brand-50"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm shadow-brand-700/20">
            <Camera className="h-8 w-8" />
          </span>
          <span className="text-sm font-medium text-brand-600">{t.passport.uploadCta}</span>
        </button>
      )}

      {previewUrl && (
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-brand-100 shadow-sm shadow-brand-700/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt={t.passport.uploadAlt} className="h-48 w-full object-cover" />

            {phase === "processing" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm font-medium">{t.passport.processing}</span>
              </div>
            )}

            {phase === "done" && (
              <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t.passport.recognized}
              </div>
            )}

            {phase === "ocr_failed" && (
              <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow">
                <AlertCircle className="h-3.5 w-3.5" />
                手入力してください
              </div>
            )}
          </div>

          {(phase === "done" || phase === "ocr_failed") && (
            <div className="flex flex-col gap-3 rounded-2xl border border-brand-100/70 bg-gradient-to-b from-brand-50/50 to-white p-4">
              <p className="text-xs text-slate-500">{t.passport.reviewHint}</p>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">{t.passport.fullNameLabel}</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">{t.passport.passportNumberLabel}</span>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm uppercase tracking-wide focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">{t.passport.phoneNumberLabel}</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={t.passport.phoneNumberPlaceholder}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>

              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center justify-center gap-1.5 self-start text-xs font-medium text-slate-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t.passport.retake}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <button
          type="button"
          disabled={!canProceed}
          onClick={() =>
            onNext({
              fullName,
              passportNumber,
              phoneNumber,
              passportImageUrl: previewUrl,
            })
          }
          className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3.5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          {t.passport.next}
        </button>
      </div>
    </div>
  );
}
