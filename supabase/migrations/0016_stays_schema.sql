-- =========================================================
-- Airbnb型 予約システム（Stays）スキーマ
-- ゲスト / オーナー / 管理者の3領域で共有するテーブル群
-- 既存の送迎システム（0001〜0015）とは独立して追加する。
-- =========================================================

create extension if not exists "pgcrypto";

-- 共通 updated_at トリガー関数（既存 set_updated_at を再利用。念のため定義）
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =========================================================
-- 1. hosts: オーナー（貸主）
-- =========================================================
create table if not exists stays_hosts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists idx_stays_hosts_email on stays_hosts (email);
drop trigger if exists trg_stays_hosts_updated_at on stays_hosts;
create trigger trg_stays_hosts_updated_at
  before update on stays_hosts for each row execute function set_updated_at();

-- =========================================================
-- 2. listings: 物件
-- =========================================================
create table if not exists stays_listings (
  id               uuid primary key default gen_random_uuid(),
  host_id          uuid not null references stays_hosts (id) on delete cascade,
  title            text not null,
  description      text not null default '',
  address          text not null default '',
  city             text not null default '',
  country          text not null default 'Japan',
  lat              double precision,
  lng              double precision,
  price_per_night  integer not null default 10000,     -- 1泊料金（円）
  cleaning_fee     integer not null default 0,
  currency         text not null default 'JPY',
  max_guests       integer not null default 2 check (max_guests >= 1),
  bedrooms         integer not null default 1,
  beds             integer not null default 1,
  baths            numeric(3,1) not null default 1,
  amenities        text[] not null default '{}',       -- 例: {'wifi','kitchen','parking'}
  photos           text[] not null default '{}',       -- 画像URLの配列
  airbnb_ical_url  text,                                -- Airbnbからエクスポートした .ics のURL（インポート元）
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_stays_listings_host on stays_listings (host_id);
create index if not exists idx_stays_listings_published on stays_listings (is_published);
drop trigger if exists trg_stays_listings_updated_at on stays_listings;
create trigger trg_stays_listings_updated_at
  before update on stays_listings for each row execute function set_updated_at();

-- =========================================================
-- 3. calendar_blocks: 空室カレンダーのブロック（予約不可日）
--    source: manual=オーナー手動 / airbnb=iCal同期 / booking=当サイト予約
-- =========================================================
create table if not exists stays_calendar_blocks (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references stays_listings (id) on delete cascade,
  start_date   date not null,
  end_date     date not null,               -- 排他的終了日（チェックアウト日）
  source       text not null default 'manual' check (source in ('manual','airbnb','booking')),
  external_uid text,                          -- iCal VEVENT の UID（同期の重複防止）
  summary      text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_stays_blocks_listing on stays_calendar_blocks (listing_id, start_date);
create unique index if not exists idx_stays_blocks_ext
  on stays_calendar_blocks (listing_id, external_uid) where external_uid is not null;

-- =========================================================
-- 4. bookings: 予約
-- =========================================================
create table if not exists stays_bookings (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references stays_listings (id) on delete cascade,
  guest_name    text not null,
  guest_email   text not null,
  check_in      date not null,
  check_out     date not null,
  guests_count  integer not null default 1 check (guests_count >= 1),
  total_price   integer not null default 0,
  status        text not null default 'pending'
                check (status in ('pending','confirmed','cancelled','completed')),
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (check_out > check_in)
);
create index if not exists idx_stays_bookings_listing on stays_bookings (listing_id, check_in);
create index if not exists idx_stays_bookings_status on stays_bookings (status);
drop trigger if exists trg_stays_bookings_updated_at on stays_bookings;
create trigger trg_stays_bookings_updated_at
  before update on stays_bookings for each row execute function set_updated_at();

-- =========================================================
-- 5. reviews: 評価・レビュー
-- =========================================================
create table if not exists stays_reviews (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references stays_listings (id) on delete cascade,
  booking_id   uuid references stays_bookings (id) on delete set null,
  guest_name   text not null,
  rating       integer not null check (rating between 1 and 5),
  comment      text not null default '',
  host_reply   text,                         -- オーナーからの返信
  is_hidden    boolean not null default false, -- 管理者による非表示（論理削除）
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_stays_reviews_listing on stays_reviews (listing_id);
drop trigger if exists trg_stays_reviews_updated_at on stays_reviews;
create trigger trg_stays_reviews_updated_at
  before update on stays_reviews for each row execute function set_updated_at();

-- =========================================================
-- 6. conversations / messages: ゲスト⇔オーナーの相互チャット
-- =========================================================
create table if not exists stays_conversations (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references stays_listings (id) on delete cascade,
  host_id      uuid not null references stays_hosts (id) on delete cascade,
  guest_name   text not null,
  guest_email  text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_stays_conv_listing on stays_conversations (listing_id);
create index if not exists idx_stays_conv_guest on stays_conversations (guest_email);
create unique index if not exists idx_stays_conv_unique
  on stays_conversations (listing_id, guest_email);
drop trigger if exists trg_stays_conv_updated_at on stays_conversations;
create trigger trg_stays_conv_updated_at
  before update on stays_conversations for each row execute function set_updated_at();

create table if not exists stays_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references stays_conversations (id) on delete cascade,
  sender_role      text not null check (sender_role in ('guest','host')),
  body             text not null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_stays_messages_conv on stays_messages (conversation_id, created_at);

-- =========================================================
-- Row Level Security
-- ※ 無料枠・Auth未導入のデモ運用を想定し、anonロールに広く許可する。
--   本番では Supabase Auth を導入し、host_id / guest 判定に基づく
--   厳密なポリシーへ差し替えること（READMEのセキュリティ注記参照）。
-- =========================================================
do $$
declare t text;
begin
  foreach t in array array[
    'stays_hosts','stays_listings','stays_calendar_blocks','stays_bookings',
    'stays_reviews','stays_conversations','stays_messages'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "%s_anon_all" on %I', t, t);
    execute format(
      'create policy "%s_anon_all" on %I for all using (true) with check (true)', t, t);
  end loop;
end $$;
