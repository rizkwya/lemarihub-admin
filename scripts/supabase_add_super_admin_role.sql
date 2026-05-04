-- Add `super_admin` to the app role enum used by `public.users.role`.
--
-- Safe to run multiple times.
-- NOTE: Postgres enum values are hard to remove, so double-check spelling before running.

begin;

alter type public.app_role add value if not exists 'super_admin';

commit;

-- Optional: verify enum values
-- select enum_range(null::public.app_role) as app_role_values;
