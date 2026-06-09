-- =========================================================
-- Step 3-4: 管理画面からのバナー登録・編集・削除を許可するRLSポリシー
--
-- bannersテーブルにはselect（is_active=true）のポリシーしか無いため、
-- 管理画面からの新規登録（insert）・並び順や有効/無効の変更（update）・
-- 削除（delete）がanonキーのままでは行えない。
--
-- ※ 0003/0004/0005と同様、Supabase Auth導入時に
--    管理者ロール条件のポリシーへ置き換える前提の暫定対応（"_TEMP"）。
-- =========================================================

create policy "banners_insert_for_anyone_TEMP"
  on banners for insert
  with check (true);

create policy "banners_update_for_anyone_TEMP"
  on banners for update
  using (true)
  with check (true);

create policy "banners_delete_for_anyone_TEMP"
  on banners for delete
  using (true);
