-- Promote a user to super_admin by email.
-- Run in Supabase SQL Editor.

-- 1) Find auth user id by email
with au as (
  select id
  from auth.users
  where email = 'gustijr05@gmail.com'
  limit 1
)
update public.users u
set role = 'super_admin'
from au
where u.id = au.id;

-- 2) Verify
select
  u.id,
  au.email,
  u.role
from public.users u
join auth.users au on au.id = u.id
where au.email = 'gustijr05@gmail.com';
