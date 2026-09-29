-- =========================================================
-- パスポート登録の住所と、りんくうタウン利用目的を保存する
--
-- 住所:
--   パスポート登録時に代表者/同行者ごとに入力された住所を guests に保持する。
--
-- りんくうタウン利用目的:
--   りんくうタウン駅を行き先にした場合、南海線に乗るのか、空港へ向かうのかを
--   transfer_requests に保存する。空港へ向かう場合は既存 terminal 列を併用する。
-- =========================================================

alter table guests
  add column if not exists address text;

comment on column guests.address is
  'パスポート登録時に入力された住所。';

alter table transfer_requests
  add column if not exists rinku_route_intent text;

comment on column transfer_requests.rinku_route_intent is
  'りんくうタウン駅選択時の目的（''nankai'' | ''airport''）。それ以外の目的地では NULL。';
