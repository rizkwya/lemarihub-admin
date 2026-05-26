import { supabaseAdminServer } from "@/lib/supabase/adminServerClient"; 
import { DeleteButton } from "@/app/admin/products/_components/DeleteButton";
import { AdminShell } from "@/app/admin/AdminShell"; // <--- IMPORT INI

type Product = {
  id: string;
  name: string;
  quantity: number;
  seller_name: string;
  price: number;
};

export default async function AdminProductsPage() {
  const supabase = supabaseAdminServer();
  
  const { data: products } = await supabase
    .from("products")
    .select("id, name, quantity, seller_name, price");

  // Bungkus isi konten dengan AdminShell
  return (
    <AdminShell current="products">
      <div className="p-6">
        {/* Konten tabel kamu di sini */}
        <table className="w-full border-collapse">
          {/* ... isi tabel yang tadi ... */}
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
    </AdminShell>
  );
}