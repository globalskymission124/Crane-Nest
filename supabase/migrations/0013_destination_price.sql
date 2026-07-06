-- =========================================================
-- Step: 目的地に料金フィールドを追加
--
-- destinations テーブルに price_jpy カラムを追加する。
-- NULL = 料金未設定（表示しない）、整数 = 円単位の料金。
-- =========================================================

alter table destinations
  add column price_jpy integer default null check (price_jpy is null or price_jpy >= 0);
