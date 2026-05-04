-- Add immutable-ish shop name to public.users
-- Run in Supabase SQL Editor.
-- Strategy:
-- - Add `shop_name` column to public.users
-- - Ensure uniqueness (case-insensitive)
-- - Lock changes by default (only allow initial set by the user themself)
-- - Admin can update later (manual process)

begin;

alter table public.users
  add column if not exists shop_name text;

-- optional: keep usernames shop-like and unique (case-insensitive)
create unique index if not exists users_shop_name_unique
  on public.users (lower(shop_name))
  where shop_name is not null and length(trim(shop_name)) > 0;

-- Helper: can the current user set shop_name for the first time?
create or replace function public.can_set_shop_name_first_time()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null
     and exists (select 1 from public.users u where u.id = auth.uid() and (u.shop_name is null or length(trim(u.shop_name)) = 0));
$$;

alter table public.users enable row level security;

-- Note:
-- You already have a SELECT policy (e.g. `users_select_self`) in your DB.
-- This script only adds UPDATE policies for `shop_name`.

-- Drop existing policy if re-running
-- (we only add policies relevant to shop_name update; keep your other policies as-is)
drop policy if exists "users_update_shop_name_first_time" on public.users;
drop policy if exists "users_update_shop_name_admin" on public.users;

-- Allow user to set shop_name only if it's currently null/empty (first time).
create policy "users_update_shop_name_first_time"
  on public.users
  for update
  using (id = auth.uid() and public.can_set_shop_name_first_time())
  with check (id = auth.uid());

-- Admin override: allow admin/super_admin to update any user's shop_name.
-- Uses `public.is_privileged_admin()` (security definer) so only role admin/super_admin can do this.
drop policy if exists "users_update_shop_name_admin" on public.users;
create policy "users_update_shop_name_admin"
  on public.users
  for update
  using (public.is_privileged_admin())
  with check (public.is_privileged_admin());

commit;
