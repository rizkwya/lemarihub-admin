"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { requireAdminClient } from '@/lib/admin/guards';
import { adminGet, adminPost } from '@/lib/admin/apiClient';
import { supabaseBrowser } from '@/lib/supabase/browserClient';
import { useAdminToast } from '../_components/AdminToastProvider';
import { Check, X, Search, Clock, Image as ImageIcon, Edit2, ShieldAlert, CheckSquare, Square, UserCheck, Loader2 } from 'lucide-react';
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

    const channel = sb
      .channel('admin-kyc-users-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
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
    setLoading(true);
    try {
      for (const userId of ids) {
        const payload = action === 'approve'
          ? { userId, kyc_status: 'verified', role: 'verified_seller' }
          : { userId, kyc_status: 'rejected' };
        await adminPost('/api/admin/users/update', payload);
      }
      pushToast({ kind: 'success', message: `${ids.length} Permintaan KYC berhasil di-${action}` });
      setSelectedIds(new Set());
      setIsEditMode(false);
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Aksi massal gagal';
      pushToast({ kind: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* HEADER CONTROL PANEL */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pemohon atau ID akun..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => { setIsEditMode(!isEditMode); setSelectedIds(new Set()); }}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold border transition-all shadow-sm ${
              isEditMode 
                ? "bg-slate-800 border-slate-800 text-white hover:bg-slate-900" 
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {isEditMode ? <X size={15} /> : <Edit2 size={14} />}
            <span>{isEditMode ? 'Batal Pilih' : 'Mode Massal'}</span>
          </button>
          
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium px-2 animate-pulse">
              <Loader2 size={14} className="animate-spin" />
              <span>Memproses...</span>
            </div>
          )}
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {isEditMode && (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <button 
            type="button"
            onClick={toggleSelectAll} 
            className="inline-flex items-center gap-2.5 text-slate-700 hover:text-slate-900 font-semibold text-sm focus:outline-none"
          >
            {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
              <CheckSquare size={19} className="text-indigo-600" />
            ) : (
              <Square size={19} className="text-slate-400" />
            )}
            <span>Pilih Semua ({selectedIds.size} / {filteredItems.length})</span>
          </button>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => processKyc(Array.from(selectedIds), 'approve')} 
                disabled={loading} 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md shadow transition-colors"
              >
                <Check size={14} /> Terima Dokumen
              </button>
              <button 
                type="button"
                onClick={() => processKyc(Array.from(selectedIds), 'reject')} 
                disabled={loading} 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-md shadow transition-colors"
              >
                <X size={14} /> Tolak Semua
              </button>
            </div>
          )}
        </div>
      )}

      {/* DATA WRAPPER GRID */}
      <div className="grid gap-3.5">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 border-dashed p-12 text-center text-slate-400">
            <ShieldAlert size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm italic font-light">Tidak ada pengajuan verifikasi KYC yang aktif saat ini.</p>
          </div>
        ) : (
          filteredItems.map((it) => (
            <div 
              key={it.id}
              onClick={() => isEditMode && toggleSelect(it.id)}
              className={`bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${
                selectedIds.has(it.id) 
                  ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-md bg-indigo-50/10" 
                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
              } ${isEditMode ? "cursor-pointer" : "cursor-default"}`}
            >
              <div className="flex items-start gap-3 flex-1">
                {isEditMode && (
                  <div className="mt-1 flex-shrink-0">
                    {selectedIds.has(it.id) ? (
                      <CheckSquare size={20} className="text-indigo-600" />
                    ) : (
                      <Square size={20} className="text-slate-300" />
                    )}
                  </div>
                )}

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                      ID: {it.id.slice(0, 8)}...
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock size={12} /> {it.kyc_submitted_at ? new Date(it.kyc_submitted_at).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-800">{it.full_name || 'Anonymous User'}</h4>
                  <p className="text-xs text-slate-500 font-medium">{it.phone || 'Nomor HP Belum Diisi'}</p>
                </div>
              </div>

              {/* MEDIA PREVIEWS & INDIVIDUAL ACTIONS */}
              <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                <div className="flex items-center gap-2">
                  {[
                    { label: 'KTP', link: it.kyc_ktp_link }, 
                    { label: 'Selfie', link: it.kyc_selfie_link }
                  ].map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); if (img.link) setPreviewImg(img.link); }}
                      className="group relative w-16 h-12 bg-slate-900 rounded-lg overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                      title={`Buka Foto ${img.label}`}
                    >
                      {img.link ? (
                        <>
                          <Image src={img.link} alt={img.label} fill className="object-cover group-hover:opacity-80 transition-opacity" unoptimized />
                          <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 text-center text-[9px] text-white font-bold py-0.5 backdrop-blur-[1px]">
                            {img.label}
                          </div>
                        </>
                      ) : (
                        <ImageIcon size={14} className="text-slate-400" />
                      )}
                    </button>
                  ))}
                </div>

                {!isEditMode && (
                  <div className="flex items-center gap-1.5 border-l border-slate-100 pl-4">
                    <button 
                      type="button"
                      disabled={loading} 
                      onClick={(e) => { e.stopPropagation(); void processKyc([it.id], 'approve'); }} 
                      className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white transition-colors border border-emerald-200/50"
                      title="Terima Verifikasi"
                    >
                      <Check size={18} />
                    </button>
                    <button 
                      type="button"
                      disabled={loading} 
                      onClick={(e) => { e.stopPropagation(); void processKyc([it.id], 'reject'); }} 
                      className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white transition-colors border border-rose-200/50"
                      title="Tolak Dokumen"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* DIALOG PREVIEW MEDIA LIGHTBOX */}
      {previewImg && (
        <div 
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center animate-in zoom-in-95 duration-200">
            <button
              type="button"
              className="absolute -top-12 right-0 p-2 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
              onClick={() => setPreviewImg(null)}
            >
              <X size={20} />
            </button>
            <div className="relative w-full h-[75vh] select-none">
              <Image 
                src={previewImg} 
                alt="Pratinjau Dokumen KYC" 
                fill 
                className="object-contain" 
                unoptimized 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}