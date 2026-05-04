-- Create `products` storage bucket and safe policies.
-- Goal:
-- - Anyone can read product images (so feeds & guests work).
-- - Only authenticated sellers can upload.
-- - Only the owner can update/delete (owner = folder prefix userId/...).
--
-- IMPORTANT:
-- - This assumes you upload images to paths like: <userId>/<timestamp>.jpg
--   (which matches ProductFormPage implementation).
--
-- Run in Supabase SQL Editor.

begin;

-- 1) Bucket
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

-- 2) Policies on storage.objects
-- Public read
drop policy if exists "products_public_read" on storage.objects;
create policy "products_public_read"
on storage.objects
for select
using (bucket_id = 'products');

-- Authenticated upload (create)
-- Enforce owner by requiring first folder = auth.uid()
drop policy if exists "products_owner_insert" on storage.objects;
create policy "products_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'products'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Owner update
drop policy if exists "products_owner_update" on storage.objects;
create policy "products_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'products'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'products'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Owner delete
drop policy if exists "products_owner_delete" on storage.objects;
create policy "products_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'products'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
