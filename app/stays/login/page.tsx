"use client";

// 簡易ログイン / 新規登録（デモ）
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ScanLine, UserPlus } from "lucide-react";
import { login, loginWithPassport, signup, useStaysSession, logout } from "@/lib/stays/auth";
import { applyReferral } from "@/lib/stays/v2";
import { useStaysT } from "@/lib/stays/i18n";
import { useEffect } from "react";

const DEMO_ACCOUNTS = [
  { role: "ゲスト", email: "guest@demo.com", to: "/stays" },
  { role: "オーナー", email: "host@demo.com", to: "/host" },
  { role: "管理者", email: "admin@demo.com", to: "/admin/stays" },
];

export default function LoginPage() {
  const router = useRouter();
  const { session } = useStaysSession();
  const { t } = useStaysT();
  const [mode, setMode] = useState<"login" | "signup" | "passport">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [refInput, setRefInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 招待リンク（?ref=CODE）からの流入なら紹介コードを自動入力し新規登録モードへ
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      setRefInput(ref.toUpperCase());
      setMode("signup");
    }
  }, []);

  async function submit(em = email, pw = password) {
    setBusy(true);
    setError(null);
    try {
      const isSignup = mode === "signup" && em === email;
      const s =
        mode === "passport"
          ? await loginWithPassport(passportNo, name)
          : isSignup
            ? await signup(name, em, pw)
            : await login(em, pw);
      if (isSignup && refInput.trim()) {
        await applyReferral(s.id, s.email, refInput);
      }
      router.push(s.role === "admin" ? "/admin/stays" : s.role === "host" ? "/host" : "/stays");
    } catch (e: any) {
      setError(e?.message || "ログインに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  if (session) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-semibold text-slate-700">
          {session.name}（{session.role}）としてログイン中です
        </p>
        <button
          onClick={() => logout()}
          className="mt-4 rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="text-center text-2xl font-extrabold">
        {mode === "login" ? t.loginTitle : mode === "passport" ? t.passportLoginTitle : t.signupTitle}
      </h1>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {mode === "passport" ? (
          <>
            <p className="mb-3 text-xs text-slate-500">
              {t.passportLoginHint}
            </p>
            <input
              value={passportNo}
              onChange={(e) => setPassportNo(e.target.value)}
              placeholder={t.passportNoPh}
              className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono uppercase"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.passportNamePh}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
          </>
        ) : (
          <>
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePh}
                className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPh}
              type="email"
              className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPh}
              type="password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
            {mode === "signup" && (
              <input
                value={refInput}
                onChange={(e) => setRefInput(e.target.value.toUpperCase())}
                placeholder={t.refCodePh}
                className="mt-2 w-full rounded-lg border border-dashed border-brand-300 px-3 py-2.5 font-mono text-sm uppercase"
              />
            )}
          </>
        )}
        {error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}
        <button
          onClick={() => submit()}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3 font-semibold text-white disabled:opacity-50"
        >
          {mode === "signup" ? <UserPlus className="h-4 w-4" /> : mode === "passport" ? <ScanLine className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          {busy ? "…" : mode === "signup" ? t.signupBtn : t.loginBtn}
        </button>
        <div className="mt-3 flex flex-col gap-1 text-center text-xs">
          {mode !== "passport" && (
            <button onClick={() => { setMode("passport"); setError(null); }} className="text-brand-600 underline">
              {t.toPassport}
            </button>
          )}
          {mode !== "signup" && (
            <button onClick={() => { setMode("signup"); setError(null); }} className="text-brand-600 underline">
              {t.toSignup}
            </button>
          )}
          {mode !== "login" && (
            <button onClick={() => { setMode("login"); setError(null); }} className="text-brand-600 underline">
              {t.toLogin}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="mb-2 text-xs font-bold text-slate-500">{t.demoAccounts}</p>
        <div className="grid gap-1.5">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              onClick={() => submit(a.email, "demo123")}
              className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm shadow-sm hover:bg-brand-50"
            >
              <span className="font-semibold text-slate-700">{a.role}</span>
              <span className="text-xs text-slate-400">{a.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
