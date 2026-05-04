-- Reviews schema for LemariHub (run in Supabase SQL Editor)
-- Goals:
-- - Buyer can leave ONE review per completed order
-- - Reviews include rating (1-5), comment, optional single image URL (MVP)
-- - Public can read reviews for active products
-- - Sellers can read reviews for their products

begin;

-- 1) Create table
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete cascade,

  rating int not null check (rating between 1 and 5),
  comment text,
  image_url text,

  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2) Enforce one-review-per-order
create unique index if not exists reviews_unique_order_id on public.reviews(order_id);

-- Helpful indexes
create index if not exists reviews_product_id_idx on public.reviews(product_id);
create index if not exists reviews_reviewer_id_idx on public.reviews(reviewer_id);

-- 3) updated_at trigger helper (simple, local)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_reviews_set_updated_at on public.reviews;
create trigger trg_reviews_set_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

-- 4) RLS
alter table public.reviews enable row level security;

-- Drop existing policies if re-running
drop policy if exists "reviews_read_public_active_products" on public.reviews;
drop policy if exists "reviews_read_seller_own_products" on public.reviews;
drop policy if exists "reviews_insert_buyer_completed_order" on public.reviews;
drop policy if exists "reviews_update_own" on public.reviews;
drop policy if exists "reviews_delete_own" on public.reviews;

-- Public read: only if product is active
create policy "reviews_read_public_active_products"
  on public.reviews
  for select
  using (
    exists (
      select 1 from public.products p
      where p.id = reviews.product_id
        and p.is_active = true
    )
  );

-- Seller read own product's reviews (when logged in)
create policy "reviews_read_seller_own_products"
  on public.reviews
  for select
  using (
    exists (
      select 1 from public.products p
      where p.id = reviews.product_id
        and p.seller_id = auth.uid()
    )
  );

-- Buyer insert review only for their own COMPLETED order and matching product.
-- Also ensures reviewer_id must equal auth.uid() and order belongs to buyer.
create policy "reviews_insert_buyer_completed_order"
  on public.reviews
  for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1
      from public.orders o
      where o.id = reviews.order_id
        and o.buyer_id = auth.uid()
        and o.product_id = reviews.product_id
        and o.status = 'COMPLETED'::order_status
    )
  );

-- Buyer can update/delete their own review
create policy "reviews_update_own"
  on public.reviews
  for update
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

create policy "reviews_delete_own"
  on public.reviews
  for delete
  using (reviewer_id = auth.uid());

commit;
