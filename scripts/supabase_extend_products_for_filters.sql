-- Extend public.products to support:
-- - multiple images (for a proper upload experience)
-- - filterable fields: city, category, size
--
-- This script is designed to be backwards-compatible with the existing app:
-- - existing columns like `image_url` remain and should still be populated (cover image).
--
-- Run in Supabase SQL Editor.

begin;

-- 1) Multiple images
-- Prefer jsonb (works well with PostgREST + Dart and can store ordered array of URLs).
-- Example value: ["https://.../1.jpg", "https://.../2.jpg"]
alter table public.products
  add column if not exists images jsonb;

-- Keep default NULL to remain backwards-compatible.
-- (App will still rely on `image_url` as cover image.)

-- 2) Filter fields
alter table public.products
  add column if not exists city text;

-- Some projects already have these; add if missing.
alter table public.products
  add column if not exists category text;

alter table public.products
  add column if not exists size text;

-- Optional: constrain empty strings to NULL (keeps filtering cleaner)
update public.products set city = null where city is not null and length(trim(city)) = 0;
update public.products set category = null where category is not null and length(trim(category)) = 0;
update public.products set size = null where size is not null and length(trim(size)) = 0;

-- Optional guardrails (won't block existing data):
-- - category/size/city max lengths to prevent junk data (keeps filtering sane)
-- NOTE: we use NOT VALID so existing rows aren't checked; you can VALIDATE later.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_city_len_chk'
  ) then
    alter table public.products
      add constraint products_city_len_chk
      check (city is null or length(city) <= 60) not valid;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_category_len_chk'
  ) then
    alter table public.products
      add constraint products_category_len_chk
      check (category is null or length(category) <= 40) not valid;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_size_len_chk'
  ) then
    alter table public.products
      add constraint products_size_len_chk
      check (size is null or length(size) <= 12) not valid;
  end if;
end
$$;

-- 3) Helpful indexes for future filtering
-- NOTE: create concurrently can't run inside a transaction; keep normal indexes for simplicity.
create index if not exists products_city_idx on public.products (city);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_size_idx on public.products (size);

-- If you plan to filter by seller frequently
create index if not exists products_seller_id_idx on public.products (seller_id);

commit;
