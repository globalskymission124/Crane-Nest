-- =========================================================
-- 送迎予約: 希望出発時刻を必須化し、朝10:00までに制限する。
--
-- - フライト時刻 flight_time は引き続き任意。
-- - preferred_departure_time は "HH:mm" 形式で必須。
-- - 送迎対応は 10:00 まで。10:01 以降は登録不可。
-- - NOT VALID にすることで既存の古いレコードは検査せず、
--   今後のINSERT/UPDATEだけをDB側で防ぐ。
-- =========================================================

alter table transfer_requests
  drop constraint if exists transfer_requests_preferred_departure_time_required_morning;

alter table transfer_requests
  add constraint transfer_requests_preferred_departure_time_required_morning
  check (
    case
      when preferred_departure_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
        split_part(preferred_departure_time, ':', 1)::integer * 60
        + split_part(preferred_departure_time, ':', 2)::integer <= 600
      else false
    end
  ) not valid;
