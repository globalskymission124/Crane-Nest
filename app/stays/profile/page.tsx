"use client";

// =========================================================
// ゲストプロフィール
// 氏名・メールの変更、パスワードの設定/変更（パスポート自動作成
// アカウントは初回ここでパスワードを設定する）
// =========================================================
import { useEffect, useState } from "react";
import { BadgeCheck, Coins, Gift, KeyRound, ShieldAlert, UserCircle2 } from "lucide-react";
import AuthGuard from "@/components/stays/AuthGuard";
import { updateProfile, useStaysSession } from "@/lib/stays/auth";
import { audit, ensureReferralCode, fetchPointsBalance } from "@/lib/stays/v2";

function ProfileBody() {
  const { session } = useStaysSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [points, setPoints] = useState(0);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (session) {
      setName(session.name);
      // 内部発行の仮メール（xxx@passport.guest）は空欄表示にして本メール入力を促す
      setEmail(session.email.endsWith("@passport.guest") ? "" : session.email);
      fetchPointsBalance(session.email).then(setPoints);
      ensureReferralCode(session.id).then(setRefCode);
    }
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function copyInvite() {
    if (!refCode) return;
    const url = `${window.location.origin}/stays/login?ref=${refCode}`;
    await navigator.clipboard.writeText(`Crane Nestで宿を予約しませんか? 紹介コード ${refCode} で登録するとポイントがもらえます → ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!session) return null;
  const isPseudoEmail = session.email.endsWith("@passport.guest");

  async function saveBasic() {
    if (!session) return;
    if (!name.trim()) return setMsg({ ok: false, text: "お名前を入力してください" });
    setSaving(true);
    setMsg(null);
    try {
      const patch: { name: string; email?: string } = { name };
      if (email.trim()) patch.email = email;
      await updateProfile(session.id, patch);
      await audit(session.email, session.role, "profile.update", session.id);
      setMsg({ ok: true, text: "プロフィールを保存しました" });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "保存に失敗しました" });
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (!session) return;
    if (pw1.length < 6) return setMsg({ ok: false, text: "パスワードは6文字以上にしてください" });
    if (pw1 !== pw2) return setMsg({ ok: false, text: "確認用パスワードが一致しません" });
    setSaving(true);
    setMsg(null);
    try {
      await updateProfile(session.id, { password: pw1 });
      await audit(session.email, session.role, "profile.password_set", session.id);
      setPw1("");
      setPw2("");
      setMsg({ ok: true, text: "パスワードを設定しました。次回からメール（またはパスポート番号）+パスワードでログインできます" });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "保存に失敗しました" });
    } finally {
      setSaving(false);
    }
  }

  const field = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-extrabold">
        <UserCircle2 className="h-6 w-6 text-brand-600" /> プロフィール
      </h1>
      <p className="mb-5 text-sm text-slate-500">アカウント情報とログイン設定を管理します。</p>

      {!session.password_set && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            パスワードが未設定です。このブラウザではログイン状態が保持されますが、
            別の端末から利用するにはパスワードの設定（または「パスポート番号でログイン」）が必要です。
          </span>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
            <Coins className="h-4 w-4" /> ポイント残高
          </p>
          <p className="mt-1 text-2xl font-extrabold text-amber-700">{points.toLocaleString()}<span className="text-sm font-bold"> pt</span></p>
          <p className="text-[10px] text-amber-600">1pt = ¥1として予約時に利用できます</p>
        </div>
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-brand-700">
            <Gift className="h-4 w-4" /> 友達紹介
          </p>
          <p className="mt-1 font-mono text-xl font-extrabold tracking-widest text-brand-700">{refCode || "…"}</p>
          <button onClick={copyInvite} className="mt-1 rounded-lg bg-brand-600 px-3 py-1 text-[11px] font-bold text-white">
            {copied ? "コピーしました ✓" : "招待リンクをコピー"}
          </button>
        </div>
      </div>

      {session.passport_number && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <BadgeCheck className="h-4 w-4 text-emerald-600" />
          パスポート登録済み: <span className="font-mono font-semibold">{session.passport_number}</span>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-slate-700">基本情報</h2>
        <label className="block text-xs font-semibold text-slate-500">お名前
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        <label className="mt-3 block text-xs font-semibold text-slate-500">
          メールアドレス{isPseudoEmail && "（未設定 — 通知や予約確認に使われます）"}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder={isPseudoEmail ? "your@email.com" : ""}
            className={field}
          />
        </label>
        <button
          onClick={saveBasic}
          disabled={saving}
          className="mt-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          保存
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <KeyRound className="h-4 w-4" /> パスワード{session.password_set ? "の変更" : "の設定"}
        </h2>
        <label className="block text-xs font-semibold text-slate-500">新しいパスワード（6文字以上）
          <input value={pw1} onChange={(e) => setPw1(e.target.value)} type="password" className={field} />
        </label>
        <label className="mt-3 block text-xs font-semibold text-slate-500">新しいパスワード（確認）
          <input value={pw2} onChange={(e) => setPw2(e.target.value)} type="password" className={field} />
        </label>
        <button
          onClick={savePassword}
          disabled={saving}
          className="mt-4 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {session.password_set ? "パスワードを変更" : "パスワードを設定"}
        </button>
      </div>

      {msg && (
        <p className={`mt-4 rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard roles={["guest", "host", "admin"]}>
      <ProfileBody />
    </AuthGuard>
  );
}
