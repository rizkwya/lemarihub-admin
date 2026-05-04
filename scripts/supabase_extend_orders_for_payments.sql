-- Extend existing public.orders with payment_id for LemariHub
--
-- Tujuan:
-- - Menghubungkan setiap order ke satu payment (sekali transfer ke rekber).
-- - Satu payment dapat memiliki beberapa orders (multi-toko checkout di masa depan).
--
-- Script ini hanya menambah kolom & index, tidak menghapus apa pun.

begin;

alter table public.orders
  add column if not exists payment_id uuid references public.payments(id);

create index if not exists idx_orders_payment_id
  on public.orders (payment_id);

commit;
