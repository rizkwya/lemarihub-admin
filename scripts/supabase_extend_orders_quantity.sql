-- Extend public.orders with quantity column for multi-item checkouts
-- Jalankan di Supabase SQL Editor.

begin;

alter table public.orders
  add column if not exists quantity int;

-- Pastikan nilai lama tidak null (default 1 untuk order lama).
update public.orders
set quantity = 1
where quantity is null;

alter table public.orders
  alter column quantity set not null;

commit;
