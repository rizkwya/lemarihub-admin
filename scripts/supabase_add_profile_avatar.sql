-- Add profile identity + avatar to public.users
-- Run in Supabase SQL Editor.
--
-- Creates:
-- - public.users.full_name (if not already present)
-- - public.users.avatar_url (public URL to image)
-- - RLS policies for user to update own profile fields (full_name, avatar_url)
--
-- Notes:
-- - Storage bucket creation + Storage RLS can be configured in Supabase Dashboard.
--   Suggested bucket: `avatars` (public) OR private bucket with signed URLs.

begin;

alter table public.users
  add column if not exists full_name text;

alter table public.users
  add column if not exists avatar_url text;

alter table public.users enable row level security;

-- Drop policies if re-running
drop policy if exists "users_update_profile_self" on public.users;
drop policy if exists "users_update_profile_admin" on public.users;

-- User can update their own profile row.
-- Keep it broad (entire row) for MVP; you can tighten to specific columns later.
create policy "users_update_profile_self"
  on public.users
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admin override
create policy "users_update_profile_admin"
  on public.users
  for update
  using (public.is_privileged_admin())
  with check (public.is_privileged_admin());

commit;
