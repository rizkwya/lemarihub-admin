-- Public product stats BATCH RPC (guest-safe) + realtime-friendly
-- Run in Supabase SQL Editor.
--
-- Goal:
-- - Fetch sold_count (orders COMPLETED) + avg_rating/review_count (reviews)
--   for MANY products in ONE call.
-- - Guest-safe: SECURITY DEFINER bypasses RLS and returns only aggregates.
--
-- Depends on:
-- - public.products(id, is_active)
-- - public.orders(product_id, status)
-- - public.reviews(product_id, rating)

begin;

create or replace function public.get_products_public_stats(p_product_ids uuid[])
returns table(
  product_id uuid,
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
    select id
    from public.products
    where id = any(p_product_ids)
      and is_active = true
  ),
  sold as (
    select o.product_id, count(*)::int as sold_count
    from public.orders o
    join p on p.id = o.product_id
    where o.status = 'COMPLETED'
    group by o.product_id
  ),
  rev as (
    select r.product_id,
      count(*)::int as review_count,
      avg(r.rating)::double precision as avg_rating
    from public.reviews r
    join p on p.id = r.product_id
    group by r.product_id
  )
  select
    p.id as product_id,
    coalesce(s.sold_count, 0) as sold_count,
    rv.avg_rating as avg_rating,
    coalesce(rv.review_count, 0) as review_count
  from p
  left join sold s on s.product_id = p.id
  left join rev rv on rv.product_id = p.id;
$$;

revoke all on function public.get_products_public_stats(uuid[]) from public;
grant execute on function public.get_products_public_stats(uuid[]) to anon;
grant execute on function public.get_products_public_stats(uuid[]) to authenticated;

commit;
