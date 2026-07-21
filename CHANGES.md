# 便槽モニタリング — 自社予約＋Airbnb（メールスキャン）ハイブリッド版

このフォルダの中身を Crane-Nest リポジトリのルートに上書きコピーしてください。

## 計算方式
2つの予約ソースを統合し、毎回再計算する。
- 自社予約: stays_bookings（人数・キャンセルを正確に保持）
- Airbnb予約: stays_ext_reservations（Airbnbの予約メールをGmailで取得・解析して反映）
共通ルール:
- confirmed のみ対象（cancelled / pending は自動除外）
- 各予約を「泊まった夜」に展開し、前回汲み取り日〜今日より前の“過ぎた夜”だけ加算
- キャンセルは予約番号(code)で突き合わせて status=cancelled にし、再計算で自動除外
- Airbnbメールで人数が取れない予約は AIRBNB_DEFAULT_GUESTS（既定2名）で充当
- スタッフの手動補正(override)は stays_tank_logs に保存し、その日だけ自動値を上書き

## 新規ファイル
- lib/stays/airbnbEmail.ts     Airbnb予約メール解析（番号/人数/日付/確定・キャンセル、日英対応）
- lib/stays/gmail.ts           Gmail API取得（googleapis, リフレッシュトークン）
- lib/stays/tankEvaluate.ts    再評価＋通知＋レスポンス整形（多重通知抑制）
- lib/stays/tankAlerts.ts      WeCom & Email ダブル通知
- app/api/stays/tank/sync/route.ts    Gmail同期→解析→反映→再計算→通知
- app/api/stays/tank/ingest/route.ts  生メール投入(Webhook/手動/テスト)
- app/api/stays/tank/reset/route.ts   汲み取りリセット
- app/admin/tank/page.tsx             管理者専用ページ(AuthGuard admin)
- supabase/migrations/0026_tank_monitor.sql          状態＋override
- supabase/migrations/0027_tank_ext_reservations.sql 外部予約(Airbnb)

## 変更ファイル
- lib/stays/tank.ts, lib/stays/tankStore.ts, app/api/stays/tank/route.ts
- components/stays/GuesthouseTankDashboard.tsx（Airbnb同期ボタン追加）
- components/admin/AdminNav.tsx（管理ナビに「便槽モニタ」）
- .env.local.example（GMAIL_* / AIRBNB_* 追加）, package.json（googleapis 追加）

HostNav.tsx はオリジナルと完全一致のため含めていません。

## セットアップ
1. npm install   （googleapis, nodemailer を導入）
2. supabase マイグレーション 0026, 0027 を適用
3. .env.local に GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN を設定
   （Google CloudでOAuthクライアント作成→gmail.readonlyで一度同意→refresh token取得）
4. 日次スケジュール等から POST /api/stays/tank/sync を実行 → Airbnbが自動反映
   Gmailを使わない場合は POST /api/stays/tank/ingest に転送メールを投げてもよい

## 注意
Airbnbのメール書式は変更されることがあるため、実メールに合わせて
lib/stays/airbnbEmail.ts の正規表現を調整してください（実メール数通を頂ければ調整可能）。

## v4 更新: パーサ堅牢化（実際の受信箱パターンに対応）
- 判定を「件名優先」に変更。予約確定/キャンセルは件名で確実に判定。
- リマインダー / 保留中 / RE:（メッセージ返信）/ 入金・領収・レビュー 通知は自動で無視。
- 確定メール本文の「キャンセルポリシー」を誤ってキャンセル判定しない（本文は“実行済み”表現のみ採用）。
- 人数は "3 guests" / "Guests: 3" / "大人2名 子供1名" / "宿泊者 4名" の数字先・ラベル先の両順に対応。

## v5 更新: 実際のAirbnbメールで検証・調整
実メール（予約確定/キャンセル）で確認した挙動:
- 確認コードは確定・キャンセル両方に入り、同一予約は同一コード → これをキーに突き合わせ。
- キャンセルは本文の「ご予約（HMxxxx）」括弧内コードも抽出（ラベル無しでも拾う）。
- 「大人1人」を1名と取得。「子ども/乳幼児」定型文では誤加算しない（数字隣接時のみ加算）。
- 「7月23日(木)」曜日付き・年なし表記も正しく日付化。
- 確定本文の「キャンセルポリシー」でキャンセル誤判定しない（件名優先）。
