import { supabaseAdminServer } from "@/lib/supabase/adminServerClient"; 
import { AdminShell } from "@/app/admin/AdminShell";

export default async function AdminProductsPage() {
  const supabase = supabaseAdminServer();
  
  // 1. Ambil data dengan error handling yang jelas
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id, 
      name, 
      quantity, 
      price,
      users(full_name)
    `);

  // 2. Debugging: Jika ada error, kita akan tahu di log Vercel
  if (error) {
    console.error("DEBUG ERROR SUPABASE:", error);
  }

  // 3. Jika tidak ada error tapi data tetap kosong, tambahkan info ke user
  return (
    <AdminShell current="products">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Manajemen Produk</h1>
        
        <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-left text-white border-collapse">
            <thead className="bg-[#111827] border-b border-gray-700">
              <tr>
                <th className="p-4">Nama Produk</th>
                <th className="p-4">Penjual</th>
                <th className="p-4">Stok</th>
                <th className="p-4">Harga</th>
              </tr>
            </thead>
            <tbody>
              {/* Jika error, tampilkan pesan error. Jika sukses tapi kosong, tampilkan info. */}
              {error ? (
                <tr><td colSpan={4} className="p-8 text-center text-red-400">Terjadi kesalahan saat memuat data.</td></tr>
              ) : products && products.length > 0 ? (
                products.map((product: any) => (
                  <tr key={product.id} className="border-b border-gray-700 hover:bg-[#2d3748]">
                    <td className="p-4">{product.name}</td>
                    <td className="p-4">{product.users?.full_name || "Tanpa Nama"}</td>
                    <td className="p-4">{product.quantity ?? 0}</td>
                    <td className="p-4">Rp {product.price?.toLocaleString("id-ID")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    Tidak ada produk ditemukan di database.
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