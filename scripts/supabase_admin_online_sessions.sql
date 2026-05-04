-- Admin online sessions: track last heartbeat from each admin.
-- Run this in your Supabase SQL editor.

create table if not exists public.admin_online_sessions (
  admin_user_id uuid primary key,
  last_seen_at timestamptz not null default now()
);

-- Optional index to query by recency if needed later.
create index if not exists admin_online_sessions_last_seen_at_idx
  on public.admin_online_sessions (last_seen_at desc);

-- RLS can stay simple; our Next.js server uses the service role for writes/reads.
alter table public.admin_online_sessions enable row level security;

-- Hanya admin/super_admin yang boleh membaca status online admin lain.
-- Buyer/seller tidak butuh informasi ini dan tidak boleh query langsung ke tabel ini.
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_online_sessions'
      and policyname = 'Authenticated can read admin_online_sessions'
  ) then
    execute 'drop policy "Authenticated can read admin_online_sessions" on public.admin_online_sessions';
  end if;
end
$$;

create policy "Admins can read admin_online_sessions" on public.admin_online_sessions
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
  );
