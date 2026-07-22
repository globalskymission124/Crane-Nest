# 便槽モニタリング v7（多言語・アニメーション・毎日自動同期）

このフォルダの中身をリポジトリの同じ場所に上書きコピーしてGitHubへpush → Vercel自動デプロイ。
※ 事前に v6（日付解析修正）が反映済みであること。

## 変更ファイル
- components/stays/GuesthouseTankDashboard.tsx
    多言語対応（zh/ja/en、管理画面の言語切替に追従・既定は中国語相当）＋
    アニメーション（水面のさざ波・シマー・ゲージ上昇・数値ポップ・警告時パルス）。
- app/api/stays/tank/sync/route.ts
    Vercel Cron 用に GET を追加（CRON_SECRET 設定時はヘッダ認証）。POST（手動）は従来通り。
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
