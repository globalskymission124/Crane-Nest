// =========================================================
// 公式サイト（/site）の多言語コンテンツ + SEO/AI検索(AEO)用データ
// サーバーレンダリングされるため、検索エンジン・AIクローラーが
// そのまま本文を読める（クライアントJS不要）。
// =========================================================

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crane-nest-cmn2.vercel.app";

export type SiteLocale = "ja" | "en" | "zh" | "tw";

export interface SiteContent {
  locale: SiteLocale;
  htmlLang: string;
  title: string;
  description: string;
  hero: { heading: string; sub: string; ctaSearch: string; ctaTransfer: string };
  features: { title: string; body: string }[];
  areasTitle: string;
  areas: { name: string; desc: string }[];
  faqTitle: string;
  faq: { q: string; a: string }[];
  hostTitle: string;
  hostBody: string;
  hostCta: string;
  footer: string;
}

export const SITE_CONTENT: Record<SiteLocale, SiteContent> = {
  ja: {
    locale: "ja",
    htmlLang: "ja",
    title: "Crane Nest（クレインネスト）| 関西の一棟貸し・町家ゲストハウス予約と空港送迎",
    description:
      "Crane Nestは関西国際空港エリア・大阪難波・京都の一棟貸しゲストハウスや町家を直接予約できる宿泊プラットフォーム。手数料を抑えた直予約、無料の空港送迎手配、パスポート事前チェックイン対応。",
    hero: {
      heading: "関西の“泊まりたい”へ、まっすぐ。",
      sub: "関空すぐの一棟貸しから京都の町家まで。直接予約だから手数料も安く、空港送迎と事前チェックインまでひとつのアプリで完結します。",
      ctaSearch: "宿を検索する",
      ctaTransfer: "空港送迎を予約",
    },
    features: [
      { title: "直接予約でおトク", body: "大手OTAより低いサービス料率。長期滞在は週割・月割が自動適用され、クーポンも使えます。" },
      { title: "空港送迎とセット", body: "関西国際空港からの送迎をパスポート登録と同時に手配。フライト時刻から最適な出発時刻を自動提案します。" },
      { title: "事前チェックイン", body: "パスポートをスマホで撮影するだけ。到着日は鍵を受け取ってすぐ滞在を開始できます。" },
      { title: "安心のサポート", body: "ホストと直接チャット、柔軟なキャンセルポリシー、管理者によるレビュー・通報対応で安心。" },
    ],
    areasTitle: "掲載エリア",
    areas: [
      { name: "泉佐野・りんくう（関空エリア）", desc: "関西国際空港から車で15分。前泊・後泊に最適な一棟貸しゲストハウス。" },
      { name: "大阪・難波", desc: "難波駅徒歩5分。道頓堀・心斎橋へ徒歩圏のモダン和室アパートメント。" },
      { name: "京都・鴨川", desc: "祇園・清水寺に好アクセスの伝統町家ステイ。" },
    ],
    faqTitle: "よくある質問",
    faq: [
      { q: "Crane Nest（クレインネスト）とは何ですか?", a: "関西の一棟貸しゲストハウス・町家を直接予約できる宿泊プラットフォームです。空港送迎の手配、パスポートによる事前チェックイン、ホストとのチャット、クレジットカード決済（Stripe）に対応しています。" },
      { q: "予約のキャンセルはできますか?", a: "できます。各宿のキャンセルポリシー（柔軟・標準・厳格）に基づき、返金額が自動計算されます。柔軟ポリシーの宿はチェックイン前日まで全額返金です。" },
      { q: "空港送迎は誰でも利用できますか?", a: "Crane Nest掲載の宿にご宿泊の方が利用できます。パスポート登録と同時にお申し込みいただけ、フライト時刻に合わせて最適な送迎時刻をご提案します。" },
      { q: "支払い方法は何が使えますか?", a: "クレジットカード（Visa / Mastercard / AMEX等、Stripe決済）に対応しています。予約確定後のオンライン決済で、領収書も発行されます。" },
      { q: "Airbnbとの違いは何ですか?", a: "直接予約のためサービス料が低く、空港送迎・事前チェックイン・多通貨表示・長期割引など、関西滞在に特化した機能をひとつのアプリで利用できる点が異なります。" },
    ],
    hostTitle: "宿を掲載しませんか?",
    hostBody: "掲載は無料。成約時のみの低率手数料で、スマート価格提案・売上分析・クーポン発行・Airbnbカレンダー同期まで無料で使えます。",
    hostCta: "オーナー登録・掲載について",
    footer: "関西の宿泊予約プラットフォーム",
  },
  en: {
    locale: "en",
    htmlLang: "en",
    title: "Crane Nest | Book Kansai Guesthouses & Machiya + Free Airport Transfer",
    description:
      "Crane Nest is a direct-booking platform for entire-house guesthouses and machiya townhouses near Kansai International Airport (KIX), Osaka Namba and Kyoto. Lower fees than major OTAs, airport transfer arrangement, and passport-based online pre-check-in.",
    hero: {
      heading: "Your Kansai stay, booked direct.",
      sub: "From whole-house rentals minutes from KIX to traditional Kyoto machiya. Direct booking means lower fees — with airport transfer and pre-check-in in one app.",
      ctaSearch: "Search stays",
      ctaTransfer: "Book airport transfer",
    },
    features: [
      { title: "Save with direct booking", body: "Lower service fees than major OTAs. Weekly and monthly discounts apply automatically, and coupons are supported." },
      { title: "Airport transfer included", body: "Arrange your KIX pickup while registering your passport. We suggest the best departure time from your flight schedule." },
      { title: "Online pre-check-in", body: "Just photograph your passport on your phone. Pick up the key and start your stay right away on arrival day." },
      { title: "Stay with confidence", body: "Chat directly with hosts, flexible cancellation policies, and moderated reviews for peace of mind." },
    ],
    areasTitle: "Areas",
    areas: [
      { name: "Izumisano / Rinku (KIX area)", desc: "15 minutes by car from Kansai International Airport. Ideal for pre/post-flight stays." },
      { name: "Osaka Namba", desc: "5-minute walk from Namba Station, near Dotonbori and Shinsaibashi." },
      { name: "Kyoto Kamogawa", desc: "Traditional machiya stay with easy access to Gion and Kiyomizu-dera." },
    ],
    faqTitle: "Frequently asked questions",
    faq: [
      { q: "What is Crane Nest?", a: "A direct-booking platform for entire-house guesthouses and machiya in Kansai, Japan. It supports airport transfer arrangement, passport-based pre-check-in, host chat, and secure card payment via Stripe." },
      { q: "Can I cancel my booking?", a: "Yes. Refunds are calculated automatically based on each property's cancellation policy (flexible, moderate, or strict). Flexible properties refund in full until the day before check-in." },
      { q: "Who can use the airport transfer?", a: "Guests staying at Crane Nest properties. You can request it while registering your passport, and we suggest the optimal pickup time based on your flight." },
      { q: "What payment methods are accepted?", a: "Credit cards (Visa, Mastercard, AMEX and more) via Stripe. Pay online after your booking is confirmed." },
      { q: "How is Crane Nest different from Airbnb?", a: "Direct booking means lower service fees, plus Kansai-focused features in one app: airport transfer, pre-check-in, multi-currency display and long-stay discounts." },
    ],
    hostTitle: "List your property",
    hostBody: "Free to list, with a low commission only when you get booked. Smart pricing suggestions, revenue analytics, coupons and Airbnb calendar sync included.",
    hostCta: "About hosting",
    footer: "Kansai stay booking platform",
  },
  zh: {
    locale: "zh",
    htmlLang: "zh-CN",
    title: "Crane Nest | 关西整栋民宿·町家直订平台 + 关西机场接送",
    description:
      "Crane Nest是关西地区的住宿直订平台，可预订关西国际机场周边、大阪难波、京都的整栋民宿和町家。比大型OTA更低的服务费，提供机场接送安排和护照在线预办入住。",
    hero: {
      heading: "直订关西好宿，一步到位。",
      sub: "从关西机场旁的整栋民宿到京都传统町家。直接预订手续费更低，机场接送与预办入住一个应用全搞定。",
      ctaSearch: "搜索住宿",
      ctaTransfer: "预约机场接送",
    },
    features: [
      { title: "直订更划算", body: "服务费低于大型OTA，连住7晚/28晚自动享受周租/月租折扣，还可使用优惠码。" },
      { title: "机场接送配套", body: "登记护照时即可同时安排关西机场接送，根据航班时间自动建议最佳出发时刻。" },
      { title: "在线预办入住", body: "手机拍摄护照即可完成登记，到店拿钥匙立即入住。" },
      { title: "安心保障", body: "与房东直接聊天、灵活的取消政策、平台审核评价与举报处理。" },
    ],
    areasTitle: "覆盖区域",
    areas: [
      { name: "泉佐野·临空（关西机场区域）", desc: "距关西国际机场车程15分钟，适合赶早班机/晚到的旅客。" },
      { name: "大阪·难波", desc: "难波站步行5分钟，步行可达道顿堀、心斋桥。" },
      { name: "京都·鸭川", desc: "传统町家住宿，前往祇园、清水寺交通便利。" },
    ],
    faqTitle: "常见问题",
    faq: [
      { q: "Crane Nest是什么?", a: "关西地区整栋民宿·町家的直订平台，支持机场接送安排、护照在线预办入住、与房东聊天以及Stripe信用卡支付。" },
      { q: "可以取消预订吗?", a: "可以。系统会根据各房源的取消政策（灵活/标准/严格）自动计算退款金额。灵活政策的房源在入住前一天可全额退款。" },
      { q: "谁可以使用机场接送?", a: "入住Crane Nest房源的客人均可使用。登记护照时即可申请，并根据航班时间获得最佳接送时刻建议。" },
      { q: "支持哪些支付方式?", a: "支持信用卡（Visa / Mastercard / AMEX等，Stripe支付），预订确认后在线支付并可开具收据。" },
      { q: "与Airbnb有什么不同?", a: "直订服务费更低，且机场接送、预办入住、多币种显示、长住折扣等关西旅行专属功能都集成在一个应用里。" },
    ],
    hostTitle: "成为房东",
    hostBody: "免费上架，仅成交时收取低额佣金。智能定价建议、营收分析、优惠券、Airbnb日历同步全部免费使用。",
    hostCta: "了解房东入驻",
    footer: "关西住宿预订平台",
  },
  tw: {
    locale: "tw",
    htmlLang: "zh-TW",
    title: "Crane Nest | 關西整棟民宿·町家直訂平台 + 關西機場接送",
    description:
      "Crane Nest是關西地區的住宿直訂平台，可預訂關西國際機場周邊、大阪難波、京都的整棟民宿與町家。比大型OTA更低的服務費，提供機場接送安排與護照線上預辦入住。",
    hero: {
      heading: "直訂關西好宿，一步到位。",
      sub: "從關西機場旁的整棟民宿到京都傳統町家。直接預訂手續費更低，機場接送與預辦入住一個應用全搞定。",
      ctaSearch: "搜尋住宿",
      ctaTransfer: "預約機場接送",
    },
    features: [
      { title: "直訂更划算", body: "服務費低於大型OTA，連住7晚/28晚自動享有週租/月租折扣，還可使用優惠碼。" },
      { title: "機場接送配套", body: "登記護照時即可同時安排關西機場接送，依航班時間自動建議最佳出發時刻。" },
      { title: "線上預辦入住", body: "手機拍攝護照即可完成登記，到店取鑰匙立即入住。" },
      { title: "安心保障", body: "與房東直接聊天、彈性的取消政策、平台審核評價與檢舉處理。" },
    ],
    areasTitle: "涵蓋區域",
    areas: [
      { name: "泉佐野·臨空（關西機場區域）", desc: "距關西國際機場車程15分鐘，適合趕早班機/晚到的旅客。" },
      { name: "大阪·難波", desc: "難波站步行5分鐘，步行可達道頓堀、心齋橋。" },
      { name: "京都·鴨川", desc: "傳統町家住宿，前往祇園、清水寺交通便利。" },
    ],
    faqTitle: "常見問題",
    faq: [
      { q: "Crane Nest是什麼?", a: "關西地區整棟民宿·町家的直訂平台，支援機場接送安排、護照線上預辦入住、與房東聊天以及Stripe信用卡支付。" },
      { q: "可以取消預訂嗎?", a: "可以。系統會依各房源的取消政策（彈性/標準/嚴格）自動計算退款金額。彈性政策的房源在入住前一天可全額退款。" },
      { q: "誰可以使用機場接送?", a: "入住Crane Nest房源的旅客均可使用。登記護照時即可申請，並依航班時間獲得最佳接送時刻建議。" },
      { q: "支援哪些付款方式?", a: "支援信用卡（Visa / Mastercard / AMEX等，Stripe支付），預訂確認後線上付款並可開立收據。" },
      { q: "與Airbnb有什麼不同?", a: "直訂服務費更低，且機場接送、預辦入住、多幣別顯示、長住折扣等關西旅行專屬功能都整合在一個應用裡。" },
    ],
    hostTitle: "成為房東",
    hostBody: "免費上架，僅成交時收取低額佣金。智慧定價建議、營收分析、優惠券、Airbnb日曆同步全部免費使用。",
    hostCta: "了解房東進駐",
    footer: "關西住宿預訂平台",
  },
};
