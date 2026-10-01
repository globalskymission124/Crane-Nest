import { NextResponse } from "next/server";
import { parsePhotoRef, signPhotoRefs, supabaseAdmin } from "@/lib/server/admin";
import { noStore, requireRole } from "@/lib/server/session";

// =========================================================
// オーナー別チェックイン（stays_checkin_guests）
//   POST { action: "submit", guest }  … ゲストがパスポート情報を登録（ログイン不要）
//   POST { action: "host_list" }      … オーナー: 自分のページの登録一覧（写真は期限つきリンク）
// stays_checkin_guests は anon キーから読めないため、ここで service_role を使う。
// =========================================================

export const runtime = "nodejs";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: noStore });
const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  let db;
  try {
    db = supabaseAdmin();
  } catch {
    return fail("サーバーの設定が不足しています", 500);
  }

  if (action === "submit") {
    const g = body?.guest || {};
    const pageId = str(g.page_id, 60);
    const fullName = str(g.full_name, 120);
    const passportNumber = str(g.passport_number, 20).toUpperCase();
    if (!pageId || !fullName || !passportNumber) return fail("氏名とパスポート番号を入力してください");

    // ページの存在とオーナーをサーバー側で確認（host_id はクライアントの値を信用しない）
    const { data: page } = await db
      .from("stays_checkin_pages")
      .select("id, host_id, is_active")
      .eq("id", pageId)
      .maybeSingle();
    if (!page || (page as any).is_active === false) return fail("このチェックインページは利用できません", 404);

    // 写真はバケット内のパスだけを受け付ける（他人の写真URLを差し込まれないように）
    const ref = parsePhotoRef(g.passport_image_url, "host-passports");
    const photo =
      ref && ref.bucket === "host-passports" && /^[0-9a-f-]{36}\.jpg$/i.test(ref.path) ? ref.path : null;

    const { data, error } = await db
      .from("stays_checkin_guests")
      .insert({
        page_id: pageId,
        host_id: (page as any).host_id,
        full_name: fullName,
        passport_number: passportNumber,
        nationality: str(g.nationality, 60),
        phone: str(g.phone, 40) || null,
        email: str(g.email, 120) || null,
        checkin_date: /^\d{4}-\d{2}-\d{2}$/.test(String(g.checkin_date || "")) ? g.checkin_date : null,
        passport_image_url: photo,
      })
      .select("id")
      .single();
    if (error || !data) return fail("登録に失敗しました", 500);
    return NextResponse.json({ id: (data as any).id }, { headers: noStore });
  }

  if (action === "host_list") {
    const auth = await requireRole(req, ["host", "admin"]);
    if (auth.error) return auth.error;
    const hostId = auth.session.host_id;
    if (!hostId) return NextResponse.json([], { headers: noStore });
    const { data, error } = await db
      .from("stays_checkin_guests")
      .select("*")
      .eq("host_id", hostId)
      .order("created_at", { ascending: false });
    if (error) return fail("読み込みに失敗しました", 500);
    const rows = (data ?? []) as { passport_image_url: string | null }[];
    const signed = await signPhotoRefs(rows.map((r) => r.passport_image_url), "host-passports", 1800);
    rows.forEach((r, i) => (r.passport_image_url = signed[i]));
    return NextResponse.json(rows, { headers: noStore });
  }

  return fail("不明な操作です");
}
