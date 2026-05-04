-- Create a dedicated shops table (public.shops) for seller storefront identity.
-- This avoids overloading public.users (which has had RLS recursion issues) and
-- makes it easier to extend shop data (avatar, description, etc.) going forward.
--
-- Run in Supabase SQL Editor.

begin;

-- 1) Table
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),

  -- Owner of the shop (one shop per seller by default)
  seller_id uuid not null unique references auth.users(id) on delete cascade,

  shop_name text not null,
  description text,
  avatar_url text,

  city text,
  province text,

  -- For future: verification / status
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep shop names unique (case-insensitive)
create unique index if not exists shops_shop_name_unique
  on public.shops (lower(shop_name));

create index if not exists shops_seller_id_idx on public.shops (seller_id);
create index if not exists shops_city_idx on public.shops (city);

-- 2) updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_shops_set_updated_at on public.shops;
create trigger trg_shops_set_updated_at
before update on public.shops
for each row execute function public.set_updated_at();

-- 3) RLS policies
alter table public.shops enable row level security;

-- Anyone can read shops (so product pages / guests can show shop info).
drop policy if exists shops_public_read on public.shops;
create policy shops_public_read
on public.shops
for select
using (true);

-- Seller can create their own shop row.
drop policy if exists shops_insert_own on public.shops;
create policy shops_insert_own
on public.shops
for insert
with check (seller_id = auth.uid());

-- Seller can update their own shop.
drop policy if exists shops_update_own on public.shops;
create policy shops_update_own
on public.shops
for update
using (seller_id = auth.uid())
with check (seller_id = auth.uid());

-- Seller can delete their own shop.
drop policy if exists shops_delete_own on public.shops;
create policy shops_delete_own
on public.shops
for delete
using (seller_id = auth.uid());

commit;
