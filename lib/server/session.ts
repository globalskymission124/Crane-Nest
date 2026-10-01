import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/stays/types";
import { supabaseAdmin } from "./admin";

// =========================================================
// サーバーで検証できるログイン状態（署名つき Cookie）
//
// これまでのログイン状態はブラウザの localStorage だけにあり、
// 書き換えれば誰でも管理者になれた。API ルートはこの Cookie を検証して
// 「誰が・どの役割で」呼んでいるかを判断する。
//   Cookie: cn_session = base64url(JSON) + "." + HMAC-SHA256
//   鍵: STAYS_SESSION_SECRET（32文字以上のランダム文字列）
// =========================================================

export const SESSION_COOKIE = "cn_session";
export const noStore = { "cache-control": "no-store" };
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30日

export interface ServerSession {
  id: string;
  role: UserRole;
  host_id: string | null;
  email: string;
  exp: number; // UNIX秒
}

function secret(): string {
  const s = process.env.STAYS_SESSION_SECRET || "";
  if (s.length < 32) throw new Error("STAYS_SESSION_SECRET が未設定か短すぎます（32文字以上）");
  return s;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function encodeSession(s: Omit<ServerSession, "exp">): string {
  const payload: ServerSession = { ...s, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined | null): ServerSession | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  let expected: string;
  try {
    expected = sign(body);
  } catch {
    return null;
  }
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString()) as ServerSession;
    if (!s?.id || !s.role || s.exp < Math.floor(Date.now() / 1000)) return null;
    return s;
  } catch {
    return null;
  }
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function getServerSession(req: Request): ServerSession | null {
  const s = decodeSession(readCookie(req, SESSION_COOKIE));
  // デモアカウントは STAYS_DEMO_LOGIN=1 のときだけ有効
  if (s && s.id.startsWith("demo-") && process.env.STAYS_DEMO_LOGIN !== "1") return null;
  return s;
}

export function setSessionCookie(res: NextResponse, s: Omit<ServerSession, "exp">): NextResponse {
  res.cookies.set(SESSION_COOKIE, encodeSession(s), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

// 役割チェック。OK ならセッション、NG なら返すべきエラーレスポンス。
// Cookie の役割だけを信じず、毎回 DB の現在の役割・停止状態を確認する
// （降格・停止がすぐ効くように）。
export async function requireRole(
  req: Request,
  roles: UserRole[]
): Promise<{ session: ServerSession; error: null } | { session: null; error: NextResponse }> {
  const deny = (msg: string, status: number) => ({
    session: null,
    error: NextResponse.json({ error: msg }, { status, headers: noStore }),
  });
  const session = getServerSession(req);
  if (!session) return deny("ログインが必要です", 401);
  if (!session.id.startsWith("demo-")) {
    const { data } = await supabaseAdmin()
      .from("stays_users")
      .select("role, host_id, is_suspended")
      .eq("id", session.id)
      .maybeSingle();
    const u = data as { role: UserRole; host_id: string | null; is_suspended: boolean | null } | null;
    if (!u || u.is_suspended) return deny("ログインが必要です", 401);
    session.role = u.role;
    session.host_id = u.host_id;
  }
  if (!roles.includes(session.role)) return deny("権限がありません", 403);
  return { session, error: null };
}


