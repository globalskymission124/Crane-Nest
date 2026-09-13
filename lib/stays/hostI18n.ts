"use client";

// =========================================================
// オーナー（ホスト）コンソールの多言語化
//  ゲスト側 (i18n.ts) と同じ言語状態 (localStorage "stays_lang" + "stays-lang"イベント)
//  を共有するため、言語切替はゲスト/ホストで連動する。
//  対応言語: 日本語・英語・繁体字・簡体字
// =========================================================
import { useEffect, useState } from "react";
import { getStaysLang, type StaysLang } from "./i18n";

interface HostDict {
  // レイアウト / ナビ
  ownerConsole: string; profile: string; toGuest: string;
  // 共通
  loading: string; back: string; next: string; cancel: string; saving: string; close: string;
  // 物件管理・ウィザード外枠
  manageListings: string; newListing: string; editListing: string; registerNewListing: string;
  stepWord: string; publishBtn: string; saveDraftBtn: string;
  phase1: string; phase2: string; phase3: string;
  // ステップ見出し・説明
  s_ptype_t: string; s_ptype_d: string;
  s_room_t: string; s_room_d: string; rd_entire: string; rd_private: string; rd_shared: string;
  s_loc_t: string; s_loc_d: string; f_city: string; f_address: string; f_lat: string; f_lng: string;
  ph_city: string; ph_address: string; loc_hint: string;
  s_basics_t: string; s_basics_d: string; f_capacity: string; f_bedrooms: string; f_beds: string; f_baths: string;
  s_amenities_t: string; s_amenities_d: string; cat_basic: string; cat_features: string; cat_safety: string;
  s_photos_t: string; photos_desc: string; photos_current: string; photos_unit: string;
  drop_hint: string; uploading: string; cover_badge: string; make_cover: string; url_ph: string; add_btn: string;
  s_title_t: string; s_title_d: string; ph_title: string;
  s_highlights_t: string; s_highlights_d: string;
  s_desc_t: string; s_desc_d: string; ph_desc: string;
  s_price_t: string; s_price_d: string; f_price: string; f_cleaning: string; guest_pays: string; per_night_clean: string;
  s_disc_t: string; s_disc_d: string; f_weekly: string; f_monthly: string;
  s_rules_t: string; s_rules_d: string; r_children: string; r_pets: string; r_smoking: string; r_events: string;
  allowed: string; not_allowed: string; f_checkin_time: string; f_checkout_time: string; f_quiet: string; ph_quiet: string;
  s_booking_t: string; s_booking_d: string; f_min_nights: string; f_cancel_policy: string;
  instant_t: string; instant_d: string; autoprice_t: string; autoprice_d: string;
  s_checkin_t: string; s_checkin_d: string; ph_checkin: string;
  s_review_t: string; s_review_d: string; no_photos: string; no_title: string; no_loc: string;
  guests_unit: string; bedrooms_short: string; beds_short: string; baths_short: string; per_night: string;
  photos_n: string; amenities_n: string; items_unit: string;
  publish_now: string; publish_now_d: string; draft_t: string; draft_d: string;
  // ダッシュボード
  d_orders_suffix: string; d_subtitle: string; d_pending: string; d_need_action: string;
  d_today_checkin: string; d_confirmed_unpaid: string;
  qa_passport: string; qa_sales: string; qa_coupon: string; qa_boost: string;
  f_all: string; st_pending: string; st_confirmed: string; st_cancelled: string; st_completed: string;
  th_property: string; th_guest: string; th_dates: string; th_guests: string; th_price: string; th_status: string; th_actions: string;
  act_approve: string; act_complete: string; act_cancel: string;
  pay_unpaid: string; pay_paid: string; pay_refunded: string; pay_partial: string;
  no_bookings: string; guests_count_unit: string;
  // 物件カード
  card_edit: string; card_publish: string; card_unpublish: string; card_boost: string; card_boosting: string;
  card_draft_badge: string; no_image: string;
  // 下書き自動保存
  draft_found: string; draft_continue: string; draft_discard: string; card_pending: string;
}

const ja: HostDict = {
  ownerConsole: "オーナー管理", profile: "プロフィール", toGuest: "ゲスト画面 →",
  loading: "読み込み中…", back: "戻る", next: "次へ", cancel: "キャンセル", saving: "保存中…", close: "閉じる",
  manageListings: "物件管理", newListing: "新規物件", editListing: "物件を編集", registerNewListing: "新規物件の登録",
  stepWord: "ステップ", publishBtn: "公開する", saveDraftBtn: "下書きを保存",
  phase1: "ステップ1：物件について教えてください", phase2: "ステップ2：物件を魅力的にしましょう", phase3: "ステップ3：公開の準備",
  s_ptype_t: "どのタイプの物件ですか？", s_ptype_d: "最も近いものを選んでください。",
  s_room_t: "ゲストが利用できるスペースは？", s_room_d: "貸し出す範囲を選んでください。",
  rd_entire: "建物や部屋を丸ごと専有します。", rd_private: "個室は専有し、一部の共用スペースを共有します。", rd_shared: "寝室やリビングなどを他の人と共有します。",
  s_loc_t: "物件はどこにありますか？", s_loc_d: "正確な住所は予約確定後にのみゲストへ共有されます。",
  f_city: "市区町村", f_address: "住所", f_lat: "緯度 (lat)", f_lng: "経度 (lng)",
  ph_city: "例：京都市東山区", ph_address: "例：〇〇町1-2-3 △△マンション305", loc_hint: "緯度・経度を入れると地図に正確にピン表示されます（任意）。",
  s_basics_t: "基本情報を教えてください", s_basics_d: "あとから変更できます。",
  f_capacity: "定員（宿泊人数）", f_bedrooms: "寝室", f_beds: "ベッド", f_baths: "バスルーム",
  s_amenities_t: "どんな設備・アメニティがありますか？", s_amenities_d: "当てはまるものをすべて選んでください。",
  cat_basic: "基本設備", cat_features: "特徴・こだわり", cat_safety: "安全性",
  s_photos_t: "物件の写真を追加しましょう", photos_desc: "5枚以上を推奨。ドラッグで並べ替えでき、先頭がカバー写真になります。",
  photos_current: "現在", photos_unit: "枚",
  drop_hint: "ここに写真をドラッグ、またはクリックして選択（複数可）", uploading: "アップロード中…",
  cover_badge: "カバー", make_cover: "カバーに", url_ph: "画像URLで追加（任意）https://...", add_btn: "追加",
  s_title_t: "物件のタイトルをつけましょう", s_title_d: "短くて魅力的なタイトルが効果的です（あとで変更できます）。",
  ph_title: "例：鴨川沿いの町家一棟貸し・京都駅まで10分",
  s_highlights_t: "物件の魅力を伝えるタグを選びましょう", s_highlights_d: "最大2つまでが目安です。",
  s_desc_t: "物件の説明を書きましょう", s_desc_d: "部屋の雰囲気、周辺環境、おすすめポイントなどを紹介してください。",
  ph_desc: "例：築100年の京町家を一棟丸ごと貸し切り。坪庭を眺めながらゆったりお過ごしいただけます。",
  s_price_t: "料金を設定しましょう", s_price_d: "いつでも変更できます。", f_price: "1泊料金（円）", f_cleaning: "清掃料（円）",
  guest_pays: "ゲストの支払い目安：", per_night_clean: "（1泊＋清掃料）",
  s_disc_t: "長期滞在の割引を設定しましょう", s_disc_d: "連泊予約を増やすのに効果的です（任意）。",
  f_weekly: "週割引（7泊以上・%）", f_monthly: "月割引（28泊以上・%）",
  s_rules_t: "ハウスルールを設定しましょう", s_rules_d: "ゲストに守ってほしいことを選んでください。",
  r_children: "子供の宿泊", r_pets: "ペットの同伴", r_smoking: "喫煙", r_events: "パーティー・イベント",
  allowed: "可", not_allowed: "不可", f_checkin_time: "チェックイン時刻", f_checkout_time: "チェックアウト時刻",
  f_quiet: "静粛時間（任意）", ph_quiet: "例：22:00〜08:00",
  s_booking_t: "予約の設定", s_booking_d: "予約の受け方やポリシーを決めます。", f_min_nights: "最低泊数", f_cancel_policy: "キャンセルポリシー",
  instant_t: "即時予約を有効にする", instant_d: "承認不要で予約が自動確定します。",
  autoprice_t: "AI自動価格調整", autoprice_d: "稼働率に応じて料金を自動最適化します。",
  s_checkin_t: "セルフチェックイン案内", s_checkin_d: "鍵の受け取り方・入館手順などを記入してください（予約確定後にゲストの「旅程」画面へ表示されます）。",
  ph_checkin: "例：玄関右のキーボックス（暗証番号は予約確定メールに記載）から鍵を取り出してください。",
  s_review_t: "内容を確認して公開しましょう", s_review_d: "下書きとして保存する場合は「今は公開しない」を選んでください。",
  no_photos: "写真が未登録です", no_title: "（タイトル未設定）", no_loc: "所在地未設定",
  guests_unit: "名", bedrooms_short: "寝室", beds_short: "ベッド", baths_short: "バス", per_night: "/泊",
  photos_n: "写真", amenities_n: "アメニティ", items_unit: "個",
  publish_now: "今すぐ公開する", publish_now_d: "検索結果に表示され、予約を受け付けます。",
  draft_t: "今は公開しない（下書き）", draft_d: "あとから物件管理で公開できます。",
  d_orders_suffix: "件の予約", d_subtitle: "今日必見：承認待ち・チェックイン・未払いをすぐ確認できます。",
  d_pending: "承認待ち", d_need_action: "←要対応", d_today_checkin: "本日チェックイン", d_confirmed_unpaid: "確定・未払い",
  qa_passport: "パスポートQR", qa_sales: "売上を見る", qa_coupon: "クーポン発行", qa_boost: "掲載ブースト",
  f_all: "すべて", st_pending: "承認待ち", st_confirmed: "確定", st_cancelled: "キャンセル", st_completed: "完了",
  th_property: "物件", th_guest: "ゲスト", th_dates: "日程", th_guests: "人数", th_price: "料金", th_status: "状態", th_actions: "操作",
  act_approve: "承認", act_complete: "完了", act_cancel: "取消",
  pay_unpaid: "未払い", pay_paid: "支払済", pay_refunded: "返金済", pay_partial: "一部返金",
  no_bookings: "予約はありません。", guests_count_unit: "名",
  card_edit: "編集", card_publish: "公開", card_unpublish: "非公開", card_boost: "ブースト", card_boosting: "PR中",
  card_draft_badge: "非公開", no_image: "画像なし",
  draft_found: "入力途中の物件があります。", draft_continue: "続きから再開", draft_discard: "破棄", card_pending: "審査中",
};

const en: HostDict = {
  ownerConsole: "Host console", profile: "Profile", toGuest: "Guest view →",
  loading: "Loading…", back: "Back", next: "Next", cancel: "Cancel", saving: "Saving…", close: "Close",
  manageListings: "Listings", newListing: "New listing", editListing: "Edit listing", registerNewListing: "Create a new listing",
  stepWord: "Step", publishBtn: "Publish", saveDraftBtn: "Save draft",
  phase1: "Step 1: Tell us about your place", phase2: "Step 2: Make it stand out", phase3: "Step 3: Finish up & publish",
  s_ptype_t: "What type of place is it?", s_ptype_d: "Pick the closest match.",
  s_room_t: "What can guests use?", s_room_d: "Choose what you are renting out.",
  rd_entire: "Guests have the entire place to themselves.", rd_private: "A private room; some spaces are shared.", rd_shared: "A shared space such as a bedroom or common area.",
  s_loc_t: "Where is your place located?", s_loc_d: "The exact address is only shared with guests after a booking is confirmed.",
  f_city: "City / ward", f_address: "Address", f_lat: "Latitude (lat)", f_lng: "Longitude (lng)",
  ph_city: "e.g. Higashiyama, Kyoto", ph_address: "e.g. 1-2-3 XX, Room 305", loc_hint: "Adding lat/lng pins the exact spot on the map (optional).",
  s_basics_t: "Share some basics", s_basics_d: "You can change these later.",
  f_capacity: "Guests (capacity)", f_bedrooms: "Bedrooms", f_beds: "Beds", f_baths: "Bathrooms",
  s_amenities_t: "What amenities does it offer?", s_amenities_d: "Select all that apply.",
  cat_basic: "Basics", cat_features: "Features", cat_safety: "Safety",
  s_photos_t: "Add photos of your place", photos_desc: "5+ recommended. Drag to reorder; the first photo is the cover.",
  photos_current: "Currently", photos_unit: "photos",
  drop_hint: "Drag photos here, or click to select (multiple)", uploading: "Uploading…",
  cover_badge: "Cover", make_cover: "Set cover", url_ph: "Add by image URL (optional) https://...", add_btn: "Add",
  s_title_t: "Give your place a title", s_title_d: "Short, catchy titles work best (you can change it later).",
  ph_title: "e.g. Riverside machiya townhouse, 10 min to Kyoto Stn",
  s_highlights_t: "Choose tags that show off your place", s_highlights_d: "Up to 2 is a good guide.",
  s_desc_t: "Write a description", s_desc_d: "Describe the vibe, the neighborhood, and what makes it special.",
  ph_desc: "e.g. A 100-year-old Kyoto townhouse, entirely yours, with a tranquil garden view.",
  s_price_t: "Set your price", s_price_d: "You can change it anytime.", f_price: "Price per night (JPY)", f_cleaning: "Cleaning fee (JPY)",
  guest_pays: "Guest pays about:", per_night_clean: "(1 night + cleaning)",
  s_disc_t: "Set discounts for longer stays", s_disc_d: "Great for encouraging multi-night bookings (optional).",
  f_weekly: "Weekly discount (7+ nights, %)", f_monthly: "Monthly discount (28+ nights, %)",
  s_rules_t: "Set your house rules", s_rules_d: "Choose what you'd like guests to follow.",
  r_children: "Children", r_pets: "Pets", r_smoking: "Smoking", r_events: "Parties / events",
  allowed: "Allowed", not_allowed: "Not allowed", f_checkin_time: "Check-in time", f_checkout_time: "Checkout time",
  f_quiet: "Quiet hours (optional)", ph_quiet: "e.g. 22:00–08:00",
  s_booking_t: "Booking settings", s_booking_d: "Decide how you accept bookings and your policy.", f_min_nights: "Minimum nights", f_cancel_policy: "Cancellation policy",
  instant_t: "Enable Instant Book", instant_d: "Bookings confirm automatically without approval.",
  autoprice_t: "AI smart pricing", autoprice_d: "Automatically optimizes price by occupancy.",
  s_checkin_t: "Self check-in instructions", s_checkin_d: "Explain key pickup and entry steps (shown on the guest's Trips screen after confirmation).",
  ph_checkin: "e.g. Take the key from the lockbox to the right of the entrance (PIN is in your confirmation email).",
  s_review_t: "Review and publish", s_review_d: "To save as a draft, choose \"Don't publish yet\".",
  no_photos: "No photos yet", no_title: "(No title)", no_loc: "Location not set",
  guests_unit: "guests", bedrooms_short: "BR", beds_short: "beds", baths_short: "BA", per_night: "/night",
  photos_n: "Photos", amenities_n: "Amenities", items_unit: "",
  publish_now: "Publish now", publish_now_d: "Appears in search and accepts bookings.",
  draft_t: "Don't publish yet (draft)", draft_d: "You can publish later from Listings.",
  d_orders_suffix: " bookings", d_subtitle: "Today at a glance: pending approvals, check-ins, and unpaid bookings.",
  d_pending: "Pending", d_need_action: "← action needed", d_today_checkin: "Check-ins today", d_confirmed_unpaid: "Confirmed · unpaid",
  qa_passport: "Passport QR", qa_sales: "View revenue", qa_coupon: "Create coupon", qa_boost: "Boost listing",
  f_all: "All", st_pending: "Pending", st_confirmed: "Confirmed", st_cancelled: "Cancelled", st_completed: "Completed",
  th_property: "Property", th_guest: "Guest", th_dates: "Dates", th_guests: "Guests", th_price: "Price", th_status: "Status", th_actions: "Actions",
  act_approve: "Approve", act_complete: "Complete", act_cancel: "Cancel",
  pay_unpaid: "Unpaid", pay_paid: "Paid", pay_refunded: "Refunded", pay_partial: "Partial refund",
  no_bookings: "No bookings.", guests_count_unit: "guests",
  card_edit: "Edit", card_publish: "Publish", card_unpublish: "Unpublish", card_boost: "Boost", card_boosting: "Promoted",
  card_draft_badge: "Draft", no_image: "No image",
  draft_found: "You have a listing in progress.", draft_continue: "Resume", draft_discard: "Discard", card_pending: "In review",
};

const tw: HostDict = {
  ownerConsole: "房東後台", profile: "個人資料", toGuest: "訪客畫面 →",
  loading: "載入中…", back: "上一步", next: "下一步", cancel: "取消", saving: "儲存中…", close: "關閉",
  manageListings: "房源管理", newListing: "新增房源", editListing: "編輯房源", registerNewListing: "新增房源",
  stepWord: "步驟", publishBtn: "發佈", saveDraftBtn: "儲存草稿",
  phase1: "步驟1：介紹你的房源", phase2: "步驟2：讓房源更吸引人", phase3: "步驟3：完成並發佈",
  s_ptype_t: "這是哪一種房源？", s_ptype_d: "請選擇最接近的類型。",
  s_room_t: "訪客可使用的空間？", s_room_d: "請選擇要出租的範圍。",
  rd_entire: "訪客可獨享整個空間。", rd_private: "獨立房間，部分空間與他人共用。", rd_shared: "與他人共用臥室或公共空間。",
  s_loc_t: "房源位於何處？", s_loc_d: "確切地址僅在預訂確認後才會提供給訪客。",
  f_city: "縣市／區", f_address: "地址", f_lat: "緯度 (lat)", f_lng: "經度 (lng)",
  ph_city: "例：京都市東山區", ph_address: "例：〇〇町1-2-3 △△大樓305", loc_hint: "填入經緯度可在地圖精準標記位置（選填）。",
  s_basics_t: "填寫基本資訊", s_basics_d: "之後可以修改。",
  f_capacity: "可住人數", f_bedrooms: "臥室", f_beds: "床", f_baths: "衛浴",
  s_amenities_t: "提供哪些設施？", s_amenities_d: "請勾選所有符合的項目。",
  cat_basic: "基本設施", cat_features: "特色", cat_safety: "安全性",
  s_photos_t: "新增房源照片", photos_desc: "建議5張以上。可拖曳排序，第一張為封面。",
  photos_current: "目前", photos_unit: "張",
  drop_hint: "將照片拖曳至此，或點擊選擇（可多選）", uploading: "上傳中…",
  cover_badge: "封面", make_cover: "設為封面", url_ph: "以圖片網址新增（選填）https://...", add_btn: "新增",
  s_title_t: "為房源取個標題", s_title_d: "簡短吸引人的標題最有效（之後可修改）。",
  ph_title: "例：河畔町家一棟出租・距京都車站10分鐘",
  s_highlights_t: "選擇能展現房源魅力的標籤", s_highlights_d: "建議最多2個。",
  s_desc_t: "撰寫房源說明", s_desc_d: "介紹氛圍、周邊環境與推薦亮點。",
  ph_desc: "例：擁有百年歷史的京町家，整棟出租，可欣賞坪庭景致。",
  s_price_t: "設定價格", s_price_d: "隨時可以修改。", f_price: "每晚價格（日圓）", f_cleaning: "清潔費（日圓）",
  guest_pays: "訪客大約支付：", per_night_clean: "（1晚＋清潔費）",
  s_disc_t: "設定長住折扣", s_disc_d: "有助於增加連住預訂（選填）。",
  f_weekly: "週折扣（7晚以上・%）", f_monthly: "月折扣（28晚以上・%）",
  s_rules_t: "設定住宿規則", s_rules_d: "選擇希望訪客遵守的事項。",
  r_children: "兒童入住", r_pets: "攜帶寵物", r_smoking: "吸菸", r_events: "派對・活動",
  allowed: "可", not_allowed: "不可", f_checkin_time: "入住時間", f_checkout_time: "退房時間",
  f_quiet: "安靜時段（選填）", ph_quiet: "例：22:00〜08:00",
  s_booking_t: "預訂設定", s_booking_d: "決定接受預訂的方式與政策。", f_min_nights: "最少入住晚數", f_cancel_policy: "取消政策",
  instant_t: "開啟即時預訂", instant_d: "無需審核，預訂自動確認。",
  autoprice_t: "AI智慧定價", autoprice_d: "依入住率自動最佳化價格。",
  s_checkin_t: "自助入住說明", s_checkin_d: "說明取鑰匙與進入步驟（確認後顯示於訪客的行程畫面）。",
  ph_checkin: "例：請從大門右側密碼鎖箱取出鑰匙（密碼於確認信中）。",
  s_review_t: "確認並發佈", s_review_d: "若要存為草稿，請選擇「暫不發佈」。",
  no_photos: "尚未上傳照片", no_title: "（未設定標題）", no_loc: "未設定地點",
  guests_unit: "人", bedrooms_short: "臥室", beds_short: "床", baths_short: "衛浴", per_night: "/晚",
  photos_n: "照片", amenities_n: "設施", items_unit: "項",
  publish_now: "立即發佈", publish_now_d: "顯示於搜尋結果並接受預訂。",
  draft_t: "暫不發佈（草稿）", draft_d: "之後可於房源管理發佈。",
  d_orders_suffix: " 筆預訂", d_subtitle: "今日重點：待審核、入住、未付款一目瞭然。",
  d_pending: "待審核", d_need_action: "←需處理", d_today_checkin: "今日入住", d_confirmed_unpaid: "已確認・未付款",
  qa_passport: "護照QR", qa_sales: "查看營收", qa_coupon: "發放優惠碼", qa_boost: "房源加值曝光",
  f_all: "全部", st_pending: "待審核", st_confirmed: "已確認", st_cancelled: "已取消", st_completed: "已完成",
  th_property: "房源", th_guest: "訪客", th_dates: "日期", th_guests: "人數", th_price: "價格", th_status: "狀態", th_actions: "操作",
  act_approve: "核准", act_complete: "完成", act_cancel: "取消",
  pay_unpaid: "未付款", pay_paid: "已付款", pay_refunded: "已退款", pay_partial: "部分退款",
  no_bookings: "沒有預訂。", guests_count_unit: "人",
  card_edit: "編輯", card_publish: "發佈", card_unpublish: "下架", card_boost: "曝光", card_boosting: "曝光中",
  card_draft_badge: "未發佈", no_image: "無圖片",
  draft_found: "有尚未完成的房源。", draft_continue: "繼續編輯", draft_discard: "捨棄", card_pending: "審核中",
};

const zh: HostDict = {
  ownerConsole: "房东后台", profile: "个人资料", toGuest: "访客界面 →",
  loading: "加载中…", back: "上一步", next: "下一步", cancel: "取消", saving: "保存中…", close: "关闭",
  manageListings: "房源管理", newListing: "新增房源", editListing: "编辑房源", registerNewListing: "新增房源",
  stepWord: "步骤", publishBtn: "发布", saveDraftBtn: "保存草稿",
  phase1: "步骤1：介绍你的房源", phase2: "步骤2：让房源更吸引人", phase3: "步骤3：完成并发布",
  s_ptype_t: "这是哪一种房源？", s_ptype_d: "请选择最接近的类型。",
  s_room_t: "访客可使用的空间？", s_room_d: "请选择要出租的范围。",
  rd_entire: "访客可独享整个空间。", rd_private: "独立房间，部分空间与他人共用。", rd_shared: "与他人共用卧室或公共空间。",
  s_loc_t: "房源位于何处？", s_loc_d: "确切地址仅在预订确认后才会提供给访客。",
  f_city: "城市／区", f_address: "地址", f_lat: "纬度 (lat)", f_lng: "经度 (lng)",
  ph_city: "例：京都市东山区", ph_address: "例：〇〇町1-2-3 △△大楼305", loc_hint: "填入经纬度可在地图精准标记位置（选填）。",
  s_basics_t: "填写基本信息", s_basics_d: "之后可以修改。",
  f_capacity: "可住人数", f_bedrooms: "卧室", f_beds: "床", f_baths: "卫浴",
  s_amenities_t: "提供哪些设施？", s_amenities_d: "请勾选所有符合的项目。",
  cat_basic: "基本设施", cat_features: "特色", cat_safety: "安全性",
  s_photos_t: "新增房源照片", photos_desc: "建议5张以上。可拖动排序，第一张为封面。",
  photos_current: "当前", photos_unit: "张",
  drop_hint: "将照片拖动至此，或点击选择（可多选）", uploading: "上传中…",
  cover_badge: "封面", make_cover: "设为封面", url_ph: "以图片网址新增（选填）https://...", add_btn: "新增",
  s_title_t: "为房源取个标题", s_title_d: "简短吸引人的标题最有效（之后可修改）。",
  ph_title: "例：河畔町家整栋出租・距京都车站10分钟",
  s_highlights_t: "选择能展现房源魅力的标签", s_highlights_d: "建议最多2个。",
  s_desc_t: "撰写房源说明", s_desc_d: "介绍氛围、周边环境与推荐亮点。",
  ph_desc: "例：拥有百年历史的京町家，整栋出租，可欣赏坪庭景致。",
  s_price_t: "设定价格", s_price_d: "随时可以修改。", f_price: "每晚价格（日元）", f_cleaning: "清洁费（日元）",
  guest_pays: "访客大约支付：", per_night_clean: "（1晚＋清洁费）",
  s_disc_t: "设定长住折扣", s_disc_d: "有助于增加连住预订（选填）。",
  f_weekly: "周折扣（7晚以上・%）", f_monthly: "月折扣（28晚以上・%）",
  s_rules_t: "设定住宿规则", s_rules_d: "选择希望访客遵守的事项。",
  r_children: "儿童入住", r_pets: "携带宠物", r_smoking: "吸烟", r_events: "派对・活动",
  allowed: "可", not_allowed: "不可", f_checkin_time: "入住时间", f_checkout_time: "退房时间",
  f_quiet: "安静时段（选填）", ph_quiet: "例：22:00〜08:00",
  s_booking_t: "预订设定", s_booking_d: "决定接受预订的方式与政策。", f_min_nights: "最少入住晚数", f_cancel_policy: "取消政策",
  instant_t: "开启即时预订", instant_d: "无需审核，预订自动确认。",
  autoprice_t: "AI智能定价", autoprice_d: "依入住率自动优化价格。",
  s_checkin_t: "自助入住说明", s_checkin_d: "说明取钥匙与进入步骤（确认后显示于访客的行程界面）。",
  ph_checkin: "例：请从大门右侧密码锁箱取出钥匙（密码于确认邮件中）。",
  s_review_t: "确认并发布", s_review_d: "若要存为草稿，请选择「暂不发布」。",
  no_photos: "尚未上传照片", no_title: "（未设定标题）", no_loc: "未设定地点",
  guests_unit: "人", bedrooms_short: "卧室", beds_short: "床", baths_short: "卫浴", per_night: "/晚",
  photos_n: "照片", amenities_n: "设施", items_unit: "项",
  publish_now: "立即发布", publish_now_d: "显示于搜索结果并接受预订。",
  draft_t: "暂不发布（草稿）", draft_d: "之后可于房源管理发布。",
  d_orders_suffix: " 笔预订", d_subtitle: "今日重点：待审核、入住、未付款一目了然。",
  d_pending: "待审核", d_need_action: "←需处理", d_today_checkin: "今日入住", d_confirmed_unpaid: "已确认・未付款",
  qa_passport: "护照QR", qa_sales: "查看营收", qa_coupon: "发放优惠码", qa_boost: "房源加值曝光",
  f_all: "全部", st_pending: "待审核", st_confirmed: "已确认", st_cancelled: "已取消", st_completed: "已完成",
  th_property: "房源", th_guest: "访客", th_dates: "日期", th_guests: "人数", th_price: "价格", th_status: "状态", th_actions: "操作",
  act_approve: "核准", act_complete: "完成", act_cancel: "取消",
  pay_unpaid: "未付款", pay_paid: "已付款", pay_refunded: "已退款", pay_partial: "部分退款",
  no_bookings: "没有预订。", guests_count_unit: "人",
  card_edit: "编辑", card_publish: "发布", card_unpublish: "下架", card_boost: "曝光", card_boosting: "曝光中",
  card_draft_badge: "未发布", no_image: "无图片",
  draft_found: "有尚未完成的房源。", draft_continue: "继续编辑", draft_discard: "舍弃", card_pending: "审核中",
};

const HOST_DICTS: Record<StaysLang, HostDict> = { en, tw, zh, ja };

// ゲスト側と同じ localStorage キー・イベントで言語状態を共有する。
export function useHostT(): { t: HostDict; lang: StaysLang } {
  const [lang, setLang] = useState<StaysLang>("ja");
  useEffect(() => {
    const sync = () => setLang(getStaysLang());
    sync();
    window.addEventListener("stays-lang", sync);
    return () => window.removeEventListener("stays-lang", sync);
  }, []);
  return { t: HOST_DICTS[lang], lang };
}
