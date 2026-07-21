-- =========================================================
-- 便槽モニタリング — 外部予約（Airbnb等）取り込みテーブル
--   Airbnbの予約確定/キャンセルメールを解析した結果を格納する。
--   自社予約(stays_bookings)と統合してタンク水量を計算するための一次データ。
--     - source + code を一意キーにして upsert（同じ予約の確定→キャンセルを追跡）
--     - status を confirmed / cancelled で持ち、キャンセルは計算から自動除外
-- =========================================================
create table if not exists stays_ext_reservations (
  source        text not null default 'airbnb',   -- 取り込み元
  code          text not null,                     -- 予約番号（一意キー）
  guests        integer,                           -- 宿泊人数（メールから抽出、null可）
  check_in      date,                              -- チェックイン
  check_out     date,                              -- チェックアウト
  status        text not null default 'confirmed', -- confirmed / cancelled
  email_id      text,                              -- 取り込み元Gmailメッセージ ID（重複取り込み防止の参考）
  raw_subject   text,                              -- 参考: 解析元の件名
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  primary key (source, code)
);
create index if not exists idx_stays_ext_res_dates on stays_ext_reservations (check_out);
create index if not exists idx_stays_ext_res_status on stays_ext_reservations (status);

drop trigger if exists trg_stays_ext_res_updated_at on stays_ext_reservations;
create trigger trg_stays_ext_res_updated_at
  before update on stays_ext_reservations for each row execute function set_updated_at();

alter table stays_ext_reservations enable row level security;
drop policy if exists ext_res_read on stays_ext_reservations;
create policy ext_res_read on stays_ext_reservations for select using (true);
