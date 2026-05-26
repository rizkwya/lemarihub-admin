'use client';

import { AdminShell } from '../AdminShell';
import { AdminOrdersTableClient } from './AdminOrdersTableClient';

export default function AdminOrdersPage() {
  return (
    <AdminShell current="orders">
      {/* Container Header untuk Deskripsi */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>

        </p>
      </div>

      <section className="card">
        <div className="adminCardTitle" style={{ marginBottom: 4 }}>
          Orders
        </div>
        <div className="small" style={{ marginBottom: 16, color: '#64748b' }}>
          List terbaru (maksimal 200). Data akan terupdate otomatis jika ada pesanan baru.
        </div>

        {/* Pastikan AdminOrdersTableClient memiliki fungsi useEffect 
           untuk fetch data saat pertama kali muncul.
        */}
        <AdminOrdersTableClient initial={[]} />
      </section>
    </AdminShell>
  );
}