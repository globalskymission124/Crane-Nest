# Crane Nest Stays — Airbnb型 予約システム v2（次世代機能フルセット）

既存の送迎予約アプリ（Next.js 14 + Supabase + Tailwind）に、Airbnbの主要機能＋
次世代機能をまとめた予約サイトを **別ページ** として追加したモジュールです。

## 3つの画面

| 対象 | URL | 主な機能 |
|------|-----|----------|
| **ゲスト** | `/stays` | 検索（高度フィルター/並び替え）、地図、予約、Stripe決済、お気に入り、旅程、レビュー、チャット、通報 |
| **オーナー** | `/host` | 予約管理、物件管理、分析ダッシュボード、スマート価格提案、クーポン、カレンダー同期、メッセージ |
| **管理者** | `/admin/stays` ほか | 全体分析（GMV/決済）、ユーザー管理、レビュー管理、通報・紛争対応、監査ログ |

## v1で実装済みの機能

- 予約システム（空室判定・料金計算・承認フロー）
- 地図（Leaflet + OpenStreetMap）
- 評価システム（星5段階・オーナー返信・管理者モデレーション）
- ゲスト⇔オーナー相互チャット
- Airbnbカレンダー同期（iCal双方向: `/api/stays/listings/{id}/calendar` エクスポート、iCal URLインポート）

## v2で追加した「次世代Airbnb」機能

### ゲスト向け
- **簡易ログイン/新規登録**（`/stays/login`。デモアカウントのワンタップログイン付き）
- **Stripe決済**：予約後に「今すぐ支払う」→ Stripe Checkout。キー未設定時は自動でモック決済にフォールバック
- **お気に入り（ウィッシュリスト）**：一覧・詳細のハート、`/stays/wishlist`
- **旅程ページ** `/stays/trips`：予約履歴、後払い、キャンセル（ポリシーに基づく自動返金計算 + Stripe実返金）
- **高度な検索フィルター**：価格帯・物件タイプ・アメニティ・評価・即時予約のみ ＋ 並び替え（おすすめ/価格/評価）
- **即時予約（Instant Book）**：承認なしで自動確定
- **クーポン適用**：予約ウィジェットでコード入力（シードに `WELCOME10` = 10%OFF）
- **長期滞在割引**：7泊以上（週割引）/ 28泊以上（月割引）を自動適用
- **キャンセルポリシー**：柔軟/標準/厳格の3種を表示・返金額に反映
- **多通貨表示**：JPY/USD/EUR/KRW/CNY（デモ用固定レート、決済は常にJPY）
- **類似宿レコメンド**：同エリア・同タイプ・近い価格帯・共通アメニティで採点
- **アプリ内通知**：予約承認・キャンセル等をベルアイコンに通知
- **通報機能**：不適切な物件を管理者へ通報

### オーナー向け
- **分析ダッシュボード** `/host/analytics`：累計売上・今後30日稼働率・ADR・レビュー平均、月別売上/予約数チャート
- **スマート価格提案**：稼働率に応じた値上げ/値下げ提案をワンクリック適用
- **クーポン管理** `/host/promotions`：%/定額、期間、利用上限、物件指定、有効/無効
- **物件設定の拡張**：物件タイプ、即時予約、キャンセルポリシー、最低泊数、週/月割引
- **予約一覧に決済状態バッジ**、ステータス変更時にゲストへ自動通知

### 管理者向け
- **プラットフォーム分析** `/admin/stays`：GMV、決済済み金額（返金控除後）、売上トップ物件、月次チャート
- **ユーザー管理** `/admin/users`：ロール変更（ゲスト/オーナー/管理者）、アカウント停止/再開
- **通報・紛争対応** `/admin/reports`:未対応→確認中→解決/却下のワークフロー + 対応メモ
- **監査ログ**：予約作成/キャンセル、クーポン操作、ユーザー操作などを自動記録

## セットアップ

1. Supabaseマイグレーションを順に適用（SQL Editorに貼り付けでもOK）
   ```
   supabase/migrations/0016_stays_schema.sql   # v1テーブル + RLS
   supabase/migrations/0017_stays_seed.sql     # デモ物件データ
   supabase/migrations/0018_stays_v2.sql       # v2テーブル + 既存テーブル拡張
   supabase/migrations/0019_stays_v2_seed.sql  # デモユーザー + クーポン
   ```

2. 環境変数（`.env.local`）
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   # Stripe（未設定でもモック決済で動作）
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...   # 任意。本番Webhook用

   # 便槽80%通知（WxPusher）
   # 自分だけに送る最短設定（極簡推送SPT。appToken/UID不要）
   WXPUSHER_SPT=SPT_xxxxxxxxxxxxxxxxx

   # 家族複数人に送る場合（標準推送）
   # WXPUSHER_APP_TOKEN=AT_xxxxxxxxxxxxxxxxx
   # WXPUSHER_UIDS=UID_xxxxxxxxxxxxxxxxx,UID_yyyyyyyyyyyyyyyyy

   # 任意: 送迎予約通知だけ別の宛先へ送る場合
   # TRANSFER_WXPUSHER_SPT=SPT_xxxxxxxxxxxxxxxxx
   # TRANSFER_WXPUSHER_UIDS=UID_xxxxxxxxxxxxxxxxx
   VACUUM_CONTACT=バキュームカー業者：〇〇環境サービス TEL 0000-00-0000

   # メールにも同時通知
   ADMIN_EMAIL=owner@example.com
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=owner@example.com
   SMTP_PASS=your-smtp-password
   MAIL_FROM=Crane Nest <owner@example.com>
   ```

3. 起動
   ```
   npm install
   npm run dev
   ```

### WxPusherで自分の個人WeChatへ便槽通知する

自分だけに送る場合は、標準推送アプリを作らなくても大丈夫です。

1. WxPusherの「方式二：极简推送」で自分の `SPT_xxx` を取得します。
2. VercelのEnvironment Variablesへ `WXPUSHER_SPT` を設定し、Redeployします。
3. 便槽が80%に到達すると、WxPusher経由で自分のWeChatに通知されます。
4. 同時に `ADMIN_EMAIL` 宛にもメール通知されます。
5. 動作確認は `/admin/tank` の「通知テスト」ボタンで実行できます。

### WxPusherで家族の個人WeChatへ便槽通知する

1. WxPusher管理后台へWeChat扫码でログインし、標準推送アプリを作成します。
2. アプリの `appToken` を取得します。
3. 家族にアプリの关注リンク/QRを読み取ってもらいます。
4. 家族それぞれの `UID_xxx` を取得します。
5. VercelのEnvironment Variablesへ `WXPUSHER_APP_TOKEN` と `WXPUSHER_UIDS` を設定し、Redeployします。
6. 便槽が80%に到達すると、WxPusher経由で家族全員の個人WeChatに通知されます。
7. 同時に `ADMIN_EMAIL` 宛にもメール通知されます。
8. 動作確認は `/admin/tank` の「通知テスト」ボタンで実行できます。

家族UIDは `WXPUSHER_UIDS=UID_xxx,UID_yyy` のようにカンマ区切りで複数指定できます。

### 送迎予約の朝10時まで制限とWxPusher通知

- ゲストの「希望出発時刻」は必須です。選択肢は `00:00` から `10:00` までに制限しています。
- 「出発便のフライト時刻」は従来通り任意です。
- 管理画面の送迎ボードは、朝10:00までの送迎予約だけを表示します。
- 新しい送迎予約が保存されると、WxPusherへ予約内容を通知します。基本は `WXPUSHER_SPT`、または `WXPUSHER_APP_TOKEN` と `WXPUSHER_UIDS` を再利用します。
- 送迎予約だけ別の宛先へ送る場合は `TRANSFER_WXPUSHER_SPT` または `TRANSFER_WXPUSHER_UIDS` を設定してください。

DB側でも今後の不正登録を防ぐ場合は、Supabaseで `supabase/migrations/0028_transfer_morning_required.sql` を実行してください。

## デモアカウント（0019シード・パスワードはすべて `demo123`）

| ロール | メール |
|--------|--------|
| ゲスト | guest@demo.com |
| オーナー | host@demo.com |
| 管理者 | admin@demo.com |

`/stays/login` にワンタップログインボタンがあります。

## Stripe決済の流れ

1. 予約作成 → 「今すぐ支払う」→ `POST /api/stays/checkout` が Checkout Session を作成
2. Stripeの決済ページで支払い（テストカード: `4242 4242 4242 4242`）
3. 成功後 `/stays/pay/result` に戻り、`GET /api/stays/checkout/confirm` が決済を確認してDBへ反映
   （本番では `POST /api/stays/webhook` に `checkout.session.completed` を登録推奨）
4. キャンセル時は `POST /api/stays/refund` がポリシーに基づく金額をStripeへ実返金

`STRIPE_SECRET_KEY` が未設定の場合、決済は自動でモック（即時支払い済み扱い）になります。

## セキュリティ注記（重要）

デモ・無料枠運用のため、RLSは **anonロールに全操作を許可**、簡易認証はパスワードを
平文保存しています。**本番では必ず** Supabase Auth（またはそれに準ずる認証基盤）を導入し、
ロール判定に基づく厳密なRLSポリシー・パスワードハッシュ化へ差し替えてください。
`/host` と `/admin` は現状クライアントサイドのガードのみです。
