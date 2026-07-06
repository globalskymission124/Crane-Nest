-- =========================================================
-- 公式サイトCMS: 管理画面から画像・バナー・文言を編集可能に
-- =========================================================

-- 1. サイトコンテンツ（1行）: 画像URL + 言語別の文言上書き(jsonb)
create table if not exists stays_site_cms (
  id              integer primary key default 1 check (id = 1),
  hero_image_url  text,                      -- ヒーロー背景画像
  area_images     jsonb not null default '[]',  -- エリアカード画像URL配列（3枚）
  gallery         jsonb not null default '[]',  -- ギャラリー画像URL配列
  text_overrides  jsonb not null default '{}',  -- {en: {heroHeading, heroSub}, tw: {...}, ...}
  updated_at      timestamptz not null default now()
);
insert into stays_site_cms (id) values (1) on conflict (id) do nothing;

alter table stays_site_cms enable row level security;
drop policy if exists stays_site_cms_anon_all on stays_site_cms;
create policy stays_site_cms_anon_all on stays_site_cms
  for all to anon using (true) with check (true);

-- 2. 画像用ストレージバケット（公開）
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

drop policy if exists "site_assets_select_TEMP" on storage.objects;
create policy "site_assets_select_TEMP"
  on storage.objects for select using (bucket_id = 'site-assets');
drop policy if exists "site_assets_insert_TEMP" on storage.objects;
create policy "site_assets_insert_TEMP"
  on storage.objects for insert with check (bucket_id = 'site-assets');
drop policy if exists "site_assets_update_TEMP" on storage.objects;
create policy "site_assets_update_TEMP"
  on storage.objects for update using (bucket_id = 'site-assets') with check (bucket_id = 'site-assets');
drop policy if exists "site_assets_delete_TEMP" on storage.objects;
create policy "site_assets_delete_TEMP"
  on storage.objects for delete using (bucket_id = 'site-assets');
