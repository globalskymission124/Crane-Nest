import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

// =========================================================
// 認証（パスワードのハッシュ化）
//
// パスワードは bcrypt でハッシュ化して stays_users.password に保存する。
// 既存の平文パスワードは、ログイン成功時に自動でハッシュへ移行する
// （lazy migration）。ハッシュ処理はサーバー側でのみ行い、
// クライアントには password ハッシュを返さない。
// =========================================================

export const runtime = "nodejs";

const SALT_ROUNDS = 10;
const MIN_PASSWORD = 6;

// クライアントに返す安全なユーザー表現（password ハッシュは含めない）
function sanitize(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    host_id: u.host_id ?? null,
    passport_number: u.passport_number ?? null,
    password_set: !!u.password,
    avatar_url: u.avatar_url ?? null,
  };
}

// bcrypt ハッシュかどうか（$2a$ / $2b$ / $2y$ で始まる）
function isHashed(p: unknown): p is string {
  return typeof p === "string" && /^\$2[aby]\$/.test(p);
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const action = String(body?.action || "");
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  // ---- 新規登録 ----
  if (action === "signup") {
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "お名前を入力してください" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "メールアドレスを入力してください" }, { status: 400 });
    if (password.length < MIN_PASSWORD)
      return NextResponse.json({ error: `パスワードは${MIN_PASSWORD}文字以上にしてください` }, { status: 400 });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { data, error } = await supabase
      .from("stays_users")
      .insert({ name, email, password: hash, role: "guest" })
      .select()
      .single();
    if (error) {
      if ((error as any).code === "23505")
        return NextResponse.json({ error: "このメールは既に登録されています" }, { status: 409 });
      return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
    }
    return NextResponse.json(sanitize(data));
  }

  // ---- ログイン ----
  if (action === "login") {
    const { data, error } = await supabase
      .from("stays_users")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (error || !data)
      return NextResponse.json({ error: "メールまたはパスワードが違います" }, { status: 401 });

    const u = data as any;
    if (u.is_suspended)
      return NextResponse.json({ error: "このアカウントは停止されています" }, { status: 403 });
    if (!u.password)
      return NextResponse.json(
        {
          error:
            "このアカウントはパスワード未設定です。「パスポート番号でログイン」をご利用いただくか、ログイン後にプロフィールでパスワードを設定してください",
        },
        { status: 400 }
      );

    let ok = false;
    if (isHashed(u.password)) {
      ok = await bcrypt.compare(password, u.password);
    } else {
      // 既存の平文パスワード: 一致すればハッシュへ自動移行
      ok = u.password === password;
      if (ok) {
        const newHash = await bcrypt.hash(password, SALT_ROUNDS);
        await supabase.from("stays_users").update({ password: newHash }).eq("id", u.id);
      }
    }
    if (!ok)
      return NextResponse.json({ error: "メールまたはパスワードが違います" }, { status: 401 });

    return NextResponse.json(sanitize(u));
  }

  // ---- パスワード設定/変更 ----
  if (action === "set_password") {
    const userId = String(body?.userId || "");
    if (!userId) return NextResponse.json({ error: "ユーザーが不明です" }, { status: 400 });
    if (password.length < MIN_PASSWORD)
      return NextResponse.json({ error: `パスワードは${MIN_PASSWORD}文字以上にしてください` }, { status: 400 });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { data, error } = await supabase
      .from("stays_users")
      .update({ password: hash })
      .eq("id", userId)
      .select()
      .single();
    if (error || !data)
      return NextResponse.json({ error: "パスワードの更新に失敗しました" }, { status: 500 });
    return NextResponse.json(sanitize(data));
  }

  return NextResponse.json({ error: "不明な操作です" }, { status: 400 });
}
