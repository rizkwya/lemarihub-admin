"use client";

import { AdminShell } from '../AdminShell';
import { AdminOrdersTableClient } from './AdminOrdersTableClient';
import { FileSpreadsheet } from 'lucide-react';

export default function AdminOrdersPage() {
  return (
    <AdminShell current="orders">
      {/* CARD OPERASIONAL UTAMA - DARK MODE */}
      <section className="bg-[#0f1938] rounded-2xl border border-slate-800/80 shadow-lg shadow-black/20 p-6">
        <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-800/60">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Validasi Transaksi Masuk</h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Menampilkan maksimal 200 data transaksi teranyar. Dashboard terintegrasi sistem Supabase Realtime secara otomatis.
            </p>
          </div>
        </div>

        {/* INJEKSI WORKSPACE TABEL */}
        <AdminOrdersTableClient initial={[]} />
      </section>
    </AdminShell>
  );
}