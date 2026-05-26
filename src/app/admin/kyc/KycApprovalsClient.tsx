"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { requireAdminClient } from '@/lib/admin/guards';
import { adminGet, adminPost } from '@/lib/admin/apiClient';
import { supabaseBrowser } from '@/lib/supabase/browserClient';
import { useAdminToast } from '../_components/AdminToastProvider';
import { Check, X, Search, Clock, Image as ImageIcon, Edit2, Trash2, CheckSquare, Square } from 'lucide-react';
import Image from 'next/image';

interface KycItem {
  id: string;
  full_name: string | null;
  phone: string | null;
  kyc_status: string;
  kyc_ktp_link: string | null;
  kyc_selfie_link: string | null;
  kyc_submitted_at: string | null;
}

export default function KycApprovalsClient() {
  const router = useRouter();
  const { pushToast } = useAdminToast();

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<KycItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGet<{ items: KycItem[] }>('/api/admin/kyc/list');
      setItems(data.items ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data';
      pushToast({ kind: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    async function auth() {
      const result = await requireAdminClient();
      if (!result.ok) {
        router.replace('/login?redirectTo=/admin/kyc');
        return;
      }
      setReady(true);
    }
    void auth();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    void refresh();

    const sb = supabaseBrowser();

    // MENGGUNAKAN LOGIKA REALTIME DARI CODE AWAL ANDA
    const channel = sb
      .channel('admin-kyc-users-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          // Mendeteksi perubahan status kyc
          const newStatus = (payload.new as { kyc_status?: string } | null)?.kyc_status;
          const oldStatus = (payload.old as { kyc_status?: string } | null)?.kyc_status;

          if (newStatus || oldStatus) {
            void refresh();
          }
        }
      )
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [ready, refresh]);

  const filteredItems = useMemo(() => {
    return items.filter(it =>
      it.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const processKyc = async (ids: string[], action: 'approve' | 'reject') => {
    // KONFIRMASI DIHAPUS - LANGSUNG EKSEKUSI
    setLoading(true);
    try {
      for (const userId of ids) {
        const payload = action === 'approve'
          ? { userId, kyc_status: 'verified', role: 'verified_seller' }
          : { userId, kyc_status: 'rejected' };
        await adminPost('/api/admin/users/update', payload);
      }
      pushToast({ kind: 'success', message: `${ids.length} User berhasil di-${action}` });
      setSelectedIds(new Set());
      setIsEditMode(false);
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Aksi gagal';
      pushToast({ kind: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <div style={{ color: '#fff' }}>
      <p style={{ opacity: 0.6, fontSize: '14px', marginBottom: '24px' }}>
        Verifikasi seller LemariHub. {loading && <span style={{ color: '#6366f1' }}>(Memproses...)</span>}
      </p>

      {/* SEARCH & EDIT */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          <input
            className="adminInput"
            placeholder="Cari nama atau ID..."
            style={{
              width: '100%', padding: '14px 14px 14px 48px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', color: '#fff'
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => { setIsEditMode(!isEditMode); setSelectedIds(new Set()); }}
          style={{
            padding: '0 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
            background: isEditMode ? '#6366f1' : 'rgba(255,255,255,0.05)', color: '#fff',
            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
          }}
        >
          {isEditMode ? <X size={18} /> : <Edit2 size={18} />}
          {isEditMode ? 'Batal' : 'Edit'}
        </button>
      </div>

      {/* BULK ACTION BAR */}
      {isEditMode && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px',
          background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px',
          border: '1px solid rgba(99, 102, 241, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div onClick={toggleSelectAll} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
              <CheckSquare size={20} color="#6366f1" />
            ) : (
              <Square size={20} opacity={0.4} />
            )}
            <span style={{ fontSize: '14px', fontWeight: '500' }}>
              Pilih Semua ({selectedIds.size}/{filteredItems.length})
            </span>
          </div>

          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => processKyc(Array.from(selectedIds), 'approve')} disabled={loading} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={16} /> Terima
              </button>
              <button onClick={() => processKyc(Array.from(selectedIds), 'reject')} disabled={loading} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={16} /> Tolak
              </button>
            </div>
          )}
        </div>
      )}

      {/* LIST DATA */}
      <div style={{ display: 'grid', gap: '12px' }}>
        {filteredItems.map((it) => (
          <div key={it.id}
            onClick={() => isEditMode && toggleSelect(it.id)}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${selectedIds.has(it.id) ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '20px',
              cursor: isEditMode ? 'pointer' : 'default', transition: '0.2s'
            }}
          >
            {isEditMode && (
              <div style={{ color: selectedIds.has(it.id) ? '#6366f1' : 'rgba(255,255,255,0.2)' }}>
                {selectedIds.has(it.id) ? <CheckSquare size={22} /> : <Square size={22} />}
              </div>
            )}

            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '10px', color: '#818cf8', fontWeight: 'bold' }}>ID: {it.id.toUpperCase()}</span>
              <h4 style={{ margin: '4px 0', fontSize: '18px' }}>{it.full_name || 'No Name'}</h4>
              <div style={{ display: 'flex', gap: '16px', opacity: 0.5, fontSize: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} /> {it.kyc_submitted_at ? new Date(it.kyc_submitted_at).toLocaleDateString('id-ID') : '-'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ label: 'KTP', link: it.kyc_ktp_link }, { label: 'SELFIE', link: it.kyc_selfie_link }].map((img, idx) => (
                  <div key={idx} onClick={(e) => { e.stopPropagation(); if (img.link) setPreviewImg(img.link); }} style={{ width: '56px', height: '42px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', background: '#000' }}>
                    {img.link ? <Image src={img.link} alt={img.label} fill style={{ objectFit: 'cover' }} unoptimized /> : <ImageIcon size={14} style={{ margin: '12px auto', display: 'block', opacity: 0.2 }} />}
                  </div>
                ))}
              </div>

              {!isEditMode && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button disabled={loading} onClick={(e) => { e.stopPropagation(); processKyc([it.id], 'approve'); }} style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}><Check size={18} /></button>
                  <button disabled={loading} onClick={(e) => { e.stopPropagation(); processKyc([it.id], 'reject'); }} style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }}><X size={18} /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* PREVIEW */}
      {previewImg && (
        <div onClick={() => setPreviewImg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '80%', height: '80%' }}>
            <Image src={previewImg} alt="Preview" fill style={{ objectFit: 'contain' }} unoptimized />
          </div>
        </div>
      )}
    </div>
  );
}