-- Multi-item COD checkout RPC for LemariHub (multi-toko ready)
--
-- Satu panggilan = satu payment (rekber) + banyak orders (bisa beda toko).
--
-- Param:
--   p_items: jsonb array, contoh:
--     [
--       {"product_id": "...uuid...", "quantity": 2},
--       {"product_id": "...uuid...", "quantity": 1}
--     ]
--   p_meetup_note: catatan opsional, akan di-copy ke semua orders.
--
-- Return:
--   uuid = payment_id yang dibuat.
--
-- Jalankan script ini di Supabase SQL Editor.

begin;

create or replace function public.create_cod_orders_multi(
  p_items jsonb,
  p_meetup_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_payment_id uuid;
  v_goods_total int := 0;
  v_app_fee int := 3000; -- sinkron dengan UI
  v_total_amount int;

  v_item jsonb;
  v_product_id uuid;
  v_qty int;
  v_price int;
  v_seller_id uuid;
  v_product_name text;
  v_is_active boolean;

  -- Array penampung item yang sudah diperkaya info seller & harga.
  v_items_expanded jsonb := '[]'::jsonb;
  v_elem jsonb;

  -- Per-seller aggregation
  v_order_id uuid;
  v_seller_goods_total int;
  v_seller_total_qty int;
  v_first_product_id uuid;
  v_first_product_price int;

  v_note text;

begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items_must_be_array';
  end if;

  v_note := case
    when p_meetup_note is null or btrim(p_meetup_note) = '' then null
    else btrim(p_meetup_note)
  end;

  -- 1) Validasi produk + bangun array item yang sudah diperkaya (seller_id, nama, harga)
  for v_item in
    select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    if v_product_id is null then
      raise exception 'product_id_required';
    end if;

    v_qty := coalesce((v_item ->> 'quantity')::int, 1);
    if v_qty <= 0 then
      v_qty := 1;
    end if;

    select id, seller_id, name, price::int, coalesce(is_active, true)
    into v_product_id, v_seller_id, v_product_name, v_price, v_is_active
    from public.products
    where id = v_product_id;

    if v_product_id is null then
      raise exception 'Produk tidak ditemukan';
    end if;

    if not v_is_active then
      raise exception 'Produk ini sudah tidak aktif';
    end if;

    if v_seller_id = v_uid then
      raise exception 'Kamu tidak bisa membeli produk milikmu sendiri';
    end if;

    v_goods_total := v_goods_total + (v_price * v_qty);

    v_items_expanded := v_items_expanded || jsonb_build_array(
      jsonb_build_object(
        'seller_id', v_seller_id,
        'product_id', v_product_id,
        'product_name', v_product_name,
        'product_price', v_price,
        'quantity', v_qty
      )
    );
  end loop;

  if v_goods_total <= 0 then
    raise exception 'Keranjang kosong atau total harga tidak valid';
  end if;

  v_total_amount := v_goods_total + v_app_fee;

  -- 2) Buat payment sekali saja untuk seluruh checkout.
  insert into public.payments (
    buyer_id,
    total_goods_amount,
    admin_fee,
    total_amount
  ) values (
    v_uid,
    v_goods_total,
    v_app_fee,
    v_total_amount
  ) returning id into v_payment_id;

  -- 3) Untuk setiap seller, buat SATU row di orders dan beberapa row di order_items.
  for v_seller_id in
    select distinct (e ->> 'seller_id')::uuid as seller_id
    from jsonb_array_elements(v_items_expanded) as e
  loop
    -- Hitung total per seller dan pilih satu produk representatif untuk kolom legacy di orders.
    select
      coalesce(sum((e ->> 'product_price')::int * (e ->> 'quantity')::int), 0) as goods_total,
      coalesce(sum((e ->> 'quantity')::int), 0) as total_qty,
      -- Gunakan min(text) lalu cast ke uuid untuk menghindari error "function min(uuid) does not exist" di beberapa versi Postgres.
      min((e ->> 'product_id')::text)::uuid as first_product_id,
      min((e ->> 'product_price')::int) as first_product_price
    into
      v_seller_goods_total,
      v_seller_total_qty,
      v_first_product_id,
      v_first_product_price
    from jsonb_array_elements(v_items_expanded) as e
    where (e ->> 'seller_id')::uuid = v_seller_id;

    if v_seller_goods_total is null or v_seller_goods_total <= 0 then
      continue;
    end if;

    -- Kolom product_price & quantity di orders sekarang kita isi dengan total per toko
    -- agar tetap kompatibel dengan UI lama yang membaca harga dari sana.
    insert into public.orders (
      payment_id,
      buyer_id,
      seller_id,
      product_id,
      product_price,
      quantity,
      meetup_note
    ) values (
      v_payment_id,
      v_uid,
      v_seller_id,
      v_first_product_id,
      v_seller_goods_total,
      v_seller_total_qty,
      v_note
    ) returning id into v_order_id;

    -- Insert line items untuk seller ini.
    for v_elem in
      select * from jsonb_array_elements(v_items_expanded) as e
      where (e ->> 'seller_id')::uuid = v_seller_id
    loop
      v_product_id := (v_elem ->> 'product_id')::uuid;
      v_product_name := (v_elem ->> 'product_name')::text;
      v_price := (v_elem ->> 'product_price')::int;
      v_qty := (v_elem ->> 'quantity')::int;

      insert into public.order_items (
        order_id,
        product_id,
        product_name,
        product_price,
        quantity
      ) values (
        v_order_id,
        v_product_id,
        v_product_name,
        v_price,
        v_qty
      );
    end loop;
  end loop;

  return v_payment_id;
end;
$$;

revoke all on function public.create_cod_orders_multi(jsonb, text) from public;
grant execute on function public.create_cod_orders_multi(jsonb, text) to authenticated;

commit;
