create or replace function public.guard_order_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
  v_has_used_cod boolean;
begin
  -- Ambil role user sekarang dari tabel users
  select role into v_role
  from public.users
  where id = auth.uid();

  -- Hanya admin/super_admin yang boleh mengubah status verifikasi pembayaran.
  if v_role not in ('admin', 'super_admin') then
    if NEW.payment_verified_at is distinct from OLD.payment_verified_at
       or NEW.payment_verified_by is distinct from OLD.payment_verified_by then
      raise exception 'Hanya admin yang boleh mengubah status verifikasi pembayaran.';
    end if;
  end if;

  -- Jika status tidak berubah, tidak usah dicek
  if NEW.status is not distinct from OLD.status then
    return NEW;
  end if;

  -- Buyer hanya boleh membatalkan pesanan sendiri
  if v_role = 'buyer' then
    -- Izinkan: PENDING/PROCESSING -> CANCELLED
    if OLD.status in ('PENDING', 'PROCESSING') and NEW.status = 'CANCELLED' then
      -- Kalau sudah ada COD yang diverifikasi (kode sudah dipakai), tidak boleh batal
      select exists (
        select 1
        from public.order_cod_verifications v
        where v.order_id = NEW.id
          and v.is_used = true
      )
      into v_has_used_cod;

      if coalesce(v_has_used_cod, false) then
        raise exception 'Transaksi tidak dapat dibatalkan karena COD sudah diverifikasi dengan kode yang valid';
      end if;

      return NEW;
    end if;

    raise exception 'Buyer tidak boleh mengubah status order (dari % ke %)', OLD.status, NEW.status;
  end if;

  -- Admin / super_admin bebas ubah status ke apa saja
  -- Syarat: Kalau mau COMPLETED, wajib ada bukti transfer
  if v_role in ('admin', 'super_admin') then
    if NEW.status = 'COMPLETED'
       and (NEW.payment_proof_url is null or trim(NEW.payment_proof_url) = '') then
      raise exception 'Belum ada bukti transfer dari buyer. Tidak bisa menandai order sebagai selesai. Status: %, URL: %', NEW.status, coalesce(NEW.payment_proof_url, 'null');
    end if;
    return NEW;
  end if;

  -- Seller boleh ubah PENDING -> PROCESSING
  if v_role = 'verified_seller' then
    -- Seller TIDAK boleh mengubah/mengganti bukti transfer. Hanya buyer yang boleh update kolom payment_proof_url.
    if NEW.payment_proof_url is distinct from OLD.payment_proof_url then
      raise exception 'Seller tidak boleh mengubah bukti transfer. Hanya buyer yang dapat mengunggah / mengganti bukti transfer.';
    end if;

    if OLD.status = 'PENDING' and NEW.status = 'PROCESSING' then
      -- Seller hanya boleh memproses order jika pembayaran sudah diverifikasi admin.
      if OLD.payment_verified_at is null then
        raise exception 'Pembayaran belum diverifikasi admin. Tidak bisa memproses order.';
      end if;
      return NEW;
    end if;

    -- Seller menyelesaikan: PROCESSING -> COMPLETED
    if OLD.status = 'PROCESSING' and NEW.status = 'COMPLETED' then
      -- Wajib sudah ada bukti transfer dari buyer di kolom payment_proof_url
      if NEW.payment_proof_url is null or trim(NEW.payment_proof_url) = '' then
        raise exception 'Belum ada bukti transfer dari buyer. Tidak bisa menyelesaikan order. Status: %, URL: %', NEW.status, coalesce(NEW.payment_proof_url, 'null');
      end if;

      -- Untuk keamanan COD, hanya izinkan kalau ada record verifikasi yang sudah digunakan
      select exists (
        select 1
        from public.order_cod_verifications v
        where v.order_id = NEW.id
          and v.is_used = true
      )
      into v_has_used_cod;

      if not coalesce(v_has_used_cod, false) then
        raise exception 'Seller: COD belum diverifikasi dengan kode yang valid. Tidak boleh menyelesaikan order.';
      end if;

      return NEW;
    end if;

    -- Bila seller mau membatalkan pesanan (contoh opsional)
    if OLD.status = 'PENDING' and NEW.status = 'CANCELLED' then
        return NEW;
    end if;

  end if;

  -- Selain aturan di atas, blok!
  raise exception 'Perubahan status tidak diizinkan untuk role %: dari % ke %', coalesce(v_role, 'unknown'), OLD.status, NEW.status;
end;
$$;

drop trigger if exists guard_order_status_trigger on public.orders;

create trigger guard_order_status_trigger
before update on public.orders
for each row
execute function public.guard_order_status();
