-- =========================================================
-- Step 6: ゲストがアップロードしたパスポート写真を実際に保存し、
--         管理画面から宿泊者情報とリンクしてダウンロードできるようにする
--
-- これまでフロントエンドの予約フローはモック（Supabaseへ未保存）だったため、
-- guests / transfer_requests への実際のinsertと、
-- パスポート写真用のStorageバケットを追加する。
--
-- ※ 0005/0008/0009と同様、Supabase Auth導入時に
--    管理者ロール条件のポリシーへ置き換える前提の暫定対応（"_TEMP"）。
-- =========================================================

insert into storage.buckets (id, name, public)
values ('passport-photos', 'passport-photos', true)
on conflict (id) do nothing;

create policy "passport_photos_storage_select_for_anyone_TEMP"
  on storage.objects for select
  using (bucket_id = 'passport-photos');

create policy "passport_photos_storage_insert_for_anyone_TEMP"
  on storage.objects for insert
  with check (bucket_id = 'passport-photos');

create policy "passport_photos_storage_update_for_anyone_TEMP"
  on storage.objects for update
  using (bucket_id = 'passport-photos')
  with check (bucket_id = 'passport-photos');

create policy "passport_photos_storage_delete_for_anyone_TEMP"
  on storage.objects for delete
  using (bucket_id = 'passport-photos');

-- guests テーブルは既存の "guests_insert_for_anyone" ポリシーで insert 可能だが、
-- 同一パスポート番号での再訪問時に upsert できるよう update も許可しておく
create policy "guests_update_for_anyone_TEMP"
  on guests for update
  using (true)
  with check (true);
