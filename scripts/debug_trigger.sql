-- Mari kita ubah triggernya agar mencetak log lengkap.
-- Log ini akan muncul langsung di error message ketika kamu tekan "Konfirmasi diproses" di aplikasi.

create or replace function public.guard_order_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
begin
  -- 1. Ambil role user (akun yang kamu pakai login untuk nekan tombol tersebut)
  select role into v_role
  from public.users
  where id = auth.uid();

  -- 2. Sebelum melakukan validasi apa pun, TAMPILKAN INFO PENTING!
  raise exception 'Debug Info: Role = %, auth.uid() = %, OLD.status = %, NEW.status = %, payment_proof = %', 
    coalesce(v_role, 'NULL'), 
    coalesce(auth.uid()::text, 'NULL'), 
    OLD.status, 
    NEW.status, 
    coalesce(NEW.payment_proof_url, 'NULL');

  return NEW;
end;
$$;
