"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/browserClient";
import { useAdminToast } from "./AdminToastProvider";

export function AdminRealtimeToasts({ currentAdminId }: { currentAdminId: string | null }) {
  const { pushToast } = useAdminToast();

  // 1. Realtime Orders
  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel("admin-toast-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        const newRow = (payload.new as { id?: string; payment_proof_url?: string | null } | null) ?? null;
        const oldRow = (payload.old as { payment_proof_url?: string | null } | null) ?? null;

        const before = !!(oldRow?.payment_proof_url && oldRow.payment_proof_url.trim().length > 0);
        const after = !!(newRow?.payment_proof_url && newRow.payment_proof_url.trim().length > 0);

        if (!before && after && newRow?.id) {
          pushToast({
            kind: "info",
            message: `Bukti transfer baru diunggah untuk order ${newRow.id}.`,
          });
        }
      })
      .subscribe();

    return () => { void sb.removeChannel(channel); };
  }, [pushToast]);

  // 2. Realtime KYC
  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel("admin-toast-kyc")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, (payload) => {
        const newStatus = (payload.new as { kyc_status?: string | null } | null)?.kyc_status;
        const oldStatus = (payload.old as { kyc_status?: string | null } | null)?.kyc_status;

        if (newStatus === "pending_verification" && oldStatus !== "pending_verification") {
          pushToast({
            kind: "info",
            message: "Ada pengajuan KYC baru yang menunggu review.",
          });
        }
      })
      .subscribe();

    return () => { void sb.removeChannel(channel); };
  }, [pushToast]);

  // 3. Realtime Logs
  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel("admin-toast-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_activity_logs" }, (payload) => {
        const row = payload.new as {
          admin_user_id?: string | null;
          action?: string | null;
          from_role?: string | null;
          to_role?: string | null;
          from_kyc_status?: string | null;
          to_kyc_status?: string | null;
        } | null;

        if (!row) return;
        const actorId = row.admin_user_id ?? null;

        if (currentAdminId && actorId && actorId === currentAdminId) return;

        const actionText = row.action ?? "";
        const fromRole = row.from_role ?? null;
        const toRole = row.to_role ?? null;
        const fromKyc = row.from_kyc_status ?? null;
        const toKyc = row.to_kyc_status ?? null;

        const parts: string[] = [];
        if (fromRole !== toRole && toRole) {
          if (toRole === "admin" || toRole === "super_admin") {
            parts.push(`Role user dipromosikan menjadi ${toRole}.`);
          } else if (fromRole) {
            parts.push(`Role user diubah: ${fromRole} → ${toRole}.`);
          } else {
            parts.push(`Role user di-set ke ${toRole}.`);
          }
        }

        if (fromKyc !== toKyc) {
          parts.push(`Status KYC: ${fromKyc ?? "-"} → ${toKyc ?? "-"}.`);
        }

        const message = parts.join(" · ") || actionText;
        if (!message) return;

        pushToast({ kind: "info", message });
      })
      .subscribe();

    return () => { void sb.removeChannel(channel); };
  }, [currentAdminId, pushToast]);

  return null;
}