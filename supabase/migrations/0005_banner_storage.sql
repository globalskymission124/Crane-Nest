-- =========================================================
-- Step 3-4: バナー画像用のSupabase Storageバケットとポリシー
--
-- 管理画面からアップロードした16:9バナー画像を保存し、
-- ゲスト画面から公開URLで参照できるようにする。
--
-- ※ 0003/0004と同様、Supabase Auth導入時に
--    管理者ロール条件のポリシーへ置き換える前提の暫定対応（"_TEMP"）。
-- =========================================================

-- バケット作成（public = trueで誰でも画像を閲覧可能にする）
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

-- 画像の閲覧は誰でも可能（ゲスト画面表示のため）
create policy "banners_storage_select_for_anyone_TEMP"
  on storage.objects for select
  using (bucket_id = 'banners');

-- アップロード（管理画面）
create policy "banners_storage_insert_for_anyone_TEMP"
  on storage.objects for insert
  with check (bucket_id = 'banners');

-- 差し替え（管理画面）
create policy "banners_storage_update_for_anyone_TEMP"
  on storage.objects for update
  using (bucket_id = 'banners')
  with check (bucket_id = 'banners');

-- 削除（管理画面）
create policy "banners_storage_delete_for_anyone_TEMP"
  on storage.objects for delete
  using (bucket_id = 'banners');
