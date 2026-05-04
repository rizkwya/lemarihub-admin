-- SECURITY DEFINER helpers for shops.
-- Rationale: you previously hit stack depth recursion (54001) with public.users policies.
-- Shops should be simpler, but these RPCs give you a stable interface and let the app
-- avoid direct writes if you later tweak RLS.
--
-- Run in Supabase SQL Editor after creating public.shops.

begin;

-- Upsert my shop profile
create or replace function public.upsert_my_shop(
  p_shop_name text,
  p_description text default null,
  p_avatar_url text default null,
  p_city text default null,
  p_province text default null
)
returns public.shops
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_row public.shops;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.shops (seller_id, shop_name, description, avatar_url, city, province)
  values (v_uid, trim(p_shop_name), nullif(trim(p_description), ''), p_avatar_url, nullif(trim(p_city), ''), nullif(trim(p_province), ''))
  on conflict (seller_id)
  do update set
    shop_name   = excluded.shop_name,
    description = excluded.description,
    avatar_url  = excluded.avatar_url,
    city        = excluded.city,
    province    = excluded.province
  returning * into v_row;

  return v_row;
end;
$$;

-- Public, guest-safe shop profile lookup for product pages.
create or replace function public.get_shop_public_profile(p_seller_id uuid)
returns table(
  seller_id uuid,
  shop_name text,
  avatar_url text,
  city text,
  province text
)
language sql
security definer
set search_path = public
set row_security = off
as $$
  select s.seller_id, s.shop_name, s.avatar_url, s.city, s.province
  from public.shops s
  where s.seller_id = p_seller_id and s.is_active = true
  limit 1;
$$;

revoke all on function public.upsert_my_shop(text, text, text, text, text) from public;
revoke all on function public.get_shop_public_profile(uuid) from public;

grant execute on function public.upsert_my_shop(text, text, text, text, text) to authenticated;
grant execute on function public.get_shop_public_profile(uuid) to anon, authenticated;

commit;
