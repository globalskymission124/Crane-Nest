-- =========================================================
-- Stays v2: 次世代機能スキーマ
--  ユーザー(簡易認証) / ウィッシュリスト / クーポン / 決済 /
--  通知 / 通報(紛争) / 監査ログ / 物件・予約・レビュー拡張
-- 0016/0017 の後に適用する。
-- =========================================================

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. users: 簡易認証ユーザー（デモ用。本番は Supabase Auth へ移行）
-- =========================================================
create table if not exists stays_users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  password    text not null,                 -- デモ用の平文。※本番では必ずハッシュ化/Auth移行
  role        text not null default 'guest' check (role in ('guest','host','admin')),
  host_id     uuid references stays_hosts (id) on delete set null,
  avatar_url  text,
  is_suspended boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists idx_stays_users_email on stays_users (email);
drop trigger if exists trg_stays_users_updated_at on stays_users;
create trigger trg_stays_users_updated_at
  before update on stays_users for each row execute function set_updated_at();

-- =========================================================
-- 2. wishlists: お気に入り
-- =========================================================
create table if not exists stays_wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_email  text not null,
  listing_id  uuid not null references stays_listings (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create unique index if not exists idx_stays_wishlists_unique
  on stays_wishlists (user_email, listing_id);

-- =========================================================
-- 3. coupons: クーポン / プロモーション
-- =========================================================
create table if not exists stays_coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text not null,
  host_id       uuid references stays_hosts (id) on delete cascade,  -- null = 全サイト共通(管理者発行)
  listing_id    uuid references stays_listings (id) on delete cascade, -- null = ホストの全物件
  discount_type text not null default 'percent' check (discount_type in ('percent','fixed')),
  value         integer not null check (value > 0),  -- percent: 1-100 / fixed: 円
  valid_from    date,
  valid_to      date,
  max_uses      integer,                              -- null = 無制限
  used_count    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create unique index if not exists idx_stays_coupons_code on stays_coupons (upper(code));

-- =========================================================
-- 4. payments: 決済（Stripe / モック）
-- =========================================================
create table if not exists stays_payments (
  id                    uuid primary key default gen_random_uuid(),
  booking_id            uuid not null references stays_bookings (id) on delete cascade,
  amount                integer not null,
  currency              text not null default 'JPY',
  provider              text not null default 'mock' check (provider in ('stripe','mock')),
  status                text not null default 'pending'
                        check (status in ('pending','paid','refunded','partially_refunded','failed')),
  stripe_session_id     text,
  stripe_payment_intent text,
  refund_amount         integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_stays_payments_booking on stays_payments (booking_id);
create index if not exists idx_stays_payments_session on stays_payments (stripe_session_id);
drop trigger if exists trg_stays_payments_updated_at on stays_payments;
create trigger trg_stays_payments_updated_at
  before update on stays_payments for each row execute function set_updated_at();

-- =========================================================
-- 5. notifications: アプリ内通知
-- =========================================================
create table if not exists stays_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_email  text not null,     -- 宛先（ゲスト/オーナー/管理者のメール）
  title       text not null,
  body        text not null default '',
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_stays_notifications_user
  on stays_notifications (user_email, is_read, created_at desc);

-- =========================================================
-- 6. reports: 通報 / 紛争
-- =========================================================
create table if not exists stays_reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_name   text not null,
  reporter_email  text not null,
  target_type     text not null check (target_type in ('listing','review','booking','user')),
  target_id       text not null,
  reason          text not null,
  status          text not null default 'open'
                  check (status in ('open','in_review','resolved','dismissed')),
  resolution_note text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
drop trigger if exists trg_stays_reports_updated_at on stays_reports;
create trigger trg_stays_reports_updated_at
  before update on stays_reports for each row execute function set_updated_at();

-- =========================================================
-- 7. audit_logs: 監査ログ（管理者向け）
-- =========================================================
create table if not exists stays_audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_email text not null default '',
  actor_role  text not null default '',
  action      text not null,
  target      text not null default '',
  detail      text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists idx_stays_audit_created on stays_audit_logs (created_at desc);

-- =========================================================
-- 8. 既存テーブルの拡張
-- =========================================================
-- 物件: 即時予約 / キャンセルポリシー / 物件タイプ / 最低泊数 / 長期割引
alter table stays_listings add column if not exists instant_book boolean not null default false;
alter table stays_listings add column if not exists cancellation_policy text not null default 'moderate'
  check (cancellation_policy in ('flexible','moderate','strict'));
alter table stays_listings add column if not exists property_type text not null default 'house'
  check (property_type in ('house','apartment','guesthouse','hotel','villa','cabin'));
alter table stays_listings add column if not exists min_nights integer not null default 1;
alter table stays_listings add column if not exists weekly_discount_pct integer not null default 0;
alter table stays_listings add column if not exists monthly_discount_pct integer not null default 0;

-- 予約: 決済状態 / クーポン / 割引額
alter table stays_bookings add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid','paid','refunded','partially_refunded'));
alter table stays_bookings add column if not exists coupon_code text;
alter table stays_bookings add column if not exists discount_amount integer not null default 0;

-- レビュー: カテゴリ別評価（Airbnb同様）
alter table stays_reviews add column if not exists rating_cleanliness integer check (rating_cleanliness between 1 and 5);
alter table stays_reviews add column if not exists rating_accuracy integer check (rating_accuracy between 1 and 5);
alter table stays_reviews add column if not exists rating_checkin integer check (rating_checkin between 1 and 5);
alter table stays_reviews add column if not exists rating_value integer check (rating_value between 1 and 5);

-- =========================================================
-- RLS（デモ運用: anon に全操作許可。本番では必ず厳密化すること）
-- =========================================================
do $$
declare t text;
begin
  foreach t in array array[
    'stays_users','stays_wishlists','stays_coupons','stays_payments',
    'stays_notifications','stays_reports','stays_audit_logs'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_anon_all', t);
    execute format('create policy %I on %I for all to anon using (true) with check (true)', t || '_anon_all', t);
  end loop;
end $$;
