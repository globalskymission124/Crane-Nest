-- =========================================================
-- 1予約に複数ゲスト（代表者＋同行者）を紐付けるための中間テーブル
--
-- これまで transfer_requests は guest_id（単一FK）で1名しか結び付かず、
-- 2人以上で宿泊する場合に2人目以降のパスポート写真・情報を保存できなかった。
--
-- guests テーブルは従来どおり passport_number でユニークな顧客マスターとして
-- 再利用し、この中間テーブルで「1予約 ↔ 複数ゲスト」の多対多を表現する。
-- 代表者（自動サインインに使う1人目）は is_primary = true で区別する。
--
-- transfer_requests.guest_id は後方互換のため残し、代表者を指す。
-- =========================================================

create table transfer_request_guests (
  id                   uuid primary key default gen_random_uuid(),
  transfer_request_id  uuid not null references transfer_requests (id) on delete cascade,
  guest_id             uuid not null references guests (id) on delete cascade,
  is_primary           boolean not null default false,
  created_at           timestamptz not null default now(),
  -- 同じ予約に同じゲストを重複登録しない
  unique (transfer_request_id, guest_id)
);

create index idx_trg_transfer on transfer_request_guests (transfer_request_id);
create index idx_trg_guest on transfer_request_guests (guest_id);

-- 1予約につき代表者は1人だけ（is_primary = true は予約ごとに一意）
create unique index idx_trg_one_primary
  on transfer_request_guests (transfer_request_id)
  where is_primary;

-- =========================================================
-- RLS: 既存の guests / transfer_requests と同じ暫定方針に合わせる。
--   - anon からの insert を許可（ゲストの新規予約フロー用）
--   - select は管理画面（anonキー）向けに全件許可（_TEMP）
--   ※ Auth 導入時に role ベースのポリシーへ差し替えること。
-- =========================================================
alter table transfer_request_guests enable row level security;

create policy "trg_insert_for_anyone"
  on transfer_request_guests for insert
  with check (true);

create policy "trg_select_for_anyone_TEMP"
  on transfer_request_guests for select
  using (true);

-- =========================================================
-- guests の upsert（onConflict: passport_number → DO UPDATE）を
-- anon キーでも確実に成立させるための update ポリシー。
--
-- リピーターや同一パスポートの再登録時に既存行を更新する必要があるが、
-- これまで guests には update ポリシーが無く、複数ゲストを毎回 upsert する
-- 本対応で更新が発生するケースが増えるため明示的に許可する（_TEMP）。
-- ※ Auth 導入時に role ベースのポリシーへ差し替えること。
-- =========================================================
create policy "guests_update_for_anyone_TEMP"
  on guests for update
  using (true)
  with check (true);
