"use client";

// =========================================================
// オーナー登録（ゲスト → ホスト昇格）
// ログイン済みゲストが屋号・連絡先を登録すると、
// 自分名義のホストになり /host で物件を公開できるようになる。
// =========================================================
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { becomeHost, useStaysSession } from "@/lib/stays/auth";

export default function BecomeHostPage() {
  const router = useRouter();
  const { session, ready } = useStaysSession();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!session) return;
    if (!name.trim()) return setError("屋号（表示名）を入力してください");
    setBusy(true);
    setError(null);
    try {
      const s = await becomeHost(session.id, {
        name: name.trim(),
        email: session.email,
        phone: phone.trim() || null,
        avatar_url: session.avatar_url ?? null,
      });
      router.push(s.role === "host" ? "/host" : "/stays");
    } catch (e: any) {
      setError(e?.message || "オーナー登録に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <p className="py-20 text-center text-slate-400">読み込み中…</p>;

  // 未ログイン → ログインへ誘導
  if (!session) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="font-semibold text-slate-700">オーナー登録にはログインが必要です</p>
        <p className="mt-1 text-sm text-slate-500">まずゲストアカウントでログインしてください。</p>
        <Link
          href="/stays/login"
          className="mt-4 inline-block rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          ログインページへ
        </Link>
      </div>
    );
  }

  // 既にオーナー/管理者 → そのまま管理画面へ
  if (session.role === "host" || session.role === "admin") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
        <p className="font-semibold text-slate-700">すでにオーナーとして登録済みです</p>
        <Link
          href="/host"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          オーナー管理へ <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
          <Building2 className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-extrabold">オーナー登録</h1>
        <p className="mt-2 text-sm text-slate-500">
          屋号と連絡先を登録すると、あなた名義で物件を掲載・公開できるようになります。
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-xs font-semibold text-slate-500">
          屋号 / 表示名
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={session.name || "例：Crane Nest 大阪"}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold text-slate-500">
          電話番号（任意）
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            inputMode="tel"
            placeholder="例：080-1234-5678"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>
        <p className="mt-3 text-xs text-slate-400">
          登録メール：<span className="font-medium text-slate-600">{session.email}</span>
        </p>

        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "登録中…" : "オーナーになる"}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        登録後はいつでもゲスト画面とオーナー管理を切り替えられます。
      </p>
    </div>
  );
}
