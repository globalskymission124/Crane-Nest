-- =========================================================
-- Step 4: サイト全体の見た目を管理画面から変更できるようにする
-- ブランドカラー・ロゴ・アイキャッチ画像をsite_settingsテーブルで一元管理する。
-- 1行のみを保持するシングルトン的なテーブルとして扱う。
--
-- ※ insert/update はTEMP的に誰でも可能にしている（Auth導入時に置き換え予定）。
-- =========================================================

create table site_settings (
  id                uuid primary key default gen_random_uuid(),
  primary_color     text not null default '#2563eb', -- ブランドカラーの基準色（HEX）。ここから明暗のスケールを自動生成する
  logo_url          text,                             -- ヘッダーに表示するロゴ画像
  hero_image_url    text,                             -- 管理画面トップに表示するアイキャッチ画像
  updated_at        timestamptz not null default now()
);

-- 初期値を1行だけ投入
insert into site_settings (primary_color) values ('#2563eb');

create trigger trg_site_settings_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

-- =========================================================
-- Row Level Security
-- =========================================================
alter table site_settings enable row level security;

-- 設定値はゲスト画面でも参照するため誰でも閲覧可
create policy "site_settings_select_for_anyone"
  on site_settings for select
  using (true);

-- 更新は管理画面から行うための暫定ポリシー（_TEMP、Auth導入時に置き換え）
create policy "site_settings_update_for_anyone_TEMP"
  on site_settings for update
  using (true)
  with check (true);


-- =========================================================
-- ロゴ・アイキャッチ画像用のSupabase Storageバケット
-- =========================================================
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

create policy "site_assets_storage_select_for_anyone_TEMP"
  on storage.objects for select
  using (bucket_id = 'site-assets');

create policy "site_assets_storage_insert_for_anyone_TEMP"
  on storage.objects for insert
  with check (bucket_id = 'site-assets');

create policy "site_assets_storage_update_for_anyone_TEMP"
  on storage.objects for update
  using (bucket_id = 'site-assets')
  with check (bucket_id = 'site-assets');

create policy "site_assets_storage_delete_for_anyone_TEMP"
  on storage.objects for delete
  using (bucket_id = 'site-assets');
