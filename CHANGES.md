# 便槽（し尿タンク）モニタリング — 追加分ファイル一覧

このフォルダの中身を Crane-Nest リポジトリのルートにそのまま上書きコピーしてください
（フォルダ構成はリポジトリと同一です）。

## 新規ファイル (8)
- lib/stays/tank.ts                              … 型・定数・純粋な計算ロジック（クライアント/サーバ共有）
- lib/stays/tankStore.ts                         … Supabaseデータアクセス＋インメモリ・モックフォールバック（サーバ専用）
- lib/stays/tankAlerts.ts                        … WeCom & Email ダブル通知（サーバ専用）
- app/api/stays/tank/route.ts                    … GET(現在状態) / POST(人数更新→再計算→通知)
- app/api/stays/tank/reset/route.ts              … 汲み取り完了リセット
- components/stays/GuesthouseTankDashboard.tsx   … ダッシュボードUI本体
- app/admin/tank/page.tsx                        … 管理者専用ページ（AuthGuard roles=["admin"]）
- supabase/migrations/0026_tank_monitor.sql      … DBマイグレーション（本番の永続化時に適用）

## 変更ファイル (3)
- components/admin/AdminNav.tsx  … 管理ナビに「便槽モニタ」項目を追加（import 1行 + ラベル定義 + nav 1行）
- .env.local.example             … WeCom / SMTP / 業者連絡先の環境変数を追記
- package.json                   … nodemailer, @types/nodemailer を追加

## 未変更（含めていません）
- components/stays/HostNav.tsx … 一度追加後に元へ戻したため、オリジナルと完全一致（コピー不要）

## セットアップ
1. npm install           （nodemailer を導入）
2. （本番のみ）supabase のマイグレーション 0026 を適用
3. .env.local に WECOM_WEBHOOK_URL / ADMIN_EMAIL / SMTP_* / VACUUM_CONTACT を設定（任意）
   未設定でも /admin/tank はモックデータで動作します。
