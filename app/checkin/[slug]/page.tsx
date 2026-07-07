"use client";

// =========================================================
// ゲスト向け: オーナー別パスポート登録ページ（QRから到達）
// 訪日外国人向けに英語メイン+日本語サブの2言語表記。
// =========================================================
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Upload } from "lucide-react";
import {
  fetchCheckinPageBySlug,
  submitCheckinGuest,
  uploadHostPassport,
  type CheckinPage,
} from "@/lib/stays/checkin";
import { useStaysSession } from "@/lib/stays/auth";
import { supabase } from "@/lib/supabase";

interface SavedPassport {
  full_name: string;
  passport_number: string;
  nationality: string;
  phone: string | null;
  email: string;
  passport_image_url: string | null;
}

export default function GuestCheckinPage({ params }: { params: { slug: string } }) {
  const [page, setPage] = useState<CheckinPage | null | undefined>(undefined);
  const [fullName, setFullName] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [nationality, setNationality] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [checkinDate, setCheckinDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { session } = useStaysSession();
  const [saved, setSaved] = useState<SavedPassport | null>(null);
  const [useForm, setUseForm] = useState(false);

  useEffect(() => {
    fetchCheckinPageBySlug(params.slug).then((p) => setPage(p && p.is_active ? p : null));
  }, [params.slug]);

  // ログイン済みでプロフィールにパスポート保存済みなら「ワンタップチェックイン」を提示
  useEffect(() => {
    if (!session) return;
    supabase
      .from("stays_users")
      .select("name,passport_number,nationality,phone,email,passport_image_url")
      .eq("id", session.id)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as any;
        if (d?.passport_number) {
          setSaved({
            full_name: d.name,
            passport_number: d.passport_number,
            nationality: d.nationality || "",
            phone: d.phone || null,
            email: d.email,
            passport_image_url: d.passport_image_url || null,
          });
        }
      });
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ワンタップチェックイン: 保存済み情報をそのままホストへ転送
  async function oneTapCheckin() {
    if (!page || !saved) return;
    if (page.require_photo && !saved.passport_image_url) {
      // 写真必須なのに未保存 → フォームに切替（他項目は自動入力済み）
      setFullName(saved.full_name);
      setPassportNo(saved.passport_number);
      setNationality(saved.nationality);
      setPhone(saved.phone || "");
      setEmail(saved.email.endsWith("@passport.guest") ? "" : saved.email);
      setUseForm(true);
      alert("Please add a photo of your passport to complete check-in.\nパスポート写真のみ追加が必要です。");
      return;
    }
    setSubmitting(true);
    try {
      await submitCheckinGuest({
        page_id: page.id,
        host_id: page.host_id,
        full_name: saved.full_name,
        passport_number: saved.passport_number,
        nationality: saved.nationality,
        phone: saved.phone,
        email: saved.email.endsWith("@passport.guest") ? null : saved.email,
        checkin_date: new Date().toISOString().slice(0, 10),
        passport_image_url: saved.passport_image_url,
      });
      setDone(true);
    } catch (e: any) {
      alert("Submission failed: " + (e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePhoto(file: File) {
    setUploading(true);
    try {
      setPhotoUrl(await uploadHostPassport(file));
    } catch (e: any) {
      alert("Upload failed: " + (e?.message || e));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!page) return;
    if (!fullName.trim() || !passportNo.trim()) return alert("Please enter your name and passport number.");
    if (page.require_phone && !phone.trim()) return alert("Please enter your phone number.");
    if (page.require_photo && !photoUrl) return alert("Please upload a photo of your passport.");
    setSubmitting(true);
    try {
      await submitCheckinGuest({
        page_id: page.id,
        host_id: page.host_id,
        full_name: fullName.trim(),
        passport_number: passportNo.trim().toUpperCase(),
        nationality: nationality.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        checkin_date: checkinDate || null,
        passport_image_url: photoUrl,
      });
      setDone(true);
    } catch (e: any) {
      alert("Submission failed: " + (e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  if (page === undefined)
    return <p className="py-24 text-center text-slate-400">Loading…</p>;
  if (page === null)
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <p className="font-bold text-slate-700">This check-in page is not available.</p>
        <p className="mt-1 text-sm text-slate-400">このチェックインページは現在利用できません。</p>
      </div>
    );

  if (done)
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-500" />
        <h1 className="text-xl font-extrabold text-slate-800">Registration complete!</h1>
        <p className="mt-1 text-sm text-slate-500">登録が完了しました。ご協力ありがとうございます。</p>
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          Your information has been securely sent to your host. Enjoy your stay!
        </p>
      </div>
    );

  const field = "mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm";

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto max-w-md px-5 pt-10">
        {page.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.logo_url} alt="" className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover" />
        )}
        <h1 className="text-center text-2xl font-extrabold text-slate-900">{page.title}</h1>
        {page.welcome_message && (
          <p className="mt-2 whitespace-pre-wrap text-center text-sm text-slate-500">{page.welcome_message}</p>
        )}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Passport registration is required by Japanese law for foreign guests.
        </p>

        {/* ワンタップチェックイン（プロフィールにパスポート保存済みの場合） */}
        {saved && !useForm && (
          <div className="mt-6 rounded-3xl border-2 border-brand-200 bg-white p-5 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600">One-tap check-in</p>
            <p className="mt-2 text-lg font-extrabold text-slate-900">{saved.full_name}</p>
            <p className="font-mono text-sm text-slate-500">
              {saved.passport_number}{saved.nationality && ` · ${saved.nationality}`}
              {saved.passport_image_url && " · 📷"}
            </p>
            <button
              onClick={oneTapCheckin}
              disabled={submitting}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 py-4 text-sm font-bold text-white shadow-lg disabled:opacity-50"
            >
              {submitting ? "Sending…" : "✓ Check in with saved passport / 保存済み情報でチェックイン"}
            </button>
            <button onClick={() => setUseForm(true)} className="mt-3 text-xs text-slate-400 underline">
              Use different details / 別の情報で登録する
            </button>
          </div>
        )}

        <div className={`mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${saved && !useForm ? "hidden" : ""}`}>
          <label className="block text-xs font-bold text-slate-600">
            Full name (as in passport) <span className="font-normal text-slate-400">/ 氏名</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="TARO YAMADA" className={field} />
          </label>
          <label className="mt-3 block text-xs font-bold text-slate-600">
            Passport number <span className="font-normal text-slate-400">/ 旅券番号</span>
            <input value={passportNo} onChange={(e) => setPassportNo(e.target.value)} placeholder="AB1234567" className={`${field} font-mono uppercase`} />
          </label>
          <label className="mt-3 block text-xs font-bold text-slate-600">
            Nationality <span className="font-normal text-slate-400">/ 国籍</span>
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Taiwan" className={field} />
          </label>
          <label className="mt-3 block text-xs font-bold text-slate-600">
            Phone {page.require_phone ? "" : "(optional) "}<span className="font-normal text-slate-400">/ 電話番号</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+886 912 345 678" className={field} />
          </label>
          <label className="mt-3 block text-xs font-bold text-slate-600">
            Email (optional) <span className="font-normal text-slate-400">/ メール</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={field} />
          </label>
          <label className="mt-3 block text-xs font-bold text-slate-600">
            Check-in date <span className="font-normal text-slate-400">/ チェックイン日</span>
            <input value={checkinDate} onChange={(e) => setCheckinDate(e.target.value)} type="date" className={field} />
          </label>

          <div className="mt-4">
            <p className="text-xs font-bold text-slate-600">
              Passport photo {page.require_photo ? "" : "(optional) "}
              <span className="font-normal text-slate-400">/ パスポート写真</span>
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={`mt-1 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-6 text-sm font-semibold ${
                photoUrl ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-500"
              }`}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
              ) : photoUrl ? (
                <><CheckCircle2 className="h-4 w-4" /> Photo uploaded ✓ (tap to replace)</>
              ) : (
                <><Upload className="h-4 w-4" /> Take a photo / choose an image</>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhoto(f);
                e.target.value = "";
              }}
            />
          </div>

          <button
            onClick={submit}
            disabled={submitting || uploading}
            className="mt-5 w-full rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit / 登録する"}
          </button>
          <p className="mt-2 text-center text-[10px] text-slate-400">
            Your information is shared only with your host for legal check-in records.
          </p>
        </div>
      </div>
    </div>
  );
}
