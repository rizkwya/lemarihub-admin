-- Find your profile table + columns (run in Supabase SQL Editor)
-- This helps because your project currently errors: relation "public.profiles" does not exist.

-- 1) List candidate tables that look like profile/user tables
select n.nspname as schema,
       c.relname as table,
       c.relkind as kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r','p')
  and n.nspname not in ('pg_catalog','information_schema','auth','storage','extensions')
  and (
    c.relname ilike '%profile%'
    or c.relname ilike '%user%'
    or c.relname ilike '%account%'
  )
order by 1,2;

-- 2) List columns for the most common candidates (edit table name if needed)
-- Try each table you suspect by replacing table_name below.
-- Example:
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema='public' and table_name='profiles'
-- order by ordinal_position;
