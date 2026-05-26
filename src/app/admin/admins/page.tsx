import { Metadata } from "next";
import { AdminShell } from '../AdminShell';
import { AdminManageAdminsClient } from './AdminManageAdminsClient';
import { Users } from 'lucide-react';

export const metadata: Metadata = {
  title: "Kelola Akses Admin | LemariHub Admin",
  description: "Pengaturan manajemen otorisasi tingkat tinggi untuk staf operasional.",
};

export default function AdminAdminsPage() {
  return (
    <AdminShell current="admins">
      {/* CARD CONTAINER UTAMA */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        
        {/* PANEL DESKRIPSI LAYOUT */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Staf Manajemen Administrator</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Hak kontrol khusus tingkat <b>super_admin</b> untuk melakukan audit dan menurunkan tingkat kredensial akun staf.
              </p>
            </div>
          </div>
        </div>

        {/* INJEKSI INTERACTIVE WORKSPACE CLIENT */}
        <AdminManageAdminsClient initial={[]} />
      </section>
    </AdminShell>
  );
}