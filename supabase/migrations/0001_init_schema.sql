-- =========================================================
-- Step 1: データベース設計
-- ゲストハウス送迎予約＆事前チェックインシステム
-- =========================================================

-- UUID生成関数を有効化
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- updated_at 自動更新用の共通トリガー関数
-- ---------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- =========================================================
-- 1. destinations: 目的地マスター
-- =========================================================
create table destinations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                 -- 例: 「関西国際空港」「JR日根野駅」
  display_order integer not null default 0,    -- 並び順（管理画面でドラッグ&ドロップ想定）
  is_active     boolean not null default true, -- 無効化トグル（論理削除）
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_destinations_active_order
  on destinations (is_active, display_order);

create trigger trg_destinations_updated_at
  before update on destinations
  for each row execute function set_updated_at();


-- =========================================================
-- 2. guests: 顧客マスター
-- =========================================================
create table guests (
  id                  uuid primary key default gen_random_uuid(),
  passport_number     text not null,
  full_name           text not null,
  phone_number        text,
  passport_image_url  text,                    -- Supabase Storageの画像パス/URL
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 同一パスポート番号の重複登録を防止（簡易の名寄せ）
create unique index idx_guests_passport_number
  on guests (passport_number);

create trigger trg_guests_updated_at
  before update on guests
  for each row execute function set_updated_at();


-- =========================================================
-- 3. transfer_requests: 送迎リクエスト
-- =========================================================

-- ステータスを型で固定（カンバンボードの列と対応）
create type transfer_status as enum (
  'pending',     -- 受付済み（未確定）
  'confirmed',   -- 確定（カンバンに配置済み）
  'completed',   -- 送迎完了
  'cancelled'    -- キャンセル
);

create table transfer_requests (
  id                        uuid primary key default gen_random_uuid(),
  guest_id                  uuid not null references guests (id) on delete cascade,
  room_number               text not null,                    -- 全9部屋: 101〜109 等を想定
  destination_id            uuid not null references destinations (id),
  flight_time               timestamptz not null,             -- 出発便の時刻
  suggested_departure_time  timestamptz,                      -- 「2.5時間前」を自動算出してセット
  passenger_count           integer not null default 1 check (passenger_count >= 1),
  luggage_large             integer not null default 0 check (luggage_large >= 0),  -- 🧳 大型スーツケース
  luggage_small             integer not null default 0 check (luggage_small >= 0),  -- 🎒 小型手荷物
  luggage_special           integer not null default 0 check (luggage_special >= 0),-- 🚲 特殊荷物
  status                    transfer_status not null default 'pending',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- カンバンボード表示（時間帯レーン別の一覧取得）を高速化
create index idx_transfer_requests_departure
  on transfer_requests (suggested_departure_time);

create index idx_transfer_requests_status
  on transfer_requests (status);

create index idx_transfer_requests_guest
  on transfer_requests (guest_id);

create trigger trg_transfer_requests_updated_at
  before update on transfer_requests
  for each row execute function set_updated_at();


-- =========================================================
-- Row Level Security（無料枠運用・直接Supabaseアクセスを想定した最小設定）
-- ※ 本格的な権限設計はAuth導入時に見直し
-- =========================================================
alter table destinations enable row level security;
alter table guests enable row level security;
alter table transfer_requests enable row level security;

-- 目的地は誰でも閲覧可（ゲストUIでボタン表示するため）
create policy "destinations_select_active_for_anyone"
  on destinations for select
  using (is_active = true);

-- guests / transfer_requests は anon からの insert のみ許可（ゲストの新規予約用）
-- select/update/delete はサービスロール（管理画面）経由のみを想定し、ここでは許可しない
create policy "guests_insert_for_anyone"
  on guests for insert
  with check (true);

create policy "transfer_requests_insert_for_anyone"
  on transfer_requests for insert
  with check (true);
