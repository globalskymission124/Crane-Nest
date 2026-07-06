-- =========================================================
-- パスポート登録からの自動サインイン対応
--  - password を null 許可（パスワード未設定アカウント）
--  - passport_number 列を追加（送迎アプリのパスポート登録と紐付け）
-- =========================================================

alter table stays_users alter column password drop not null;
alter table stays_users add column if not exists passport_number text;
alter table stays_users add column if not exists phone text;
create unique index if not exists idx_stays_users_passport
  on stays_users (passport_number) where passport_number is not null;
