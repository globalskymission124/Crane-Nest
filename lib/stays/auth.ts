"use client";

// =========================================================
// 簡易認証（デモ用）
// stays_users テーブルに対して照合し、セッションを localStorage に保持。
// パスポート登録（送迎アプリ）からの自動サインインにも対応。
// 本番では Supabase Auth へ移行すること。
// =========================================================
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { StaysUser, UserRole } from "./types";

const KEY = "stays_session_v1";

const DEMO_SESSIONS: Record<string, StaysSession> = {
  "guest@demo.com": {
    id: "demo-guest",
    name: "Hiroshi",
    email: "guest@demo.com",
    role: "guest",
    host_id: null,
    password_set: true,
    avatar_url: null,
  },
  "host@demo.com": {
    id: "demo-host",
    name: "Crane Nest Host",
    email: "host@demo.com",
    role: "host",
    host_id: "11111111-1111-1111-1111-111111111111",
    password_set: true,
    avatar_url: null,
  },
  "admin@demo.com": {
    id: "demo-admin",
    name: "Platform Admin",
    email: "admin@demo.com",
    role: "admin",
    host_id: "11111111-1111-1111-1111-111111111111",
    password_set: true,
    avatar_url: null,
  },
};

function demoLogin(email: string, password: string): StaysSession | null {
  if (password !== "demo123") return null;
  return DEMO_SESSIONS[email.trim().toLowerCase()] || null;
}

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
  if (s) localStorage.setItem(KEY, JSON.stringify(s));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("stays-session"));
}

function toSession(u: any): StaysSession {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    host_id: u.host_id,
    passport_number: u.passport_number ?? null,
    password_set: !!u.password,
    avatar_url: u.avatar_url ?? null,
  };
}

// パスワードはサーバー側 (/api/stays/auth) で bcrypt 照合する。
// クライアントは平文パスワードをDBと直接照合しない。
async function callAuth(payload: Record<string, unknown>): Promise<StaysSession> {
  const res = await fetch("/api/stays/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "認証に失敗しました");
  return json as StaysSession;
}

export async function login(email: string, password: string): Promise<StaysSession> {
  const normalizedEmail = email.trim().toLowerCase();
  // デモアカウントはクライアント側で完結（DB不要）
  const demo = demoLogin(normalizedEmail, password);
  if (demo) {
    setSession(demo);
    return demo;
  }
  const s = await callAuth({ action: "login", email: normalizedEmail, password });
  setSession(s);
  return s;
}

// パスポート番号 + 氏名 でログイン（パスワード未設定ゲスト向け）
export async function loginWithPassport(passportNumber: string, fullName: string): Promise<StaysSession> {
  const { data, error } = await supabase
    .from("stays_users")
    .select("*")
    .eq("passport_number", passportNumber.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("このパスポート番号のアカウントが見つかりません");
  const u = data as any;
  if (u.is_suspended) throw new Error("このアカウントは停止されています");
  if (u.name.trim().toLowerCase() !== fullName.trim().toLowerCase())
    throw new Error("氏名が一致しません（パスポート登録時と同じ表記で入力してください）");
  const s = toSession(u);
  setSession(s);
  return s;
}

// 送迎アプリのパスポート登録から自動でアカウント作成 & サインイン。
// メール未入力のため、パスポート番号から内部用メールを発行する
// （後からプロフィールで本メール・パスワードに変更可能）。
export async function autoSignInWithPassport(
  fullName: string,
  passportNumber: string,
  phone?: string
): Promise<StaysSession | null> {
  try {
    const pn = passportNumber.trim().toUpperCase();
    if (!pn || !fullName.trim()) return null;

    const { data: existing } = await supabase
      .from("stays_users")
      .select("*")
      .eq("passport_number", pn)
      .maybeSingle();

    if (existing) {
      const s = toSession(existing);
      setSession(s);
      return s;
    }

    const pseudoEmail = `${pn.toLowerCase()}@passport.guest`;
    const { data, error } = await supabase
      .from("stays_users")
      .insert({
        name: fullName.trim(),
        email: pseudoEmail,
        password: null,
        role: "guest",
        passport_number: pn,
        phone: phone || null,
      })
      .select()
      .single();
    if (error || !data) return null;
    const s = toSession(data);
    setSession(s);
    return s;
  } catch {
    return null; // 自動サインイン失敗は送迎予約の体験を止めない
  }
}

// プロフィール更新（名前 / メール / アバター / パスポート）。セッションも更新する。
// ※パスワード変更は setPassword()（サーバー側でハッシュ化）を使うこと。
export async function updateProfile(
  userId: string,
  patch: {
    name?: string;
    email?: string;
    avatar_url?: string | null;
    passport_number?: string | null;
    nationality?: string | null;
    passport_image_url?: string | null;
  }
): Promise<StaysSession> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.email !== undefined) payload.email = patch.email.trim().toLowerCase();
  if (patch.avatar_url !== undefined) payload.avatar_url = patch.avatar_url;
  if (patch.passport_number !== undefined)
    payload.passport_number = patch.passport_number ? patch.passport_number.trim().toUpperCase() : null;
  if (patch.nationality !== undefined) payload.nationality = patch.nationality;
  if (patch.passport_image_url !== undefined) payload.passport_image_url = patch.passport_image_url;
  const { data, error } = await supabase
    .from("stays_users")
    .update(payload)
    .eq("id", userId)
    .select()
    .single();
  if (error) {
    if ((error as any).code === "23505") throw new Error("このメールアドレスは既に使われています");
    throw error;
  }
  const s = toSession(data);
  setSession(s);
  return s;
}

export async function signup(name: string, email: string, password: string): Promise<StaysSession> {
  const s = await callAuth({
    action: "signup",
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
  });
  setSession(s);
  return s;
}

// パスワードの設定/変更（サーバー側でハッシュ化）。セッションも更新する。
export async function setPassword(userId: string, password: string): Promise<StaysSession> {
  const s = await callAuth({ action: "set_password", userId, password });
  setSession(s);
  return s;
}

// ゲスト → オーナー(host)への昇格。
// 1) stays_hosts に本人のホストレコードを作成
// 2) stays_users の role を host、host_id を新規ホストIDに更新
// 3) セッションを更新（以後 /host にアクセス可能・物件を自分名義で公開可能）
export async function becomeHost(
  userId: string,
  profile: { name: string; email: string; phone?: string | null; avatar_url?: string | null }
): Promise<StaysSession> {
  const name = profile.name.trim();
  const email = profile.email.trim().toLowerCase();
  if (!name) throw new Error("屋号（表示名）を入力してください");
  if (!userId || userId.startsWith("demo-"))
    throw new Error("デモアカウントではオーナー登録できません。通常のアカウントでログインしてください");

  // 既に同じメールのホストが存在すれば再利用（重複作成を防ぐ）
  const { data: existingHost } = await supabase
    .from("stays_hosts")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  let hostId: string;
  if (existingHost) {
    hostId = (existingHost as any).id;
  } else {
    const { data: host, error: hErr } = await supabase
      .from("stays_hosts")
      .insert({
        name,
        email,
        phone: profile.phone?.trim() || null,
        avatar_url: profile.avatar_url ?? null,
      })
      .select()
      .single();
    if (hErr || !host) throw hErr || new Error("オーナー情報の作成に失敗しました");
    hostId = (host as any).id;
  }

  const { data: user, error: uErr } = await supabase
    .from("stays_users")
    .update({ role: "host", host_id: hostId })
    .eq("id", userId)
    .select()
    .single();
  if (uErr || !user) throw uErr || new Error("アカウントの更新に失敗しました");

  const s = toSession(user);
  setSession(s);
  return s;
}

export function logout() {
  setSession(null);
}

// セッションを購読するフック
export function useStaysSession(): { session: StaysSession | null; ready: boolean } {
  const [session, setState] = useState<StaysSession | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setState(getSession());
    sync();
    setReady(true);
    window.addEventListener("stays-session", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("stays-session", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { session, ready };
}
