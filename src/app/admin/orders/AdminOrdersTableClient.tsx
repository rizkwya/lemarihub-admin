"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { adminGet, adminPost } from "@/lib/admin/apiClient";
import { useAdminToast } from "../_components/AdminToastProvider";
import { supabaseBrowser } from "@/lib/supabase/browserClient";

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

  // State untuk Image Preview Modal
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void refresh();
        }
      )
      .subscribe();

    // Listener tombol ESC untuk menutup modal preview
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewUrl(null);
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      sb.removeChannel(channel);
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
        message: action === "approve" ? "Pembayaran diverifikasi!" : "Bukti ditolak."
      });
    } catch (e) {
      pushToast({ kind: "error", message: e instanceof Error ? e.message : "Terjadi kesalahan" });
    }
  }

  function formatRupiah(amount: number | null | undefined): string {
    if (!amount) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount);
  }

  function getStatusStyle(order: OrderRow) {
    if (order.payment_verified_at) {
      return { bg: "rgba(34, 197, 94, 0.1)", color: "#22c55e", label: "Verified" };
    }
    if (order.status?.toLowerCase() === "pending" || order.payment_proof_url) {
      return { bg: "rgba(234, 179, 8, 0.1)", color: "#eab308", label: "Pending" };
    }
    return { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444", label: order.status || "Unknown" };
  }

  const filteredRows = useMemo(() => {
    let result = rows;

    if (activeFilter === "pending") {
      result = result.filter(o => !o.payment_verified_at);
    } else if (activeFilter === "verified") {
      result = result.filter(o => !!o.payment_verified_at);
    }

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
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Header & Filter Section */}
      <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          type="text"
          placeholder="Cari Order ID, Buyer, atau Toko..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input"
          style={{ maxWidth: 400, width: "100%" }}
        />

        <div style={{ display: "flex", gap: "8px" }}>
          {(["all", "pending", "verified"] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`btn btnSm ${activeFilter === f ? "btnPrimary" : ""}`}
              style={{
                textTransform: "capitalize",
                backgroundColor: activeFilter === f ? "" : "transparent",
                border: activeFilter === f ? "" : "1px solid rgba(148, 163, 184, 0.4)",
                color: activeFilter === f ? "" : "#94a3b8",
                padding: "6px 16px"
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Utama */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="adminTable">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: "right", paddingLeft: 16 }}>No.</th>
                <th>Created</th>
                <th>Order</th>
                <th style={{ textAlign: "center" }}>Payment</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Buyer</th>
                <th>Seller</th>
                <th style={{ textAlign: "center", paddingRight: 16 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isInitialLoading && rows.length === 0 ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="skeletonRow">
                    {Array.from({ length: 9 }).map((_, i) => (<td key={i} style={{ padding: "12px" }}><span className="skeletonBox" /></td>))}
                  </tr>
                ))
              ) : groupedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
                    Tidak ada pesanan ditemukan.
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
                      {/* Baris Header Grup */}
                      <tr className="adminGroupRow">
                        <td colSpan={9} className="small" style={{
                          backgroundColor: "rgba(59, 130, 246, 0.08)",
                          borderLeft: "4px solid #818cf8",
                          padding: "10px 16px"
                        }}>
                          <span className="tech-label" style={{ fontWeight: 600 }}>
                            {first.payment_id ? `GROUP: ${first.payment_id.slice(-8).toUpperCase()}` : "SINGLE ORDER"}
                          </span>
                          <span style={{ color: "#475569", margin: "0 8px" }}>•</span>
                          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px" }}>{groupOrders.length} Pesanan</span>
                        </td>
                      </tr>
                      {/* Baris Data Order */}
                      {groupOrders.map((o, idx) => {
                        const style = getStatusStyle(o);
                        return (
                          <tr key={o.id}>
                            <td style={{ textAlign: "right", color: "#64748b", paddingLeft: 16 }}>{++runningIndex}</td>
                            <td className="small">{new Date(o.created_at).toLocaleDateString("id-ID")}</td>
                            <td className="small">
                              <div style={{ fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{o.order_code || o.id.slice(0, 8)}</div>
                              <div style={{ fontSize: "11px", color: "#94a3b8" }}>{o.items?.[0]?.product_name || "Produk"}</div>
                            </td>
                            <td style={{ textAlign: "center", fontFamily: "monospace" }} className="small">
                              {o.payment_id ? o.payment_id.slice(-6).toUpperCase() : "-"}
                            </td>
                            <td>
                              <span style={{
                                padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: 600,
                                backgroundColor: style.bg, color: style.color, border: `1px solid ${style.color}40`
                              }}>
                                {style.label}
                              </span>
                            </td>
                            <td className="small" style={{ fontWeight: 500 }}>{formatRupiah(o.total_amount || o.product_price)}</td>
                            <td className="small">{o.buyer_full_name || "Guest"}</td>
                            <td className="small">{o.seller_shop_name || "-"}</td>

                            {/* Kolom Aksi (hanya muncul sekali per grup) */}
                            {idx === 0 && (
                              <td rowSpan={groupOrders.length} style={{ textAlign: "center", verticalAlign: "middle", paddingRight: 16 }}>
                                {hasProof ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                                    <button
                                      onClick={() => setPreviewUrl(proofUrl)}
                                      className="btn btnGhost btnSm"
                                      style={{ fontSize: "11px", padding: "6px 12px", width: "100%", whiteSpace: "nowrap" }}
                                    >
                                      📄 View Proof
                                    </button>
                                    {!isVerified && (
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", width: "100%" }}>
                                        <button title="Approve" onClick={() => handleVerifyGroup(groupOrderIds, "approve")} className="btn btnPrimary btnSm" style={{ padding: "4px" }}>✓</button>
                                        <button title="Reject" onClick={() => handleVerifyGroup(groupOrderIds, "reject")} className="btn btnDanger btnSm" style={{ padding: "4px" }}>✕</button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>No Proof</span>
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

      {/* COMPONENT: Modal Viewer Bukti Transfer (Gaya Modern Tech) */}
      {previewUrl && (
        <div className="adminModalBackdrop" style={{ zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPreviewUrl(null)}>
          <div className="adminModal" style={{ width: '100%', maxWidth: '500px', margin: '20px', borderRadius: '16px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: '16px' }}>
              <div className="adminModalTitle" style={{ fontSize: '18px', fontWeight: 600 }}>Bukti Transfer</div>
              <button
                className="btnGhost"
                onClick={() => setPreviewUrl(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '20px', color: '#fff', opacity: 0.7 }}
              >
                ×
              </button>
            </div>
            <div className="adminModalBody">
              <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Image
                  src={previewUrl}
                  alt="Bukti Transfer"
                  width={1200}
                  height={1600}
                  unoptimized
                  style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', display: 'block', height: 'auto' }}
                />
              </div>
            </div>
            <div className="adminModalActions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setPreviewUrl(null)}>
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}