-- COD (meet-up) escrow verification for LemariHub
--
-- This script adds a small "Digital Handshake" layer on top of existing
-- `public.orders` so that:
--
-- - Buyer membayar ke Admin (upload bukti transfer)
-- - Admin/Seller memproses order (status: PROCESSING)
-- - Saat ketemuan, Seller memasukkan kode verifikasi dari Buyer
-- - Hanya order dengan kode valid yang boleh berubah ke COMPLETED
-- - Buyer masih bisa CANCEL sebelum kode digunakan
--
-- Jalankan script ini SEBELUM `supabase_order_status_trigger.sql`,
-- karena trigger status akan mengecek tabel `order_cod_verifications`.

begin;

-- 1) Tabel untuk menyimpan OTP / QR handshake COD
create table if not exists public.order_cod_verifications (
	order_id uuid primary key references public.orders(id) on delete cascade,
	buyer_id uuid not null references public.users(id),
	seller_id uuid not null references public.users(id),
	verification_code text not null,
	qr_payload text,
	is_used boolean not null default false,
	used_at timestamptz,
	expires_at timestamptz,
	created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_order_cod_verifications_code
	on public.order_cod_verifications (verification_code);

-- 2) RLS: buyer & seller bisa melihat record miliknya, tapi tidak bisa ubah langsung
alter table public.order_cod_verifications enable row level security;

do $$
begin
	if exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'order_cod_verifications'
			and policyname = 'order_cod_verifications_select'
	) then
		execute 'drop policy "order_cod_verifications_select" on public.order_cod_verifications';
	end if;
end $$;

create policy "order_cod_verifications_select"
on public.order_cod_verifications
for select
to authenticated
using (
	buyer_id = auth.uid()
	or seller_id = auth.uid()
);

-- Tidak ada kebijakan INSERT/UPDATE/DELETE agar tidak bisa diutak-atik
-- langsung dari client. Perubahan dilakukan via RPC security definer.

-- 3) RPC: Seller mengkonfirmasi COD dengan kode verifikasi
--    - Mengecek bahwa pemanggil adalah seller dari order tsb
--    - Mengecek status order & bukti transfer buyer sudah ada
--    - Mengecek kode valid dan belum pernah dipakai
--    - Menandai kode sebagai used dan mengubah status order ke COMPLETED

create or replace function public.confirm_cod_order(
	p_order_id uuid,
	p_code text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
	v_seller_id uuid;
	v_buyer_id uuid;
	v_status public.order_status;
	v_proof text;
	v_now timestamptz := timezone('utc', now());
	v_expires_at timestamptz;
	v_is_used boolean;
begin
	if auth.uid() is null then
		raise exception 'Harus login untuk konfirmasi COD';
	end if;

	-- Ambil order dan pastikan ini milik seller yang sedang login
	select buyer_id, seller_id, status, payment_proof_url
	into v_buyer_id, v_seller_id, v_status, v_proof
	from public.orders
	where id = p_order_id;

	if v_seller_id is null then
		raise exception 'Order tidak ditemukan';
	end if;

	if v_seller_id <> auth.uid() then
		raise exception 'Hanya seller pemilik order yang dapat konfirmasi COD';
	end if;

	-- Hanya boleh menyelesaikan dari status PROCESSING (dana sudah di Admin)
	if v_status is distinct from 'PROCESSING'::public.order_status then
		raise exception 'Order harus dalam status PROCESSING untuk konfirmasi COD. Status saat ini: %', v_status;
	end if;

	-- Wajib ada bukti transfer (buyer -> admin) sebelum bisa selesai
	if v_proof is null or trim(v_proof) = '' then
		raise exception 'Belum ada bukti transfer dari buyer. Tidak bisa menyelesaikan COD.';
	end if;

	-- Ambil record verifikasi
	select is_used, expires_at
	into v_is_used, v_expires_at
	from public.order_cod_verifications
	where order_id = p_order_id
		and buyer_id = v_buyer_id
		and seller_id = v_seller_id
		and verification_code = p_code;

	if not found then
		raise exception 'Kode verifikasi COD salah';
	end if;

	if v_is_used then
		raise exception 'Kode verifikasi COD sudah digunakan';
	end if;

	if v_expires_at is not null and v_now > v_expires_at then
		raise exception 'Kode verifikasi COD sudah kadaluarsa';
	end if;

	-- Tandai kode sudah dipakai
	update public.order_cod_verifications
	set is_used = true,
			used_at = v_now
	where order_id = p_order_id;

	-- Ubah status order menjadi COMPLETED.
	-- Trigger `guard_order_status` akan mengecek lagi aturan keamanan
	-- (role seller, bukti transfer, dll) sebelum menerima perubahan ini.
	update public.orders
	set status = 'COMPLETED'::public.order_status
	where id = p_order_id;
end;
$$;

-- 4) RPC: Buyer melihat / menghasilkan kode verifikasi COD
--    - Hanya buyer pemilik order
--    - Hanya untuk order yang sudah masuk tahap PROCESSING
--    - Jika sudah ada kode yang masih berlaku & belum dipakai, gunakan kembali
--    - Jika belum ada, buat kode baru dan simpan di order_cod_verifications

create or replace function public.generate_cod_verification(
	p_order_id uuid
)
returns table (
	verification_code text,
	expires_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
declare
	v_buyer_id uuid;
	v_seller_id uuid;
	v_status public.order_status;
	v_now timestamptz := timezone('utc', now());
	v_code text;
	v_expires_at timestamptz;
begin
	if auth.uid() is null then
		raise exception 'Harus login untuk melihat kode COD';
	end if;

	select buyer_id, seller_id, status
	into v_buyer_id, v_seller_id, v_status
	from public.orders
	where id = p_order_id;

	if v_buyer_id is null then
		raise exception 'Order tidak ditemukan';
	end if;

	if v_buyer_id <> auth.uid() then
		raise exception 'Hanya buyer pemilik order yang bisa melihat kode COD';
	end if;

	-- Hanya izinkan kode COD ketika order sudah dalam status PROCESSING
	if v_status is distinct from 'PROCESSING'::public.order_status then
		raise exception 'Kode COD hanya tersedia saat order sedang diproses.';
	end if;

	-- Coba pakai ulang kode yang sudah pernah dibuat untuk order ini,
	-- TANPA mengubahnya lagi. Satu order punya satu kode "utama" yang
	-- konsisten, bahkan kalau app dibuka-tutup berkali-kali. Keamanan
	-- tetap dijaga di fungsi confirm_cod_order (cek is_used & expires_at)
	-- sehingga kode yang sudah dipakai / kadaluarsa tidak bisa dipakai
	-- ulang untuk menyelesaikan order.
	select ocv.verification_code, ocv.expires_at
	into v_code, v_expires_at
	from public.order_cod_verifications as ocv
	where ocv.order_id = p_order_id;

	if found then
		return query select v_code, v_expires_at;
	end if;

	-- Belum ada kode sama sekali untuk order ini: generate kode baru
	-- 6 digit numerik, cukup untuk handshake offline.
	v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
	v_expires_at := v_now + interval '2 hours';

	insert into public.order_cod_verifications (
		order_id,
		buyer_id,
		seller_id,
		verification_code,
		expires_at,
		is_used,
		used_at
	) values (
		p_order_id,
		v_buyer_id,
		v_seller_id,
		v_code,
		v_expires_at,
		false,
		null
	)
	on conflict (order_id) do nothing;

	return query select v_code, v_expires_at;
end;
$$;

commit;
