-- =========================================================
-- Step 3-1: バナー画像管理用テーブル追加
-- ゲストUIに表示する16:9バナーを管理画面からアップロード・並べ替え可能にする
-- =========================================================

-- =========================================================
-- banners: バナー画像マスター
-- =========================================================
create table banners (
  id            uuid primary key default gen_random_uuid(),
  image_url     text not null,                 -- Supabase Storageの画像パス/URL（16:9想定）
  alt_text      text not null default '',      -- アクセシビリティ用の代替テキスト
  display_order integer not null default 0,    -- 並び順（管理画面でドラッグ&ドロップ想定）
  is_active     boolean not null default true, -- 無効化トグル（論理削除）
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_banners_active_order
  on banners (is_active, display_order);

create trigger trg_banners_updated_at
  before update on banners
  for each row execute function set_updated_at();

-- =========================================================
-- Row Level Security
-- =========================================================
alter table banners enable row level security;

-- バナーは誰でも閲覧可（ゲストUIで表示するため、有効なものだけ）
create policy "banners_select_active_for_anyone"
  on banners for select
  using (is_active = true);

-- insert/update/delete はサービスロール（管理画面）経由のみを想定し、ここでは許可しない
