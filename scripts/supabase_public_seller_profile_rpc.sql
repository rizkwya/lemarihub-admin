-- Public seller profile RPC (guest-safe)
-- Run in Supabase SQL Editor.
--
-- Why: Some projects hit stack depth recursion (54001) when anon selects from public.users
-- due to recursive RLS policies. This RPC bypasses RLS safely via SECURITY DEFINER and
-- returns only limited public fields.

begin;

-- When changing the return type (adding avatar_url), Postgres requires the
-- old function to be dropped first. This is safe because we recreate it
-- immediately below with the same name and argument types.
drop function if exists public.get_seller_public_profile(uuid);

create or replace function public.get_seller_public_profile(p_seller_id uuid)
returns table(
  seller_id uuid,
  shop_name text,
  full_name text,
  phone text,
  avatar_url text
)
language sql
security definer
set search_path = public
set row_security = off
as $$
  select
    u.id as seller_id,
    nullif(trim(u.shop_name), '') as shop_name,
    nullif(trim(u.full_name), '') as full_name,
    nullif(trim(u.phone), '') as phone,
    nullif(trim(u.avatar_url), '') as avatar_url
  from public.users u
  where u.id = p_seller_id;
$$;

revoke all on function public.get_seller_public_profile(uuid) from public;
grant execute on function public.get_seller_public_profile(uuid) to anon;
grant execute on function public.get_seller_public_profile(uuid) to authenticated;

commit;
