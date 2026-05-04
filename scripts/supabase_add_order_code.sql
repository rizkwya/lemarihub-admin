-- Add human-friendly, searchable order_code to existing public.orders
-- Run this once in Supabase SQL editor.

begin;

-- 1) Sequence for generating monotonic order numbers (safe to re-run)
create sequence if not exists public.order_code_seq;

-- 2) Column on existing orders table
alter table public.orders
  add column if not exists order_code text;

-- 3) Helper: convert sequence number to short base36 string (0-9A-Z)
create or replace function public.to_base36(v bigint)
returns text
language plpgsql
as $$
declare
  chars text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  result text := '';
  n bigint := v;
  digit int;
begin
  if n <= 0 then
    return '0';
  end if;

  while n > 0 loop
    digit := (n % 36)::int;
    result := substr(chars, digit + 1, 1) || result;
    n := n / 36;
  end loop;

  return result;
end;
$$;

-- 4) Generator function: e.g. LH-1AB3F9 (pendek, kelihatan random)
create or replace function public.generate_order_code()
returns text
language plpgsql
as $$
declare
  v_seq bigint;
  v_raw text;
begin
  v_seq := nextval('public.order_code_seq');
  v_raw := public.to_base36(v_seq);
  -- Pastikan panjang minimal 6 karakter supaya konsisten di UI.
  return 'LH-' || lpad(v_raw, 6, '0');
end;
$$;

-- 5) Backfill any existing rows tanpa order_code
update public.orders
set order_code = public.generate_order_code()
where order_code is null;

-- 6) BEFORE INSERT trigger untuk auto-fill order_code ketika null
create or replace function public.set_order_code()
returns trigger
language plpgsql
as $$
begin
  if new.order_code is null or btrim(new.order_code) = '' then
    new.order_code := public.generate_order_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_set_order_code on public.orders;
create trigger trg_orders_set_order_code
before insert on public.orders
for each row
execute function public.set_order_code();

-- 7) Unique index untuk pencarian cepat berdasarkan order_code
create unique index if not exists orders_order_code_key on public.orders(order_code);

commit;
