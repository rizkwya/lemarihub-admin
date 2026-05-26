// src/app/admin/products/_components/DeleteButton.tsx
"use client";
import { supabaseBrowser } from "@/lib/supabase/browserClient"; 
import { useRouter } from "next/navigation";

export function DeleteButton({ productId }: { productId: string }) {
  const router = useRouter();
  const supabase = supabaseBrowser(); 

  const handleDelete = async () => {
    if (confirm("Yakin ingin menghapus produk ini?")) {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) {
        alert("Gagal menghapus produk: " + error.message);
      } else {
        router.refresh(); // Ini akan memicu server component untuk fetch ulang data
      }
    }
  };

  return (
    <button 
      onClick={handleDelete} 
      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors"
    >
      Hapus
    </button>
  );
}