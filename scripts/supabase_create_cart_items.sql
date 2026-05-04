-- Cart items (per user)
-- Add this to Supabase SQL editor and run once.

create table if not exists public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,

  quantity int not null default 1 check (quantity >= 1 and quantity <= 99),

  -- Optional snapshot fields for nicer UI (avoids extra joins)
  price int,
  name text,
  image_url text,
  seller_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, product_id)
);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists t_cart_items_updated_at on public.cart_items;
create trigger t_cart_items_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

alter table public.cart_items enable row level security;

-- Policies: each user can read/write only their own cart.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cart_items'
      and policyname = 'cart_items_select_own'
  ) then
    create policy cart_items_select_own
      on public.cart_items
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cart_items'
      and policyname = 'cart_items_insert_own'
  ) then
    create policy cart_items_insert_own
      on public.cart_items
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cart_items'
      and policyname = 'cart_items_update_own'
  ) then
    create policy cart_items_update_own
      on public.cart_items
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cart_items'
      and policyname = 'cart_items_delete_own'
  ) then
    create policy cart_items_delete_own
      on public.cart_items
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;
