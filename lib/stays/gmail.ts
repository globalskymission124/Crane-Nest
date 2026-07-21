// =========================================================
// Gmail からの Airbnb メール取得（サーバ専用）
//   googleapis + OAuth2 リフレッシュトークンで、Airbnb からの
//   予約確定 / キャンセルメールを検索し、件名と本文テキストを返す。
//
//   環境変数:
//     GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN … OAuth2認証
//     AIRBNB_MAIL_QUERY … 検索クエリ（既定: from:automated@airbnb.com newer_than:14d）
//
//   ※ googleapis 依存。未設定時は skipped を返し、アプリは落ちない。
//   ※ リフレッシュトークンの取得は Google Cloud で OAuth クライアントを作成し、
//     gmail.readonly スコープで一度だけ同意フローを通す（READMEに手順を記載）。
// =========================================================

export interface RawEmail {
  id: string;
  subject: string;
  body: string; // text/plain（無ければ text/html をタグ除去）
  internalDate: number; // epoch ms
}

export interface GmailFetchResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  emails: RawEmail[];
}

function gmailConfigured(): boolean {
  return (
    !!process.env.GMAIL_CLIENT_ID &&
    !!process.env.GMAIL_CLIENT_SECRET &&
    !!process.env.GMAIL_REFRESH_TOKEN
  );
}

// base64url → UTF-8
function decodeB64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

// Gmail message payload を再帰的に走査して本文テキストを取り出す
function extractBody(payload: any): string {
  if (!payload) return "";
  // 単一パート
  if (payload.body?.data && (!payload.parts || payload.parts.length === 0)) {
    const text = decodeB64Url(payload.body.data);
    return payload.mimeType === "text/html" ? stripHtml(text) : text;
  }
  // マルチパート: text/plain を優先、無ければ text/html
  let plain = "";
  let html = "";
  const walk = (parts: any[]) => {
    for (const p of parts || []) {
      if (p.mimeType === "text/plain" && p.body?.data) plain += decodeB64Url(p.body.data) + "\n";
      else if (p.mimeType === "text/html" && p.body?.data) html += decodeB64Url(p.body.data) + "\n";
      if (p.parts) walk(p.parts);
    }
  };
  walk(payload.parts || []);
  return plain.trim() ? plain : stripHtml(html);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Airbnb メールを取得
export async function fetchAirbnbEmails(): Promise<GmailFetchResult> {
  if (!gmailConfigured()) {
    return { ok: false, skipped: true, error: "GMAIL_* 環境変数が未設定", emails: [] };
  }

  try {
    // 依存が無い環境でもビルドが壊れないよう動的 import
    const { google } = await import("googleapis");
    const oauth2 = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET
    );
    oauth2.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
    const gmail = google.gmail({ version: "v1", auth: oauth2 });

    const q =
      process.env.AIRBNB_MAIL_QUERY ||
      "from:(airbnb.com) newer_than:14d";

    const list = await gmail.users.messages.list({ userId: "me", q, maxResults: 50 });
    const messages = list.data.messages || [];

    const emails: RawEmail[] = [];
    for (const m of messages) {
      if (!m.id) continue;
      const msg = await gmail.users.messages.get({ userId: "me", id: m.id, format: "full" });
      const headers = msg.data.payload?.headers || [];
      const subject =
        headers.find((h) => (h.name || "").toLowerCase() === "subject")?.value || "";
      const body = extractBody(msg.data.payload);
      emails.push({
        id: m.id,
        subject,
        body,
        internalDate: Number(msg.data.internalDate || 0),
      });
    }
    return { ok: true, emails };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Gmail取得に失敗", emails: [] };
  }
}
