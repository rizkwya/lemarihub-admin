-- Fix stack depth recursion by updating profile via SECURITY DEFINER RPC
-- Run in Supabase SQL Editor.
--
-- Why:
-- - If your current `public.users` RLS policies/triggers cause recursive checks,
--   a SECURITY DEFINER RPC can bypass row-policy recursion safely while still
--   enforcing that only the logged-in user (auth.uid) can update their own row.
--
-- Usage from client (Supabase Flutter):
--   await supabase.rpc('update_my_profile', params: {
--     'p_full_name': 'Your Name',
--     'p_avatar_url': 'https://...'
--   });

begin;

create or replace function public.update_my_profile(
  p_full_name text default null,
  p_avatar_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.users
  set
    full_name = coalesce(p_full_name, full_name),
    avatar_url = coalesce(p_avatar_url, avatar_url),
    updated_at = now()
  where id = v_uid;
end;
$$;

-- Let authenticated users call it
revoke all on function public.update_my_profile(text, text) from public;
grant execute on function public.update_my_profile(text, text) to authenticated;

commit;
