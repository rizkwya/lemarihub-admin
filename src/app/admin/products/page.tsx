import { supabaseAdminServer } from "@/lib/supabase/adminServerClient"; 
import { AdminShell } from "@/app/admin/AdminShell";
import { DeleteButton } from "@/app/admin/products/_components/DeleteButton";

type Product = {
  id: string;
  name: string;
  quantity: number; // Pastikan kolom ini ada di tabel, jika tidak gunakan 'stock' atau sesuai nama kolommu
  price: number;
  // Karena seller_id adalah relasi ke tabel users, kita akan ambil namanya lewat relasi
  users?: { full_name: string } | null; 
};

export default async function AdminProductsPage() {
  const supabase = supabaseAdminServer();
  
  // Perbaikan Query:
  // 1. Mengambil data dari 'products' dan join ke 'users' untuk mendapatkan nama penjual.
  // 2. Pastikan nama kolom 'quantity' sama dengan yang ada di DB (cek di screenshot, jika tidak ada ganti dengan kolom yang sesuai).
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id, 
      name, 
      quantity, 
      price,
      users(full_name)
    `);

  if (error) {
    console.error("Supabase Error:", error);
  }

  return (
    <AdminShell current="products">
      <div className="p-6">
        <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-left text-white border-collapse">
            <thead className="bg-[#111827] border-b border-gray-700">
              <tr>
                <th className="p-4">Nama Produk</th>
                <th className="p-4">Penjual</th>
                <th className="p-4">Stok</th>
                <th className="p-4">Harga</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products && products.length > 0 ? (
                products.map((product: any) => (
                  <tr key={product.id} className="border-b border-gray-700 hover:bg-[#2d3748]">
                    <td className="p-4">{product.name}</td>
                    <td className="p-4">{product.users?.full_name || "Tanpa Nama"}</td>
                    <td className="p-4">{product.quantity ?? 0}</td>
                    <td className="p-4">Rp {product.price?.toLocaleString("id-ID")}</td>
                    <td className="p-4 text-right">
                      <DeleteButton productId={product.id} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    Tidak ada produk ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}