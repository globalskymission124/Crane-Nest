-- =========================================================
-- 物件追加フローの Airbnb 化に伴うカラム追加
--  ・room_type       : まるまる貸切 / 個室 / 相部屋
--  ・house rules     : ペット/喫煙/パーティー/子供 の可否、チェックイン/アウト時刻、静粛時間
--  ・highlights      : 物件のハイライト（タグ）
--  ・property_type   : 選択肢を Airbnb 相当に拡張（旅館・民宿・ロフト等）
-- 既存データは安全なデフォルトで埋まる（後方互換）。
-- =========================================================

-- ---- 1. 部屋タイプ（entire=まるまる貸切 / private=個室 / shared=相部屋）----
alter table stays_listings
  add column if not exists room_type text not null default 'entire'
    check (room_type in ('entire', 'private', 'shared'));

-- ---- 2. ハウスルール ----
alter table stays_listings add column if not exists allow_pets     boolean not null default false;
alter table stays_listings add column if not exists allow_smoking  boolean not null default false;
alter table stays_listings add column if not exists allow_events   boolean not null default false; -- パーティー・イベント
alter table stays_listings add column if not exists allow_children boolean not null default true;
alter table stays_listings add column if not exists check_in_time  text; -- 例: '15:00'
alter table stays_listings add column if not exists check_out_time text; -- 例: '10:00'
alter table stays_listings add column if not exists quiet_hours    text; -- 例: '22:00〜08:00'

-- ---- 3. ハイライト（タグ）----
--   例: {'peaceful','unique','family','stylish','central','spacious'}
alter table stays_listings
  add column if not exists highlights text[] not null default '{}';

-- ---- 4. 物件タイプの選択肢を拡張 ----
--   既存 CHECK 制約を貼り替える（制約名は 0018 で自動命名されるため名前指定で drop）。
do $$
declare
  con_name text;
begin
  select conname into con_name
    from pg_constraint
   where conrelid = 'stays_listings'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%property_type%';
  if con_name is not null then
    execute format('alter table stays_listings drop constraint %I', con_name);
  end if;
end $$;

alter table stays_listings
  add constraint stays_listings_property_type_check
  check (property_type in (
    'house', 'apartment', 'guesthouse', 'hotel', 'villa', 'cabin',
    'ryokan', 'minshuku', 'loft', 'condo', 'townhouse', 'bnb'
  ));
