import { supabaseAdminServer } from "@/lib/supabase/adminServerClient"; 
import { AdminShell } from "@/app/admin/AdminShell";
import { DeleteButton } from "@/app/admin/products/_components/DeleteButton";

type Product = {
  id: string;
  name: string;
  quantity: number;
  seller_name: string;
  price: number;
};

export default async function AdminProductsPage() {
  const supabase = supabaseAdminServer();
  
  // Mengambil data dari tabel 'products'
  const { data: products } = await supabase
    .from("products")
    .select("id, name, quantity, seller_name, price");
  
    console.log("Data produk dari DB:", products);

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
                products.map((product: Product) => (
                  <tr key={product.id} className="border-b border-gray-700 hover:bg-[#2d3748]">
                    <td className="p-4">{product.name}</td>
                    <td className="p-4">{product.seller_name}</td>
                    <td className="p-4">{product.quantity}</td>
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