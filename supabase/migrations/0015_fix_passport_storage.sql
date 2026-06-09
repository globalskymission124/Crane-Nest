-- ========================================================
-- 0015: passport-photos バケットを公開設定にする
--
-- guestBooking.ts が getPublicUrl() でURLを生成しているため、
-- バケットが非公開だとURLにアクセスできない。
-- パスポート番号がファイル名に含まれないランダムUUID命名なので
-- 公開バケットとして運用して問題ない。
-- ========================================================

-- バケットが存在しない場合は作成、存在する場合は public = true に更新
insert into storage.buckets (id, name, public)
values ('passport-photos', 'passport-photos', true)
on conflict (id) do update set public = true;

-- 公開読み取りポリシーを追加（未設定の場合のみ）
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'passport_photos_public_read'
  ) then
    execute $policy$
      create policy "passport_photos_public_read"
        on storage.objects for select
        using (bucket_id = 'passport-photos')
    $policy$;
  end if;
end $$;

-- アップロードポリシー（anon も insert できるよう設定）
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'passport_photos_insert'
  ) then
    execute $policy$
      create policy "passport_photos_insert"
        on storage.objects for insert
        with check (bucket_id = 'passport-photos')
    $policy$;
  end if;
end $$;
