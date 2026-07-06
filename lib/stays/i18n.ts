"use client";

// =========================================================
// Stays（予約UI）の多言語化
// メインターゲット: 訪日外国人（中華圏・欧州）→ デフォルトは英語。
// 繁体字（台湾/香港）・簡体字・日本語を切替可能。
// =========================================================
import { useEffect, useState } from "react";
import type { CancellationPolicy, PropertyType } from "./types";

export type StaysLang = "en" | "tw" | "zh" | "ja";
const KEY = "stays_lang";
export const STAYS_LANGS: { code: StaysLang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "tw", label: "繁體中文" },
  { code: "zh", label: "简体中文" },
  { code: "ja", label: "日本語" },
];

interface Dict {
  // ナビ
  searchStays: string; wishlist: string; trips: string; login: string; logout: string;
  hostConsole: string; adminConsole: string; footer: string;
  // 一覧
  searchPlaceholder: string; guestsN: string; viewSplit: string; viewList: string; viewMap: string;
  results: string; noResults: string; perNight: string; maxN: string; loading: string;
  dataError: string;
  // AI検索
  aiPlaceholder: string; aiButton: string; aiUnderstood: string;
  // フィルター
  filters: string; reset: string; priceRange: string; priceMin: string; priceMax: string;
  propertyType: string; amenities: string; rating: string; ratingAny: string; instantOnly: string;
  sortRecommended: string; sortPriceAsc: string; sortPriceDesc: string; sortRating: string;
  // 予約ウィジェット
  checkIn: string; checkOut: string; guests: string; yourName: string; yourEmail: string;
  coupon: string; apply: string; options: string; cleaningFee: string; couponDiscount: string;
  optionsTotal: string; serviceFee: string; total: string; nightsUnit: string;
  instantBook: string; bookNow: string; requestBook: string; sending: string;
  unavailable: string; minNightsWarn: string; usePoints: string; ptBalance: string; ptEarn: string;
  bookedInstant: string; bookedRequest: string; pendingApproval: string; payNow: string; payLater: string;
  // 詳細
  about: string; amenitiesTitle: string; location: string; noLocation: string; backToList: string;
  hostLabel: string; reviewsAnchor: string; policyTitle: string; weeklyOff: string; monthlyOff: string;
  similar: string; maxGuestsLabel: string; bedrooms: string; baths: string; minNightsLabel: string;
  // ログイン
  loginTitle: string; signupTitle: string; passportLoginTitle: string; emailPh: string; passwordPh: string;
  namePh: string; passportNoPh: string; passportNamePh: string; refCodePh: string;
  loginBtn: string; signupBtn: string; toSignup: string; toLogin: string; toPassport: string;
  demoAccounts: string; passportLoginHint: string; loggedInAs: string;
  // ラベルマップ
  amenity: Record<string, string>;
  ptype: Record<PropertyType, string>;
  policy: Record<CancellationPolicy, string>;
}

const en: Dict = {
  searchStays: "Explore", wishlist: "Wishlist", trips: "Trips", login: "Log in", logout: "Log out",
  hostConsole: "Host", adminConsole: "Admin", footer: "Crane Nest Stays — Kansai stay booking",
  searchPlaceholder: "Search by area or property (e.g. Namba, Kyoto)", guestsN: "guests",
  viewSplit: "Split", viewList: "List", viewMap: "Map",
  results: "results", noResults: "No stays match your search.", perNight: "/ night", maxN: "up to", loading: "Loading…",
  dataError: "Could not load data. Please check the connection.",
  aiPlaceholder: "Ask AI (e.g. house for 6 near KIX with parking under ¥20,000)", aiButton: "AI Search", aiUnderstood: "Understood:",
  filters: "Filters", reset: "Reset", priceRange: "Price per night (JPY)", priceMin: "Min", priceMax: "Max",
  propertyType: "Property type", amenities: "Amenities", rating: "Rating", ratingAny: "Any", instantOnly: "Instant Book only",
  sortRecommended: "Recommended", sortPriceAsc: "Price: low to high", sortPriceDesc: "Price: high to low", sortRating: "Top rated",
  checkIn: "Check-in", checkOut: "Check-out", guests: "Guests", yourName: "Your name", yourEmail: "Email address",
  coupon: "Coupon code", apply: "Apply", options: "Add-ons", cleaningFee: "Cleaning fee", couponDiscount: "Coupon discount",
  optionsTotal: "Add-ons", serviceFee: "Service fee", total: "Total", nightsUnit: "nights",
  instantBook: "Instant Book", bookNow: "Book now", requestBook: "Request to book", sending: "Sending…",
  unavailable: "These dates are not available.", minNightsWarn: "Minimum stay is", usePoints: "Use points (balance", ptBalance: "pt)", ptEarn: "pt back on this booking",
  bookedInstant: "Your booking is confirmed!", bookedRequest: "Booking request sent!", pendingApproval: "(awaiting approval)",
  payNow: "Pay now", payLater: "You can also pay later from Trips",
  about: "About this place", amenitiesTitle: "Amenities", location: "Location", noLocation: "No location registered.", backToList: "Back to list",
  hostLabel: "Host", reviewsAnchor: "Write a review", policyTitle: "Cancellation policy",
  weeklyOff: "% off for 7+ nights", monthlyOff: "% off for 28+ nights",
  similar: "Similar stays you may like", maxGuestsLabel: "guests max", bedrooms: "BR", baths: "BA", minNightsLabel: "min nights",
  loginTitle: "Log in", signupTitle: "Create account", passportLoginTitle: "Log in with passport number",
  emailPh: "Email address", passwordPh: "Password", namePh: "Your name",
  passportNoPh: "Passport number", passportNamePh: "Full name (as registered)", refCodePh: "Referral code (optional — both get points)",
  loginBtn: "Log in", signupBtn: "Sign up", toSignup: "Create an account", toLogin: "Log in with email & password",
  toPassport: "Log in with passport number (transfer users)",
  demoAccounts: "Demo accounts (password: demo123)",
  passportLoginHint: "If you registered your passport for a transfer, log in with your passport number and name.",
  loggedInAs: "Logged in as",
  amenity: { wifi: "Wi-Fi", kitchen: "Kitchen", parking: "Free parking", washer: "Washer", air_conditioning: "Air conditioning", tv: "TV", elevator: "Elevator", bathtub: "Bathtub", pool: "Pool", workspace: "Workspace" },
  ptype: { house: "House", apartment: "Apartment", guesthouse: "Guesthouse", hotel: "Hotel", villa: "Villa", cabin: "Cabin" },
  policy: { flexible: "Flexible — full refund until 1 day before check-in", moderate: "Moderate — full refund until 5 days before, then 50%", strict: "Strict — 50% until 14 days before, then no refund" },
};

const ja: Dict = {
  searchStays: "宿を探す", wishlist: "お気に入り", trips: "旅程", login: "ログイン", logout: "ログアウト",
  hostConsole: "オーナー管理", adminConsole: "管理者", footer: "Crane Nest Stays — 関西の宿泊予約",
  searchPlaceholder: "エリア・宿名で検索（例: 難波、京都）", guestsN: "名",
  viewSplit: "分割", viewList: "一覧", viewMap: "地図",
  results: "件", noResults: "条件に合う宿が見つかりませんでした。", perNight: "/ 泊", maxN: "最大", loading: "読み込み中…",
  dataError: "データを取得できませんでした。接続を確認してください。",
  aiPlaceholder: "AIに文章で相談（例: 関空近くで6人泊まれる一棟貸し2万円以下）", aiButton: "AI検索", aiUnderstood: "解釈した条件:",
  filters: "フィルター", reset: "リセット", priceRange: "1泊料金（円）", priceMin: "下限", priceMax: "上限",
  propertyType: "物件タイプ", amenities: "アメニティ", rating: "評価", ratingAny: "指定なし", instantOnly: "即時予約のみ",
  sortRecommended: "おすすめ順", sortPriceAsc: "料金が安い順", sortPriceDesc: "料金が高い順", sortRating: "評価が高い順",
  checkIn: "チェックイン", checkOut: "チェックアウト", guests: "ゲスト", yourName: "お名前", yourEmail: "メールアドレス",
  coupon: "クーポンコード", apply: "適用", options: "オプション（追加購入）", cleaningFee: "清掃料", couponDiscount: "クーポン割引",
  optionsTotal: "オプション", serviceFee: "サービス料", total: "合計", nightsUnit: "泊",
  instantBook: "即時予約", bookNow: "今すぐ予約する", requestBook: "予約をリクエスト", sending: "送信中…",
  unavailable: "選択した期間は予約できません。", minNightsWarn: "最低泊数:", usePoints: "ポイントを使う（残高", ptBalance: "pt）", ptEarn: "pt 還元",
  bookedInstant: "予約が確定しました！", bookedRequest: "予約リクエストを送信しました！", pendingApproval: "（承認待ち）",
  payNow: "今すぐ支払う", payLater: "後から「旅程」でもお支払いできます",
  about: "この宿について", amenitiesTitle: "アメニティ", location: "場所", noLocation: "位置情報は登録されていません。", backToList: "一覧に戻る",
  hostLabel: "ホスト", reviewsAnchor: "レビューを書く", policyTitle: "キャンセルポリシー",
  weeklyOff: "%OFF（7泊以上）", monthlyOff: "%OFF（28泊以上）",
  similar: "この宿に似ているおすすめ", maxGuestsLabel: "名まで", bedrooms: "寝室", baths: "バス", minNightsLabel: "最低泊数",
  loginTitle: "ログイン", signupTitle: "新規登録", passportLoginTitle: "パスポート番号でログイン",
  emailPh: "メールアドレス", passwordPh: "パスワード", namePh: "お名前",
  passportNoPh: "パスポート番号", passportNamePh: "氏名（登録時と同じ表記）", refCodePh: "紹介コード（任意・双方にpt進呈）",
  loginBtn: "ログイン", signupBtn: "登録する", toSignup: "アカウントを作成する", toLogin: "メール+パスワードでログイン",
  toPassport: "パスポート番号でログイン（送迎利用の方）",
  demoAccounts: "デモアカウント（パスワード: demo123）",
  passportLoginHint: "送迎予約でパスポート登録済みの方は、パスポート番号と氏名でログインできます。",
  loggedInAs: "ログイン中:",
  amenity: { wifi: "Wi-Fi", kitchen: "キッチン", parking: "無料駐車場", washer: "洗濯機", air_conditioning: "エアコン", tv: "テレビ", elevator: "エレベーター", bathtub: "バスタブ", pool: "プール", workspace: "ワークスペース" },
  ptype: { house: "一軒家", apartment: "アパート", guesthouse: "ゲストハウス", hotel: "ホテル", villa: "ヴィラ", cabin: "コテージ" },
  policy: { flexible: "柔軟（前日まで全額返金）", moderate: "標準（5日前まで全額、以降50%）", strict: "厳格（14日前まで50%、以降返金なし）" },
};

const tw: Dict = {
  searchStays: "探索住宿", wishlist: "收藏", trips: "行程", login: "登入", logout: "登出",
  hostConsole: "房東後台", adminConsole: "管理員", footer: "Crane Nest Stays — 關西住宿預訂",
  searchPlaceholder: "以區域或住宿名稱搜尋（例: 難波、京都）", guestsN: "位",
  viewSplit: "分割", viewList: "列表", viewMap: "地圖",
  results: "筆結果", noResults: "沒有符合條件的住宿。", perNight: "/ 晚", maxN: "最多", loading: "載入中…",
  dataError: "無法取得資料，請確認連線。",
  aiPlaceholder: "用一句話問AI（例: 關西機場附近可住6人有停車場，2萬日圓以下）", aiButton: "AI搜尋", aiUnderstood: "已解讀條件:",
  filters: "篩選", reset: "重設", priceRange: "每晚價格（日圓）", priceMin: "下限", priceMax: "上限",
  propertyType: "房源類型", amenities: "設施", rating: "評分", ratingAny: "不限", instantOnly: "僅限即時預訂",
  sortRecommended: "推薦排序", sortPriceAsc: "價格由低到高", sortPriceDesc: "價格由高到低", sortRating: "評分最高",
  checkIn: "入住", checkOut: "退房", guests: "人數", yourName: "姓名", yourEmail: "電子郵件",
  coupon: "優惠碼", apply: "套用", options: "加購選項", cleaningFee: "清潔費", couponDiscount: "優惠折抵",
  optionsTotal: "加購", serviceFee: "服務費", total: "總計", nightsUnit: "晚",
  instantBook: "即時預訂", bookNow: "立即預訂", requestBook: "送出預訂申請", sending: "傳送中…",
  unavailable: "所選日期無法預訂。", minNightsWarn: "最少入住晚數:", usePoints: "使用點數（餘額", ptBalance: "pt）", ptEarn: "pt 回饋",
  bookedInstant: "預訂已確認！", bookedRequest: "預訂申請已送出！", pendingApproval: "（等待房東確認）",
  payNow: "立即付款", payLater: "也可以稍後在「行程」中付款",
  about: "關於此住宿", amenitiesTitle: "設施", location: "位置", noLocation: "尚未登錄位置資訊。", backToList: "返回列表",
  hostLabel: "房東", reviewsAnchor: "撰寫評價", policyTitle: "取消政策",
  weeklyOff: "% OFF（7晚以上）", monthlyOff: "% OFF（28晚以上）",
  similar: "你可能也喜歡", maxGuestsLabel: "人", bedrooms: "臥室", baths: "衛浴", minNightsLabel: "最少晚數",
  loginTitle: "登入", signupTitle: "註冊帳號", passportLoginTitle: "以護照號碼登入",
  emailPh: "電子郵件", passwordPh: "密碼", namePh: "姓名",
  passportNoPh: "護照號碼", passportNamePh: "姓名（與登記時相同）", refCodePh: "推薦碼（選填・雙方獲得點數）",
  loginBtn: "登入", signupBtn: "註冊", toSignup: "建立帳號", toLogin: "以郵件+密碼登入",
  toPassport: "以護照號碼登入（使用接送服務者）",
  demoAccounts: "測試帳號（密碼: demo123）",
  passportLoginHint: "若已在接送預約登記護照，可用護照號碼與姓名登入。",
  loggedInAs: "登入中:",
  amenity: { wifi: "Wi-Fi", kitchen: "廚房", parking: "免費停車", washer: "洗衣機", air_conditioning: "空調", tv: "電視", elevator: "電梯", bathtub: "浴缸", pool: "泳池", workspace: "工作空間" },
  ptype: { house: "整棟住宅", apartment: "公寓", guesthouse: "民宿", hotel: "飯店", villa: "別墅", cabin: "小木屋" },
  policy: { flexible: "彈性（入住前一天可全額退款）", moderate: "標準（5天前全額、之後退50%）", strict: "嚴格（14天前退50%、之後不退款）" },
};

const zh: Dict = {
  ...tw,
  searchStays: "探索住宿", wishlist: "收藏", trips: "行程", login: "登录", logout: "退出",
  hostConsole: "房东后台", adminConsole: "管理员", footer: "Crane Nest Stays — 关西住宿预订",
  searchPlaceholder: "按区域或住宿名称搜索（例: 难波、京都）",
  viewList: "列表", viewMap: "地图",
  results: "条结果", noResults: "没有符合条件的住宿。", loading: "加载中…",
  dataError: "无法获取数据，请检查网络连接。",
  aiPlaceholder: "用一句话问AI（例: 关西机场附近可住6人有停车场，2万日元以下）", aiButton: "AI搜索", aiUnderstood: "已解读条件:",
  filters: "筛选", reset: "重置", priceRange: "每晚价格（日元）",
  propertyType: "房源类型", amenities: "设施", rating: "评分", ratingAny: "不限", instantOnly: "仅限即时预订",
  sortRecommended: "推荐排序", sortPriceAsc: "价格从低到高", sortPriceDesc: "价格从高到低", sortRating: "评分最高",
  checkIn: "入住", checkOut: "退房", guests: "人数", yourName: "姓名", yourEmail: "电子邮箱",
  coupon: "优惠码", apply: "应用", options: "加购选项", cleaningFee: "清洁费", couponDiscount: "优惠抵扣",
  optionsTotal: "加购", serviceFee: "服务费", total: "总计",
  instantBook: "即时预订", bookNow: "立即预订", requestBook: "提交预订申请", sending: "发送中…",
  unavailable: "所选日期无法预订。", minNightsWarn: "最少入住晚数:", usePoints: "使用积分（余额",
  ptEarn: "pt 返还",
  bookedInstant: "预订已确认！", bookedRequest: "预订申请已提交！", pendingApproval: "（等待房东确认）",
  payNow: "立即支付", payLater: "也可以稍后在「行程」中支付",
  about: "关于此住宿", amenitiesTitle: "设施", location: "位置", noLocation: "尚未登记位置信息。", backToList: "返回列表",
  hostLabel: "房东", reviewsAnchor: "写评价", policyTitle: "取消政策",
  similar: "你可能也喜欢", bedrooms: "卧室", baths: "卫浴", minNightsLabel: "最少晚数",
  loginTitle: "登录", signupTitle: "注册账号", passportLoginTitle: "用护照号码登录",
  emailPh: "电子邮箱", passwordPh: "密码", namePh: "姓名",
  passportNoPh: "护照号码", passportNamePh: "姓名（与登记时相同）", refCodePh: "推荐码（选填・双方获得积分）",
  loginBtn: "登录", signupBtn: "注册", toSignup: "创建账号", toLogin: "用邮箱+密码登录",
  toPassport: "用护照号码登录（使用接送服务者）",
  demoAccounts: "测试账号（密码: demo123）",
  passportLoginHint: "若已在接送预约登记护照，可用护照号码与姓名登录。",
  loggedInAs: "已登录:",
  amenity: { wifi: "Wi-Fi", kitchen: "厨房", parking: "免费停车", washer: "洗衣机", air_conditioning: "空调", tv: "电视", elevator: "电梯", bathtub: "浴缸", pool: "泳池", workspace: "工作空间" },
  ptype: { house: "整栋住宅", apartment: "公寓", guesthouse: "民宿", hotel: "酒店", villa: "别墅", cabin: "小木屋" },
  policy: { flexible: "灵活（入住前一天可全额退款）", moderate: "标准（5天前全额、之后退50%）", strict: "严格（14天前退50%、之后不退款）" },
};

const DICTS: Record<StaysLang, Dict> = { en, tw, zh, ja };

export function getStaysLang(): StaysLang {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem(KEY) as StaysLang | null;
  if (saved && saved in DICTS) return saved;
  // ブラウザ言語から初期判定（デフォルト英語）
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("ja")) return "ja";
  if (nav === "zh-tw" || nav === "zh-hk" || nav.startsWith("zh-hant")) return "tw";
  if (nav.startsWith("zh")) return "zh";
  return "en";
}

export function setStaysLang(l: StaysLang) {
  localStorage.setItem(KEY, l);
  window.dispatchEvent(new Event("stays-lang"));
}

export function useStaysT(): { t: Dict; lang: StaysLang } {
  const [lang, setLang] = useState<StaysLang>("en");
  useEffect(() => {
    const sync = () => setLang(getStaysLang());
    sync();
    window.addEventListener("stays-lang", sync);
    return () => window.removeEventListener("stays-lang", sync);
  }, []);
  return { t: DICTS[lang], lang };
}
