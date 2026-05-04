-- Admin activity logs: track who did what (role/KYC changes).
-- Run this in your Supabase SQL editor.

create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  target_user_id uuid not null,
  action text not null,
  from_role public.app_role,
  to_role public.app_role,
  from_kyc_status text,
  to_kyc_status text,
  created_at timestamptz not null default now()
);

alter table public.admin_activity_logs enable row level security;

-- Only admins/super_admins boleh membaca log aktivitas.
-- Akses baca dilakukan via Next.js server (service role) atau langsung dari Supabase
-- oleh admin jika perlu. Buyer/seller tidak perlu melihat log ini sama sekali.
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_activity_logs'
      and policyname = 'Admins can read activity logs'
  ) then
    execute 'drop policy "Admins can read activity logs" on public.admin_activity_logs';
  end if;
end
$$;

create policy "Admins can read activity logs" on public.admin_activity_logs
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
  );
