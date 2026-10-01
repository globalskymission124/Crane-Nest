# セキュリティ更新 + Japan Travel Card v2 / 鶴印帳（プロトタイプ）

## 1. 何が問題だったか

| 問題 | 影響 |
|---|---|
| `guests` に「誰でも読める・書き換えられる」ポリシー（`guests_select_for_anyone_TEMP` / `guests_update_for_anyone_TEMP`） | 全ゲストの氏名・旅券番号・電話・住所を、サイトを開いた人なら誰でも取得・改ざんできた |
| `stays_users` / `stays_checkin_guests` に `*_anon_all`（全操作許可） | パスワードハッシュ・旅券番号の取得、**自分の role を admin に書き換える**ことも可能だった |
| `passport-photos` / `host-passports` バケットが公開 + 一覧ポリシーあり | パスポート写真を誰でも一覧・閲覧・削除できた |
| ログイン状態が localStorage だけ | 開発者ツールで書き換えれば管理者になれた |
| `/admin` の多くのページ（記録・送迎ボードなど）にログイン確認なし | 管理画面がそのまま開けた |
| `set_password` が本人確認なし | `userId` を指定すれば他人のパスワードを変更できた |
| デモ管理者 `admin@demo.com / demo123` が本番でも有効 | 誰でも管理者としてログインできた |

`NEXT_PUBLIC_SUPABASE_ANON_KEY` はブラウザに配られる公開の鍵なので、管理画面のパスワードでは防げませんでした。

## 2. 何を変えたか

**方針**: パスポート・パスワードを含む表は、ブラウザ（anon キー）から一切読めないようにし、
API ルートが「署名つき Cookie でログインを確認 → service_role キーで読む」形に変えました。
写真は非公開バケットに入れ、表示は 10〜30 分だけ有効なリンク（署名URL）で出します。

### 新しく追加したファイル
- `lib/server/admin.ts` … service_role クライアント、写真の署名URL発行
- `lib/server/session.ts` … 署名つき Cookie（`cn_session`, httpOnly）の発行・検証、役割チェック（毎回 DB で役割・停止状態を確認）
- `lib/server/travelCardData.ts` … Travel Card のデータ組み立て（同行者・写真の署名URL）
- `app/api/admin/data/route.ts` … 管理者用: 送迎ボード・宿泊記録
- `app/api/guest/booking/route.ts` … ゲストの送迎予約の保存
- `app/api/stays/account/route.ts` … プロフィール・紹介コード・ユーザー管理
- `app/api/stays/checkin/route.ts` … オーナー別チェックインの登録・一覧
- `app/api/stays/travel-card/route.ts` … Travel Card のデータ
- `supabase/migrations/0040_lock_down_passport_data.sql` … ポリシーを外し、バケットを非公開に
- `lib/stays/embassies.ts` … 国籍 → 在日大使館（プロトタイプ）
- `app/stays/tsuru-in/` … 鶴印帳（プロトタイプ）
- `public/travel-card-hero-ink.webp` … カードのヘッダー画像

### 変更したファイル
- `app/api/stays/auth/route.ts` … Cookie 発行、パスポートログイン・自動サインイン・プロフィール更新・オーナー昇格をサーバー側へ。デモは `STAYS_DEMO_LOGIN=1` のときだけ
- `lib/stays/auth.ts` … 上の API を呼ぶだけに。ページを開くとサーバーにログイン状態を確認し、無効なら表示用コピーを消す
- `lib/guestBooking.ts` … 写真はアップロードのみ（公開URLを作らない）、保存は `/api/guest/booking`
- `lib/stays/checkin.ts`, `lib/stays/v2.ts`, `lib/stays/queries.ts`, `lib/stays/travelCard.ts`, `lib/transferBookingAlerts.ts`
- `components/admin/GuestRecordsManager.tsx`, `components/admin/TransferKanbanBoard.tsx`
- `app/admin/layout.tsx` … 管理画面すべてに管理者ログインを必須に
- `app/stays/profile/page.tsx`, `app/checkin/[slug]/page.tsx`
- `components/stays/JapanTravelCard.tsx`（+ `.module.css`）… v2 デザインに置き換え
- `components/guest/BookingCompleteStep.tsx` … 予約直後のカードに同行者と出国予定日を渡す
- `.env.local.example` … 新しい環境変数

## 3. 反映の手順（この順番を守ってください）

1. **Vercel に環境変数を追加**（Settings → Environment Variables、Production / Preview 両方）
   - `SUPABASE_SERVICE_ROLE_KEY` … Supabase → Project Settings → API → `service_role`（**NEXT_PUBLIC_ を付けない**）
   - `STAYS_SESSION_SECRET` … 32文字以上のランダム文字列（例: `openssl rand -base64 48` の結果）
   - `STAYS_DEMO_LOGIN` は**設定しない**（本番でデモアカウントを無効にするため）
2. **コードを反映してデプロイ**（zip の中身でリポジトリを置き換え → push）
3. デプロイ後、**管理者アカウントでログインし直す**（古いログイン状態は無効になります）
4. 動作確認（下の「4. 確認チェックリスト」の 1〜6）
5. **Supabase の SQL Editor で `0040_lock_down_passport_data.sql` を実行**
6. もう一度 1〜6 を確認し、7〜8 も確認

> 5 を先にやると、古いコードの予約・管理画面が動かなくなります。必ず 2 のあとに実行してください。

**K-OPS（Crane-Interigent-Switch）** は `CRANENEST_SUPABASE_SERVICE_KEY`（service_role）で読んでいるので、
この変更の影響を受けません。写真パスの新形式（`<uuid>.jpg`）にも対応済みです。

## 4. 確認チェックリスト

1. ゲスト: 送迎予約（パスポート撮影 → 予約完了）が最後まで通る。完了画面に Travel Card が出る
2. 管理画面 `/admin`: 送迎ボードに予約とパスポート写真が出る
3. 管理画面 `/admin/records`: 一覧と写真、ZIP ダウンロードができる
4. オーナー `/host/checkin`: 登録一覧と写真リンクが開ける
5. ゲスト `/checkin/<slug>`: 登録できる（ログイン済みならワンタップも）
6. `/stays/travel-card` と `/stays/tsuru-in` が表示される
7. （0040 実行後）ブラウザの開発者ツールなどから anon キーで `guests` を読もうとすると `permission denied` になる
8. （0040 実行後）SQL Editor で下を実行し、結果が 0 行 / `public = false` になる
   ```sql
   select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('guests','transfer_requests','transfer_request_guests','stays_users','stays_checkin_guests');
   select id, public from storage.buckets where id in ('passport-photos','host-passports');
   ```

## 5. 念のため確認してほしいこと（すでに悪用されていないか）

これまで誰でも `stays_users.role` を書き換えられたので、次を確認してください。

```sql
-- 管理者・オーナーの一覧。心当たりのないアカウントがないか
select id, name, email, role, is_suspended, created_at from stays_users
 where role in ('admin', 'host') order by created_at;
```

- 心当たりのない admin がいれば role を `guest` に戻すか停止してください
- 管理者アカウントのパスワードは変更をおすすめします（ハッシュが読める状態だったため）
- Supabase の Logs（API）で、見慣れない大量の `guests` / `stays_users` 読み取りがないかも確認できます

## 6. 今回まだ直していないこと（次の段階）

- `stays_bookings` / `stays_payments` / `stays_messages` など、**ほかの `stays_*` 表も anon 全許可のまま**です。
  パスポートほどではありませんが、予約者の氏名・メール・支払い情報が含まれるため、同じ方式でサーバー側へ移すのが次の段階です。
- 宿の部屋・目的地・バナーの編集（管理画面）も anon キーで書き込んでいます（`*_TEMP` の書き込みポリシー）。
- 「パスポート番号 + 氏名」でのログインは、両方を知っている人ならログインできます（従来どおりの仕様）。
- パスポートの読み取り（Gemini）を、端末内の MRZ 読み取りに切り替える件は未着手です。

## 7. プロトタイプについて

### Japan Travel Card v2（`components/stays/JapanTravelCard.tsx`）
- 紺 × 青の発光デザイン、ヘッダーに Crane Feather のイラスト
- 項目名はゲストの言語（英・简・繁・한・日）を大きく、日本語を小さく。スタッフ向けの一文は常に日本語
- 代表者＋同行者を1人1枚（スワイプ / ボタンで切り替え）
- パスポート写真は透かし入り・下部の読み取り欄（MRZ）を隠して表示。オフにもできる
- 緊急連絡先は色とアイコンで区別し、タップで発信（050 と大使館は +81 形式）
- 「スクショ用表示」でボタンを消し、カードだけを全画面に
- 出国予定日は「空港送迎の日付」から推定（専用の入力欄はまだありません）。有効期限 = 出国予定日 + 3日
- **未対応**: 生年月日・性別・入国日（DB に項目がない）、帰国予定日の入力、期限切れでの自動削除

### 大使館（`lib/stays/embassies.ts`）
- 電話番号を入れているのは米・英・加・豪の4か国だけです。**公開前に各大使館の公式サイトで番号を確認してください。**
- それ以外の国は公式サイト or 外務省の「駐日外国公館リスト」へのリンクを出します。

### 鶴印帳（`/stays/tsuru-in`）
- 見た目と体験を確かめるデモです。宿・日付・特典は仮のデータで、DB には保存しません。

## 8. こちらで確認したこと

- `tsc --noEmit` と `next build` が通ること
- 本番モードでサーバーを起動し、次を確認
  - Cookie なし / 偽造 Cookie で管理者 API → 401、ゲストで管理者 API → 403
  - 本人確認なしのパスワード変更・オーナー一覧 → 401
  - `STAYS_DEMO_LOGIN` 未設定ではデモ管理者でログインできない
  - ログアウトで Cookie が消える
- PostgreSQL 16 に同じ形の表・ポリシーを作って `0040` を実行し、
  anon で `guests` / `stays_users` が読めない・写真はアップロードだけできて一覧・削除できない・
  バナーなど他のバケットは今までどおり読める・2回実行しても壊れない、を確認
- Travel Card v2 と鶴印帳を実際にブラウザで表示して確認

**実際の Supabase（本番データ）では動かしていません。** 反映後に「4. 確認チェックリスト」で確認してください。
