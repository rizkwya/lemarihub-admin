import { Metadata } from "next";
import { AdminShell } from "../AdminShell";
import KycApprovalsClient from "./KycApprovalsClient";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "KYC Approvals | LemariHub Admin",
  description: "Halaman persetujuan verifikasi identitas akun toko penjual.",
};

export default function KycApprovalsPage() {
  return (
    <AdminShell current="kyc">
      {/* WRAPPER CARD UTAMA DASHBOARD */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        
        {/* PANEL DESKRIPSI LAYOUT */}
        <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Validasi Pengajuan KYC Seller</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Periksa kecocokan foto identitas KTP dan foto wajah pengguna sebelum memberikan status Hak Jual (*Verified Seller*).
            </p>
          </div>
        </div>

        {/* INJEKSI MAIN CLIENT WORKSPACE */}
        <KycApprovalsClient />
      </section>
    </AdminShell>
  );
}