// =========================================================
// AI自然文検索: 「関空近くで6人泊まれてWi-Fiある一棟貸し、2万円以下」の
// ような文章から検索条件を抽出する（日英対応・オフライン動作）。
// =========================================================
import type { Filters } from "@/components/stays/SearchFilters";
import { DEFAULT_FILTERS } from "@/components/stays/SearchFilters";
import type { PropertyType } from "./types";

export interface ParsedQuery {
  q: string;
  guests: number | null;
  filters: Filters;
  understood: string[]; // 解釈した条件の説明チップ
}

const AMENITY_WORDS: [RegExp, string, string][] = [
  [/wi-?fi|ワイファイ|ネット/i, "wifi", "Wi-Fi"],
  [/キッチン|自炊|kitchen/i, "kitchen", "キッチン"],
  [/駐車|パーキング|parking|car/i, "parking", "駐車場"],
  [/洗濯|ランドリー|washer|laundry/i, "washer", "洗濯機"],
  [/エアコン|冷房|air.?con/i, "air_conditioning", "エアコン"],
  [/バスタブ|お風呂|風呂|bath\s?tub/i, "bathtub", "バスタブ"],
  [/プール|pool/i, "pool", "プール"],
  [/仕事|ワーケーション|デスク|workspace|work/i, "workspace", "ワークスペース"],
];

const TYPE_WORDS: [RegExp, PropertyType, string][] = [
  [/一棟貸し|一軒家|貸切|entire|house/i, "house", "一軒家"],
  [/町家|町屋|machiya/i, "house", "町家"],
  [/アパート|マンション|apartment/i, "apartment", "アパート"],
  [/ゲストハウス|guest\s?house|hostel/i, "guesthouse", "ゲストハウス"],
  [/ホテル|hotel/i, "hotel", "ホテル"],
  [/ヴィラ|ビラ|villa/i, "villa", "ヴィラ"],
  [/コテージ|山小屋|cabin|cottage/i, "cabin", "コテージ"],
];

const AREA_WORDS = [
  "関空", "泉佐野", "りんくう", "難波", "なんば", "大阪", "梅田", "心斎橋",
  "京都", "祇園", "嵐山", "神戸", "奈良", "和歌山",
  "osaka", "kyoto", "namba", "kix", "kobe", "nara",
];

export function parseSmartQuery(text: string): ParsedQuery {
  const understood: string[] = [];
  const filters: Filters = { ...DEFAULT_FILTERS, propertyTypes: [], amenities: [] };
  let guests: number | null = null;

  // 人数: 「6人」「4名」「for 5 people」
  const g = text.match(/(\d+)\s*(人|名|people|guests?|persons?|pax)/i);
  if (g) {
    guests = Number(g[1]);
    understood.push(`${guests}名で宿泊`);
  }

  // 上限価格: 「2万円以下」「15000円まで」「under 20000」
  const man = text.match(/(\d+(?:\.\d+)?)\s*万円?\s*(以下|まで|以内)?/);
  const yen = text.match(/(\d{4,6})\s*円\s*(以下|まで|以内)?/);
  const under = text.match(/under\s*[¥$]?\s*(\d{3,6})/i);
  if (man && (man[2] || /万円?(以下|まで|以内)/.test(text))) {
    filters.priceMax = Math.round(Number(man[1]) * 10000);
  } else if (yen) {
    filters.priceMax = Number(yen[1]);
  } else if (under) {
    filters.priceMax = Number(under[1]);
  }
  if (filters.priceMax) understood.push(`1泊 ¥${filters.priceMax.toLocaleString()}以下`);

  // アメニティ
  for (const [re, key, label] of AMENITY_WORDS) {
    if (re.test(text) && !filters.amenities.includes(key)) {
      filters.amenities.push(key);
      understood.push(label);
    }
  }

  // 物件タイプ
  for (const [re, type, label] of TYPE_WORDS) {
    if (re.test(text) && !filters.propertyTypes.includes(type)) {
      filters.propertyTypes.push(type);
      understood.push(label);
      break; // 最初の1タイプのみ
    }
  }

  // 即時予約 / 高評価
  if (/即時|即予約|すぐ(に)?泊|instant/i.test(text)) {
    filters.instantOnly = true;
    understood.push("即時予約のみ");
  }
  if (/高評価|評判|人気|top.?rated|best/i.test(text)) {
    filters.minRating = 4;
    filters.sort = "rating";
    understood.push("評価4.0以上");
  }
  if (/安い|格安|cheap/i.test(text)) {
    filters.sort = "price_asc";
    understood.push("安い順");
  }

  // エリアキーワード
  let q = "";
  const lower = text.toLowerCase();
  for (const area of AREA_WORDS) {
    if (lower.includes(area.toLowerCase())) {
      q = area === "なんば" ? "難波" : area === "kix" || area === "関空" ? "泉佐野" : area;
      understood.push(`エリア: ${area}`);
      break;
    }
  }

  return { q, guests, filters, understood };
}
