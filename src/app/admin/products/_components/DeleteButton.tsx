// src/app/admin/products/_components/DeleteButton.tsx
"use client";
// Pastikan kamu cek nama fungsi di browserClient.ts, 
// biasanya namanya mungkin 'supabaseBrowser' atau serupa.
// Sesuaikan import di bawah ini dengan nama yang ada di file tersebut:
import { supabaseBrowser } from "@/lib/supabase/browserClient"; 
import { useRouter } from "next/navigation";

export function DeleteButton({ productId }: { productId: string }) {
  const router = useRouter();
  const supabase = supabaseBrowser(); // Sesuaikan nama fungsi

  const handleDelete = async () => {
    if (confirm("Yakin ingin menghapus produk ini?")) {
      await supabase.from("products").delete().eq("id", productId);
      router.refresh(); 
    }
  };

  return (
    <button onClick={handleDelete} className="bg-red-500 text-white px-3 py-1 rounded">
      Hapus
    </button>
  );
}