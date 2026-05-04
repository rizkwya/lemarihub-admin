-- Public product stats RPC (guest-safe) + realtime-friendly
-- Run in Supabase SQL Editor.
--
-- Goal:
-- - Allow ANY client (including anon/guest) to fetch:
--   - sold_count (orders COMPLETED)
--   - avg_rating + review_count (reviews)
--   - shop_name / full_name for seller
-- - Without direct selects from tables that may be blocked/recursive under RLS
--
-- Security:
-- - SECURITY DEFINER bypasses RLS.
-- - This function returns ONLY aggregated/public fields.
-- - It does NOT leak buyer identities or order details.

begin;

create or replace function public.get_product_public_stats(p_product_id uuid)
returns table(
  product_id uuid,
  seller_id uuid,
  shop_name text,
  sold_count integer,
  avg_rating double precision,
  review_count integer
)
language sql
security definer
set search_path = public
set row_security = off
as $$
  with p as (
    select id, seller_id
    from public.products
    where id = p_product_id
      and is_active = true
  ),
  sold as (
    select count(*)::int as sold_count
    from public.orders o
    join p on p.id = o.product_id
    where o.status = 'COMPLETED'
  ),
  rev as (
    select
      count(*)::int as review_count,
      avg(r.rating)::double precision as avg_rating
    from public.reviews r
    join p on p.id = r.product_id
  )
  select
    p_product_id as product_id,
    (select seller_id from p) as seller_id,
    null::text as shop_name,
    coalesce((select sold_count from sold), 0) as sold_count,
    (select avg_rating from rev) as avg_rating,
    coalesce((select review_count from rev), 0) as review_count
  where exists (select 1 from p);
$$;

-- Allow anyone (anon + authenticated) to call
revoke all on function public.get_product_public_stats(uuid) from public;
grant execute on function public.get_product_public_stats(uuid) to anon;
grant execute on function public.get_product_public_stats(uuid) to authenticated;

commit;
