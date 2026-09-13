-- =========================================================
-- 物件の審査（モデレーション）ステータス
--  approved = 公開可（既定・既存物件は全てこれ）
--  pending  = 審査待ち（新規ホスト物件。承認まで検索結果に出さない）
--  rejected = 却下
-- 既定を approved にしているため既存データ・既存挙動は不変（後方互換）。
-- =========================================================
alter table stays_listings
  add column if not exists moderation_status text not null default 'approved'
    check (moderation_status in ('approved', 'pending', 'rejected'));

alter table stays_listings
  add column if not exists moderation_note text;

create index if not exists idx_stays_listings_moderation on stays_listings (moderation_status);
