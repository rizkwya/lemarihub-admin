'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminGet, adminPost } from '@/lib/admin/apiClient';
import { AdminShell } from '../AdminShell';
import { useAdminToast } from '../_components/AdminToastProvider';

type AppRole = 'buyer' | 'verified_seller' | 'admin' | 'super_admin';

type AdminUserListItem = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  kyc_status: string;
  created_at: string | null;
  last_sign_in_at: string | null;
};

type KycStatus = 'pending_verification' | 'verified' | 'rejected';

type UserUpdatePatch = {
  role?: AppRole;
  kyc_status?: KycStatus;
};

export default function UsersRolesPage() {
  return (
    <AdminShell current="users">
      <UsersRolesContent />
    </AdminShell>
  );
}

function UsersRolesContent() {
  const { pushToast } = useAdminToast();

  const [listRows, setListRows] = useState<AdminUserListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // States untuk Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [kycFilter, setKycFilter] = useState<'all' | KycStatus>('all');

  // State untuk Action Modal
  const [pending, setPending] = useState<{
    userId: string;
    label: string;
    patch: UserUpdatePatch;
  } | null>(null);

  // =========================
  // LOAD DATA
  // =========================
  const loadUserList = useCallback(async () => {
    setListLoading(true);
    try {
      const params: string[] = [];
      if (roleFilter !== 'all') params.push(`role=${roleFilter}`);
      if (kycFilter !== 'all') params.push(`kyc_status=${kycFilter}`);

      const qs = params.length ? `?${params.join('&')}` : '';
      const data = await adminGet<{ users: AdminUserListItem[] }>(`/api/admin/users/list${qs}`);

      setListRows(data.users ?? []);
    } catch {
      pushToast({ kind: 'error', message: 'Gagal memuat data pengguna.' });
    } finally {
      setListLoading(false);
    }
  }, [kycFilter, pushToast, roleFilter]);

  useEffect(() => {
    void loadUserList();
  }, [loadUserList]);

  // =========================
  // FILTERING PENCARIAN (INSTANT)
  // =========================
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return listRows;
    const q = searchQuery.toLowerCase();
    return listRows.filter(
      (u) =>
        (u.email || '').toLowerCase().includes(q) ||
        (u.full_name || '').toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  }, [listRows, searchQuery]);

  // =========================
  // STATS
  // =========================
  const stats = useMemo(() => {
    const total = listRows.length;
    const verified = listRows.filter(u => u.kyc_status === 'verified').length;
    const pendingKyc = listRows.filter(u => u.kyc_status === 'pending_verification').length;
    const admin = listRows.filter(u => u.role === 'admin' || u.role === 'super_admin').length;

    return { total, verified, pendingKyc, admin };
  }, [listRows]);

  // =========================
  // ACTION
  // =========================
  function requestAction(userId: string, label: string, patch: UserUpdatePatch) {
    setPending({ userId, label, patch });
  }

  async function applyAction() {
    if (!pending) return;

    try {
      await adminPost('/api/admin/users/update', {
        userId: pending.userId,
        ...pending.patch,
      });

      pushToast({ kind: 'success', message: `${pending.label} berhasil.` });
      setPending(null);
      await loadUserList();
    } catch {
      pushToast({ kind: 'error', message: 'Gagal memperbarui pengguna.' });
    }
  }

  // =========================
  // STYLING HELPERS
  // =========================
  function getBadgeStyle(type: string) {
    switch (type) {
      case 'verified': return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', label: 'Verified' };
      case 'pending_verification': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Pending' };
      case 'rejected': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Rejected' };
      default: return { bg: 'rgba(107, 114, 128, 0.1)', color: '#9ca3af', label: type };
    }
  }

  function getRoleStyle(role: string) {
    switch (role) {
      case 'super_admin': return { bg: 'rgba(147, 51, 234, 0.1)', color: '#c084fc', label: 'Super Admin' };
      case 'admin': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', label: 'Admin' };
      case 'verified_seller': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#34d399', label: 'Seller' };
      case 'buyer': return { bg: 'rgba(148, 163, 184, 0.1)', color: '#cbd5e1', label: 'Buyer' };
      default: return { bg: 'rgba(107, 114, 128, 0.1)', color: '#9ca3af', label: role };
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 className="adminHeaderTitle" style={{ fontSize: '28px', margin: 0, background: 'linear-gradient(90deg, #fff, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>

          </h1>
          <div className="adminHeaderSubtitle" style={{ opacity: 0.6, marginTop: '4px' }}>

          </div>
        </div>
      </div>

      {/* ========================= */}
      {/* STATS */}
      {/* ========================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatCard label="Total Users" value={stats.total} />
        <StatCard label="Verified Seller" value={stats.verified} color="#34d399" />
        <StatCard label="Pending KYC" value={stats.pendingKyc} color="#fbbf24" />
        <StatCard label="Admin Team" value={stats.admin} color="#818cf8" />
      </div>

      {/* ========================= */}
      {/* FILTER & SEARCH BAR */}
      {/* ========================= */}
      <div className="card" style={{ marginTop: 24, padding: '16px' }}>
        <div className="row" style={{ flexWrap: 'wrap', gap: 16 }}>
          {/* Search Bar */}
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
            <input
              type="text"
              placeholder="Cari berdasarkan email, nama, atau ID..."
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', width: '100%' }}
            />
          </div>

          <div className="row" style={{ gap: 12, flex: '1 1 300px', justifyContent: 'flex-end' }}>
            <select
              className="input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as AppRole | 'all')}
              style={{ maxWidth: '180px' }}
            >
              <option value="all">Semua Role</option>
              <option value="buyer">Buyer</option>
              <option value="verified_seller">Seller</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>

            <select
              className="input"
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value as 'all' | KycStatus)}
              style={{ maxWidth: '180px' }}
            >
              <option value="all">Semua KYC Status</option>
              <option value="pending_verification">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================= */}
      {/* TABLE */}
      {/* ========================= */}
      <div className="card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="adminTable">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Pengguna</th>
                <th>Role</th>
                <th>KYC Status</th>
                <th style={{ textAlign: 'right', paddingRight: 20 }}>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {listLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="skeletonRow">
                    <td style={{ paddingLeft: 20 }}><span className="skeletonBox" style={{ height: 36, width: '80%' }} /></td>
                    <td><span className="skeletonBox" style={{ width: 80 }} /></td>
                    <td><span className="skeletonBox" style={{ width: 80 }} /></td>
                    <td><span className="skeletonBox" /></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
                    <div>Tidak ada pengguna yang sesuai dengan kriteria pencarian.</div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleCfg = getRoleStyle(u.role);
                  const kycCfg = getBadgeStyle(u.kyc_status);

                  return (
                    <tr key={u.id} style={{ transition: 'background 0.2s' }}>
                      <td style={{ paddingLeft: 20 }}>
                        <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{u.full_name || 'Tanpa Nama'}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{u.email}</div>
                      </td>

                      <td>
                        <span style={{
                          background: roleCfg.bg, color: roleCfg.color, border: `1px solid ${roleCfg.color}40`,
                          padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600
                        }}>
                          {roleCfg.label}
                        </span>
                      </td>

                      <td>
                        <span style={{
                          background: kycCfg.bg, color: kycCfg.color, border: `1px solid ${kycCfg.color}40`,
                          padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600
                        }}>
                          {kycCfg.label}
                        </span>
                      </td>

                      <td style={{ paddingRight: 20 }}>
                        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            className="btn btnSm btnGhost"
                            onClick={() => requestAction(u.id, `Jadikan ${u.full_name} sebagai Seller?`, { role: 'verified_seller' })}
                            disabled={u.role === 'verified_seller'}
                          >
                            Promote
                          </button>

                          {u.kyc_status === 'pending_verification' && (
                            <>
                              <button
                                className="btn btnSm btnPrimary"
                                onClick={() => requestAction(u.id, `Setujui KYC ${u.full_name}?`, { kyc_status: 'verified' })}
                                style={{ padding: '6px 12px' }}
                              >
                                ✓ Approve
                              </button>
                              <button
                                className="btn btnSm btnDanger"
                                onClick={() => requestAction(u.id, `Tolak KYC ${u.full_name}?`, { kyc_status: 'rejected' })}
                                style={{ padding: '6px 12px' }}
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================= */}
      {/* MODAL KONFIRMASI (Modern) */}
      {/* ========================= */}
      {pending && (
        <div className="adminModalBackdrop" onClick={() => setPending(null)}>
          <div className="adminModal" onClick={(e) => e.stopPropagation()}>
            <div className="adminModalTitle" style={{ fontSize: '18px', color: '#fff' }}>Konfirmasi Aksi</div>
            <div className="adminModalBody" style={{ marginTop: '12px', fontSize: '14px', color: '#cbd5e1' }}>
              {pending.label}
            </div>

            <div className="adminModalActions" style={{ marginTop: '24px' }}>
              <button className="btn btnGhost" onClick={() => setPending(null)}>
                Batal
              </button>
              <button className="btn btnPrimary" onClick={applyAction}>
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================
// STAT CARD (Modern Tech)
// =========================
function StatCard({ label, value, color = '#eaf0ff' }: { label: string; value: number; color?: string }) {
  return (
    <div className="card" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      borderLeft: `3px solid ${color}`,
      padding: '16px 20px'
    }}>
      <div className="tech-label" style={{ color: '#94a3b8', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: 700, color: color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}