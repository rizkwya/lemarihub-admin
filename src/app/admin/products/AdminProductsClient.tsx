"use client";

import { useState } from "react";

// Data dummy sesuai dengan apa yang pernah muncul di SS kamu
const dummyProducts = [
  {
    id: "1",
    name: "Baju",
    price: 120000,
    seller_name: "Toko A",
    is_active: true,
  },
  {
    id: "2",
    name: "Monitor bekas kantor",
    price: 249000,
    seller_name: "Toko B",
    is_active: true,
  },
];

export default function AdminProductsClient() {
  const [products] = useState(dummyProducts);

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
            <tr key={p.id} className="border-b border-gray-700 hover:bg-[#2d3748]">
              <td className="p-4">{p.name}</td>
              <td className="p-4">Rp {p.price.toLocaleString("id-ID")}</td>
              <td className="p-4">{p.seller_name}</td>
              <td className="p-4">{p.is_active ? "Aktif" : "Non-Aktif"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}