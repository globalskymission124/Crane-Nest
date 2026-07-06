-- =========================================================
-- Stays デモ用シードデータ（関西エリアの物件を例に）
-- 何度流しても重複しないよう固定UUIDで upsert する。
-- =========================================================

insert into stays_hosts (id, name, email, phone) values
  ('11111111-1111-1111-1111-111111111111', '鶴の巣ホスト', 'host@crane-nest.example', '+81-90-0000-0000')
on conflict (id) do nothing;

insert into stays_listings
  (id, host_id, title, description, address, city, country, lat, lng,
   price_per_night, cleaning_fee, max_guests, bedrooms, beds, baths, amenities, photos, is_published)
values
  ('aaaaaaa1-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   '関空すぐ・鶴の巣ゲストハウス 一棟貸し',
   '関西国際空港から車で15分。最大6名まで泊まれる一棟貸しの町家です。キッチン・洗濯機完備、無料駐車場あり。',
   '大阪府泉佐野市りんくう往来北1', '泉佐野市', 'Japan', 34.4128, 135.2960,
   14000, 3000, 6, 3, 4, 1.5,
   array['wifi','kitchen','parking','washer','air_conditioning','tv'],
   array[
     'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200',
     'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200',
     'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200'
   ], true),
  ('aaaaaaa1-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   '難波徒歩5分 モダン和室アパートメント',
   '難波駅から徒歩5分の好立地。観光にもビジネスにも便利。2名向けのコンパクトなお部屋です。',
   '大阪府大阪市中央区難波3', '大阪市', 'Japan', 34.6659, 135.5010,
   9800, 2000, 2, 1, 1, 1.0,
   array['wifi','kitchen','air_conditioning','tv','elevator'],
   array[
     'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
     'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200'
   ], true),
  ('aaaaaaa1-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111111',
   '京都・鴨川そばの町家ステイ',
   '鴨川まで徒歩1分。祇園・清水寺へのアクセス良好。4名まで滞在可能な伝統的な町家。',
   '京都府京都市東山区', '京都市', 'Japan', 35.0036, 135.7710,
   18000, 4000, 4, 2, 3, 1.0,
   array['wifi','kitchen','washer','air_conditioning','bathtub'],
   array[
     'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200',
     'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200'
   ], true)
on conflict (id) do nothing;

insert into stays_reviews (id, listing_id, guest_name, rating, comment) values
  ('bbbbbbb1-0000-0000-0000-000000000001','aaaaaaa1-0000-0000-0000-000000000001','Emma',5,'空港から近くて最高でした。家も広くて清潔！'),
  ('bbbbbbb1-0000-0000-0000-000000000002','aaaaaaa1-0000-0000-0000-000000000001','大輔',4,'駐車場付きで助かりました。また利用します。'),
  ('bbbbbbb1-0000-0000-0000-000000000003','aaaaaaa1-0000-0000-0000-000000000002','Sophie',5,'難波から本当に近い。立地は完璧でした。')
on conflict (id) do nothing;
