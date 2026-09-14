-- =========================================================
-- お気に入りの複数リスト化（Airbnbのウィッシュリスト）
--  ゲストが「京都旅行」「家族向け」などのリストを作り、保存した宿を振り分ける。
--  collection_id が null の保存は「未分類」扱い（既存データは全て未分類のまま）。
-- =========================================================
create table if not exists stays_wishlist_collections (
  id          uuid primary key default gen_random_uuid(),
  user_email  text not null,
  name        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_stays_wl_collections_user on stays_wishlist_collections (user_email);

alter table stays_wishlists
  add column if not exists collection_id uuid references stays_wishlist_collections (id) on delete set null;

-- RLS（既存の stays_wishlists と同じ匿名許可ポリシーに合わせる）
alter table stays_wishlist_collections enable row level security;
drop policy if exists stays_wishlist_collections_anon_all on stays_wishlist_collections;
create policy stays_wishlist_collections_anon_all on stays_wishlist_collections for all to anon using (true) with check (true);
