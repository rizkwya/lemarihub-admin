-- Messages RLS policies for LemariHub chat
--
-- Tujuan:
-- - Buyer & seller bisa terus mengirim dan membaca chat untuk suatu order
--   (room) meskipun status order sudah COMPLETED.
-- - User lain di luar buyer/seller tidak bisa mengakses pesan itu.
--
-- Asumsi skema:
-- - public.messages punya kolom minimal: id, room_id, sender_id, message_type,
--   body, image_url, created_at (detail kolom lain tidak berpengaruh ke RLS).
-- - public.orders punya kolom: id, buyer_id, seller_id.
--   Kolom id pada orders = room_id di messages (1 room per order).
--
-- Jalankan script ini di Supabase SQL Editor.

begin;

alter table public.messages enable row level security;

-- Drop policy lama dengan nama yang sama kalau ada (aman untuk re-run).
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'messages_select_participants'
  ) then
    execute 'drop policy "messages_select_participants" on public.messages';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'messages_insert_participants'
  ) then
    execute 'drop policy "messages_insert_participants" on public.messages';
  end if;
end
$$;

-- 1) SELECT: hanya buyer/seller yang boleh baca pesan di room tsb.
create policy "messages_select_participants"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = messages.room_id
      and (
        o.buyer_id = auth.uid()
        or o.seller_id = auth.uid()
      )
  )
  or exists (
    select 1
    from public.chat_rooms cr
    where cr.id = messages.room_id
      and (
        cr.buyer_id = auth.uid()
        or cr.seller_id = auth.uid()
      )
  )
);

-- 2) INSERT: hanya buyer/seller yang boleh kirim pesan di room tsb, dan
--    sender_id harus sama dengan auth.uid().
create policy "messages_insert_participants"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and (
    exists (
      select 1
      from public.orders o
      where o.id = messages.room_id
        and (
          o.buyer_id = auth.uid()
          or o.seller_id = auth.uid()
        )
    )
    or exists (
      select 1
      from public.chat_rooms cr
      where cr.id = messages.room_id
        and (
          cr.buyer_id = auth.uid()
          or cr.seller_id = auth.uid()
        )
    )
  )
);

-- Catatan:
-- - Kita sengaja tidak membatasi berdasarkan status order. Selama user adalah
--   buyer/seller di orders, dia boleh terus chat (baik sebelum maupun
--   sesudah COMPLETED).
-- - Kalau sebelumnya ada policy lain yang terlalu ketat (misalnya hanya
--   mengizinkan status tertentu), policy baru ini akan menjadi tambahan
--   "OR" sehingga buyer/seller tetap lolos RLS.

commit;
