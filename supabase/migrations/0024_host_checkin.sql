-- =========================================================
-- オーナー別パスポート登録（チェックイン）ページ
--  各オーナーが自分専用の登録ページを作成・編集し、QRで配布。
--  登録されたゲスト情報はオーナーがCSVでダウンロード可能。
--  ※ 既存のCrane Nest送迎用パスポート登録（guestsテーブル）とは独立。
-- =========================================================

-- 1. チェックインページ（オーナーごとに作成・編集）
create table if not exists stays_checkin_pages (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid not null references stays_hosts (id) on delete cascade,
  slug            text not null,                 -- URL: /checkin/{slug}
  title           text not null default 'Guest Check-in',
  welcome_message text not null default '',
  logo_url        text,
  require_phone   boolean not null default true,
  require_photo   boolean not null default true,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists idx_stays_checkin_slug on stays_checkin_pages (slug);
create index if not exists idx_stays_checkin_host on stays_checkin_pages (host_id);
drop trigger if exists trg_stays_checkin_pages_updated_at on stays_checkin_pages;
create trigger trg_stays_checkin_pages_updated_at
  before update on stays_checkin_pages for each row execute function set_updated_at();

-- 2. 登録されたゲスト（パスポート情報）
create table if not exists stays_checkin_guests (
  id                 uuid primary key default gen_random_uuid(),
  page_id            uuid not null references stays_checkin_pages (id) on delete cascade,
  host_id            uuid not null references stays_hosts (id) on delete cascade,
  full_name          text not null,
  passport_number    text not null,
  nationality        text not null default '',
  phone              text,
  email              text,
  checkin_date       date,
  passport_image_url text,
  created_at         timestamptz not null default now()
);
create index if not exists idx_stays_checkin_guests_host
  on stays_checkin_guests (host_id, created_at desc);

-- RLS（デモ: anon全許可）
do $$
declare t text;
begin
  foreach t in array array['stays_checkin_pages','stays_checkin_guests'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_anon_all', t);
    execute format('create policy %I on %I for all to anon using (true) with check (true)', t || '_anon_all', t);
  end loop;
end $$;

-- 3. パスポート画像用ストレージ（オーナー用・公開バケット ※本番は非公開+署名URL推奨）
insert into storage.buckets (id, name, public)
values ('host-passports', 'host-passports', true)
on conflict (id) do nothing;

drop policy if exists "host_passports_select_TEMP" on storage.objects;
create policy "host_passports_select_TEMP"
  on storage.objects for select using (bucket_id = 'host-passports');
drop policy if exists "host_passports_insert_TEMP" on storage.objects;
create policy "host_passports_insert_TEMP"
  on storage.objects for insert with check (bucket_id = 'host-passports');
drop policy if exists "host_passports_delete_TEMP" on storage.objects;
create policy "host_passports_delete_TEMP"
  on storage.objects for delete using (bucket_id = 'host-passports');
