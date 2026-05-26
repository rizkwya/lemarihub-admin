import { supabaseAdminServer } from "@/lib/supabase/adminServerClient"; 
import { AdminShell } from "@/app/admin/AdminShell";

type Product = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  users?: { full_name: string } | null; 
};

export default async function AdminProductsPage() {
  const supabase = supabaseAdminServer();
  
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
                {/* Header Aksi dihapus atau dikosongkan */}
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
                    {/* Tombol Hapus dihapus dari sini */}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
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