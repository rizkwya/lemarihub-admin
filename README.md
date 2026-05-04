# LemariHub Admin Panel

Web admin panel untuk operasional LemariHub (approve KYC, kelola role/user, monitoring transaksi, dsb).

Target hosting: **Vercel**
Target domain: `admin.stackuniversal.web.id`

## Prasyarat
- Project Supabase sudah jadi
- Sudah ada minimal 1 user admin di DB (sementara: `gustijr05@gmail.com`)

## Environment Variables
Buat file `.env.local` di folder `admin-panel/`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional (kalau mau server-side admin action nanti):
- `SUPABASE_SERVICE_ROLE_KEY` *(jangan pernah expose ke client)*

## Develop

```bash
cd admin-panel
npm install
npm run dev
```

## Deploy ke Vercel (ringkas)
1. Import repo ini di Vercel
2. Set Root Directory: `admin-panel`
3. Set env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Tambah custom domain: `admin.stackuniversal.web.id`
   - Di Cloudflare, buat CNAME sesuai instruksi Vercel

## Catatan Security
Admin-only enforcement dilakukan dengan:
- Client guard: cek `profiles.role == 'admin'`
- Data layer tetap aman lewat RLS di Supabase (wajib)

> Panel ini sengaja dibuat minimal dulu. Nanti kita tambah halaman KYC approvals dan role management yang beneran melakukan update via Supabase (RPC / edge function / server route) sesuai RLS yang kamu sudah buat.
