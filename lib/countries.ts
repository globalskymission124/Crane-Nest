// =========================================================
// 国籍の選択 (パスポート登録)。ISO 3166 の国 (2 文字 / 3 文字) と国際電話の番号。
//  - 保存は 2 文字 (TW / HK / KR …)。Crane-Interigent-Switch の WELCOME 地球儀・宿泊者名簿で使う
//  - 国名は端末の言語で表示 (Intl.DisplayNames)。英語名・自分の言葉の国名・国番号・3 文字コードでも探せる
// =========================================================

/** "TW:TWN:886,…" (2 文字:3 文字:国番号) */
const RAW = "AD:AND:376,AE:ARE:971,AF:AFG:93,AG:ATG:1,AI:AIA:1,AL:ALB:355,AM:ARM:374,AO:AGO:244,AQ:ATA:,AR:ARG:54,AS:ASM:1,AT:AUT:43,AU:AUS:61,AW:ABW:297,AX:ALA:358,AZ:AZE:994,BA:BIH:387,BB:BRB:1,BD:BGD:880,BE:BEL:32,BF:BFA:226,BG:BGR:359,BH:BHR:973,BI:BDI:257,BJ:BEN:229,BL:BLM:590,BM:BMU:1,BN:BRN:673,BO:BOL:591,BQ:BES:599,BR:BRA:55,BS:BHS:1,BT:BTN:975,BV:BVT:,BW:BWA:267,BY:BLR:375,BZ:BLZ:501,CA:CAN:1,CC:CCK:61,CD:COD:243,CF:CAF:236,CG:COG:242,CH:CHE:41,CI:CIV:225,CK:COK:682,CL:CHL:56,CM:CMR:237,CN:CHN:86,CO:COL:57,CR:CRI:506,CU:CUB:53,CV:CPV:238,CW:CUW:599,CX:CXR:61,CY:CYP:357,CZ:CZE:420,DE:DEU:49,DJ:DJI:253,DK:DNK:45,DM:DMA:1,DO:DOM:1,DZ:DZA:213,EC:ECU:593,EE:EST:372,EG:EGY:20,EH:ESH:212,ER:ERI:291,ES:ESP:34,ET:ETH:251,FI:FIN:358,FJ:FJI:679,FK:FLK:500,FM:FSM:691,FO:FRO:298,FR:FRA:33,GA:GAB:241,GB:GBR:44,GD:GRD:1,GE:GEO:995,GF:GUF:594,GG:GGY:44,GH:GHA:233,GI:GIB:350,GL:GRL:299,GM:GMB:220,GN:GIN:224,GP:GLP:590,GQ:GNQ:240,GR:GRC:30,GS:SGS:,GT:GTM:502,GU:GUM:1,GW:GNB:245,GY:GUY:592,HK:HKG:852,HM:HMD:,HN:HND:504,HR:HRV:385,HT:HTI:509,HU:HUN:36,ID:IDN:62,IE:IRL:353,IL:ISR:972,IM:IMN:44,IN:IND:91,IO:IOT:246,IQ:IRQ:964,IR:IRN:98,IS:ISL:354,IT:ITA:39,JE:JEY:44,JM:JAM:1,JO:JOR:962,JP:JPN:81,KE:KEN:254,KG:KGZ:996,KH:KHM:855,KI:KIR:686,KM:COM:269,KN:KNA:1,KP:PRK:850,KR:KOR:82,KW:KWT:965,KY:CYM:1,KZ:KAZ:7,LA:LAO:856,LB:LBN:961,LC:LCA:1,LI:LIE:423,LK:LKA:94,LR:LBR:231,LS:LSO:266,LT:LTU:370,LU:LUX:352,LV:LVA:371,LY:LBY:218,MA:MAR:212,MC:MCO:377,MD:MDA:373,ME:MNE:382,MF:MAF:590,MG:MDG:261,MH:MHL:692,MK:MKD:389,ML:MLI:223,MM:MMR:95,MN:MNG:976,MO:MAC:853,MP:MNP:1,MQ:MTQ:596,MR:MRT:222,MS:MSR:1,MT:MLT:356,MU:MUS:230,MV:MDV:960,MW:MWI:265,MX:MEX:52,MY:MYS:60,MZ:MOZ:258,NA:NAM:264,NC:NCL:687,NE:NER:227,NF:NFK:672,NG:NGA:234,NI:NIC:505,NL:NLD:31,NO:NOR:47,NP:NPL:977,NR:NRU:674,NU:NIU:683,NZ:NZL:64,OM:OMN:968,PA:PAN:507,PE:PER:51,PF:PYF:689,PG:PNG:675,PH:PHL:63,PK:PAK:92,PL:POL:48,PM:SPM:508,PN:PCN:,PR:PRI:1,PS:PSE:970,PT:PRT:351,PW:PLW:680,PY:PRY:595,QA:QAT:974,RE:REU:262,RO:ROU:40,RS:SRB:381,RU:RUS:7,RW:RWA:250,SA:SAU:966,SB:SLB:677,SC:SYC:248,SD:SDN:249,SE:SWE:46,SG:SGP:65,SH:SHN:290,SI:SVN:386,SJ:SJM:47,SK:SVK:421,SL:SLE:232,SM:SMR:378,SN:SEN:221,SO:SOM:252,SR:SUR:597,SS:SSD:211,ST:STP:239,SV:SLV:503,SX:SXM:1,SY:SYR:963,SZ:SWZ:268,TC:TCA:1,TD:TCD:235,TF:ATF:,TG:TGO:228,TH:THA:66,TJ:TJK:992,TK:TKL:690,TL:TLS:670,TM:TKM:993,TN:TUN:216,TO:TON:676,TR:TUR:90,TT:TTO:1,TV:TUV:688,TW:TWN:886,TZ:TZA:255,UA:UKR:380,UG:UGA:256,UM:UMI:,US:USA:1,UY:URY:598,UZ:UZB:998,VA:VAT:39,VC:VCT:1,VE:VEN:58,VG:VGB:1,VI:VIR:1,VN:VNM:84,VU:VUT:678,WF:WLF:681,WS:WSM:685,XK:XKK:383,YE:YEM:967,YT:MYT:262,ZA:ZAF:27,ZM:ZMB:260,ZW:ZWE:263";

export interface Country { a2: string; a3: string; tel: string }
export const COUNTRIES: Country[] = RAW.split(",").map((r) => { const [a2, a3, tel] = r.split(":"); return { a2, a3, tel }; });
const BY_A3 = new Map(COUNTRIES.map((c) => [c.a3, c.a2]));

/** よく来る国 (リストの上に出す) */
export const COMMON = ["TW", "HK", "CN", "KR", "SG", "MY", "TH", "US", "AU", "PH", "VN", "ID", "GB", "FR", "DE", "CA", "MO", "IN"];

/** 国旗の絵文字 */
export const flagOf = (a2: string) => a2.length === 2 ? String.fromCodePoint(...[...a2.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)) : "🏳️";

const dnCache = new Map<string, Intl.DisplayNames | null>();
/** 国名 (その言語で)。読めなければ 2 文字のまま */
export function countryName(a2: string, locale: string): string {
  const loc = locale === "zh" ? "zh-CN" : locale;
  let dn = dnCache.get(loc);
  if (dn === undefined) { try { dn = new Intl.DisplayNames([loc], { type: "region" }); } catch { dn = null; } dnCache.set(loc, dn); }
  try { return dn?.of(a2) ?? a2; } catch { return a2; }
}

/** パスポートの MRZ の 3 文字 (TWN / CHN / D) → 2 文字。香港・マカオのパスポートは発行国 (HKG / MAC) を優先 */
export function fromMrz(nationality: string | null | undefined, issuing?: string | null): string | null {
  const iss = String(issuing ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  if (iss === "HKG" || iss === "MAC") return iss === "HKG" ? "HK" : "MO";
  const n = String(nationality ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  if (!n) return null;
  if (n === "D") return "DE"; // ドイツは D<<
  if (n === "GBR" || /^GB[A-Z]$/.test(n)) return "GB";
  if (n.length === 2 && COUNTRIES.some((c) => c.a2 === n)) return n;
  return BY_A3.get(n) ?? null;
}

/** 電話番号の国番号 (+886 …) から国。+1 はアメリカ、+7 はロシア、+44 はイギリス */
export function fromPhone(phone: string | null | undefined): string | null {
  const d = String(phone ?? "").replace(/[^\d+]/g, "");
  const m = d.match(/^(?:\+|00)(\d{1,4})/); if (!m) return null;
  const pref: Record<string, string> = { "1": "US", "7": "RU", "44": "GB", "61": "AU", "39": "IT", "47": "NO", "590": "GP", "262": "RE", "212": "MA", "358": "FI", "599": "CW" };
  for (let n = Math.min(4, m[1].length); n >= 1; n--) {
    const code = m[1].slice(0, n);
    if (pref[code]) return pref[code];
    const hit = COUNTRIES.find((c) => c.tel === code);
    if (hit) return hit.a2;
  }
  return null;
}

/** 端末の言語・地域から (zh-TW → TW など)。最後の手がかり */
export function fromBrowser(): string | null {
  if (typeof navigator === "undefined") return null;
  for (const l of navigator.languages ?? [navigator.language]) {
    const m = String(l).match(/[-_]([A-Za-z]{2})\b/);
    if (m && COUNTRIES.some((c) => c.a2 === m[1].toUpperCase()) && m[1].toUpperCase() !== "JP") return m[1].toUpperCase();
  }
  return null;
}

/** 主な都市・地域の名前 → 国 (住所や検索に都市名だけ書く人が多いので)。小文字・空白なし */
const CITY: Record<string, string> = {
  taipei: "TW", taichung: "TW", kaohsiung: "TW", tainan: "TW", taoyuan: "TW", hsinchu: "TW", 台北: "TW", 臺北: "TW", 台中: "TW", 臺中: "TW", 高雄: "TW", 台南: "TW", 臺南: "TW", 桃園: "TW", 新北: "TW", 新竹: "TW",
  hongkong: "HK", kowloon: "HK", 九龍: "HK", 九龙: "HK", 新界: "HK", 香港: "HK", macau: "MO", macao: "MO", 澳門: "MO", 澳门: "MO",
  beijing: "CN", shanghai: "CN", guangzhou: "CN", shenzhen: "CN", chengdu: "CN", hangzhou: "CN", wuhan: "CN", xian: "CN", nanjing: "CN", 北京: "CN", 上海: "CN", 广州: "CN", 深圳: "CN", 成都: "CN", 杭州: "CN", 武汉: "CN", 西安: "CN", 南京: "CN", 重庆: "CN", 天津: "CN",
  seoul: "KR", busan: "KR", incheon: "KR", daegu: "KR", jeju: "KR", 서울: "KR", 부산: "KR", 인천: "KR", 대구: "KR", 제주: "KR",
  singapore: "SG", kualalumpur: "MY", penang: "MY", johorbahru: "MY", bangkok: "TH", chiangmai: "TH", phuket: "TH", manila: "PH", cebu: "PH", quezoncity: "PH",
  hanoi: "VN", hochiminh: "VN", saigon: "VN", danang: "VN", jakarta: "ID", bali: "ID", surabaya: "ID", newdelhi: "IN", delhi: "IN", mumbai: "IN", bangalore: "IN",
  sydney: "AU", melbourne: "AU", brisbane: "AU", perth: "AU", auckland: "NZ", london: "GB", manchester: "GB", edinburgh: "GB", paris: "FR", lyon: "FR", berlin: "DE", munich: "DE", frankfurt: "DE", hamburg: "DE",
  rome: "IT", milan: "IT", madrid: "ES", barcelona: "ES", amsterdam: "NL", zurich: "CH", geneva: "CH", stockholm: "SE", moscow: "RU", dubai: "AE", abudhabi: "AE",
  newyork: "US", losangeles: "US", sanfrancisco: "US", seattle: "US", chicago: "US", boston: "US", hawaii: "US", honolulu: "US", california: "US", texas: "US", toronto: "CA", vancouver: "CA", montreal: "CA", saopaulo: "BR", mexicocity: "MX",
};
const sq = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\s.\-'’(),，、]/g, "");
let NAME_IDX: [string, string][] | null = null;
/** いろんな言語の国名 (と 3 文字コード) → 国。長い名前から先に (「South Korea」を「Korea」より先に) */
function nameIndex(): [string, string][] {
  if (NAME_IDX) return NAME_IDX;
  const m = new Map<string, string>();
  for (const loc of ["en", "ja", "zh", "zh-TW", "ko", "es", "fr", "de", "it", "pt", "th", "vi", "id", "ru"])
    for (const c of COUNTRIES) { const n = sq(countryName(c.a2, loc)); if (n.length >= 2 && !m.has(n)) m.set(n, c.a2); }
  m.set("usa", "US"); m.set("america", "US"); m.set("uk", "GB"); m.set("england", "GB"); m.set("korea", "KR"); m.set("taiwanroc", "TW"); m.set("roc", "TW"); m.set("prc", "CN");
  m.set("中國", "CN"); m.set("中华人民共和国", "CN"); m.set("中華民國", "TW"); m.set("한국", "KR"); m.set("대한민국", "KR");
  NAME_IDX = [...m.entries()].sort((a, b) => b[0].length - a[0].length);
  return NAME_IDX;
}

/** 書いた言葉 (住所・検索) から国を予想する。最後のほう (住所は国名が最後) を優先。わからなければ null */
export function fromText(text: string | null | undefined): string | null {
  const raw = String(text ?? "").trim(); if (raw.length < 2) return null;
  const segs = raw.split(/[,，、\n\r;／/|]+/).map((x) => sq(x.replace(/[0-9]{3,}[0-9\-]*/g, " "))).filter(Boolean).reverse();
  const idx = nameIndex();
  for (const seg of segs) {
    for (const [n, c] of idx) if (seg === n) return c;
    if (CITY[seg]) return CITY[seg];
  }
  const all = sq(raw);
  for (const seg of segs) for (const [n, c] of idx) if (n.length >= 4 && seg.endsWith(n)) return c;
  for (const [k, c] of Object.entries(CITY)) if ((k.length >= 4 || /[^\x00-\x7f]/.test(k)) && all.includes(k)) return c; // 漢字・ハングルの都市名は 2 文字でも (台北市… / 서울특별시…)
  for (const [n, c] of idx) if (n.length >= 5 && all.includes(n)) return c;
  return null;
}

/** 少しの打ちまちがいも許して比べる (編集距離) */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  // 入れかわり (taiwna → taiwan) も 1 回と数える
  let pp: number[] = [], prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], pp[j - 2] + 1);
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1; pp = prev; prev = cur;
  }
  return prev[b.length];
}
/** 都市名の検索用 (Taipei → TW) */
export const cityToCountry = (q: string): string | null => CITY[sq(q)] ?? null;
export const searchKey = sq;
