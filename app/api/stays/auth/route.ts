import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/server/admin";
import {
  clearSessionCookie,
  getServerSession,
  noStore,
  setSessionCookie,
} from "@/lib/server/session";

// =========================================================
// 認証（サーバー側で照合し、署名つき Cookie を発行する）
//
// パスワードは bcrypt でハッシュ化して stays_users.password に保存する。
// 既存の平文パスワードは、ログイン成功時に自動でハッシュへ移行する（lazy migration）。
// stays_users は anon キーから読めない（migration 0040）ため、すべて service_role で扱う。
// ログインに成功したら cn_session Cookie を付ける。API ルートはこの Cookie で本人確認する。
// =========================================================

export const runtime = "nodejs";

const SALT_ROUNDS = 10;
const MIN_PASSWORD = 6;

// デモアカウント（STAYS_DEMO_LOGIN=1 のときだけ使える。本番では無効）
const DEMO_PASSWORD = "demo123";
const DEMO_USERS: Record<string, { id: string; name: string; role: "guest" | "host" | "admin"; host_id: string | null }> = {
  "guest@demo.com": { id: "demo-guest", name: "Hiroshi", role: "guest", host_id: null },
  "host@demo.com": { id: "demo-host", name: "Crane Nest Host", role: "host", host_id: "11111111-1111-1111-1111-111111111111" },
  "admin@demo.com": { id: "demo-admin", name: "Platform Admin", role: "admin", host_id: "11111111-1111-1111-1111-111111111111" },
};

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

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStore });
}

// ログイン成功レスポンス（ユーザー情報 + Cookie）
function signedIn(u: any) {
  const res = NextResponse.json(sanitize(u), { headers: noStore });
  return setSessionCookie(res, { id: u.id, role: u.role, host_id: u.host_id ?? null, email: u.email });
}

const sameName = (a: string, b: string) =>
  a.trim().replace(/\s+/g, " ").toLowerCase() === b.trim().replace(/\s+/g, " ").toLowerCase();

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("不正なリクエストです", 400);
  }

  const action = String(body?.action || "");
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  let db;
  try {
    db = supabaseAdmin();
  } catch (e) {
    console.error("[auth]", (e as Error).message);
    return fail("サーバーの設定が不足しています", 500);
  }

  // ---- 現在のログイン状態（Cookie が無効なら null） ----
  if (action === "me") {
    const s = getServerSession(req);
    if (!s) return clearSessionCookie(NextResponse.json(null, { headers: noStore }));
    if (s.id.startsWith("demo-")) {
      const demo = Object.entries(DEMO_USERS).find(([, d]) => d.id === s.id);
      if (!demo) return clearSessionCookie(NextResponse.json(null, { headers: noStore }));
      return NextResponse.json(
        { ...demo[1], email: demo[0], passport_number: null, password_set: true, avatar_url: null },
        { headers: noStore }
      );
    }
    const { data } = await db.from("stays_users").select("*").eq("id", s.id).maybeSingle();
    if (!data || (data as any).is_suspended) return clearSessionCookie(NextResponse.json(null, { headers: noStore }));
    return NextResponse.json(sanitize(data), { headers: noStore });
  }

  // ---- ログアウト ----
  if (action === "logout") {
    return clearSessionCookie(NextResponse.json({ ok: true }, { headers: noStore }));
  }

  // ---- 新規登録 ----
  if (action === "signup") {
    const name = String(body?.name || "").trim();
    if (!name) return fail("お名前を入力してください", 400);
    if (!email) return fail("メールアドレスを入力してください", 400);
    if (password.length < MIN_PASSWORD) return fail(`パスワードは${MIN_PASSWORD}文字以上にしてください`, 400);

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { data, error } = await db
      .from("stays_users")
      .insert({ name, email, password: hash, role: "guest" })
      .select()
      .single();
    if (error) {
      if ((error as any).code === "23505") return fail("このメールは既に登録されています", 409);
      return fail("登録に失敗しました", 500);
    }
    return signedIn(data);
  }

  // ---- ログイン ----
  if (action === "login") {
    const demo = DEMO_USERS[email];
    if (demo && process.env.STAYS_DEMO_LOGIN === "1") {
      if (password !== DEMO_PASSWORD) return fail("メールまたはパスワードが違います", 401);
      return signedIn({ ...demo, email, password: "x" });
    }

    const { data, error } = await db.from("stays_users").select("*").eq("email", email).maybeSingle();
    if (error || !data) return fail("メールまたはパスワードが違います", 401);

    const u = data as any;
    if (u.is_suspended) return fail("このアカウントは停止されています", 403);
    if (!u.password)
      return fail(
        "このアカウントはパスワード未設定です。「パスポート番号でログイン」をご利用いただくか、ログイン後にプロフィールでパスワードを設定してください",
        400
      );

    let ok = false;
    if (isHashed(u.password)) {
      ok = await bcrypt.compare(password, u.password);
    } else {
      // 既存の平文パスワード: 一致すればハッシュへ自動移行
      ok = u.password === password;
      if (ok) {
        const newHash = await bcrypt.hash(password, SALT_ROUNDS);
        await db.from("stays_users").update({ password: newHash }).eq("id", u.id);
      }
    }
    if (!ok) return fail("メールまたはパスワードが違います", 401);
    return signedIn(u);
  }

  // ---- パスポート番号 + 氏名でログイン（パスワード未設定ゲスト向け） ----
  if (action === "passport_login") {
    const pn = String(body?.passportNumber || "").trim().toUpperCase();
    const fullName = String(body?.fullName || "");
    if (!pn || !fullName.trim()) return fail("パスポート番号と氏名を入力してください", 400);
    const { data } = await db.from("stays_users").select("*").eq("passport_number", pn).maybeSingle();
    const u = data as any;
    // 「番号が無い」と「氏名が違う」を区別しない（番号の存在を探られないように）
    if (!u || !sameName(u.name, fullName))
      return fail("パスポート番号または氏名が一致しません（パスポート登録時と同じ表記で入力してください）", 401);
    if (u.is_suspended) return fail("このアカウントは停止されています", 403);
    return signedIn(u);
  }

  // ---- 送迎アプリのパスポート登録直後の自動サインイン ----
  //  既存アカウントは氏名が一致したときだけログインさせる。無ければ作成する。
  if (action === "passport_auto") {
    const pn = String(body?.passportNumber || "").trim().toUpperCase();
    const fullName = String(body?.fullName || "").trim();
    const phone = String(body?.phone || "").trim() || null;
    if (!pn || !fullName) return fail("入力が不足しています", 400);

    const { data: existing } = await db.from("stays_users").select("*").eq("passport_number", pn).maybeSingle();
    if (existing) {
      const u = existing as any;
      if (u.is_suspended || !sameName(u.name, fullName)) return fail("自動サインインできませんでした", 401);
      return signedIn(u);
    }
    const { data, error } = await db
      .from("stays_users")
      .insert({
        name: fullName,
        email: `${pn.toLowerCase()}@passport.guest`,
        password: null,
        role: "guest",
        passport_number: pn,
        phone,
      })
      .select()
      .single();
    if (error || !data) return fail("自動サインインできませんでした", 500);
    return signedIn(data);
  }

  // ここから先はログイン中の本人だけ
  const session = getServerSession(req);
  if (!session || session.id.startsWith("demo-")) return fail("ログインが必要です", 401);

  // ---- パスワード設定/変更（本人のみ） ----
  if (action === "set_password") {
    if (password.length < MIN_PASSWORD) return fail(`パスワードは${MIN_PASSWORD}文字以上にしてください`, 400);
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { data, error } = await db
      .from("stays_users")
      .update({ password: hash })
      .eq("id", session.id)
      .select()
      .single();
    if (error || !data) return fail("パスワードの更新に失敗しました", 500);
    return signedIn(data);
  }

  // ---- プロフィール更新（名前 / メール / アバター / パスポート） ----
  if (action === "profile_update") {
    const patch = body?.patch || {};
    const payload: Record<string, unknown> = {};
    if (typeof patch.name === "string") payload.name = patch.name.trim();
    if (typeof patch.email === "string") payload.email = patch.email.trim().toLowerCase();
    if (patch.avatar_url !== undefined) payload.avatar_url = patch.avatar_url || null;
    if (patch.passport_number !== undefined)
      payload.passport_number = patch.passport_number ? String(patch.passport_number).trim().toUpperCase() : null;
    if (patch.nationality !== undefined) payload.nationality = patch.nationality || null;
    if (patch.passport_image_url !== undefined) payload.passport_image_url = patch.passport_image_url || null;
    if (!Object.keys(payload).length) return fail("変更がありません", 400);

    const { data, error } = await db
      .from("stays_users")
      .update(payload)
      .eq("id", session.id)
      .select()
      .single();
    if (error) {
      if ((error as any).code === "23505") return fail("このメールアドレスまたはパスポート番号は既に使われています", 409);
      return fail("プロフィールの更新に失敗しました", 500);
    }
    return signedIn(data);
  }

  // ---- ゲスト → オーナー(host) への昇格 ----
  if (action === "become_host") {
    const name = String(body?.name || "").trim();
    const hostEmail = String(body?.email || "").trim().toLowerCase();
    if (!name) return fail("屋号（表示名）を入力してください", 400);
    if (!hostEmail) return fail("メールアドレスを入力してください", 400);

    const { data: me } = await db.from("stays_users").select("*").eq("id", session.id).maybeSingle();
    if (!me) return fail("ログインが必要です", 401);
    if ((me as any).role === "admin") return signedIn(me); // 管理者は降格させない

    let hostId: string;
    const { data: existingHost } = await db.from("stays_hosts").select("id, email").eq("email", hostEmail).maybeSingle();
    if (existingHost) {
      // 他人のホスト情報を乗っ取れないよう、本人のメールと一致するときだけ再利用する
      if (hostEmail !== String((me as any).email).toLowerCase())
        return fail("このメールアドレスのオーナーは既に登録されています", 409);
      hostId = (existingHost as any).id;
    } else {
      const { data: host, error: hErr } = await db
        .from("stays_hosts")
        .insert({
          name,
          email: hostEmail,
          phone: String(body?.phone || "").trim() || null,
          avatar_url: body?.avatar_url ?? null,
        })
        .select()
        .single();
      if (hErr || !host) return fail("オーナー情報の作成に失敗しました", 500);
      hostId = (host as any).id;
    }

    const { data: user, error: uErr } = await db
      .from("stays_users")
      .update({ role: "host", host_id: hostId })
      .eq("id", session.id)
      .select()
      .single();
    if (uErr || !user) return fail("アカウントの更新に失敗しました", 500);
    return signedIn(user);
  }

  return fail("不明な操作です", 400);
}
