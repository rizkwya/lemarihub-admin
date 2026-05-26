"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browserClient";

// Pastikan interface sesuai dengan struktur tabel di Supabase
type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  is_active: boolean;
  users: { full_name: string } | null;
};

export default function AdminProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const sb = supabaseBrowser();
      
      const { data, error } = await sb
        .from("products")
        .select(`
          id, 
          name, 
          price, 
          image_url, 
          is_active, 
          users(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching products:", error);
      } else {
        setProducts(data as Product[]);
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  if (loading) return <div>Memuat data...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Daftar Semua Produk</h1>
      <table className="w-full text-left text-white border-collapse">
        <thead className="border-b border-gray-700">
          <tr>
            <th className="p-4">Nama Produk</th>
            <th className="p-4">Harga</th>
            <th className="p-4">Penjual</th>
            <th className="p-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-gray-700">
              <td className="p-4">{p.name}</td>
              <td className="p-4">Rp {p.price.toLocaleString("id-ID")}</td>
              <td className="p-4">{p.users?.full_name || "Tanpa Nama"}</td>
              <td className="p-4">{p.is_active ? "Aktif" : "Non-Aktif"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}