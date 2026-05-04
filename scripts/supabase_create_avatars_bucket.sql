-- Create `avatars` Storage bucket + policies
-- Run in Supabase SQL Editor.
--
-- IMPORTANT:
-- - This script configures Supabase Storage (schema: storage).
-- - It must be run by a role that can insert into storage.buckets (typically service role / SQL editor).
--
-- Two modes:
-- A) Public READ avatars: easy for MVP (recommended for now)
--    - bucket is public
--    - anyone can read avatar images
--    - only authenticated user can upload/update/delete their own files
--
-- B) Private avatars (more secure):
--    - set bucket public=false
--    - in the app, fetch via signed URLs
--    - requires additional code changes (not included here)

begin;

-- 1) Create bucket if missing
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- 2) Policies on storage.objects
--    We store avatar at path: {userId}/avatar.ext
--    So we can enforce "folder = auth.uid()".

-- Drop if re-running
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_delete_own" ON storage.objects;

-- Public read (because bucket is public anyway, but policy keeps it explicit)
create policy "avatars_public_read"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Allow authenticated users to upload into their own folder
create policy "avatars_user_upload_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow user to update (replace/upsert) their own avatar objects
create policy "avatars_user_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow user to delete their own avatar objects
create policy "avatars_user_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
