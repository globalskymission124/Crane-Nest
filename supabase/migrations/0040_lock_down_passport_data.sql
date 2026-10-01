-- =========================================================
-- 0040: パスポート情報・パスワードを anon キーから読めないようにする
--
-- これまで guests / stays_users / stays_checkin_guests などに
-- 「誰でも読める・書ける」ポリシー（_TEMP / _anon_all）が付いていた。
-- anon キーはブラウザに配られる公開の鍵なので、
-- サイトを開いた人なら誰でも全ゲストの旅券番号・写真・パスワードハッシュを取得できた。
--
-- このマイグレーション以降:
--   - 下の表は anon / authenticated から一切アクセスできない（RLS 有効・ポリシーなし）
--   - アプリは API ルートでログインを確認し、service_role キーで読み書きする
--   - パスポート写真のバケットは非公開。ブラウザは「アップロードだけ」できる。
--     表示は API が発行する期限つきリンク（署名URL）で行う。
--
-- ★ 実行の順番: 先に新しいアプリをデプロイし、環境変数
--    SUPABASE_SERVICE_ROLE_KEY / STAYS_SESSION_SECRET を設定してから実行すること。
--    （古いアプリのまま実行すると、予約・管理画面が動かなくなる）
-- =========================================================

-- ---------- 1. 個人情報テーブル: 既存ポリシーをすべて外す ----------
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'guests',
    'transfer_requests',
    'transfer_request_guests',
    'stays_users',
    'stays_checkin_guests'
  ] loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    for p in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

-- 念のため anon / authenticated からの直接権限も外す（service_role は RLS を無視して使える）
revoke all on table public.guests from anon, authenticated;
revoke all on table public.transfer_requests from anon, authenticated;
revoke all on table public.transfer_request_guests from anon, authenticated;
revoke all on table public.stays_users from anon, authenticated;
revoke all on table public.stays_checkin_guests from anon, authenticated;

-- ---------- 2. パスポート写真バケットを非公開に ----------
update storage.buckets set public = false where id in ('passport-photos', 'host-passports');

-- 2つのバケットに関するポリシーを、アップロード (INSERT) 以外すべて外す
-- （ダッシュボードで手動作成したポリシーも名前に関係なく対象）
do $$
declare p record;
begin
  for p in
    select policyname, cmd, coalesce(qual, '') || ' ' || coalesce(with_check, '') as expr
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    if (p.expr like '%passport-photos%' or p.expr like '%host-passports%') then
      execute format('drop policy if exists %I on storage.objects', p.policyname);
    end if;
  end loop;
end $$;

-- アップロードだけ許可（上書き・一覧・削除・読み取りは不可）
create policy "passport_photos_upload_only"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'passport-photos');

create policy "host_passports_upload_only"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'host-passports');

-- ---------- 3. 確認用（実行後にこのクエリで 0 行なら OK） ----------
-- select tablename, policyname from pg_policies
--  where schemaname = 'public'
--    and tablename in ('guests','transfer_requests','transfer_request_guests','stays_users','stays_checkin_guests');
-- select id, public from storage.buckets where id in ('passport-photos','host-passports');  -- public = false
