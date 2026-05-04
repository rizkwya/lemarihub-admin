-- Order items (line items) schema for LemariHub (run in Supabase SQL Editor)
--
-- Konsep:
-- - Satu row di public.orders mewakili satu pesanan ke satu toko (seller).
-- - Detail produk-produk di dalam pesanan tersebut disimpan di public.order_items.
-- - Ini memungkinkan satu order berisi beberapa produk sekaligus dari toko yang sama.
--
-- Script ini aman dijalankan berulang (idempotent) dan tidak menghapus data.

begin;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  -- Snapshot nama & harga saat order dibuat (anti berubah kalau produk diupdate)
  product_name text not null,
  product_price integer not null check (product_price >= 0),
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_order_items_order_id
  on public.order_items (order_id);

create index if not exists idx_order_items_product_id
  on public.order_items (product_id);

-- RLS: buyer & seller boleh melihat item yang terkait orders miliknya.
alter table public.order_items enable row level security;

-- Drop existing SELECT policy jika ada (agar idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND policyname = 'order_items_select_linked_orders'
  ) THEN
    EXECUTE 'drop policy "order_items_select_linked_orders" on public.order_items';
  END IF;
END $$;

create policy "order_items_select_linked_orders"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

commit;
