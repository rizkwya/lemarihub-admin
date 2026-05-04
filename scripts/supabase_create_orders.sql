-- Orders schema for LemariHub (run in Supabase SQL Editor)
--
-- IMPORTANT:
-- This repo may already have `public.orders` with a different column set.
-- If you already have `public.orders`, DO NOT re-run a conflicting CREATE TABLE.
--
-- This script is kept intentionally minimal:
-- - Ensures `public.order_status` enum exists (used by other scripts like reviews)
-- - Leaves table creation to your existing schema/migrations
--
-- If you need to create orders table from scratch, create a separate script
-- aligned with your current DB design.

begin;

-- 1) Status enum (shared by other scripts, e.g. reviews)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'PENDING',
      'PROCESSING',
      'COMPLETED',
      'CANCELLED'
    );
  end if;
end $$;

-- If the enum already exists but uses older value(s), try to extend it safely.
-- (Adding enum values is safe and non-breaking; removing/renaming is not.)
do $$
begin
  if exists (select 1 from pg_type where typname = 'order_status') then
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'order_status' and e.enumlabel = 'PENDING'
    ) then
      alter type public.order_status add value 'PENDING';
    end if;

    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'order_status' and e.enumlabel = 'PROCESSING'
    ) then
      alter type public.order_status add value 'PROCESSING';
    end if;

    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'order_status' and e.enumlabel = 'COMPLETED'
    ) then
      alter type public.order_status add value 'COMPLETED';
    end if;

    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'order_status' and e.enumlabel = 'CANCELLED'
    ) then
      alter type public.order_status add value 'CANCELLED';
    end if;
  end if;
end $$;

-- 2) Table
-- NOTE: orders table creation + RLS policies are intentionally omitted here.
-- Your project already has `public.orders`.

commit;
