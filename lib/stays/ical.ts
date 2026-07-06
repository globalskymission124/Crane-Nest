// =========================================================
// iCal（.ics）双方向同期ユーティリティ（外部依存なし）
//   - generateICS: 当サイトの予約/ブロックを .ics として書き出し
//     （AirbnbやGoogleカレンダーにインポートさせる = エクスポート）
//   - parseICS: Airbnb等が発行する .ics を読み取り、予約不可期間を抽出
//     （Airbnbの予約を当サイトへ取り込む = インポート）
// Airbnpの iCal は全日イベント（VALUE=DATE, DTEND は排他的）で表現される。
// =========================================================

export interface ICalEvent {
  uid: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD（排他的 = チェックアウト日）
  summary: string;
}

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

// YYYY-MM-DD -> YYYYMMDD
function toICalDate(d: string): string {
  return d.replace(/-/g, "");
}

// YYYYMMDD -> YYYY-MM-DD
function fromICalDate(d: string): string {
  const m = d.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return d;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function icalTimestamp(dt: Date): string {
  return (
    dt.getUTCFullYear() +
    pad(dt.getUTCMonth() + 1) +
    pad(dt.getUTCDate()) +
    "T" +
    pad(dt.getUTCHours()) +
    pad(dt.getUTCMinutes()) +
    pad(dt.getUTCSeconds()) +
    "Z"
  );
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// RFC5545: 75オクテットで折り返し（簡易実装）
function foldLine(line: string): string {
  if (line.length <= 74) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length > 0) {
    chunks.push(" " + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  return chunks.join("\r\n");
}

export function generateICS(calendarName: string, events: ICalEvent[]): string {
  const now = icalTimestamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Crane Nest//Stays//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine("X-WR-CALNAME:" + escapeText(calendarName)),
  ];
  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + ev.uid);
    lines.push("DTSTAMP:" + now);
    lines.push("DTSTART;VALUE=DATE:" + toICalDate(ev.start));
    lines.push("DTEND;VALUE=DATE:" + toICalDate(ev.end));
    lines.push(foldLine("SUMMARY:" + escapeText(ev.summary)));
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

// 折り返し（次行が空白始まり）を結合してから行配列を返す
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

export function parseICS(text: string): ICalEvent[] {
  const lines = unfold(text);
  const events: ICalEvent[] = [];
  let cur: Partial<ICalEvent> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur && cur.start && cur.end) {
        events.push({
          uid: cur.uid || `${cur.start}-${cur.end}`,
          start: cur.start,
          end: cur.end,
          summary: cur.summary || "Reserved",
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const keyPart = line.slice(0, idx); // 例: DTSTART;VALUE=DATE
    const value = line.slice(idx + 1);
    const key = keyPart.split(";")[0].toUpperCase();
    if (key === "UID") cur.uid = value.trim();
    else if (key === "DTSTART") cur.start = fromICalDate(value.trim());
    else if (key === "DTEND") cur.end = fromICalDate(value.trim());
    else if (key === "SUMMARY") cur.summary = value.replace(/\\,/g, ",").replace(/\\;/g, ";").trim();
  }
  return events;
}
