"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { adminGet, adminPost } from "@/lib/admin/apiClient";
import { useAdminToast } from "../_components/AdminToastProvider";
import { supabaseBrowser } from "@/lib/supabase/browserClient";
import { Search, Check, X, Eye, FileText, ImageIcon } from "lucide-react";

export type OrderItemSummary = {
  order_id: string;
  product_name: string | null;
  product_price: number | null;
  quantity: number | null;
};

export type OrderRow = {
  id: string;
  created_at: string;
  order_code?: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  product_id: string | null;
  payment_id?: string | null;
  total_amount: number | null;
  product_price: number | null;
  status: string | null;
  payment_proof_url: string | null;
  payment_verified_at: string | null;
  buyer_full_name?: string | null;
  seller_shop_name?: string | null;
  items?: OrderItemSummary[];
};

type Props = {
  initial: OrderRow[];
};

type FilterStatus = "all" | "pending" | "verified";

export function AdminOrdersTableClient({ initial }: Props) {
  const [rows, setRows] = useState<OrderRow[]>(initial);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(initial.length === 0);
  const [query, setQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { pushToast } = useAdminToast();

  const refresh = useCallback(async () => {
    try {
      const data = await adminGet<{ orders: OrderRow[] }>("/api/admin/orders/list");
      if (data.orders) setRows(data.orders);
    } catch (e) {
      pushToast({ kind: "error", message: e instanceof Error ? e.message : "Gagal mengambil data orders" });
    } finally {
      setIsInitialLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    const sb = supabaseBrowser();
    void refresh();

    const channel = sb
      .channel("admin-orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        void refresh();
      })
      .subscribe();

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewUrl(null);
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      void sb.removeChannel(channel);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [refresh]);

  async function handleVerifyGroup(orderIds: string[], action: "approve" | "reject") {
    if (orderIds.length === 0) return;
    try {
      for (const id of orderIds) {
        const res = await adminPost<{ ok: boolean; order: OrderRow }>("/api/admin/orders/verify", {
          orderId: id,
          action
        });
        if (!res.ok) throw new Error("Gagal memproses verifikasi");
        const updated = res.order;
        setRows((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      }
      pushToast({
        kind: "success",
        message: action === "approve" ? "Pembayaran berhasil diverifikasi!" : "Bukti transfer ditolak."
      });
    } catch (e) {
      pushToast({ kind: "error", message: e instanceof Error ? e.message : "Terjadi kesalahan" });
    }
  }

  const formatRupiah = (amount: number | null | undefined) => {
    if (!amount) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (order: OrderRow) => {
    if (order.payment_verified_at) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">Verified</span>;
    }
    if (order.status?.toLowerCase() === "pending" || order.payment_proof_url) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wide">Pending</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wide">{order.status || "Unknown"}</span>;
  };

  const filteredRows = useMemo(() => {
    let result = rows;
    if (activeFilter === "pending") result = result.filter(o => !o.payment_verified_at);
    if (activeFilter === "verified") result = result.filter(o => !!o.payment_verified_at);

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((o) =>
        o.order_code?.toLowerCase().includes(q) ||
        o.buyer_full_name?.toLowerCase().includes(q) ||
        o.seller_shop_name?.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, query, activeFilter]);

  const groupedRows = useMemo(() => {
    const map = new Map<string, OrderRow[]>();
    for (const o of filteredRows) {
      const key = o.payment_id ?? `single-${o.id}`;
      const current = map.get(key) || [];
      current.push(o);
      map.set(key, current);
    }
    return Array.from(map.entries());
  }, [filteredRows]);

  let runningIndex = 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* FILTER & SEARCH PANEL */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-[#0b1329] p-4 rounded-xl border border-slate-800/60 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Cari Order ID, Pembeli, atau Nama Toko..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#0f1938] border border-slate-800/80 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[#0f1938] p-1.5 rounded-lg border border-slate-800/80">
          {(["all", "pending", "verified"] as FilterStatus[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize transition-all duration-200 ${
                activeFilter === filter
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white hover:bg-[#16224f]"
              }`}
            >
              {filter === "all" ? "Semua" : filter}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE WORKSPACE */}
      <div className="bg-[#0b1329] rounded-xl border border-slate-800/60 shadow-inner overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f1938] border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4 text-center w-12">No</th>
                <th className="py-4 px-4">Tanggal</th>
                <th className="py-4 px-4">Order info</th>
                <th className="py-4 px-4 text-center">Payment ID</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">Total Amount</th>
                <th className="py-4 px-4">Pembeli</th>
                <th className="py-4 px-4">Merchant</th>
                <th className="py-4 px-4 text-center w-32">Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-sm">
              {isInitialLoading && rows.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <td key={i} className="p-4"><div className="h-4 bg-slate-800/50 rounded"></div></td>
                    ))}
                  </tr>
                ))
              ) : groupedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 text-xs italic">
                    Tidak ada transaksi atau pesanan yang ditemukan.
                  </td>
                </tr>
              ) : (
                groupedRows.map(([groupKey, groupOrders]) => {
                  const first = groupOrders[0];
                  const groupOrderIds = groupOrders.map(o => o.id);
                  const proofUrl = groupOrders.find(o => o.payment_proof_url)?.payment_proof_url;
                  const hasProof = !!proofUrl;
                  const isVerified = groupOrders.every(o => !!o.payment_verified_at);

                  return (
                    <React.Fragment key={groupKey}>
                      {/* Baris Pembatas Informasi Grup */}
                      <tr className="bg-[#16224f]/40 border-l-4 border-indigo-500">
                        <td colSpan={9} className="py-2.5 px-4 text-[11px] font-medium text-slate-400">
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold border border-indigo-500/20">
                              {first.payment_id ? `BATCH COMPONENT: ${first.payment_id.slice(-8).toUpperCase()}` : "SINGLE TRANSACTION"}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-300 font-semibold">{groupOrders.length} item dalam struk ini</span>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Baris Detail Item di dalam Grup */}
                      {groupOrders.map((o, idx) => {
                        return (
                          <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-4 text-center text-slate-500 font-medium">{++runningIndex}</td>
                            <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap text-xs">{new Date(o.created_at).toLocaleDateString("id-ID")}</td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white text-xs">{o.order_code || o.id.slice(0, 8)}</div>
                              <div className="text-[11px] text-slate-500 max-w-[180px] truncate mt-0.5">{o.items?.[0]?.product_name || "Produk Retail"}</div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-500 font-semibold uppercase">
                              {o.payment_id ? o.payment_id.slice(-6) : "-"}
                            </td>
                            <td className="py-3.5 px-4">{getStatusBadge(o)}</td>
                            <td className="py-3.5 px-4 font-bold text-slate-200">{formatRupiah(o.total_amount || o.product_price)}</td>
                            <td className="py-3.5 px-4 text-slate-300 text-xs">{o.buyer_full_name || "Guest User"}</td>
                            <td className="py-3.5 px-4 text-slate-300 text-xs font-medium">{o.seller_shop_name || "-"}</td>

                            {/* Kolom Aksi Tunggal khusus baris pertama grup */}
                            {idx === 0 && (
                              <td rowSpan={groupOrders.length} className="py-3.5 px-4 text-center vertical-middle border-l border-slate-800/60 bg-[#0f1938]/30">
                                {hasProof ? (
                                  <div className="flex flex-col gap-2 items-center justify-center">
                                    <button
                                      onClick={() => setPreviewUrl(proofUrl)}
                                      className="inline-flex items-center justify-center gap-1.5 w-full px-2.5 py-1.5 bg-[#16224f] hover:bg-indigo-600 border border-indigo-500/20 hover:border-transparent text-indigo-300 hover:text-white text-[11px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all"
                                    >
                                      <Eye size={13} />
                                      <span>Struk</span>
                                    </button>
                                    {!isVerified && (
                                      <div className="flex gap-1.5 w-full">
                                        <button 
                                          type="button"
                                          title="Setujui Pembayaran" 
                                          onClick={() => handleVerifyGroup(groupOrderIds, "approve")} 
                                          className="flex-1 inline-flex items-center justify-center p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors"
                                        >
                                          <Check size={14} />
                                        </button>
                                        <button 
                                          type="button"
                                          title="Tolak Bukti" 
                                          onClick={() => handleVerifyGroup(groupOrderIds, "reject")} 
                                          className="flex-1 inline-flex items-center justify-center p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-colors"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-500 italic font-medium flex items-center justify-center gap-1 bg-slate-800/30 py-1.5 rounded-lg border border-slate-800/50">
                                    <ImageIcon size={12} /> Belum Upload
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPONENT: DIALOG PREVIEW MODAL */}
      {previewUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050914]/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewUrl(null)}
        >
          <div 
            className="bg-[#0f1938] rounded-2xl max-w-lg w-full p-5 shadow-2xl shadow-black/50 border border-slate-700/80 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white">
                <FileText className="text-indigo-400" size={18} />
                <h3 className="text-base font-bold tracking-tight">Detail Bukti Transfer</h3>
              </div>
              <button
                type="button"
                className="p-1 rounded-md text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                onClick={() => setPreviewUrl(null)}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="py-5 overflow-y-auto flex-1">
              <div className="relative w-full rounded-xl overflow-hidden bg-[#0b1329] border border-slate-800/80 flex items-center justify-center shadow-inner min-h-[300px]">
                <Image
                  src={previewUrl}
                  alt="Struk Pembayaran"
                  width={800}
                  height={1100}
                  unoptimized
                  className="w-full max-h-[55vh] object-contain block"
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button 
                type="button"
                className="px-5 py-2 bg-[#16224f] hover:bg-indigo-600 border border-indigo-500/20 text-slate-200 hover:text-white text-xs font-bold tracking-wider uppercase rounded-lg transition-colors"
                onClick={() => setPreviewUrl(null)}
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
