import { NextResponse } from "next/server";
import { noStore, requireRole } from "@/lib/server/session";
import { travelCardForAdminRecord, travelCardForUser } from "@/lib/server/travelCardData";

// =========================================================
// Japan Travel Card のデータ
//   POST { action: "mine" }                       … ログイン中の本人（同行者も含む）
//   POST { action: "preview", source, id }        … 管理者: 記録からのプレビュー
// =========================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    if (body?.action === "preview") {
      const auth = await requireRole(req, ["admin"]);
      if (auth.error) return auth.error;
      const source = body.source === "transfer" ? "transfer" : "checkin";
      return NextResponse.json(await travelCardForAdminRecord(source, String(body.id || "")), { headers: noStore });
    }
    const auth = await requireRole(req, ["guest", "host", "admin"]);
    if (auth.error) return auth.error;
    if (auth.session.id.startsWith("demo-"))
      return NextResponse.json({ error: "デモアカウントにはカードがありません" }, { status: 404, headers: noStore });
    return NextResponse.json(await travelCardForUser(auth.session.id), { headers: noStore });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Travel Cardを読み込めませんでした" },
      { status: 500, headers: noStore }
    );
  }
}
