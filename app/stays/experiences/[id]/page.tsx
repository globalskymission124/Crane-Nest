"use client";

// =========================================================
// ゲスト：体験の詳細 + 予約リクエスト
// =========================================================
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Users, CheckCircle2 } from "lucide-react";
import StaysMap from "@/components/stays/StaysMap";
import { fetchExperience, createExperienceBooking } from "@/lib/stays/experiences";
import { fetchHost } from "@/lib/stays/queries";
import { notify } from "@/lib/stays/v2";
import { todayStr } from "@/lib/stays/availability";
import { useStaysSession } from "@/lib/stays/auth";
import { useCurrency } from "@/lib/stays/currency";
import { EXPERIENCE_CATEGORY_LABELS, formatJPY, type Experience, type Host } from "@/lib/stays/types";

export default function ExperienceDetailPage({ params }: { params: { id: string } }) {
  const { session } = useStaysSession();
  const { fmt } = useCurrency();
  const [exp, setExp] = useState<Experience | null>(null);
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [guests, setGuests] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const e = await fetchExperience(params.id);
      setExp(e);
      if (e) setHost(await fetchHost(e.host_id));
      setLoading(false);
    })();
  }, [params.id]);

  useEffect(() => {
    if (session) {
      setName((n) => n || session.name);
      setEmail((v) => v || (session.email.endsWith("@passport.guest") ? "" : session.email));
    }
  }, [session]);

  if (loading) return <p className="py-20 text-center text-slate-400">読み込み中…</p>;
  if (!exp)
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">体験が見つかりませんでした。</p>
        <Link href="/stays/experiences" className="mt-2 inline-block text-brand-600 underline">一覧に戻る</Link>
      </div>
    );

  const total = exp.price_per_person * guests;

  async function submit() {
    if (!exp) return;
    if (!name.trim() || !email.trim()) return alert("お名前とメールを入力してください");
    if (!date) return alert("希望日を選択してください");
    if (guests < 1 || guests > exp.max_guests) return alert(`人数は1〜${exp.max_guests}名で選択してください`);
    setSubmitting(true);
    try {
      await createExperienceBooking({
        experience_id: exp.id,
        guest_name: name.trim(),
        guest_email: email.trim().toLowerCase(),
        date,
        time,
        guests_count: guests,
        total_price: total,
      });
      if (host?.email) {
        await notify(
          host.email,
          "体験の予約リクエスト",
          `${exp.title} ${date} ${time}・${guests}名・${formatJPY(total)}`,
          "/host/experiences"
        );
      }
      setDone(true);
    } catch (e: any) {
      alert("予約に失敗しました: " + (e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/stays/experiences" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> 体験一覧へ
      </Link>

      {/* 写真 */}
      <div className="overflow-hidden rounded-2xl bg-slate-100">
        <div className="aspect-[1.9]">
          {exp.photos[activePhoto] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={exp.photos[activePhoto]} alt={exp.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">No Image</div>
          )}
        </div>
      </div>
      {exp.photos.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {exp.photos.map((p, i) => (
            <button key={i} onClick={() => setActivePhoto(i)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${i === activePhoto ? "border-brand-500" : "border-transparent"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* 本文 */}
        <div className="flex flex-col gap-5">
          <div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
              {EXPERIENCE_CATEGORY_LABELS[exp.category]}
            </span>
            <h1 className="mt-2 text-2xl font-extrabold">{exp.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {exp.city}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> 約{Math.round(exp.duration_minutes / 60 * 10) / 10}時間</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> 最大{exp.max_guests}名</span>
            </p>
          </div>

          {host && (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
                {host.name.charAt(0)}
              </div>
              <p className="font-semibold">ホスト: {host.name}</p>
            </div>
          )}

          <div>
            <h2 className="mb-2 text-lg font-bold">体験内容</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{exp.description}</p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-bold">集合場所</h2>
            <p className="text-sm text-slate-600">{exp.meeting_point || "予約確定後にご案内します"}</p>
            {exp.lat != null && exp.lng != null && (
              <StaysMap
                markers={[{ id: exp.id, lat: exp.lat, lng: exp.lng, title: exp.title, price: exp.price_per_person }]}
                center={[exp.lat, exp.lng]}
                zoom={14}
                className="mt-3 h-64 w-full overflow-hidden rounded-2xl border border-slate-200"
              />
            )}
          </div>
        </div>

        {/* 予約ウィジェット */}
        <div className="lg:sticky lg:top-24 h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {done ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-500" />
              <p className="font-bold text-slate-800">予約リクエストを送信しました</p>
              <p className="mt-1 text-sm text-slate-500">ホストの承認をお待ちください。</p>
              <Link href="/stays/experiences" className="mt-4 inline-block text-sm font-semibold text-brand-600 underline">
                他の体験を見る
              </Link>
            </div>
          ) : (
            <>
              <p className="text-xl font-black">
                {fmt(exp.price_per_person)}<span className="text-sm font-semibold text-slate-500"> / 1名</span>
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-500">
                  希望日
                  <input type="date" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-semibold text-slate-500">
                    時間
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
                  </label>
                  <label className="text-xs font-semibold text-slate-500">
                    人数
                    <input type="number" min={1} max={exp.max_guests} value={guests} onChange={(e) => setGuests(Math.max(1, Math.min(exp.max_guests, Number(e.target.value))))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
                  </label>
                </div>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="お名前" className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メールアドレス" type="email" className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                <span className="text-slate-500">{fmt(exp.price_per_person)} × {guests}名</span>
                <span className="font-bold text-slate-900">{fmt(total)}</span>
              </div>

              <button
                onClick={submit}
                disabled={submitting}
                className="mt-3 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3 font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "送信中…" : "予約をリクエスト"}
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-400">今は予約リクエストのみ。ホスト承認後に確定します。</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
