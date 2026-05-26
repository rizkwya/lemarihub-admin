"use client";

import { AdminShell } from '../AdminShell';
import { AdminManageAdminsClient } from './AdminManageAdminsClient';

export default function AdminAdminsPage() {
  return (
    <AdminShell current="admins">
      <section className="card">
        <div className="adminCardTitle" style={{ marginBottom: 4 }}>
          Kelola Admin
        </div>
        <div className="small" style={{ marginBottom: 12 }}>
          Hanya <b>super_admin</b> yang bisa mengelola daftar admin. Gunakan halaman ini untuk
          mengecek siapa saja yang punya akses admin dan menurunkan role jika sudah tidak
          dibutuhkan.
        </div>

        <AdminManageAdminsClient initial={[]} />
      </section>
    </AdminShell>
  );
}