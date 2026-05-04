-- Storage bucket + RLS policies for buyer payment proofs
--
-- Bucket: payment-proofs
-- Path convention used by app:
--   <uid>/orders/<order_id>/payment-proof-<timestamp>.<ext>
--
-- NOTE: This script creates a bucket and policies. Re-running is safe.

begin;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

-- Read: public
create policy "payment_proofs_public_read"
on storage.objects
for select
to public
using (bucket_id = 'payment-proofs');

-- Upload: authenticated users can upload only under their uid prefix
create policy "payment_proofs_user_upload_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Update own
create policy "payment_proofs_user_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete own
create policy "payment_proofs_user_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
