-- =========================================================
-- Step 3-3: 管理画面からの目的地登録・編集を許可するRLSポリシー
--
-- destinations には select 用のポリシーしか無いため、
-- 管理画面からの追加（insert）・並び順変更や有効/無効切替（update）が
-- anonキーのままでは行えない。
--
-- ※ 0003と同様、Supabase Auth導入時に管理者ロール条件へ置き換える前提の暫定対応。
-- =========================================================

create policy "destinations_insert_for_anyone_TEMP"
  on destinations for insert
  with check (true);

create policy "destinations_update_for_anyone_TEMP"
  on destinations for update
  using (true)
  with check (true);
