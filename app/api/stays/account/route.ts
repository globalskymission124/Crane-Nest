import { NextResponse } from "next/server";
import { supabaseAdmin, signPhotoRef } from "@/lib/server/admin";
import { getServerSession, noStore, requireRole } from "@/lib/server/session";
import { addPoints, fetchPlatformSettings, notify } from "@/lib/stays/v2";

// =========================================================
// アカウント関連（stays_users を扱う操作）
//   stays_users は anon キーから読めないため、ここで権限を確認してから service_role で扱う。
//   POST { action, ... }
//     profile          … 本人のパスポート情報（写真は期限つきリンク）
//     referral_code    … 本人の紹介コード（未発行なら発行）
//     apply_referral   … 新規登録直後に紹介コードを適用
//     admin_list_users … 管理者: ユーザー一覧
//     admin_update_user… 管理者: 役割変更 / 停止
// =========================================================

export const runtime = "nodejs";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: noStore });
const ok = (data: unknown) => NextResponse.json(data, { headers: noStore });

function genReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  let db;
  try {
    db = supabaseAdmin();
  } catch {
    return fail("サーバーの設定が不足しています", 500);
  }

  if (action === "admin_list_users" || action === "admin_update_user") {
    const auth = await requireRole(req, ["admin"]);
    if (auth.error) return auth.error;

    if (action === "admin_list_users") {
      const { data, error } = await db
        .from("stays_users")
        .select("id,name,email,role,host_id,avatar_url,is_suspended,created_at")
        .order("created_at", { ascending: false });
      if (error) return fail("ユーザーを読み込めませんでした", 500);
      return ok(data ?? []);
    }

    const id = String(body?.id || "");
    const patch: Record<string, unknown> = {};
    if (["guest", "host", "admin"].includes(body?.patch?.role)) patch.role = body.patch.role;
    if (typeof body?.patch?.is_suspended === "boolean") patch.is_suspended = body.patch.is_suspended;
    if (!id || !Object.keys(patch).length) return fail("変更内容が不正です", 400);
    if (id === auth.session.id && (patch.role && patch.role !== "admin" || patch.is_suspended === true))
      return fail("自分自身の管理者権限は外せません", 400);
    const { error } = await db.from("stays_users").update(patch).eq("id", id);
    if (error) return fail("更新に失敗しました", 500);
    return ok({ ok: true });
  }

  const session = getServerSession(req);
  if (!session) return fail("ログインが必要です", 401);
  if (session.id.startsWith("demo-")) {
    if (action === "profile") return ok({ passport_number: null, nationality: null, passport_image_url: null, passport_image_preview: null, phone: null });
    if (action === "referral_code") return ok({ code: "DEMO00" });
    return fail("デモアカウントでは使えません", 400);
  }

  if (action === "profile") {
    const { data } = await db
      .from("stays_users")
      .select("name,email,phone,passport_number,nationality,passport_image_url")
      .eq("id", session.id)
      .maybeSingle();
    const u = data as any;
    if (!u) return fail("ログインが必要です", 401);
    return ok({
      ...u,
      // 保存値（パス）はチェックイン転送用にそのまま返し、表示用は期限つきリンクを別に返す
      passport_image_preview: await signPhotoRef(u.passport_image_url, "host-passports"),
    });
  }

  if (action === "referral_code") {
    const { data } = await db.from("stays_users").select("referral_code").eq("id", session.id).maybeSingle();
    const existing = (data as any)?.referral_code;
    if (existing) return ok({ code: existing });
    for (let i = 0; i < 5; i++) {
      const code = genReferralCode();
      const { error } = await db.from("stays_users").update({ referral_code: code }).eq("id", session.id);
      if (!error) return ok({ code });
    }
    return fail("紹介コードを発行できませんでした", 500);
  }

  if (action === "apply_referral") {
    const code = String(body?.code || "").trim().toUpperCase();
    if (!code) return ok({ applied: false });
    const { data: me } = await db.from("stays_users").select("id,email,referred_by").eq("id", session.id).maybeSingle();
    if (!me || (me as any).referred_by) return ok({ applied: false }); // 1人1回まで
    const { data: referrer } = await db
      .from("stays_users")
      .select("id,email,referral_code")
      .eq("referral_code", code)
      .maybeSingle();
    if (!referrer || (referrer as any).id === session.id || (referrer as any).email === (me as any).email)
      return ok({ applied: false });
    const settings = await fetchPlatformSettings();
    const bonus = settings.referral_bonus_points ?? 500;
    await db.from("stays_users").update({ referred_by: code }).eq("id", session.id);
    await addPoints((me as any).email, bonus, `友達紹介ボーナス（コード: ${code}）`);
    await addPoints((referrer as any).email, bonus, "友達紹介ボーナス（紹介成立）");
    await notify((referrer as any).email, "友達紹介が成立しました", `${bonus}ポイントを獲得しました`, "/stays/profile");
    return ok({ applied: true });
  }

  return fail("不明な操作です", 400);
}
