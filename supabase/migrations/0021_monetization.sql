-- =========================================================
-- 収益化エンジン
--  プラットフォーム料率設定 / アドオン(アップセル) / 掲載ブースト
-- =========================================================

-- 1. プラットフォーム設定（1行のみ。管理者が料率を自由に変更）
create table if not exists stays_platform_settings (
  id                     integer primary key default 1 check (id = 1),
  guest_fee_pct          numeric(5,2) not null default 10,   -- ゲストサービス料(%)
  host_commission_pct    numeric(5,2) not null default 3,    -- オーナー成約手数料(%)
  featured_price_per_day integer not null default 500,       -- 掲載ブースト料金(円/日)
  enable_guest_fee       boolean not null default true,
  enable_host_commission boolean not null default true,
  enable_featured        boolean not null default true,
  enable_addons          boolean not null default true,
  updated_at             timestamptz not null default now()
);
insert into stays_platform_settings (id) values (1) on conflict (id) do nothing;

-- 2. アドオン（アップセル商品）
create table if not exists stays_addons (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid references stays_hosts (id) on delete cascade,   -- null = 全サイト共通
  listing_id  uuid references stays_listings (id) on delete cascade, -- null = 全物件
  name        text not null,
  description text not null default '',
  price       integer not null check (price >= 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 3. 既存テーブル拡張
alter table stays_listings add column if not exists featured_until date;  -- ブースト掲載期限
alter table stays_bookings add column if not exists guest_fee integer not null default 0;
alter table stays_bookings add column if not exists host_commission integer not null default 0;
alter table stays_bookings add column if not exists addons jsonb not null default '[]';

-- 4. サンプルアドオン
insert into stays_addons (id, host_id, listing_id, name, description, price) values
  ('44444444-4444-4444-4444-444444444401', null, null, '空港送迎', '関西国際空港⇔宿泊先の送迎（片道）', 3000),
  ('44444444-4444-4444-4444-444444444402', null, null, 'レイトチェックアウト', 'チェックアウトを14時まで延長', 2000),
  ('44444444-4444-4444-4444-444444444403', null, null, '朝食セット', '地元食材の和朝食（1名分×滞在日数）', 1500)
on conflict (id) do nothing;

-- RLS（デモ: anon全許可）
do $$
declare t text;
begin
  foreach t in array array['stays_platform_settings','stays_addons'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_anon_all', t);
    execute format('create policy %I on %I for all to anon using (true) with check (true)', t || '_anon_all', t);
  end loop;
end $$;
