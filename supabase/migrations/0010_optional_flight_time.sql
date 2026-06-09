-- =========================================================
-- Step 5: フライト出発時刻を任意項目に変更し、
--         ゲストの希望出発（送迎）時刻を保存できるようにする
--
-- - flight_time を NULL 許容に変更（未定のまま予約を進められるように）
-- - preferred_departure_time 列を追加（ゲストが希望する送迎時刻、任意・"HH:mm"相当）
-- =========================================================

alter table transfer_requests
  alter column flight_time drop not null;

alter table transfer_requests
  add column if not exists preferred_departure_time text;
