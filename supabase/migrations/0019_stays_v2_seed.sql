-- =========================================================
-- Stays v2 デモシード: デモユーザー3名 + サイト共通クーポン
-- 0018 の後に適用。何度流しても安全（固定UUIDで upsert）。
-- =========================================================

insert into stays_users (id, name, email, password, role, host_id) values
  ('22222222-2222-2222-2222-222222222201', 'デモゲスト', 'guest@demo.com', 'demo123', 'guest', null),
  ('22222222-2222-2222-2222-222222222202', '鶴の巣ホスト', 'host@demo.com',  'demo123', 'host',  '11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222203', '管理者',       'admin@demo.com', 'demo123', 'admin', null)
on conflict (id) do nothing;

-- サイト共通10%OFFクーポン（管理者発行、無期限）
insert into stays_coupons (id, code, host_id, listing_id, discount_type, value, is_active) values
  ('33333333-3333-3333-3333-333333333301', 'WELCOME10', null, null, 'percent', 10, true)
on conflict (id) do nothing;

-- デモ物件に即時予約・ポリシー・長期割引を設定
update stays_listings set
  instant_book = true,
  cancellation_policy = 'flexible',
  weekly_discount_pct = 10,
  monthly_discount_pct = 20
where id = 'aaaaaaa1-0000-0000-0000-000000000001';
