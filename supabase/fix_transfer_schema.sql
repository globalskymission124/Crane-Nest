-- =========================================================
-- Crane Nest 送迎予約 保存エラー修正 SQL
--
-- エラー内容:
--   「Could not find the 'terminal' column of 'transfer_requests'
--    in the schema cache」
--
-- 原因:
--   マイグレーション 0032（複数ゲスト用の中間テーブル）と
--   0033（terminal 列の追加）が本番 Supabase に未適用のため、
--   予約保存時の INSERT が失敗している。
--
-- このスクリプトは何度実行しても安全（冪等）です。
-- Supabase ダッシュボード → SQL Editor に貼り付けて「Run」してください。
-- =========================================================

-- ---------------------------------------------------------
-- 0033: transfer_requests に terminal 列を追加
-- ---------------------------------------------------------
alter table transfer_requests
  add column if not exists terminal text;

comment on column transfer_requests.terminal is
  '関西空港のみ: ターミナル番号（''1'' | ''2''）。それ以外の目的地では NULL。';

-- ---------------------------------------------------------
-- 0032: 1予約に複数ゲストを紐付ける中間テーブル
-- （2人目以降のパスポート写真・情報を宿泊記録に表示するために必要）
-- ---------------------------------------------------------
create table if not exists transfer_request_guests (
  id                   uuid primary key default gen_random_uuid(),
  transfer_request_id  uuid not null references transfer_requests (id) on delete cascade,
  guest_id             uuid not null references guests (id) on delete cascade,
  is_primary           boolean not null default false,
  created_at           timestamptz not null default now(),
  unique (transfer_request_id, guest_id)
);

create index if not exists idx_trg_transfer on transfer_request_guests (transfer_request_id);
create index if not exists idx_trg_guest on transfer_request_guests (guest_id);

create unique index if not exists idx_trg_one_primary
  on transfer_request_guests (transfer_request_id)
  where is_primary;

alter table transfer_request_guests enable row level security;

-- RLS ポリシー（再実行できるよう drop → create）
drop policy if exists "trg_insert_for_anyone" on transfer_request_guests;
create policy "trg_insert_for_anyone"
  on transfer_request_guests for insert
  with check (true);

drop policy if exists "trg_select_for_anyone_TEMP" on transfer_request_guests;
create policy "trg_select_for_anyone_TEMP"
  on transfer_request_guests for select
  using (true);

-- guests の upsert（onConflict: passport_number）を anon キーで成立させる update ポリシー
drop policy if exists "guests_update_for_anyone_TEMP" on guests;
create policy "guests_update_for_anyone_TEMP"
  on guests for update
  using (true)
  with check (true);

-- ---------------------------------------------------------
-- PostgREST のスキーマキャッシュを再読み込み
-- （列を追加しても API が古いキャッシュを見続けることがあるため）
-- ---------------------------------------------------------
notify pgrst, 'reload schema';
