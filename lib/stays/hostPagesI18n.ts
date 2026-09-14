"use client";

// =========================================================
// オーナー（ホスト）各画面の多言語辞書（日/英/繁/簡）
//  hostI18n.ts と同じ言語状態（stays_lang）を共有する。
//  ナビ＋各ページの表示文言をまとめて管理。
// =========================================================
import { useEffect, useState } from "react";
import { getStaysLang, type StaysLang } from "./i18n";

export interface HostPagesDict {
  nav: {
    bookings: string; analytics: string; payouts: string; listings: string; experiences: string;
    passport: string; coupons: string; calendar: string; messages: string; menu: string; today: string;
  };
  common: { save: string; cancel: string; edit: string; delete: string; active: string; inactive: string; loading: string; add: string };
  menu: {
    title: string; ownerMode: string; income: string; monthIncome: string; insights: string; reviewsUnit: string;
    createNew: string; createNewDesc: string; accountSettings: string; myListings: string; checkinQR: string;
    getHelp: string; openBackend: string; logout: string; profile: string;
  };
  analytics: {
    title: string; scPayout: string; scPayoutSubA: string; scPayoutSubB: string; scOcc: string; scAdr: string; scRating: string;
    reviewsUnit: string; chartRevenue: string; chartBookings: string; monthSuffix: string; smartPricing: string; apply: string;
    superhostTitle: string; superhostAchieved: string; shRating: string; shReviews: string; shGoal: string;
  };
  payouts: {
    title: string; subtitle: string; scTotal: string; scTotalSub: string; scMonth: string; scMonthSub: string;
    scPaid: string; scPaidSub: string; scPending: string; scPendingSub: string;
    accountTitle: string; accountDesc: string; bankName: string; bankNamePh: string; accountName: string; accountNamePh: string;
    accountInfo: string; accountInfoPh: string; saveAccount: string; saveMsgOk: string;
    detailTitle: string; noEarnings: string; thPropertyPeriod: string; thTotal: string; thFee: string; thNet: string; totalNet: string;
    historyTitle: string; noHistory: string; paid: string; processing: string;
    nextTitle: string; nextDateLabel: string; nextAmountLabel: string; nextNote: string;
  };
  promotions: {
    title: string; newCoupon: string; editCoupon: string; code: string; targetListing: string; allListings: string;
    discountType: string; percent: string; fixed: string; discountRate: string; discountAmount: string;
    validFrom: string; validTo: string; maxUses: string; noCoupons: string; targetSite: string; targetAllMine: string;
    off: string; usedLabel: string; addonTitle: string; addonAdd: string; addonDesc: string; siteCommon: string;
  };
  checkin: {
    title: string; createPage: string; subtitle: string; editPage: string; newPage: string; pageTitle: string; urlName: string;
    welcomeMsg: string; requirePhone: string; requirePhoto: string; noPages: string; posterPrint: string; preview: string;
    published: string; stopped: string; guestsTitle: string; csvDownload: string;
    thDatetime: string; thName: string; thPassport: string; thNationality: string; thPhone: string; thCi: string; thPhoto: string;
    show: string; noGuests: string;
  };
  experiences: {
    title: string; add: string; expTitle: string; desc: string; category: string; city: string; pricePer: string; duration: string;
    maxGuests: string; meetingPoint: string; lat: string; lng: string; photos: string; uploadHint: string; uploading: string; cover: string; makeCover: string;
    noItems: string; publishTo: string; unpublishTo: string; bookingsTitle: string; pendingBadge: string; noBookings: string;
    approve: string; reject: string; markDone: string; stPending: string; stConfirmed: string; stCompleted: string; stCancelled: string; perPerson: string; maxUnit: string;
  };
  calendar: {
    title: string; subtitle: string; selectListing: string; exportTitle: string; exportDesc: string; copy: string;
    importTitle: string; importDesc: string; saveUrl: string; syncNow: string; blocksTitle: string; start: string; endExclusive: string;
    addBlock: string; noBlocks: string; srcManual: string; srcAirbnb: string; srcBooking: string; copied: string; urlSaved: string; manualBlockNote: string;
    gridTitle: string; selectDayHint: string; priceOverride: string; savePrice: string; clearOverride: string; blockDay: string; unblockDay: string; baseLabel: string; daysUnit: string; selectedRange: string; overviewTitle: string; overviewLegend: string;
  };
  messages: { title: string; subtitle: string; noConvos: string; selectConvo: string };
}

const ja: HostPagesDict = {
  nav: { bookings: "予約", analytics: "分析", payouts: "受取", listings: "物件", experiences: "体験", passport: "パスポート登録", coupons: "クーポン", calendar: "カレンダー同期", messages: "メッセージ", menu: "メニュー", today: "今日" },
  common: { save: "保存", cancel: "キャンセル", edit: "編集", delete: "削除", active: "有効", inactive: "無効", loading: "読み込み中…", add: "追加" },
  menu: { title: "メニュー", ownerMode: "オーナーモード", income: "収入", monthIncome: "今月の収入", insights: "分析インサイト", reviewsUnit: "件のレビュー", createNew: "新しく作成", createNewDesc: "物件・体験・サービスを公開して収入源を広げましょう。", accountSettings: "アカウント設定", myListings: "物件管理", checkinQR: "チェックインQR", getHelp: "ヘルプ", openBackend: "オーナー管理を開く", logout: "ログアウト", profile: "プロフィール" },
  analytics: { title: "分析ダッシュボード", scPayout: "受取見込額（手数料差引後）", scPayoutSubA: "総流通", scPayoutSubB: "手数料", scOcc: "今後30日の平均稼働率", scAdr: "平均宿泊単価 (ADR)", scRating: "レビュー平均", reviewsUnit: "件", chartRevenue: "月別売上（チェックイン月ベース）", chartBookings: "月別予約数", monthSuffix: "月", smartPricing: "スマート価格提案", apply: "適用", superhostTitle: "スーパーホストへの進捗", superhostAchieved: "スーパーホスト達成！", shRating: "評価", shReviews: "レビュー数", shGoal: "目標" },
  payouts: { title: "受取（Payout）", subtitle: "受取額 = 宿泊料 − ゲストサービス料 − 成約手数料。支払済みの予約が対象です。", scTotal: "累計受取（確定）", scTotalSub: "件の支払済み予約", scMonth: "今月の受取", scMonthSub: "チェックイン/予約日ベース", scPaid: "振込済み", scPaidSub: "回", scPending: "未振込（残高）", scPendingSub: "累計受取 − 振込済み", accountTitle: "受取口座", accountDesc: "振込先を登録してください。ここに入力した情報をもとに運営が振込を行います。", bankName: "金融機関名", bankNamePh: "例：〇〇銀行 △△支店", accountName: "口座名義", accountNamePh: "例：ヤマダ タロウ", accountInfo: "口座番号・種別など", accountInfoPh: "例：普通 1234567", saveAccount: "受取口座を保存", saveMsgOk: "受取口座を保存しました", detailTitle: "受取明細", noEarnings: "支払済みの予約がまだありません。", thPropertyPeriod: "物件・期間", thTotal: "支払総額", thFee: "手数料", thNet: "受取額", totalNet: "累計受取", historyTitle: "振込履歴", noHistory: "振込履歴はまだありません。運営が振込を行うとここに表示されます。", paid: "振込済み", processing: "処理中", nextTitle: "次回の振込予定", nextDateLabel: "振込予定日", nextAmountLabel: "予定額（未振込残高）", nextNote: "毎月末に前月までの未振込分をまとめて振り込みます（目安）。" },
  promotions: { title: "クーポン管理", newCoupon: "新規クーポン", editCoupon: "クーポンを編集", code: "コード", targetListing: "対象物件", allListings: "すべての物件", discountType: "割引タイプ", percent: "％割引", fixed: "定額割引（円）", discountRate: "割引率（%）", discountAmount: "割引額（円）", validFrom: "有効開始日", validTo: "有効終了日", maxUses: "利用上限回数（空欄=無制限）", noCoupons: "クーポンはまだありません。", targetSite: "サイト全体", targetAllMine: "自分の全物件", off: "OFF", usedLabel: "利用", addonTitle: "オプション商品（アップセル）", addonAdd: "追加", addonDesc: "予約時にゲストが追加購入できる商品です（送迎・朝食・レイトチェックアウトなど）。", siteCommon: "サイト共通" },
  checkin: { title: "パスポート登録ページ", createPage: "ページを作成", subtitle: "自分専用のパスポート登録ページを作り、QRポスターを印刷して宿に掲示。ゲストがスキャンして登録した情報をCSVでダウンロードできます。", editPage: "ページを編集", newPage: "新規ページ", pageTitle: "ページタイトル（ゲストに表示）", urlName: "URL名（半角英数・空欄で自動生成）", welcomeMsg: "ウェルカムメッセージ（英語推奨・任意）", requirePhone: "電話番号を必須にする", requirePhoto: "パスポート写真を必須にする", noPages: "まだページがありません。「ページを作成」から1分で作れます。", posterPrint: "QRポスター印刷", preview: "プレビュー", published: "公開中", stopped: "停止中", guestsTitle: "登録されたゲスト", csvDownload: "CSVダウンロード", thDatetime: "登録日時", thName: "氏名", thPassport: "旅券番号", thNationality: "国籍", thPhone: "電話", thCi: "C/I日", thPhoto: "写真", show: "表示", noGuests: "まだ登録はありません" },
  experiences: { title: "体験の管理", add: "体験を追加", expTitle: "タイトル", desc: "説明", category: "カテゴリ", city: "都市", pricePer: "1名あたり料金（円）", duration: "所要時間（分）", maxGuests: "最大人数", meetingPoint: "集合場所", lat: "緯度（任意）", lng: "経度（任意）", photos: "写真", uploadHint: "ドラッグ、またはクリックして写真を選択", uploading: "アップロード中…", cover: "カバー", makeCover: "カバーにする", noItems: "まだ体験がありません。「体験を追加」から作成できます。", publishTo: "公開する", unpublishTo: "非公開に", bookingsTitle: "体験の予約", pendingBadge: "承認待ち", noBookings: "予約リクエストはまだありません。", approve: "承認", reject: "却下", markDone: "実施済みにする", stPending: "承認待ち", stConfirmed: "確定", stCompleted: "実施済み", stCancelled: "キャンセル", perPerson: "/名", maxUnit: "名" },
  calendar: { title: "カレンダー & Airbnb同期", subtitle: "AirbnbのiCal（.ics）と双方向で空室を同期します。", selectListing: "物件を選択", exportTitle: "① Airbnbへエクスポート", exportDesc: "このURLをAirbnbの「カレンダーを同期 → 別のサイトを接続」に貼り付けると、当サイトの予約がAirbnbに反映されます。", copy: "コピー", importTitle: "② Airbnbからインポート", importDesc: "Airbnbで発行したiCalエクスポートURL（.ics）を貼り付けて保存し、「今すぐ同期」で予約済み日を取り込みます。", saveUrl: "URLを保存", syncNow: "今すぐ同期", blocksTitle: "予約不可日（ブロック）", start: "開始", endExclusive: "終了（排他）", addBlock: "手動ブロック追加", noBlocks: "ブロックはありません。", srcManual: "手動", srcAirbnb: "Airbnb", srcBooking: "サイト予約", copied: "コピーしました。", urlSaved: "iCal URLを保存しました。", manualBlockNote: "オーナー手動ブロック", gridTitle: "料金・空室カレンダー", selectDayHint: "日付をクリック（もう一度クリックで期間選択）して、料金やブロックをまとめて編集できます。", priceOverride: "この日の料金（円）", savePrice: "料金を保存", clearOverride: "基準料金に戻す", blockDay: "この日をブロック", unblockDay: "ブロック解除", baseLabel: "基準", daysUnit: "日間", selectedRange: "選択中", overviewTitle: "全物件カレンダー", overviewLegend: "色付き＝予約不可" },
  messages: { title: "メッセージ", subtitle: "ゲストからの問い合わせに返信します。", noConvos: "まだ会話はありません。", selectConvo: "会話を選択してください。" },
};

const en: HostPagesDict = {
  nav: { bookings: "Bookings", analytics: "Analytics", payouts: "Payouts", listings: "Listings", experiences: "Experiences", passport: "Passport", coupons: "Coupons", calendar: "Calendar sync", messages: "Messages", menu: "Menu", today: "Today" },
  common: { save: "Save", cancel: "Cancel", edit: "Edit", delete: "Delete", active: "Active", inactive: "Inactive", loading: "Loading…", add: "Add" },
  menu: { title: "Menu", ownerMode: "Host mode", income: "Income", monthIncome: "This month", insights: "Insights", reviewsUnit: "reviews", createNew: "Create new", createNewDesc: "Publish a listing, experience, or service to grow your income.", accountSettings: "Account settings", myListings: "Manage listings", checkinQR: "Check-in QR", getHelp: "Get help", openBackend: "Open host console", logout: "Log out", profile: "Profile" },
  analytics: { title: "Analytics", scPayout: "Est. payout (after fees)", scPayoutSubA: "GMV", scPayoutSubB: "Fees", scOcc: "Avg occupancy (next 30 days)", scAdr: "Average daily rate (ADR)", scRating: "Avg rating", reviewsUnit: "reviews", chartRevenue: "Monthly revenue (by check-in month)", chartBookings: "Monthly bookings", monthSuffix: "", smartPricing: "Smart price suggestions", apply: "Apply", superhostTitle: "Superhost progress", superhostAchieved: "Superhost achieved!", shRating: "Rating", shReviews: "Reviews", shGoal: "Goal" },
  payouts: { title: "Payouts", subtitle: "Payout = nightly total − guest service fee − host commission. Only paid bookings count.", scTotal: "Total payout (confirmed)", scTotalSub: "paid bookings", scMonth: "This month", scMonthSub: "by check-in / booking date", scPaid: "Paid out", scPaidSub: "times", scPending: "Pending (balance)", scPendingSub: "total − paid out", accountTitle: "Payout account", accountDesc: "Register your bank details. We use this to send your payouts.", bankName: "Bank name", bankNamePh: "e.g. XX Bank, YY branch", accountName: "Account holder", accountNamePh: "e.g. Taro Yamada", accountInfo: "Account number / type", accountInfoPh: "e.g. Checking 1234567", saveAccount: "Save payout account", saveMsgOk: "Payout account saved", detailTitle: "Payout details", noEarnings: "No paid bookings yet.", thPropertyPeriod: "Property / dates", thTotal: "Total paid", thFee: "Fees", thNet: "Net payout", totalNet: "Total payout", historyTitle: "Payout history", noHistory: "No payout history yet. It will appear here once we send a payout.", paid: "Paid out", processing: "Processing", nextTitle: "Next payout", nextDateLabel: "Estimated date", nextAmountLabel: "Amount (pending balance)", nextNote: "Pending balance is paid out around the end of each month (estimate)." },
  promotions: { title: "Coupons", newCoupon: "New coupon", editCoupon: "Edit coupon", code: "Code", targetListing: "Target listing", allListings: "All listings", discountType: "Discount type", percent: "% off", fixed: "Fixed amount (JPY)", discountRate: "Discount rate (%)", discountAmount: "Discount amount (JPY)", validFrom: "Valid from", validTo: "Valid to", maxUses: "Max uses (blank = unlimited)", noCoupons: "No coupons yet.", targetSite: "Entire site", targetAllMine: "All my listings", off: "OFF", usedLabel: "used", addonTitle: "Add-ons (upsell)", addonAdd: "Add", addonDesc: "Items guests can add at booking (transfer, breakfast, late checkout, etc.).", siteCommon: "Site-wide" },
  checkin: { title: "Passport registration", createPage: "Create page", subtitle: "Create your own passport registration page, print a QR poster, and download registered guest data as CSV.", editPage: "Edit page", newPage: "New page", pageTitle: "Page title (shown to guests)", urlName: "URL name (a-z0-9, auto if blank)", welcomeMsg: "Welcome message (English recommended, optional)", requirePhone: "Require phone number", requirePhoto: "Require passport photo", noPages: "No pages yet. Create one in a minute from \"Create page\".", posterPrint: "Print QR poster", preview: "Preview", published: "Published", stopped: "Stopped", guestsTitle: "Registered guests", csvDownload: "Download CSV", thDatetime: "Registered", thName: "Name", thPassport: "Passport no.", thNationality: "Nationality", thPhone: "Phone", thCi: "C/I date", thPhoto: "Photo", show: "View", noGuests: "No registrations yet" },
  experiences: { title: "Experiences", add: "Add experience", expTitle: "Title", desc: "Description", category: "Category", city: "City", pricePer: "Price per person (JPY)", duration: "Duration (min)", maxGuests: "Max guests", meetingPoint: "Meeting point", lat: "Latitude (optional)", lng: "Longitude (optional)", photos: "Photos", uploadHint: "Drag, or click to select photos", uploading: "Uploading…", cover: "Cover", makeCover: "Set cover", noItems: "No experiences yet. Add one from \"Add experience\".", publishTo: "Publish", unpublishTo: "Unpublish", bookingsTitle: "Experience bookings", pendingBadge: "pending", noBookings: "No booking requests yet.", approve: "Approve", reject: "Reject", markDone: "Mark done", stPending: "Pending", stConfirmed: "Confirmed", stCompleted: "Completed", stCancelled: "Cancelled", perPerson: "/person", maxUnit: "guests" },
  calendar: { title: "Calendar & Airbnb sync", subtitle: "Two-way availability sync with Airbnb iCal (.ics).", selectListing: "Select listing", exportTitle: "① Export to Airbnb", exportDesc: "Paste this URL into Airbnb's \"Sync calendars → Connect another website\" so your bookings here show on Airbnb.", copy: "Copy", importTitle: "② Import from Airbnb", importDesc: "Paste your Airbnb iCal export URL (.ics), save it, then \"Sync now\" to import booked dates.", saveUrl: "Save URL", syncNow: "Sync now", blocksTitle: "Blocked dates", start: "Start", endExclusive: "End (exclusive)", addBlock: "Add manual block", noBlocks: "No blocks.", srcManual: "Manual", srcAirbnb: "Airbnb", srcBooking: "Site booking", copied: "Copied.", urlSaved: "iCal URL saved.", manualBlockNote: "Host manual block", gridTitle: "Price & availability", selectDayHint: "Click a day (click again for a range) to set price or block, in bulk.", priceOverride: "Price for this day (JPY)", savePrice: "Save price", clearOverride: "Reset to base", blockDay: "Block this day", unblockDay: "Unblock", baseLabel: "Base", daysUnit: "days", selectedRange: "Selected", overviewTitle: "All listings calendar", overviewLegend: "Shaded = unavailable" },
  messages: { title: "Messages", subtitle: "Reply to guest inquiries.", noConvos: "No conversations yet.", selectConvo: "Select a conversation." },
};

const tw: HostPagesDict = {
  nav: { bookings: "預訂", analytics: "分析", payouts: "收款", listings: "房源", experiences: "體驗", passport: "護照登記", coupons: "優惠碼", calendar: "日曆同步", messages: "訊息", menu: "選單", today: "今天" },
  common: { save: "儲存", cancel: "取消", edit: "編輯", delete: "刪除", active: "啟用", inactive: "停用", loading: "載入中…", add: "新增" },
  menu: { title: "選單", ownerMode: "房東模式", income: "收入", monthIncome: "本月收入", insights: "分析洞察", reviewsUnit: "則評價", createNew: "新增項目", createNewDesc: "發佈房源、體驗或服務，拓展多元收入。", accountSettings: "帳號設定", myListings: "房源管理", checkinQR: "入住QR", getHelp: "取得協助", openBackend: "開啟房東後台", logout: "登出", profile: "個人資料" },
  analytics: { title: "分析後台", scPayout: "預估收款（扣除手續費後）", scPayoutSubA: "總流通", scPayoutSubB: "手續費", scOcc: "未來30天平均入住率", scAdr: "平均房價 (ADR)", scRating: "平均評分", reviewsUnit: "則", chartRevenue: "各月營收（以入住月計）", chartBookings: "各月預訂數", monthSuffix: "月", smartPricing: "智慧定價建議", apply: "套用", superhostTitle: "超讚房東進度", superhostAchieved: "已達成超讚房東！", shRating: "評分", shReviews: "評價數", shGoal: "目標" },
  payouts: { title: "收款（Payout）", subtitle: "收款 = 住宿費 − 訪客服務費 − 成交手續費。僅計入已付款的預訂。", scTotal: "累計收款（確定）", scTotalSub: "筆已付款預訂", scMonth: "本月收款", scMonthSub: "以入住/預訂日計", scPaid: "已匯款", scPaidSub: "次", scPending: "未匯款（餘額）", scPendingSub: "累計收款 − 已匯款", accountTitle: "收款帳戶", accountDesc: "請登記匯款帳戶，我們將依此進行匯款。", bankName: "金融機構名稱", bankNamePh: "例：〇〇銀行 △△分行", accountName: "戶名", accountNamePh: "例：王小明", accountInfo: "帳號・種類等", accountInfoPh: "例：一般 1234567", saveAccount: "儲存收款帳戶", saveMsgOk: "已儲存收款帳戶", detailTitle: "收款明細", noEarnings: "尚無已付款的預訂。", thPropertyPeriod: "房源・期間", thTotal: "付款總額", thFee: "手續費", thNet: "收款額", totalNet: "累計收款", historyTitle: "匯款紀錄", noHistory: "尚無匯款紀錄。營運方匯款後將顯示於此。", paid: "已匯款", processing: "處理中", nextTitle: "下次匯款", nextDateLabel: "預計匯款日", nextAmountLabel: "金額（未匯款餘額）", nextNote: "每月月底統一匯出截至上月的未匯款金額（預估）。" },
  promotions: { title: "優惠碼管理", newCoupon: "新增優惠碼", editCoupon: "編輯優惠碼", code: "代碼", targetListing: "適用房源", allListings: "所有房源", discountType: "折扣類型", percent: "％折扣", fixed: "定額折扣（日圓）", discountRate: "折扣率（%）", discountAmount: "折扣金額（日圓）", validFrom: "生效日", validTo: "截止日", maxUses: "使用上限次數（留空=無限）", noCoupons: "尚無優惠碼。", targetSite: "全站", targetAllMine: "我的所有房源", off: "OFF", usedLabel: "已用", addonTitle: "加購商品（Upsell）", addonAdd: "新增", addonDesc: "訪客預訂時可加購的商品（接送・早餐・延遲退房等）。", siteCommon: "全站共用" },
  checkin: { title: "護照登記頁", createPage: "建立頁面", subtitle: "建立專屬護照登記頁，列印QR海報張貼於住宿處，訪客掃描登記的資料可下載為CSV。", editPage: "編輯頁面", newPage: "新頁面", pageTitle: "頁面標題（顯示給訪客）", urlName: "URL名稱（英數字・留空自動產生）", welcomeMsg: "歡迎訊息（建議英文・選填）", requirePhone: "電話號碼設為必填", requirePhoto: "護照照片設為必填", noPages: "尚無頁面。從「建立頁面」1分鐘即可建立。", posterPrint: "列印QR海報", preview: "預覽", published: "公開中", stopped: "已停用", guestsTitle: "已登記訪客", csvDownload: "下載CSV", thDatetime: "登記時間", thName: "姓名", thPassport: "護照號碼", thNationality: "國籍", thPhone: "電話", thCi: "入住日", thPhoto: "照片", show: "檢視", noGuests: "尚無登記" },
  experiences: { title: "體驗管理", add: "新增體驗", expTitle: "標題", desc: "說明", category: "類別", city: "城市", pricePer: "每人費用（日圓）", duration: "時長（分鐘）", maxGuests: "最多人數", meetingPoint: "集合地點", lat: "緯度（選填）", lng: "經度（選填）", photos: "照片", uploadHint: "拖曳，或點擊選擇照片", uploading: "上傳中…", cover: "封面", makeCover: "設為封面", noItems: "尚無體驗。可從「新增體驗」建立。", publishTo: "發佈", unpublishTo: "取消發佈", bookingsTitle: "體驗預訂", pendingBadge: "待審核", noBookings: "尚無預訂申請。", approve: "核准", reject: "拒絕", markDone: "標記為已完成", stPending: "待審核", stConfirmed: "已確認", stCompleted: "已完成", stCancelled: "已取消", perPerson: "/人", maxUnit: "人" },
  calendar: { title: "日曆 & Airbnb同步", subtitle: "與Airbnb iCal（.ics）雙向同步空房。", selectListing: "選擇房源", exportTitle: "① 匯出至Airbnb", exportDesc: "將此URL貼到Airbnb的「同步日曆 → 連接其他網站」，本站的預訂即會顯示於Airbnb。", copy: "複製", importTitle: "② 從Airbnb匯入", importDesc: "貼上Airbnb的iCal匯出URL（.ics）並儲存，再點「立即同步」匯入已預訂日期。", saveUrl: "儲存URL", syncNow: "立即同步", blocksTitle: "不可預訂日（封鎖）", start: "開始", endExclusive: "結束（不含）", addBlock: "新增手動封鎖", noBlocks: "沒有封鎖。", srcManual: "手動", srcAirbnb: "Airbnb", srcBooking: "本站預訂", copied: "已複製。", urlSaved: "已儲存iCal URL。", manualBlockNote: "房東手動封鎖", gridTitle: "價格・空房日曆", selectDayHint: "點選日期（再點一次可選範圍）以批次設定價格或封鎖。", priceOverride: "當日價格（日圓）", savePrice: "儲存價格", clearOverride: "恢復基準價", blockDay: "封鎖此日", unblockDay: "解除封鎖", baseLabel: "基準", daysUnit: "天", selectedRange: "已選", overviewTitle: "全部房源日曆", overviewLegend: "有色＝不可預訂" },
  messages: { title: "訊息", subtitle: "回覆訪客的詢問。", noConvos: "尚無對話。", selectConvo: "請選擇對話。" },
};

const zh: HostPagesDict = {
  nav: { bookings: "预订", analytics: "分析", payouts: "收款", listings: "房源", experiences: "体验", passport: "护照登记", coupons: "优惠码", calendar: "日历同步", messages: "消息", menu: "菜单", today: "今天" },
  common: { save: "保存", cancel: "取消", edit: "编辑", delete: "删除", active: "启用", inactive: "停用", loading: "加载中…", add: "新增" },
  menu: { title: "菜单", ownerMode: "房东模式", income: "收入", monthIncome: "本月收入", insights: "分析洞察", reviewsUnit: "条评价", createNew: "新建项目", createNewDesc: "发布房源、体验或服务，拓展多元收入。", accountSettings: "账号设置", myListings: "房源管理", checkinQR: "入住QR", getHelp: "获取帮助", openBackend: "打开房东后台", logout: "退出", profile: "个人资料" },
  analytics: { title: "分析后台", scPayout: "预估收款（扣除手续费后）", scPayoutSubA: "总流通", scPayoutSubB: "手续费", scOcc: "未来30天平均入住率", scAdr: "平均房价 (ADR)", scRating: "平均评分", reviewsUnit: "条", chartRevenue: "各月营收（以入住月计）", chartBookings: "各月预订数", monthSuffix: "月", smartPricing: "智能定价建议", apply: "应用", superhostTitle: "超赞房东进度", superhostAchieved: "已达成超赞房东！", shRating: "评分", shReviews: "评价数", shGoal: "目标" },
  payouts: { title: "收款（Payout）", subtitle: "收款 = 住宿费 − 访客服务费 − 成交手续费。仅计入已付款的预订。", scTotal: "累计收款（确定）", scTotalSub: "笔已付款预订", scMonth: "本月收款", scMonthSub: "以入住/预订日计", scPaid: "已打款", scPaidSub: "次", scPending: "未打款（余额）", scPendingSub: "累计收款 − 已打款", accountTitle: "收款账户", accountDesc: "请登记打款账户，我们将据此进行打款。", bankName: "金融机构名称", bankNamePh: "例：〇〇银行 △△支行", accountName: "户名", accountNamePh: "例：王小明", accountInfo: "账号・类型等", accountInfoPh: "例：普通 1234567", saveAccount: "保存收款账户", saveMsgOk: "已保存收款账户", detailTitle: "收款明细", noEarnings: "尚无已付款的预订。", thPropertyPeriod: "房源・期间", thTotal: "付款总额", thFee: "手续费", thNet: "收款额", totalNet: "累计收款", historyTitle: "打款记录", noHistory: "尚无打款记录。运营方打款后将显示于此。", paid: "已打款", processing: "处理中", nextTitle: "下次打款", nextDateLabel: "预计打款日", nextAmountLabel: "金额（未打款余额）", nextNote: "每月月底统一打出截至上月的未打款金额（预估）。" },
  promotions: { title: "优惠码管理", newCoupon: "新增优惠码", editCoupon: "编辑优惠码", code: "代码", targetListing: "适用房源", allListings: "所有房源", discountType: "折扣类型", percent: "％折扣", fixed: "定额折扣（日元）", discountRate: "折扣率（%）", discountAmount: "折扣金额（日元）", validFrom: "生效日", validTo: "截止日", maxUses: "使用上限次数（留空=无限）", noCoupons: "尚无优惠码。", targetSite: "全站", targetAllMine: "我的所有房源", off: "OFF", usedLabel: "已用", addonTitle: "加购商品（Upsell）", addonAdd: "新增", addonDesc: "访客预订时可加购的商品（接送・早餐・延迟退房等）。", siteCommon: "全站共用" },
  checkin: { title: "护照登记页", createPage: "创建页面", subtitle: "创建专属护照登记页，打印QR海报张贴于住宿处，访客扫描登记的资料可下载为CSV。", editPage: "编辑页面", newPage: "新页面", pageTitle: "页面标题（显示给访客）", urlName: "URL名称（英数字・留空自动生成）", welcomeMsg: "欢迎消息（建议英文・选填）", requirePhone: "电话号码设为必填", requirePhoto: "护照照片设为必填", noPages: "尚无页面。从「创建页面」1分钟即可创建。", posterPrint: "打印QR海报", preview: "预览", published: "公开中", stopped: "已停用", guestsTitle: "已登记访客", csvDownload: "下载CSV", thDatetime: "登记时间", thName: "姓名", thPassport: "护照号码", thNationality: "国籍", thPhone: "电话", thCi: "入住日", thPhoto: "照片", show: "查看", noGuests: "尚无登记" },
  experiences: { title: "体验管理", add: "新增体验", expTitle: "标题", desc: "说明", category: "类别", city: "城市", pricePer: "每人费用（日元）", duration: "时长（分钟）", maxGuests: "最多人数", meetingPoint: "集合地点", lat: "纬度（选填）", lng: "经度（选填）", photos: "照片", uploadHint: "拖动，或点击选择照片", uploading: "上传中…", cover: "封面", makeCover: "设为封面", noItems: "尚无体验。可从「新增体验」创建。", publishTo: "发布", unpublishTo: "取消发布", bookingsTitle: "体验预订", pendingBadge: "待审核", noBookings: "尚无预订申请。", approve: "核准", reject: "拒绝", markDone: "标记为已完成", stPending: "待审核", stConfirmed: "已确认", stCompleted: "已完成", stCancelled: "已取消", perPerson: "/人", maxUnit: "人" },
  calendar: { title: "日历 & Airbnb同步", subtitle: "与Airbnb iCal（.ics）双向同步空房。", selectListing: "选择房源", exportTitle: "① 导出至Airbnb", exportDesc: "将此URL粘贴到Airbnb的「同步日历 → 连接其他网站」，本站的预订即会显示于Airbnb。", copy: "复制", importTitle: "② 从Airbnb导入", importDesc: "粘贴Airbnb的iCal导出URL（.ics）并保存，再点「立即同步」导入已预订日期。", saveUrl: "保存URL", syncNow: "立即同步", blocksTitle: "不可预订日（封锁）", start: "开始", endExclusive: "结束（不含）", addBlock: "新增手动封锁", noBlocks: "没有封锁。", srcManual: "手动", srcAirbnb: "Airbnb", srcBooking: "本站预订", copied: "已复制。", urlSaved: "已保存iCal URL。", manualBlockNote: "房东手动封锁", gridTitle: "价格・空房日历", selectDayHint: "点选日期（再点一次可选范围）以批量设定价格或封锁。", priceOverride: "当日价格（日元）", savePrice: "保存价格", clearOverride: "恢复基准价", blockDay: "封锁此日", unblockDay: "解除封锁", baseLabel: "基准", daysUnit: "天", selectedRange: "已选", overviewTitle: "全部房源日历", overviewLegend: "有色＝不可预订" },
  messages: { title: "消息", subtitle: "回复访客的咨询。", noConvos: "尚无对话。", selectConvo: "请选择对话。" },
};

const DICTS: Record<StaysLang, HostPagesDict> = { en, tw, zh, ja };

export function useHostPagesT(): { p: HostPagesDict; lang: StaysLang } {
  const [lang, setLang] = useState<StaysLang>("ja");
  useEffect(() => {
    const sync = () => setLang(getStaysLang());
    sync();
    window.addEventListener("stays-lang", sync);
    return () => window.removeEventListener("stays-lang", sync);
  }, []);
  return { p: DICTS[lang], lang };
}
