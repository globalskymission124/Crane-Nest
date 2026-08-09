"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** 画像を縮小して data URL(JPEG) にする（送信サイズ・コスト削減）。 */
async function fileToDownscaledDataUrl(
  file: File,
  maxSize = 1600,
  quality = 0.85
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("read failed"));
    fr.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = document.createElement("img");
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("image load failed"));
      i.src = dataUrl;
    });
    let width = img.width;
    let height = img.height;
    if (Math.max(width, height) > maxSize) {
      const s = maxSize / Math.max(width, height);
      width = Math.round(width * s);
      height = Math.round(height * s);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SignaturePad } from "@/components/SignaturePad";
import RoulettePopup from "@/components/RoulettePopup";
import { getRouletteDict } from "@/lib/roulette";
import { getContract, COMPANY_NAME } from "@/lib/zeroAuthContract";
import { BRANCH_LIST, storeToBranchId } from "@/lib/branches";
import { unlockSuccessSound, playSuccessSound } from "@/lib/successSound";
import {
  recoveryActionKeys,
  ZERO_AUTH_HOLD_AMOUNT_JPY,
  ZERO_AUTH_SUMMARY_KEYS,
  type RecoveryActionKey,
  type ZeroAuthIssue,
} from "@/lib/zeroAuthUx";

/** 画像ファイルを縮小して JPEG dataURL にする（アップロード容量を抑える）。 */
async function fileToDataUrl(file: File, maxDim = 1600): Promise<string> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = document.createElement("img");
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
      img.src = bitmapUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return bitmapUrl;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

type Phase = "form" | "created" | "signing" | "cardPending" | "cardSaved";
type SignMethod = "screen" | "reader";

/** SVG文字列を PNG dataURL にラスタライズする（契約書PDFに埋め込むため）。 */
async function svgToPngDataUrl(svg: string, width = 480): Promise<string | null> {
  try {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const img = document.createElement("img");
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("svg load failed"));
        img.src = url;
      });
      const ratio = img.height && img.width ? img.height / img.width : 0.4;
      const w = width;
      const h = Math.max(1, Math.round(w * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

export function ZeroAuthContent() {
  const locale = useLocale();
  const t = useTranslations("zeroAuth");
  const searchParams = useSearchParams();
  // URLで拠点が指定されていればそれを初期値に。無ければ予約情報 or スタッフ手動選択で決める。
  const branchParam = searchParams.get("branch") ?? undefined;
  const [branch, setBranch] = useState<string | undefined>(branchParam);
  const reservationId = searchParams.get("reservationId") ?? undefined;
  const contract = getContract(locale);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [passportNo, setPassportNo] = useState("");
  // 写真から自動入力（OCR）
  const fileRef = useRef<HTMLInputElement>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMsg, setOcrMsg] = useState<string | null>(null);
  const ocrLang = locale.startsWith("ja") ? "ja" : locale.startsWith("zh") ? "zh" : "en";
  const ocrT = {
    ja: {
      btn: "📷 写真から自動入力（パスポート/免許/予約）",
      loading: "読み取り中…",
      done: "読み取りました。内容を必ず確認・修正してください。",
      none: "読み取れませんでした。手動で入力してください。",
      fail: "読み取りに失敗しました。手動で入力してください。",
    },
    en: {
      btn: "📷 Auto-fill from photo (passport / license / booking)",
      loading: "Reading…",
      done: "Done. Please review and correct the values.",
      none: "Could not read. Please enter manually.",
      fail: "Reading failed. Please enter manually.",
    },
    zh: {
      btn: "📷 拍照自动填写（护照/驾照/预订）",
      loading: "识别中…",
      done: "已识别，请务必核对并修正内容。",
      none: "无法识别，请手动输入。",
      fail: "识别失败，请手动输入。",
    },
  }[ocrLang];

  const runOcr = async (file: File) => {
    setOcrMsg(null);
    setOcrLoading(true);
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
      const res = await fetch("/api/zero-auth/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOcrMsg(`${ocrT.fail}（${j.error || res.status}${j.detail ? `: ${String(j.detail).slice(0, 120)}` : ""}）`);
        return;
      }
      let filled = 0;
      if (j.name) { setName(j.name); filled++; }
      if (j.address) { setAddress(j.address); filled++; }
      if (j.phone) { setContact(j.phone); filled++; }
      if (j.passportNo) { setPassportNo(j.passportNo); filled++; }
      setOcrMsg(filled > 0 ? ocrT.done : ocrT.none);
    } catch (e) {
      setOcrMsg(`${ocrT.fail}（${e instanceof Error ? e.message : "network"}）`);
    } finally {
      setOcrLoading(false);
    }
  };
  const [passport, setPassport] = useState<string | null>(null);
  const [idp, setIdp] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [signMethod, setSignMethod] = useState<SignMethod>("reader");
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [phase, setPhase] = useState<Phase>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastIssue, setLastIssue] = useState<ZeroAuthIssue | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [card, setCard] = useState<{ brand?: string; last4?: string } | null>(null);
  const [showRoulette, setShowRoulette] = useState(false);
  const [reservation, setReservation] = useState<{
    source?: string;
    orderNo?: string;
    vehicleClass?: string;
    pickupAt?: string;
    returnAt?: string;
    store?: string;
    pickupStore?: string;
  } | null>(null);

  const feeText = useMemo(() => contract.feeFormula, [contract]);
  const tt = (key: string) => t(key);
  const recoveryActions = lastIssue
    ? recoveryActionKeys(lastIssue, signMethod, BRANCH_LIST.length > 1)
    : [];

  // オーソリ（カード保存）完了で効果音を鳴らし、ルーレットを自動表示
  useEffect(() => {
    if (phase === "cardSaved") {
      playSuccessSound();
      setShowRoulette(true);
    }
  }, [phase]);

  // OTA予約IDが付いていれば、予約情報を取得してフォームをプレフィル
  useEffect(() => {
    if (!reservationId) return;
    (async () => {
      try {
        const res = await fetch(`/api/reservations/${encodeURIComponent(reservationId)}`, {
          cache: "no-store",
        });
        const j = await res.json();
        if (j.success && j.reservation) {
          const r = j.reservation;
          setReservation(r);
          if (r.customerName) setName(r.customerName);
          const c = r.email || r.phone;
          if (c) setContact(c);
          // URLで拠点未指定なら、予約の取車店から拠点（S700）を自動解決。
          if (!branchParam) {
            const b = storeToBranchId(r.pickupStore ?? r.store);
            if (b) setBranch(b);
          }
        }
      } catch {
        /* プレフィル失敗は無視（手入力で継続可能） */
      }
    })();
  }, [reservationId]);

  const handlePassport = async (f: File | null) => {
    if (!f) return;
    setPassport(await fileToDataUrl(f));
  };
  const handleIdp = async (f: File | null) => {
    if (!f) return;
    setIdp(await fileToDataUrl(f));
  };

  const submit = async () => {
    // ユーザー操作（送信タップ）の瞬間に効果音を解錠しておく（自動再生ブロック対策）。
    unlockSuccessSound();
    setError(null);
    setLastIssue(null);
    if (!name.trim()) return setError(t("errors.nameRequired"));
    if (!address.trim()) return setError(t("errors.addressRequired"));
    if (!contact.trim()) return setError(t("errors.contactRequired"));
    if (!passport) return setError(t("errors.passportRequired"));
    if (signMethod === "screen" && !signature)
      return setError(t("errors.signatureRequired"));
    // S700署名は拠点ごとに端末が異なるため、複数拠点があるときは拠点選択を必須にする。
    if (signMethod === "reader" && BRANCH_LIST.length > 1 && !branch)
      return setError(t("branchRequired"));
    if (!agreed) return setError(t("errors.agreeRequired"));

    setLoading(true);
    try {
      const res = await fetch("/api/zero-auth/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          branch,
          name,
          address,
          contact,
          passportNo,
          passportDataUrl: passport,
          idpDataUrl: idp,
          signatureDataUrl: signMethod === "screen" ? signature : undefined,
          signOnReader: signMethod === "reader",
          reservationId,
          agreed,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(t("errors.generic"));
        setLastIssue("generic");
        return;
      }
      setContractId(data.contractId);
      setPdfUrl(data.pdfUrl);
      setPhase("created");
    } catch {
      setError(t("errors.generic"));
      setLastIssue("generic");
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = async (paymentIntentId: string) => {
    const timeoutMs = 120_000;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(
          `/api/zero-auth/terminal/status?paymentIntentId=${encodeURIComponent(
            paymentIntentId
          )}`,
          { cache: "no-store" }
        );
        const j = await res.json();
        if (res.ok && j.success) {
          if (j.status === "succeeded") {
            setCard({ brand: j.cardBrand, last4: j.cardLast4 });
            return "ok" as const;
          }
          if (j.status === "canceled") return "canceled" as const;
          if (j.declined) return "declined" as const;
        }
      } catch {
        /* 一時的な通信エラーは無視 */
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    return "timeout" as const;
  };

  const sendToPos = async () => {
    if (!contractId) return;
    setError(null);
    setLastIssue(null);
    setLoading(true);
    setPhase("cardPending");
    try {
      const res = await fetch("/api/zero-auth/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId, branch }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || t("errors.posFailed"));
        setLastIssue("generic");
        setPhase("created");
        return;
      }
      const result = await pollStatus(data.paymentIntentId);
      if (result === "ok") {
        setPhase("cardSaved");
      } else {
        setLastIssue(
          result === "declined"
            ? "posDeclined"
            : result === "canceled"
            ? "posCanceled"
            : "posTimeout"
        );
        setError(
          result === "declined"
            ? t("errors.posDeclined")
            : result === "canceled"
            ? t("errors.posCanceled")
            : t("errors.posTimeout")
        );
        setPhase("created");
      }
    } catch {
      setError(t("errors.posFailed"));
      setLastIssue("generic");
      setPhase("created");
    } finally {
      setLoading(false);
    }
  };

  // S700 の署名完了をポーリング
  const pollSignature = async (readerId: string, cId: string) => {
    const timeoutMs = 130_000;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(
          `/api/zero-auth/reader-signature/status?readerId=${encodeURIComponent(
            readerId
          )}&contractId=${encodeURIComponent(cId)}`,
          { cache: "no-store" }
        );
        const j = await res.json();
        if (res.ok && j.success) {
          if (j.status === "succeeded")
            return { ok: true as const, svg: (j.svg as string | null) ?? null };
          if (j.status === "failed") return { ok: false as const, reason: "failed" };
        }
      } catch {
        /* 一時的な通信エラーは無視 */
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    return { ok: false as const, reason: "timeout" };
  };

  // 店頭フロー: S700で署名 → カードをタッチ(¥50与信→即解放)でカード保存
  const runReaderFlow = async () => {
    if (!contractId) return;
    // ユーザー操作（開始タップ）の瞬間に効果音を解錠しておく。
    unlockSuccessSound();
    const headers = { "Content-Type": "application/json" };
    setError(null);
    setLastIssue(null);
    setLoading(true);
    setPhase("signing");
    try {
      // 1) リーダーに署名画面を表示
      const sres = await fetch("/api/zero-auth/reader-signature", {
        method: "POST",
        headers,
        body: JSON.stringify({ contractId, branch, locale }),
      });
      const sdata = await sres.json();
      if (!sdata.success) {
        setError(sdata.error || t("errors.signFailed"));
        setLastIssue("signFailed");
        setPhase("created");
        return;
      }
      // 2) 署名完了を待つ
      const sresult = await pollSignature(sdata.readerId, contractId);
      if (!sresult.ok) {
        setLastIssue(sresult.reason === "timeout" ? "signTimeout" : "signFailed");
        setError(
          sresult.reason === "timeout" ? t("errors.signTimeout") : t("errors.signFailed")
        );
        setPhase("created");
        return;
      }
      // 3) 署名SVG → PNG化して契約書PDF用に保存
      if (sresult.svg) {
        const png = await svgToPngDataUrl(sresult.svg);
        if (png) {
          await fetch(`/api/zero-auth/contract/${contractId}/signature-png`, {
            method: "POST",
            headers,
            body: JSON.stringify({ dataUrl: png }),
          }).catch(() => {});
        }
      }
      // 4) カード保存（¥50与信ホールド→即解放）
      setPhase("cardPending");
      const tres = await fetch("/api/zero-auth/terminal", {
        method: "POST",
        headers,
        body: JSON.stringify({ contractId, branch }),
      });
      const tdata = await tres.json();
      if (!tdata.success) {
        setError(tdata.error || t("errors.posFailed"));
        setLastIssue("generic");
        setPhase("created");
        return;
      }
      const result = await pollStatus(tdata.paymentIntentId);
      if (result === "ok") {
        setPhase("cardSaved");
      } else {
        setLastIssue(
          result === "declined"
            ? "posDeclined"
            : result === "canceled"
            ? "posCanceled"
            : "posTimeout"
        );
        setError(
          result === "declined"
            ? t("errors.posDeclined")
            : result === "canceled"
            ? t("errors.posCanceled")
            : t("errors.posTimeout")
        );
        setPhase("created");
      }
    } catch {
      setError(t("errors.generic"));
      setLastIssue("generic");
      setPhase("created");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setName("");
    setAddress("");
    setContact("");
    setPassportNo("");
    setPassport(null);
    setIdp(null);
    setSignature(null);
    setSignMethod("reader");
    setAgreed(false);
    setContractId(null);
    setPdfUrl(null);
    setCard(null);
    setError(null);
    setLastIssue(null);
    setShowRoulette(false);
    setPhase("form");
  };

  const returnToEditableForm = () => {
    setContractId(null);
    setPdfUrl(null);
    setCard(null);
    setShowRoulette(false);
    setError(null);
    setLastIssue(null);
    setLoading(false);
    setPhase("form");
  };

  const handleRecoveryAction = (action: RecoveryActionKey) => {
    if (action === "retry" || action === "tryAnotherCard") {
      if (signMethod === "reader") {
        void runReaderFlow();
      } else {
        void sendToPos();
      }
      return;
    }
    if (action === "switchToScreenSignature") {
      setSignMethod("screen");
      returnToEditableForm();
      return;
    }
    if (action === "changeStore") {
      setBranch(undefined);
      returnToEditableForm();
    }
  };

  const inputCls =
    "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base";
  const sectionTitle = "text-sm font-semibold text-gray-900 mb-3 mt-1";

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="w-full max-w-xl mx-auto">
        <div className="flex justify-center mb-4">
          <Image
            src="/best_car_rental_logo.png"
            alt="Best Car Rental"
            width={180}
            height={108}
            priority
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-start gap-3 mb-2">
            <h1 className="text-xl font-bold text-gray-900">{t("heading")}</h1>
            <LanguageSwitcher />
          </div>
          <p className="text-sm text-gray-500 mb-4">{t("subheading")}</p>

          <ZeroAuthAssurance t={tt} feeText={feeText} />

          {/* OTA予約から自動プレフィル */}
          {reservation && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <span className="font-semibold">
                {reservation.source ?? "OTA"}
                {reservation.orderNo ? ` #${reservation.orderNo}` : ""}
              </span>
              {reservation.vehicleClass ? ` ・ ${reservation.vehicleClass}` : ""}
              {reservation.pickupAt
                ? ` ・ ${new Date(reservation.pickupAt).toLocaleString()}`
                : ""}
            </div>
          )}

          {/* 署名を送る拠点（S700）の選択。予約から自動判定、飛び込みは手動で選ぶ。 */}
          {phase === "form" && BRANCH_LIST.length > 1 && (
            <div className="mb-5">
              <p className="text-xs font-medium text-gray-600 mb-1">
                {t("branchLabel")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {BRANCH_LIST.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBranch(b.id)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      branch === b.id
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
              {!branch && (
                <p className="text-xs text-red-500 mt-1">{t("branchRequired")}</p>
              )}
            </div>
          )}

          <p className="text-sm text-gray-600 mb-5">{t("intro")}</p>

          {phase === "form" && (
            <div className="space-y-5">
              {/* 契約者情報 */}
              <div>
                <h2 className={sectionTitle}>{t("sectionCustomer")}</h2>
                {/* 写真から自動入力（OCR）→ 氏名・電話・住所・パスポート番号を埋める */}
                <div className="mb-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) runOcr(f);
                      e.currentTarget.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={ocrLoading}
                    className="w-full rounded-lg border border-purple-300 bg-purple-50 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-60"
                  >
                    {ocrLoading ? ocrT.loading : ocrT.btn}
                  </button>
                  {ocrMsg && <p className="mt-1 text-xs text-gray-500">{ocrMsg}</p>}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {contract.labels.name}
                    </label>
                    <input
                      className={inputCls}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("namePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {contract.labels.address}
                    </label>
                    <input
                      className={inputCls}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t("addressPlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {contract.labels.contact}
                    </label>
                    <input
                      className={inputCls}
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder={t("contactPlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {contract.labels.passportNo}
                    </label>
                    <input
                      className={inputCls}
                      value={passportNo}
                      onChange={(e) => setPassportNo(e.target.value)}
                      placeholder={t("passportNoPlaceholder")}
                    />
                  </div>
                </div>
              </div>

              {/* 本人確認書類 */}
              <div>
                <h2 className={sectionTitle}>{t("sectionDocs")}</h2>
                <div className="space-y-4">
                  <FileField
                    label={t("passportUpload")}
                    helper={t("passportHelper")}
                    chooseLabel={t("chooseFile")}
                    selectedLabel={t("fileSelected")}
                    value={passport}
                    onFile={handlePassport}
                    required
                  />
                  <FileField
                    label={t("idpUpload")}
                    helper={t("idpHelper")}
                    chooseLabel={t("chooseFile")}
                    selectedLabel={t("fileSelected")}
                    value={idp}
                    onFile={handleIdp}
                  />
                </div>
              </div>

              {/* 特約・同意 */}
              <div>
                <h2 className={sectionTitle}>{t("sectionAgreement")}</h2>
                <AgreementSummary t={tt} />
                <button
                  type="button"
                  onClick={() => setShowTerms((v) => !v)}
                  className="text-blue-600 text-sm hover:underline"
                >
                  {showTerms ? t("hideFullAgreement") : t("viewFullAgreement")}
                </button>
                {showTerms && (
                  <div className="mt-3 max-h-72 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-700 space-y-3">
                    <p className="font-semibold text-gray-900">{contract.docTitle}</p>
                    <p className="text-xs text-gray-500">
                      {contract.labels.company}: {COMPANY_NAME}
                    </p>
                    <p>{contract.intro}</p>
                    {contract.clauses.map((c, i) => (
                      <div key={i}>
                        <p className="font-medium text-gray-900">{c.heading}</p>
                        <p className="text-gray-600">{c.body}</p>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-start gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {t("agreeCheckbox")} <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>

              {/* 電子署名 */}
              <div>
                <h2 className={sectionTitle}>{t("sectionSign")}</h2>

                {/* 署名方法の選択 */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setSignMethod("reader")}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      signMethod === "reader"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {t("signMethodReader")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignMethod("screen")}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      signMethod === "screen"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {t("signMethodScreen")}
                  </button>
                </div>

                {signMethod === "screen" ? (
                  <>
                    <p className="text-sm text-gray-600 mb-2">{t("signatureLabel")}</p>
                    <SignaturePad onChange={setSignature} clearLabel={t("signatureClear")} />
                    <p className="text-xs text-gray-400 mt-1">{t("signatureHelper")}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    {t("readerFlowHelper")}
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              >
                {loading ? t("processingContract") : t("submit")}
              </button>
            </div>
          )}

          {(phase === "created" ||
            phase === "signing" ||
            phase === "cardPending" ||
            phase === "cardSaved") && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium text-sm">
                  {t("contractCreated")}
                </p>
                <p className="text-green-700 text-xs mt-1">
                  {t("contractId")}: <span className="font-mono">{contractId}</span>
                </p>
              </div>

              {pdfUrl && (
                <a
                  href={`${pdfUrl}?download=1`}
                  className="block w-full text-center border border-blue-600 text-blue-600 py-3 px-4 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  {t("downloadPdf")}
                </a>
              )}

              {/* 予約に紐づく貸渡書があれば、同じS700署名でPDFを出せる */}
              {reservationId && (
                <a
                  href={`/api/rental-agreement/by-reservation/${encodeURIComponent(
                    reservationId
                  )}/pdf?download=1`}
                  className="block w-full text-center border border-emerald-600 text-emerald-700 py-3 px-4 rounded-lg font-medium hover:bg-emerald-50 transition-colors"
                >
                  {t("downloadAgreementPdf")}
                </a>
              )}

              {/* 進行中のステップ表示（S700署名フロー） */}
              {(phase === "signing" || phase === "cardPending") && (
                <div className="text-center py-3 border border-blue-100 bg-blue-50 rounded-lg">
                  <div className="animate-spin h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-gray-700">
                    {phase === "signing" ? t("signingOnReader") : t("processingPos")}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t("stepSign")} → {t("stepCard")}
                  </p>
                </div>
              )}

              {phase !== "cardSaved" &&
                phase !== "signing" &&
                phase !== "cardPending" && (
                  <button
                    type="button"
                    onClick={signMethod === "reader" ? runReaderFlow : sendToPos}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                  >
                    {signMethod === "reader" ? t("startReaderFlow") : t("sendToPos")}
                  </button>
                )}

              {phase === "cardSaved" && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-green-800 font-semibold">{t("cardSaved")}</p>
                    {card?.last4 && (
                      <p className="text-green-700 text-sm mt-1">
                        {card.brand?.toUpperCase()} •••• {card.last4}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRoulette(true)}
                    className="w-full bg-gradient-to-r from-amber-400 to-pink-500 text-white py-3.5 px-4 rounded-lg font-bold shadow hover:opacity-95 transition"
                  >
                    🎁 {getRouletteDict(locale).spinButton}
                  </button>
                </>
              )}

              {error && lastIssue ? (
                <RecoveryPanel
                  error={error}
                  actions={recoveryActions}
                  t={tt}
                  onAction={handleRecoveryAction}
                />
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="button"
                onClick={reset}
                className="w-full text-gray-500 hover:text-gray-700 text-sm underline"
              >
                {t("startOver")}
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <a href="/" className="text-blue-600 text-sm hover:underline">
              {t("backToNormal")}
            </a>
          </div>
        </div>
      </div>

      {/* オーソリ完了で表示されるルーレット（くじ引き） */}
      <RoulettePopup
        isOpen={showRoulette}
        locale={locale}
        onClose={() => setShowRoulette(false)}
      />
    </div>
  );
}

function FileField({
  label,
  helper,
  chooseLabel,
  selectedLabel,
  value,
  onFile,
  required,
}: {
  label: string;
  helper: string;
  chooseLabel: string;
  selectedLabel: string;
  value: string | null;
  onFile: (f: File | null) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="flex items-center gap-3">
        <label className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          {chooseLabel}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {value && (
          <span className="inline-flex items-center gap-2 text-sm text-green-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="preview"
              className="h-10 w-10 object-cover rounded border border-gray-200"
            />
            {selectedLabel}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1">{helper}</p>
    </div>
  );
}

function ZeroAuthAssurance({
  t,
  feeText,
}: {
  t: (key: string) => string;
  feeText: string;
}) {
  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
        <div className="bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("todayCharge")}
          </p>
          <p className="mt-1 text-3xl font-black text-emerald-600">
            {t("zeroYen")}
          </p>
          <p className="mt-1 text-xs text-slate-500">{t("todayChargeNote")}</p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("cardCheck")}
          </p>
          <p className="mt-1 text-xl font-black text-slate-900">
            ¥{ZERO_AUTH_HOLD_AMOUNT_JPY} → {t("immediateRelease")}
          </p>
          <p className="mt-1 text-xs text-slate-500">{t("cardCheckNote")}</p>
        </div>
        <div className="bg-amber-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            {t("feeBoxTitle")}
          </p>
          <p className="mt-1 text-sm font-black text-amber-950">{feeText}</p>
          <p className="mt-1 text-xs text-amber-800">{t("feeBoxNote")}</p>
        </div>
      </div>
    </div>
  );
}

function AgreementSummary({ t }: { t: (key: string) => string }) {
  return (
    <div className="mb-3 grid gap-2 sm:grid-cols-3">
      {ZERO_AUTH_SUMMARY_KEYS.map((key, index) => (
        <div
          key={key}
          className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="mb-2 inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-slate-900 px-2 text-xs font-black text-white">
            {index === 0 ? "¥0" : index === 1 ? "!" : "S"}
          </div>
          <p className="text-sm font-black leading-tight text-slate-900">{t(key)}</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            {t(`${key}Note`)}
          </p>
        </div>
      ))}
    </div>
  );
}

function RecoveryPanel({
  error,
  actions,
  t,
  onAction,
}: {
  error: string;
  actions: RecoveryActionKey[];
  t: (key: string) => string;
  onAction: (action: RecoveryActionKey) => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-800">{error}</p>
      <p className="mt-1 text-xs text-red-700">{t("recoveryHint")}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action)}
            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            {t(`recovery.${action}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
