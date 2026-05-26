// src/app/admin/products/page.tsx
import { supabaseAdminServer } from "@/lib/supabase/adminServerClient"; 
import { DeleteButton } from "@/app/admin/products/_components/DeleteButton";

type Product = {
  id: string;
  name: string;
  quantity: number;
  seller_name: string;
  price: number;
};

export default async function AdminProductsPage() {
  // Gunakan nama fungsi yang benar sesuai file lib
  const supabase = supabaseAdminServer();
  
  const { data: products } = await supabase
    .from("products")
    .select("id, name, quantity, seller_name, price");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Daftar Semua Produk</h1>
      <table className="w-full border-collapse">
        {/* ... sisa kode tabel sama ... */}
        <tbody>
          {products?.map((product: Product) => (
            <tr key={product.id} className="border-b">
              <td className="p-2">{product.name}</td>
              <td className="p-2">{product.seller_name}</td>
              <td className="p-2">{product.quantity}</td>
              <td className="p-2">
                <DeleteButton productId={product.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}