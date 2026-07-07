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

export async function login(email: string, password: string): Promise<StaysSession> {
  const { data, error } = await supabase
    .from("stays_users")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("メールまたはパスワードが違います");
  const u = data as any;
  if (u.is_suspended) throw new Error("このアカウントは停止されています");
  if (!u.password)
    throw new Error(
      "このアカウントはパスワード未設定です。「パスポート番号でログイン」をご利用いただくか、ログイン後にプロフィールでパスワードを設定してください"
    );
  if (u.password !== password) throw new Error("メールまたはパスワードが違います");
  const s = toSession(u);
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

// プロフィール更新（名前 / メール / パスワード）。セッションも更新する。
export async function updateProfile(
  userId: string,
  patch: {
    name?: string;
    email?: string;
    password?: string;
    avatar_url?: string | null;
    passport_number?: string | null;
    nationality?: string | null;
    passport_image_url?: string | null;
  }
): Promise<StaysSession> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.email !== undefined) payload.email = patch.email.trim().toLowerCase();
  if (patch.password !== undefined) payload.password = patch.password;
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
  const { data, error } = await supabase
    .from("stays_users")
    .insert({ name: name.trim(), email: email.trim().toLowerCase(), password, role: "guest" })
    .select()
    .single();
  if (error) {
    if ((error as any).code === "23505") throw new Error("このメールは既に登録されています");
    throw error;
  }
  const s = toSession(data);
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
