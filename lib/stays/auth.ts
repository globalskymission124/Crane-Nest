"use client";

// =========================================================
// ログイン（クライアント側）
//
// 照合とログイン状態の発行はすべてサーバー (/api/stays/auth) が行い、
// 署名つき Cookie (cn_session, httpOnly) を付ける。API はその Cookie で本人確認する。
// localStorage のセッションは「画面表示用のコピー」にすぎず、権限の判断には使わない。
// ページを開いたときにサーバーへ確認し、Cookie が無効ならコピーも消す。
// =========================================================
import { useEffect, useState } from "react";
import type { UserRole } from "./types";

const KEY = "stays_session_v1";

export interface StaysSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  host_id: string | null;
  passport_number?: string | null;
  password_set?: boolean;
  avatar_url?: string | null;
}

export function getSession(): StaysSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StaysSession) : null;
  } catch {
    return null;
  }
}

export function setSession(s: StaysSession | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    // ストレージが使えない環境でも Cookie 側のログインは有効
  }
  window.dispatchEvent(new Event("stays-session"));
}

async function callAuth(payload: Record<string, unknown>): Promise<StaysSession> {
  const res = await fetch("/api/stays/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "認証に失敗しました");
  return json as StaysSession;
}

async function authAndStore(payload: Record<string, unknown>): Promise<StaysSession> {
  const s = await callAuth(payload);
  setSession(s);
  return s;
}

export async function login(email: string, password: string): Promise<StaysSession> {
  return authAndStore({ action: "login", email: email.trim().toLowerCase(), password });
}

// パスポート番号 + 氏名 でログイン（パスワード未設定ゲスト向け）
export async function loginWithPassport(passportNumber: string, fullName: string): Promise<StaysSession> {
  return authAndStore({ action: "passport_login", passportNumber, fullName });
}

// 送迎アプリのパスポート登録から自動でアカウント作成 & サインイン。
// 失敗しても送迎予約の体験は止めない。
export async function autoSignInWithPassport(
  fullName: string,
  passportNumber: string,
  phone?: string
): Promise<StaysSession | null> {
  try {
    if (!passportNumber.trim() || !fullName.trim()) return null;
    return await authAndStore({ action: "passport_auto", fullName, passportNumber, phone: phone || null });
  } catch {
    return null;
  }
}

// プロフィール更新（名前 / メール / アバター / パスポート）。セッションも更新する。
// ※パスワード変更は setPassword()（サーバー側でハッシュ化）を使うこと。
export async function updateProfile(
  _userId: string,
  patch: {
    name?: string;
    email?: string;
    avatar_url?: string | null;
    passport_number?: string | null;
    nationality?: string | null;
    passport_image_url?: string | null;
  }
): Promise<StaysSession> {
  return authAndStore({ action: "profile_update", patch });
}

export async function signup(name: string, email: string, password: string): Promise<StaysSession> {
  return authAndStore({
    action: "signup",
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
  });
}

// パスワードの設定/変更（ログイン中の本人のみ。サーバー側でハッシュ化）
export async function setPassword(_userId: string, password: string): Promise<StaysSession> {
  return authAndStore({ action: "set_password", password });
}

// ゲスト → オーナー(host)への昇格（サーバー側で stays_hosts 作成と役割変更を行う）
export async function becomeHost(
  userId: string,
  profile: { name: string; email: string; phone?: string | null; avatar_url?: string | null }
): Promise<StaysSession> {
  if (!profile.name.trim()) throw new Error("屋号（表示名）を入力してください");
  if (!userId || userId.startsWith("demo-"))
    throw new Error("デモアカウントではオーナー登録できません。通常のアカウントでログインしてください");
  return authAndStore({
    action: "become_host",
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? null,
    avatar_url: profile.avatar_url ?? null,
  });
}

export function logout() {
  setSession(null);
  fetch("/api/stays/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ action: "logout" }),
  }).catch(() => {});
}

// ページを開いたら一度だけサーバーにログイン状態を確認し、表示用コピーを合わせる。
let verifyOnce: Promise<void> | null = null;
function verifyWithServer(): Promise<void> {
  if (!verifyOnce) {
    verifyOnce = fetch("/api/stays/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: "me" }),
    })
      .then(async (res) => {
        if (!res.ok) return; // サーバー不調のときは表示を変えない
        const me = (await res.json().catch(() => null)) as StaysSession | null;
        const current = getSession();
        if (!me) {
          if (current) setSession(null);
        } else if (JSON.stringify(me) !== JSON.stringify(current)) {
          setSession(me);
        }
      })
      .catch(() => {});
  }
  return verifyOnce;
}

// セッションを購読するフック。ready はサーバー確認が終わってから true になる。
export function useStaysSession(): { session: StaysSession | null; ready: boolean } {
  const [session, setState] = useState<StaysSession | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const sync = () => setState(getSession());
    sync();
    verifyWithServer().finally(() => {
      if (!alive) return;
      sync();
      setReady(true);
    });
    window.addEventListener("stays-session", sync);
    window.addEventListener("storage", sync);
    return () => {
      alive = false;
      window.removeEventListener("stays-session", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { session, ready };
}
