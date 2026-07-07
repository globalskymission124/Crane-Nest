-- =========================================================
-- プロフィールへのパスポート保存（ワンタップチェックイン用）
-- avatar_url は 0018 で作成済み。
-- =========================================================
alter table stays_users add column if not exists nationality text;
alter table stays_users add column if not exists passport_image_url text;
