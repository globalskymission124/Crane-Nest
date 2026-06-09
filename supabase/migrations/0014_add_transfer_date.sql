-- ========================================================
-- 0014: transfer_requests に transfer_date (date型) を追加
--
-- ゲストが送迎希望日を明示的に選択できるようにする。
-- Kanban ボードの日付フィルタもこのカラムを使用する。
-- ========================================================

alter table transfer_requests
  add column if not exists transfer_date date default null;

-- 既存レコードは flight_time の日付部分で埋める（あれば）
update transfer_requests
  set transfer_date = (flight_time at time zone 'Asia/Tokyo')::date
  where transfer_date is null
    and flight_time is not null;
