-- =========================================================
-- Step 4: 目的地に写真を登録できるようにする
--
-- destinations テーブルに image_url 列を追加し、
-- 管理画面からアップロードした写真をゲスト画面の目的地選択カードに表示する。
-- =========================================================

alter table destinations
  add column if not exists image_url text;

-- =========================================================
-- 目的地写真用のSupabase Storageバケット
-- =========================================================
insert into storage.buckets (id, name, public)
values ('destination-photos', 'destination-photos', true)
on conflict (id) do nothing;

create policy "destination_photos_storage_select_for_anyone_TEMP"
  on storage.objects for select
  using (bucket_id = 'destination-photos');

create policy "destination_photos_storage_insert_for_anyone_TEMP"
  on storage.objects for insert
  with check (bucket_id = 'destination-photos');

create policy "destination_photos_storage_update_for_anyone_TEMP"
  on storage.objects for update
  using (bucket_id = 'destination-photos')
  with check (bucket_id = 'destination-photos');

create policy "destination_photos_storage_delete_for_anyone_TEMP"
  on storage.objects for delete
  using (bucket_id = 'destination-photos');
