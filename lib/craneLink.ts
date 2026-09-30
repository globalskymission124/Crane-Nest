// =========================================================
// Crane-Interigent-Switch（お部屋・送迎・車内 iPad のシステム）との紐づけ。
//
// 車内 iPad などの「予約つき QR」は  https://<このサイト>/?r=<予約の合言葉>  の形。
// ・合言葉は送迎予約と一緒に保存する（transfer_requests.reservation_token）
//   → あちらのシステムが、どの予約の送迎・パスポートかを確実に見分けられる。
// ・合言葉からお部屋・チェックアウト日を受け取り、フォームに最初から入れる（入力の手間と間違いを減らす）。
// 合言葉が無い（今までどおりの QR）場合は何もしない。
// =========================================================

const KEY = "cn_res_token";
const SWITCH_URL = (process.env.NEXT_PUBLIC_SWITCH_URL || "https://crane-interigent-switch.vercel.app").replace(/\/$/, "");
const TOKEN_RE = /^[a-f0-9]{24,128}$/i;

/** URL の ?r= （無ければ、このタブで前に開いたときのもの） */
export function getReservationToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const q = new URL(window.location.href).searchParams.get("r");
    if (q && TOKEN_RE.test(q)) {
      window.sessionStorage.setItem(KEY, q);
      return q;
    }
    const s = window.sessionStorage.getItem(KEY);
    return s && TOKEN_RE.test(s) ? s : null;
  } catch {
    return null;
  }
}

export interface ReservationPrefill {
  room: string | null; // お部屋の漢字 1 文字（例: 「春」）
  checkOut: string | null; // "YYYY-MM-DD"
  guest: string | null;
}

let cache: Promise<ReservationPrefill | null> | null = null;
/** 合言葉からお部屋・チェックアウト日を受け取る（失敗しても null で続行） */
export function fetchReservationPrefill(): Promise<ReservationPrefill | null> {
  const token = getReservationToken();
  if (!token) return Promise.resolve(null);
  if (!cache) {
    cache = fetch(`${SWITCH_URL}/api/cn/prefill?r=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j?.ok ? { room: j.room ?? null, checkOut: j.checkOut ?? null, guest: j.guest ?? null } : null))
      .catch(() => null);
  }
  return cache;
}

/** お部屋の漢字（「春」）→ このシステムのお部屋（「春咏」）。名前の中に同じ漢字があるもの */
export function findRoomByKanji<T extends { id: string; name: string }>(rooms: T[], kanji: string | null): T | null {
  if (!kanji) return null;
  return rooms.find((r) => (r.name || "").trim().startsWith(kanji)) ?? rooms.find((r) => (r.name || "").includes(kanji)) ?? null;
}
