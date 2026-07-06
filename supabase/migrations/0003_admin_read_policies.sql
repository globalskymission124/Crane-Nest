-- =========================================================
-- Step 3-2: 管理画面からの閲覧を許可するRLSポリシー
--
-- 現状、guests / transfer_requests には select ポリシーが無く、
-- destinations は is_active = true の行しか見えない（ゲストUI向け）。
-- このままでは管理画面（カンバンボード等）がanonキーでデータを取得できない。
--
-- ※ 本来は Supabase Auth 等で管理者ロールを導入し、
--    「認証済みスタッフのみ閲覧可」に置き換えるべき暫定対応。
--    認証導入時にこれらの "_TEMP" ポリシーは削除し、
--    role を条件にしたポリシーへ差し替えること。
-- =========================================================

-- destinations: 管理画面では無効化済みのものも含めて一覧・編集対象にしたいため、
-- 既存の「有効なものだけ」ポリシーを「全件閲覧可」へ置き換える
drop policy if exists "destinations_select_active_for_anyone" on destinations;

create policy "destinations_select_for_anyone_TEMP"
  on destinations for select
  using (true);

-- guests: カンバンボードでゲスト名を表示するために必要
create policy "guests_select_for_anyone_TEMP"
  on guests for select
  using (true);

-- transfer_requests: カンバンボードの一覧表示に必要
create policy "transfer_requests_select_for_anyone_TEMP"
  on transfer_requests for select
  using (true);
