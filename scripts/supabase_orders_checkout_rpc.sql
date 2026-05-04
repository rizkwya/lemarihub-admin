-- Secure COD checkout RPC for LemariHub
--
-- Tujuan:
-- - Buyer tidak bisa mengutak-atik harga, seller_id, atau buyer_id saat membuat order.
-- - Semua logika utama checkout (snapshot harga, validasi produk aktif) terjadi di DB.
-- - Tetap kompatibel dengan skema `public.orders` yang sudah ada (id & app_fee pakai default).
--
-- Jalankan script ini di Supabase SQL Editor.

begin;

create or replace function public.create_cod_order(
  p_product_id uuid,
  p_meetup_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_product_id uuid;
  v_seller_id uuid;
  v_price int;
  v_is_active boolean;
  -- Payment-level grouping (satu transfer rekber per checkout)
  v_payment_id uuid;
  v_goods_total int;
  v_app_fee int := 3000; -- sinkron dengan UI checkout
  v_total_amount int;
  v_order_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Ambil snapshot produk langsung dari DB.
  select id, seller_id, price::int, coalesce(is_active, true)
  into v_product_id, v_seller_id, v_price, v_is_active
  from public.products
  where id = p_product_id;

  if v_product_id is null then
    raise exception 'Produk tidak ditemukan';
  end if;

  if not v_is_active then
    raise exception 'Produk ini sudah tidak aktif';
  end if;

  -- Opsional: cegah beli produk sendiri.
  if v_seller_id = v_uid then
    raise exception 'Kamu tidak bisa membeli produk milikmu sendiri';
  end if;

  -- Buat payment record untuk sekali transfer ini.
  -- Saat ini satu payment = satu order, tapi desain ini siap untuk
  -- multi-order (multi-toko) di masa depan.
  v_goods_total := v_price;
  v_total_amount := v_goods_total + v_app_fee;

  insert into public.payments (
    buyer_id,
    total_goods_amount,
    admin_fee,
    total_amount
  )
  values (
    v_uid,
    v_goods_total,
    v_app_fee,
    v_total_amount
  )
  returning id into v_payment_id;

  -- Insert order dengan snapshot harga & seller dari server.
  -- Kolom lain seperti app_fee dan status memakai default tabel.
  insert into public.orders (
    payment_id,
    buyer_id,
    seller_id,
    product_id,
    product_price,
    quantity,
    meetup_note
  )
  values (
    v_payment_id,
    v_uid,
    v_seller_id,
    v_product_id,
    v_price,
    1,
    case
      when p_meetup_note is null or btrim(p_meetup_note) = '' then null
      else btrim(p_meetup_note)
    end
  )
  returning id into v_order_id;

  return v_order_id;
end;
$$;

-- Batasi eksekusi hanya untuk user authenticated (bukan publik anonim tanpa login).
revoke all on function public.create_cod_order(uuid, text) from public;
grant execute on function public.create_cod_order(uuid, text) to authenticated;

commit;
