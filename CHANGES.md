# 便槽・送迎通知 v13（WxPusher SPT対応 + 朝10時まで送迎）

このフォルダの中身をリポジトリの同じ場所に上書きコピーしてGitHubへpush → Vercel自動デプロイ。
※ 事前に v6（日付解析修正）が反映済みであること。

## 変更ファイル
- lib/stays/tankAlerts.ts
    80%到達時の通知先をWxPusher標準推送へ変更。`WXPUSHER_APP_TOKEN` と `WXPUSHER_UIDS`
    を設定すると、家族UID宛へテキスト通知を送信します。
    自分だけに送る場合は、`WXPUSHER_SPT` だけでも極簡推送で通知できます。
    メール通知と同時に送る二重通知構成に整理しました。
- lib/wxpusher.ts
    WxPusher標準推送/極簡推送SPTの共通ヘルパーを追加。appToken、UID、SPTはサーバ環境変数からのみ読みます。
- components/stays/GuesthouseTankDashboard.tsx
    多言語対応（zh/ja/en、管理画面の言語切替に追従・既定は中国語相当）＋
    アニメーション（水面のさざ波・シマー・ゲージ上昇・数値ポップ・警告時パルス）。
    現在水位、汲み取りライン、WxPusher通知状態をヘッダーで確認できます。
    WxPusher + Email の「通知テスト」ボタンを追加しました。
- app/api/stays/tank/test-alert/route.ts
    通知設定確認用の手動テストAPI。実通知と同じ経路で送信し、alertedフラグは変更しません。
- .env.local.example / README-STAYS.md
    WxPusher + Email 通知に必要な環境変数を追記。
- app/api/stays/tank/sync/route.ts
    Vercel Cron 用に GET を追加（CRON_SECRET 設定時はヘッダ認証）。POST（手動）は従来通り。
- components/guest/TransferDetailsStep.tsx / lib/transferTime.ts / lib/guestBooking.ts
    送迎の希望出発時刻を必須化。選択肢は00:00〜10:00に制限し、保存前にも同じ条件を検証します。
    出発便のフライト時刻は引き続き任意です。
- components/admin/TransferKanbanBoard.tsx / lib/adminSchedule.ts
    管理画面の送迎ボードを朝10:00までの予約表示に絞り、早朝・朝の2レーン構成に変更しました。
- app/api/transfer/booking-alert/route.ts / lib/transferBookingAlerts.ts
    新しい送迎予約をWxPusherへ通知するAPIを追加。`WXPUSHER_APP_TOKEN` と `WXPUSHER_UIDS` を再利用し、
    任意で `WXPUSHER_SPT` / `TRANSFER_WXPUSHER_SPT` / `TRANSFER_WXPUSHER_UIDS` による宛先指定もできます。
- supabase/migrations/0028_transfer_morning_required.sql
    DB側でも今後の新規/更新レコードに対して、希望出発時刻必須・10:00までのチェック制約を追加します。
- vercel.json（新規）
    毎日 21:00 UTC（＝日本時間 6:00）に /api/stays/tank/sync を自動実行するCron。

## 毎日自動同期の有効化（Vercel）
1. 上記をデプロイすると、Vercel が vercel.json のCronを認識します。
2. （推奨）Vercel の Environment Variables に CRON_SECRET を追加（任意の長い文字列）。
   → Vercelは自動で Authorization: Bearer <CRON_SECRET> を付けて叩くため、外部からの
     無断実行を防げます。設定後は Redeploy。
3. Vercelダッシュボード → プロジェクト → Settings → Cron Jobs で登録を確認できます。
   （Hobbyプランは1日1回まで。今回の設定は1日1回なのでOK）

## 実行タイミングを変えたい場合
vercel.json の "schedule"（cron式・UTC）を変更:
  "0 21 * * *" = 毎日 6:00 JST / "0 22 * * *" = 7:00 JST / "0 23 * * *" = 8:00 JST

## 言語について
タンク画面は管理画面右上の言語切替（中文/日本語/English）に追従します。
現在は中国語表示です。もし「常に中国語で固定」にしたい場合は連絡ください（切替と独立に固定できます）。
