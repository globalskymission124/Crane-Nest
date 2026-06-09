-- =========================================================
-- Step 4: 部屋管理機能
--
-- これまで「部屋番号」はフロントエンドに 101〜109 をハードコードしていたが、
-- 管理画面から「部屋の名前」として登録・編集・削除・並び替え・写真登録が
-- できるようにするため rooms テーブルを新設する。
--
-- ※ insert/update/delete はTEMP的に誰でも可能にしている（Auth導入時に置き換え予定）。
-- =========================================================

create table rooms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,            -- 部屋の名前（例: "やまぼうし", "Room 101" など自由入力）
  photo_url     text,                     -- 部屋の写真（Storage上の公開URL）
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_rooms_updated_at
  before update on rooms
  for each row execute function set_updated_at();

-- 初期データとして既存の9部屋分（101〜109）を登録
insert into rooms (name, display_order) values
  ('101', 1),
  ('102', 2),
  ('103', 3),
  ('104', 4),
  ('105', 5),
  ('106', 6),
  ('107', 7),
  ('108', 8),
  ('109', 9);

-- =========================================================
-- Row Level Security
-- =========================================================
alter table rooms enable row level security;

-- ゲスト画面・管理画面の両方から参照するため、閲覧は誰でも可（有効/無効の絞り込みはアプリ側で実施）
create policy "rooms_select_for_anyone_TEMP"
  on rooms for select
  using (true);

create policy "rooms_insert_for_anyone_TEMP"
  on rooms for insert
  with check (true);

create policy "rooms_update_for_anyone_TEMP"
  on rooms for update
  using (true)
  with check (true);

create policy "rooms_delete_for_anyone_TEMP"
  on rooms for delete
  using (true);


-- =========================================================
-- 部屋写真用のSupabase Storageバケット
-- =========================================================
insert into storage.buckets (id, name, public)
values ('room-photos', 'room-photos', true)
on conflict (id) do nothing;

create policy "room_photos_storage_select_for_anyone_TEMP"
  on storage.objects for select
  using (bucket_id = 'room-photos');

create policy "room_photos_storage_insert_for_anyone_TEMP"
  on storage.objects for insert
  with check (bucket_id = 'room-photos');

create policy "room_photos_storage_update_for_anyone_TEMP"
  on storage.objects for update
  using (bucket_id = 'room-photos')
  with check (bucket_id = 'room-photos');

create policy "room_photos_storage_delete_for_anyone_TEMP"
  on storage.objects for delete
  using (bucket_id = 'room-photos');
