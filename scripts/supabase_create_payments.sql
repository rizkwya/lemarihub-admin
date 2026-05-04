-- Payments schema for LemariHub (run in Supabase SQL Editor)
--
-- Konsep:
-- - Satu payment mewakili satu kali transfer buyer ke rekening rekber.
-- - Satu payment bisa dikaitkan dengan satu atau beberapa orders (multi-toko checkout di masa depan).
-- - Tabel orders menyimpan foreign key payment_id.
--
-- Script ini aman dijalankan berulang (idempotent) dan tidak menghapus data.

begin;

-- 1) Tabel payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.users(id) on delete cascade,
  -- Total harga barang (belum termasuk biaya admin rekber)
  total_goods_amount integer not null check (total_goods_amount >= 0),
  -- Biaya admin rekber untuk sekali pembayaran ini
  admin_fee integer not null default 0 check (admin_fee >= 0),
  -- Total yang harus ditransfer buyer (barang + fee admin)
  total_amount integer not null check (total_amount >= 0),
  -- Optional: bukti transfer & verifikasi admin di level payment
  payment_proof_url text,
  status text not null default 'PENDING',
  payment_verified_at timestamptz,
  payment_verified_by uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_payments_buyer_created_at
  on public.payments (buyer_id, created_at desc);

-- Trigger sederhana untuk updated_at
create or replace function public.tg_payments_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists t_payments_updated_at on public.payments;
create trigger t_payments_updated_at
before update on public.payments
for each row
execute function public.tg_payments_set_updated_at();

-- 2) RLS: buyer hanya bisa melihat & mengubah payment miliknya sendiri.
alter table public.payments enable row level security;

-- SELECT own
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payments'
      AND policyname = 'payments_select_own'
  ) THEN
    EXECUTE 'drop policy "payments_select_own" on public.payments';
  END IF;
END $$;

create policy "payments_select_own"
  on public.payments
  for select
  to authenticated
  using (buyer_id = auth.uid());

-- INSERT own
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payments'
      AND policyname = 'payments_insert_own'
  ) THEN
    EXECUTE 'drop policy "payments_insert_own" on public.payments';
  END IF;
END $$;

create policy "payments_insert_own"
  on public.payments
  for insert
  to authenticated
  with check (buyer_id = auth.uid());

-- UPDATE own
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payments'
      AND policyname = 'payments_update_own'
  ) THEN
    EXECUTE 'drop policy "payments_update_own" on public.payments';
  END IF;
END $$;

create policy "payments_update_own"
  on public.payments
  for update
  to authenticated
  using (buyer_id = auth.uid())
  with check (buyer_id = auth.uid());

commit;
