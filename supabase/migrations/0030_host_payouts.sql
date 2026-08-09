-- =========================================================
-- ホストの受取（payout）
--  - stays_hosts に受取口座情報を保持（ホスト本人が入力）
--  - stays_payouts に振込記録を保持（管理者が作成、ホストが履歴を閲覧）
-- =========================================================

-- 受取口座情報（ホストが自分で入力）
alter table stays_hosts add column if not exists payout_bank_name text;
alter table stays_hosts add column if not exists payout_account_name text;
alter table stays_hosts add column if not exists payout_account_info text;

-- 振込記録
create table if not exists stays_payouts (
  id           uuid primary key default gen_random_uuid(),
  host_id      uuid not null references stays_hosts (id) on delete cascade,
  amount       numeric not null default 0,
  status       text not null default 'pending' check (status in ('pending','paid')),
  period_start date,
  period_end   date,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_stays_payouts_host on stays_payouts (host_id);

drop trigger if exists trg_stays_payouts_updated_at on stays_payouts;
create trigger trg_stays_payouts_updated_at
  before update on stays_payouts for each row execute function set_updated_at();

-- RLS（他のstaysテーブルと同じくanonに全許可。アプリ側でロール制御）
alter table stays_payouts enable row level security;
drop policy if exists stays_payouts_anon_all on stays_payouts;
create policy stays_payouts_anon_all on stays_payouts for all to anon using (true) with check (true);
