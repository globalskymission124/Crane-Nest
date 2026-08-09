-- =========================================================
-- 体験（Experiences）
--  - stays_experiences: ホストが提供するアクティビティ
--  - stays_experience_bookings: 体験の予約リクエスト
-- =========================================================

create table if not exists stays_experiences (
  id                uuid primary key default gen_random_uuid(),
  host_id           uuid not null references stays_hosts (id) on delete cascade,
  title             text not null,
  description       text not null default '',
  category          text not null default 'other',
  city              text not null default '',
  meeting_point     text not null default '',
  lat               double precision,
  lng               double precision,
  price_per_person  numeric not null default 0,
  currency          text not null default 'JPY',
  duration_minutes  integer not null default 120,
  max_guests        integer not null default 8,
  photos            text[] not null default '{}',
  is_published      boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_stays_experiences_host on stays_experiences (host_id);
drop trigger if exists trg_stays_experiences_updated_at on stays_experiences;
create trigger trg_stays_experiences_updated_at
  before update on stays_experiences for each row execute function set_updated_at();

create table if not exists stays_experience_bookings (
  id             uuid primary key default gen_random_uuid(),
  experience_id  uuid not null references stays_experiences (id) on delete cascade,
  guest_name     text not null,
  guest_email    text not null,
  date           date not null,
  time           text,
  guests_count   integer not null default 1,
  total_price    numeric not null default 0,
  status         text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  note           text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_stays_exp_bookings_exp on stays_experience_bookings (experience_id);
create index if not exists idx_stays_exp_bookings_email on stays_experience_bookings (guest_email);

-- RLS（他のstaysテーブルと同様にanon全許可。アプリ側でロール制御）
alter table stays_experiences enable row level security;
drop policy if exists stays_experiences_anon_all on stays_experiences;
create policy stays_experiences_anon_all on stays_experiences for all to anon using (true) with check (true);

alter table stays_experience_bookings enable row level security;
drop policy if exists stays_experience_bookings_anon_all on stays_experience_bookings;
create policy stays_experience_bookings_anon_all on stays_experience_bookings for all to anon using (true) with check (true);
