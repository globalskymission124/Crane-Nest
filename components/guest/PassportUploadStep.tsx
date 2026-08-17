"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, CheckCircle2, RotateCcw, AlertCircle, UserPlus, X } from "lucide-react";
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

// MRZ領域を切り出し、3倍拡大＋2値化（白黒）で前処理する
async function preprocessMrz(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // MRZはパスポート下部 約20%
      const mrzH = Math.floor(img.height * 0.22);
      const scale = 3; // 3倍拡大でOCR精度向上
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = mrzH * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(imageUrl); return; }

      // MRZ帯を拡大描画
      ctx.drawImage(
        img,
        0, img.height - mrzH, img.width, mrzH,
        0, 0, canvas.width, canvas.height
      );

      // 2値化（グレースケール → 閾値128で白黒）
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const v = gray > 128 ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      ctx.putImageData(id, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

// ファイルを base64 データURLに変換する
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Gemini 3.5 Flash（サーバー側APIルート経由）でパスポートを読み取る
async function runGeminiOcr(file: File): Promise<{ fullName: string; passportNumber: string }> {
  try {
    const dataUrl = await fileToDataUrl(file);
    const res = await fetch("/api/passport/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: dataUrl, mimeType: file.type || "image/jpeg" }),
    });
    if (!res.ok) return { fullName: "", passportNumber: "" };
    const data = await res.json();
    return {
      fullName: String(data.fullName ?? "").trim(),
      passportNumber: String(data.passportNumber ?? "").trim(),
    };
  } catch (err) {
    console.warn("Gemini OCR failed:", err);
    return { fullName: "", passportNumber: "" };
  }
}

// Tesseract.js を動的インポートしてパスポート画像からMRZを読み取る（Gemini失敗時のフォールバック）
async function runTesseractOcr(imageUrl: string): Promise<{ fullName: string; passportNumber: string }> {
  try {
    // MRZ領域を前処理
    const mrzImage = await preprocessMrz(imageUrl);

    const { createWorker } = await import("tesseract.js");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const worker = await createWorker("eng" as any);

    // PSM 6: 均一なテキストブロックとして認識
    await worker.setParameters({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tessedit_pageseg_mode: "6" as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<" as any,
    });

    const { data } = await worker.recognize(mrzImage);
    await worker.terminate();

    const lines = data.text
      .split("\n")
      .map((l) => l.replace(/[^A-Z0-9<]/gi, "").toUpperCase())
      .filter((l) => l.length >= 20);

    return parseMrzLines(lines);
  } catch (err) {
    console.warn("OCR failed:", err);
    return { fullName: "", passportNumber: "" };
  }
}

type Phase = "idle" | "processing" | "done" | "ocr_failed";

// 1名分の入力状態（代表者・同行者で共通）
interface GuestState {
  id: string;
  phase: Phase;
  previewUrl: string | null;
  fullName: string;
  passportNumber: string;
  phoneNumber: string;
}

function createGuestState(): GuestState {
  return {
    id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()),
    phase: "idle",
    previewUrl: null,
    fullName: "",
    passportNumber: "",
    phoneNumber: "",
  };
}

interface PassportUploadStepProps {
  onNext: (data: PassportFormData) => void;
}

// =========================================================
// 1名分のパスポート撮影・確認カード
//  - 代表者(isPrimary)は電話番号を必須、同行者は任意
//  - 撮影 → OCR → 手直しの流れは全カード共通
// =========================================================
interface GuestCaptureCardProps {
  guest: GuestState;
  index: number;
  isPrimary: boolean;
  onPatch: (patch: Partial<GuestState>) => void;
  onRemove?: () => void;
}

function GuestCaptureCard({ guest, index, isPrimary, onPatch, onRemove }: GuestCaptureCardProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const label = isPrimary ? t.passport.primaryGuestLabel : `${t.passport.companionLabel} ${index}`;

  const handleFileSelected = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    onPatch({ previewUrl: objectUrl, phase: "processing" });

    // まず Gemini 3.5 Flash で読み取り、失敗時は Tesseract にフォールバック
    let result = await runGeminiOcr(file);
    if (!result.fullName && !result.passportNumber) {
      result = await runTesseractOcr(objectUrl);
    }

    onPatch({
      fullName: result.fullName,
      passportNumber: result.passportNumber,
      phase: result.fullName || result.passportNumber ? "done" : "ocr_failed",
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  };

  const handleRetake = () => {
    if (guest.previewUrl) URL.revokeObjectURL(guest.previewUrl);
    onPatch({ previewUrl: null, fullName: "", passportNumber: "", phoneNumber: "", phase: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      {/* カード見出し（代表者 / 同行者N） */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isPrimary ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {label}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={() => {
              if (guest.previewUrl) URL.revokeObjectURL(guest.previewUrl);
              onRemove();
            }}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
            {t.passport.removeGuest}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />

      {!guest.previewUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-brand-100 bg-gradient-to-b from-brand-50/80 to-white text-brand-500 transition active:scale-[0.99] active:bg-brand-50"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm shadow-brand-700/20">
            <Camera className="h-8 w-8" />
          </span>
          <span className="text-sm font-medium text-brand-600">{t.passport.uploadCta}</span>
        </button>
      )}

      {guest.previewUrl && (
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-brand-100 shadow-sm shadow-brand-700/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={guest.previewUrl} alt={t.passport.uploadAlt} className="h-48 w-full object-cover" />

            {guest.phase === "processing" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm font-medium">{t.passport.processing}</span>
              </div>
            )}

            {guest.phase === "done" && (
              <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t.passport.recognized}
              </div>
            )}

            {guest.phase === "ocr_failed" && (
              <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow">
                <AlertCircle className="h-3.5 w-3.5" />
                手入力してください
              </div>
            )}
          </div>

          {(guest.phase === "done" || guest.phase === "ocr_failed") && (
            <div className="flex flex-col gap-3 rounded-2xl border border-brand-100/70 bg-gradient-to-b from-brand-50/50 to-white p-4">
              <p className="text-xs text-slate-500">{t.passport.reviewHint}</p>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">{t.passport.fullNameLabel}</span>
                <input
                  type="text"
                  value={guest.fullName}
                  onChange={(e) => onPatch({ fullName: e.target.value })}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">{t.passport.passportNumberLabel}</span>
                <input
                  type="text"
                  value={guest.passportNumber}
                  onChange={(e) => onPatch({ passportNumber: e.target.value })}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm uppercase tracking-wide focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  {t.passport.phoneNumberLabel}
                  {!isPrimary && (
                    <span className="ml-1 text-[10px] font-normal text-slate-400">（{t.passport.optionalTag}）</span>
                  )}
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={guest.phoneNumber}
                  onChange={(e) => onPatch({ phoneNumber: e.target.value })}
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
    </div>
  );
}

export default function PassportUploadStep({ onNext }: PassportUploadStepProps) {
  const { t } = useTranslation();
  // guests[0] が代表者、以降が同行者。初期は代表者1名分。
  const [guests, setGuests] = useState<GuestState[]>(() => [createGuestState()]);

  const patchGuest = (id: string, patch: Partial<GuestState>) => {
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const addCompanion = () => {
    setGuests((prev) => [...prev, createGuestState()]);
  };

  const removeGuest = (id: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== id));
  };

  const primary = guests[0];
  const primaryCaptured = primary.phase === "done" || primary.phase === "ocr_failed";

  // 1名でも複数名でも進める。
  //  - 代表者: 写真取得済み + 氏名/番号/電話が揃う
  //  - 同行者: 写真取得済み + 氏名/番号が揃う（電話は任意）+ 処理中でない
  const isGuestReady = (g: GuestState, isPrimary: boolean) => {
    if (g.phase === "processing" || !g.previewUrl) return false;
    if (!g.fullName.trim() || !g.passportNumber.trim()) return false;
    if (isPrimary && !g.phoneNumber.trim()) return false;
    return true;
  };

  const canProceed = guests.every((g, i) => isGuestReady(g, i === 0));

  const handleSubmit = () => {
    const [head, ...rest] = guests;
    onNext({
      fullName: head.fullName,
      passportNumber: head.passportNumber,
      phoneNumber: head.phoneNumber,
      passportImageUrl: head.previewUrl,
      companions: rest.map((g) => ({
        fullName: g.fullName,
        passportNumber: g.passportNumber,
        phoneNumber: g.phoneNumber,
        passportImageUrl: g.previewUrl,
      })),
    });
  };

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

      {/* ゲストごとの撮影カード（代表者＋同行者） */}
      <div className="flex flex-col gap-6">
        {guests.map((guest, index) => (
          <GuestCaptureCard
            key={guest.id}
            guest={guest}
            index={index}
            isPrimary={index === 0}
            onPatch={(patch) => patchGuest(guest.id, patch)}
            onRemove={index === 0 ? undefined : () => removeGuest(guest.id)}
          />
        ))}
      </div>

      {/* 同行者を追加（代表者を撮影し終えてから表示、人数上限なし） */}
      {primaryCaptured && (
        <button
          type="button"
          onClick={addCompanion}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 py-3 text-sm font-semibold text-brand-600 transition active:scale-[0.99] active:bg-brand-50"
        >
          <UserPlus className="h-4 w-4" />
          {t.passport.addGuestCta}
        </button>
      )}

      <div className="mt-6">
        <button
          type="button"
          disabled={!canProceed}
          onClick={handleSubmit}
          className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3.5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          {t.passport.next}
        </button>
      </div>
    </div>
  );
}
