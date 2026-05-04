-- Verify admin role for an email (run in Supabase SQL Editor)
-- Replace email if needed.

select u.id, u.email
from auth.users u
where u.email = 'gustijr05@gmail.com'
limit 1;

-- If your profile table is public.profiles, this will work:
-- select p.id, p.email, p.role, p.kyc_status
-- from public.profiles p
-- join auth.users u on u.id = p.id
-- where u.email = 'gustijr05@gmail.com';

-- If unsure which table is used, run:
-- admin-panel/scripts/supabase_find_profile_table.sql
