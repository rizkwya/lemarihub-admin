-- Add payment verification fields to orders for admin approval flow.
-- Run this in Supabase SQL Editor.

begin;

alter table public.orders
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_verified_by uuid references public.users(id);

commit;
