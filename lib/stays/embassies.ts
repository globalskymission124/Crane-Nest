// =========================================================
// 国籍 → 在日大使館（Japan Travel Card の緊急連絡先用・プロトタイプ）
//
// ★ 電話番号は本番公開前に必ず各大使館の公式サイトで確認すること。
//   確認できていない国は tel を入れず、外務省の「駐日外国公館リスト」へ案内する。
// 国籍は自由入力のため、表記ゆれ（英語・日本語・中国語・韓国語・国コード）で照合する。
// 将来はパスポートの MRZ にある 3 文字の国コード（USA など）で照合する想定。
// =========================================================

export interface EmbassyInfo {
  code: string; // ICAO / ISO 3文字コード
  name: string; // 表示名（英語）
  tel: string | null; // 表示用（国内形式）。未確認なら null
  url: string | null;
}

export const MOFA_EMBASSY_LIST_URL = "https://www.mofa.go.jp/about/emb_cons/protocol/index.html";

const EMBASSIES: (EmbassyInfo & { aliases: string[] })[] = [
  {
    code: "USA",
    name: "U.S. Embassy Tokyo",
    tel: "03-3224-5000",
    url: "https://jp.usembassy.gov/",
    aliases: ["usa", "us", "united states", "united states of america", "america", "american", "アメリカ", "米国", "美国", "미국"],
  },
  {
    code: "GBR",
    name: "British Embassy Tokyo",
    tel: "03-5211-1100",
    url: "https://www.gov.uk/world/organisations/british-embassy-tokyo",
    aliases: ["gbr", "uk", "united kingdom", "great britain", "british", "england", "イギリス", "英国", "英國", "영국"],
  },
  {
    code: "CAN",
    name: "Embassy of Canada to Japan",
    tel: "03-5412-6200",
    url: "https://www.international.gc.ca/country-pays/japan-japon/tokyo.aspx",
    aliases: ["can", "canada", "canadian", "カナダ", "加拿大", "캐나다"],
  },
  {
    code: "AUS",
    name: "Australian Embassy Tokyo",
    tel: "03-5232-4111",
    url: "https://japan.embassy.gov.au/",
    aliases: ["aus", "australia", "australian", "オーストラリア", "豪州", "澳大利亚", "澳洲", "호주"],
  },
  // 以下は番号未確認。公式サイト / 外務省リストへ案内する。
  { code: "KOR", name: "Embassy of the Republic of Korea", tel: null, url: "https://overseas.mofa.go.kr/jp-ja/index.do", aliases: ["kor", "korea", "south korea", "republic of korea", "韓国", "大韓民国", "韩国", "韓國", "한국", "대한민국"] },
  { code: "CHN", name: "Embassy of China in Japan", tel: null, url: null, aliases: ["chn", "china", "chinese", "prc", "中国", "中華人民共和国", "中华人民共和国", "중국"] },
  { code: "TWN", name: "Taipei Economic and Cultural Representative Office", tel: null, url: null, aliases: ["twn", "taiwan", "taiwanese", "台湾", "台灣", "中華民國", "대만"] },
  { code: "HKG", name: "Embassy of China in Japan (Hong Kong SAR)", tel: null, url: null, aliases: ["hkg", "hong kong", "hongkong", "香港", "홍콩"] },
  { code: "THA", name: "Royal Thai Embassy Tokyo", tel: null, url: null, aliases: ["tha", "thailand", "thai", "タイ", "泰国", "泰國", "태국"] },
  { code: "SGP", name: "Embassy of Singapore in Tokyo", tel: null, url: null, aliases: ["sgp", "singapore", "シンガポール", "新加坡", "싱가포르"] },
  { code: "PHL", name: "Embassy of the Philippines", tel: null, url: null, aliases: ["phl", "philippines", "filipino", "フィリピン", "菲律宾", "菲律賓", "필리핀"] },
  { code: "VNM", name: "Embassy of Viet Nam", tel: null, url: null, aliases: ["vnm", "vietnam", "viet nam", "ベトナム", "越南", "베트남"] },
  { code: "FRA", name: "Embassy of France in Japan", tel: null, url: null, aliases: ["fra", "france", "french", "フランス", "法国", "法國", "프랑스"] },
  { code: "DEU", name: "German Embassy Tokyo", tel: null, url: null, aliases: ["deu", "germany", "german", "ドイツ", "德国", "德國", "독일"] },
];

const norm = (s: string) => s.trim().toLowerCase().replace(/[.\s]+/g, " ");

export function embassyFor(nationality: string | null | undefined): EmbassyInfo | null {
  if (!nationality) return null;
  const n = norm(nationality);
  if (!n) return null;
  const hit = EMBASSIES.find((e) => e.aliases.some((a) => norm(a) === n));
  if (!hit) return null;
  const { aliases: _a, ...info } = hit;
  return info;
}

// "03-3224-5000" → "+81332245000"（海外 SIM でもかかる形式）
export function toInternationalDial(tel: string): string {
  return "+81" + tel.replace(/[^0-9]/g, "").replace(/^0/, "");
}
