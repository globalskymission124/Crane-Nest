-- =========================================================
-- v4: ポイントプログラム / 友達紹介 / 自動ダイナミックプライシング
-- =========================================================

-- 料率設定にポイント・紹介ボーナスを追加
alter table stays_platform_settings add column if not exists points_earn_pct numeric(5,2) not null default 1;      -- 予約額の何%をポイント還元
alter table stays_platform_settings add column if not exists referral_bonus_points integer not null default 500;   -- 紹介成立時の双方付与pt

-- ユーザー: 紹介コード
alter table stays_users add column if not exists referral_code text;
create unique index if not exists idx_stays_users_refcode
  on stays_users (referral_code) where referral_code is not null;
alter table stays_users add column if not exists referred_by text;  -- 紹介者のreferral_code

-- 物件: 自動ダイナミックプライシング
alter table stays_listings add column if not exists auto_pricing boolean not null default false;

-- ポイント台帳（残高 = deltaの合計。1pt = 1円として予約時に利用可能）
create table if not exists stays_points_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_email  text not null,
  delta       integer not null,          -- 正=付与 / 負=利用
  reason      text not null default '',
  booking_id  uuid references stays_bookings (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_stays_points_user on stays_points_ledger (user_email, created_at desc);

alter table stays_points_ledger enable row level security;
drop policy if exists stays_points_ledger_anon_all on stays_points_ledger;
create policy stays_points_ledger_anon_all on stays_points_ledger
  for all to anon using (true) with check (true);
