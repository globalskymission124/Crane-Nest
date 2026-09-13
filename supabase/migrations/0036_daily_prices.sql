-- =========================================================
-- 日別料金の上書き（カレンダーからオーナーが特定日の料金を設定）
--  未設定の日は物件の基準料金 (price_per_night) を使用。
-- =========================================================
create table if not exists stays_daily_prices (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references stays_listings (id) on delete cascade,
  date        date not null,
  price       integer not null check (price >= 0),
  created_at  timestamptz not null default now(),
  unique (listing_id, date)
);
create index if not exists idx_stays_daily_prices_listing on stays_daily_prices (listing_id, date);

alter table stays_daily_prices enable row level security;

-- 読み取りは公開（ゲストの料金計算に使用）
drop policy if exists stays_daily_prices_read on stays_daily_prices;
create policy stays_daily_prices_read on stays_daily_prices for select using (true);

-- 書き込みは全許可（アプリ側でオーナー/管理者に限定。既存テーブルの方針に合わせる）
drop policy if exists stays_daily_prices_write on stays_daily_prices;
create policy stays_daily_prices_write on stays_daily_prices for all using (true) with check (true);
