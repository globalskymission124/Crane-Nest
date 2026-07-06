-- =========================================================
-- Step: 目的地削除バグ修正
--
-- 問題1: destinations に delete RLS ポリシーが存在しないため、
--        管理画面から削除を実行してもSupabaseに弾かれる。
--
-- 問題2: transfer_requests.destination_id が destinations(id) を
--        NOT NULL REFERENCES で参照しており、紐づく送迎予約が
--        存在する目的地を削除しようとするとFK制約違反になる。
--        → destination_id を nullable にして ON DELETE SET NULL に変更する。
--          （過去の予約データは削除せず、目的地情報のみ NULL になる）
-- =========================================================

-- ① destinations の DELETE を許可するポリシーを追加
create policy "destinations_delete_for_anyone_TEMP"
  on destinations for delete
  using (true);

-- ② transfer_requests.destination_id の既存FK制約を差し替え
--    NOT NULL + RESTRICT → nullable + ON DELETE SET NULL
alter table transfer_requests
  drop constraint transfer_requests_destination_id_fkey;

alter table transfer_requests
  alter column destination_id drop not null;

alter table transfer_requests
  add constraint transfer_requests_destination_id_fkey
  foreign key (destination_id)
  references destinations (id)
  on delete set null;
