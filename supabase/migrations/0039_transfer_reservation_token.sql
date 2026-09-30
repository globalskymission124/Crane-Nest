-- =========================================================
-- 送迎予約に「予約の合言葉」列を追加する
--
-- お部屋・送迎のシステム（Crane-Interigent-Switch）の予約つき QR（?r=<合言葉>）から
-- 開いたときに、その合言葉を送迎予約と一緒に保存する。
-- あちらのシステムはこの合言葉で「どの宿泊予約の送迎・パスポートか」を確実に見分ける。
-- 今までどおりの QR から登録したものは NULL（お部屋とチェックアウト日で紐づける）。
-- 何回実行しても大丈夫。
-- =========================================================

alter table transfer_requests
  add column if not exists reservation_token text;

create index if not exists idx_transfer_requests_reservation_token
  on transfer_requests (reservation_token);

comment on column transfer_requests.reservation_token is
  '予約つき QR の合言葉（Crane-Interigent-Switch の reservations.guest_token）。今までどおりの QR からの登録では NULL。';

notify pgrst, 'reload schema';
