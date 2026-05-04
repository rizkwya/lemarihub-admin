"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browserClient";
import { requireAdminClient } from "@/lib/admin/guards";
import { adminDelete, adminPost } from "@/lib/admin/apiClient";
import { AdminToastProvider, useAdminToast } from "./_components/AdminToastProvider";
import { LayoutDashboard, ShoppingCart, ShieldCheck, Users } from "lucide-react";

type AppRole = "buyer" | "verified_seller" | "admin" | "super_admin";

type Me = { id: string; role: AppRole; email: string | null } | null;

type AdminShellProps = {
  current: "overview" | "orders" | "kyc" | "users" | "admins";
  children: React.ReactNode;
};

export function AdminShell({ current, children }: AdminShellProps) {
  const router = useRouter();
  const [supabase, setSupabase] = useState<ReturnType<typeof supabaseBrowser> | null>(null);

  const [status, setStatus] = useState<"loading" | "ok">("loading");
  const [me, setMe] = useState<Me>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Kirim heartbeat ke server supaya status "online" akurat.
  useEffect(() => {
    let cancelled = false;

    async function ping() {
      try {
        // Gunakan adminPost supaya Authorization bearer token ikut terkirim
        // dan server-side requireAdmin(req) tidak 401.
        await adminPost("/api/admin/heartbeat", {});
      } catch {
        // abaikan error; hanya untuk presence.
      }
    }

    void ping();
    const id = setInterval(() => {
      if (!cancelled) void ping();
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function run() {
      const result = await requireAdminClient();
      if (!mounted) return;

      if (!result.ok) {
        // Kalau tidak punya akses admin (role bukan admin/super_admin) atau belum login,
        // selalu lempar ke halaman login. Di sana sudah ada UI khusus untuk akun non-admin.
        router.replace("/login?redirectTo=/admin");
        return;
      }

      setStatus("ok");
      setMe({ id: result.userId, role: result.role, email: result.email });
    }

    void run();
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    setSupabase(supabaseBrowser());
  }, []);

  async function logout() {
    if (!supabase) return;
    // best-effort: hapus session online sebelum logout
    try {
      await adminDelete("/api/admin/heartbeat");
    } catch {
      // ignore
    }
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (status === "loading") {
    return (
      <div className="container">
        <h1>Loading…</h1>
      </div>
    );
  }

  const isSuperAdmin = me?.role === "super_admin";

  const headerTitleMap: Record<AdminShellProps["current"], string> = {
    overview: "Admin Dashboard",
    orders: "Orders & Bukti Transfer",
    kyc: "KYC Approvals",
    users: "Users & Roles",
    admins: "Kelola Admin",
  };

  const headerSubtitleMap: Record<AdminShellProps["current"], string> = {
    overview: "Monitoring order, KYC, dan aktivitas admin secara cepat.",
    orders: "Review bukti transfer dan status pesanan.",
    kyc: "Kelola pengajuan KYC dan verifikasi penjual.",
    users: "Promosi / demote role buyer, seller, admin, dan super_admin.",
    admins: "Kelola akun admin dan super_admin.",
  };

  return (
    <AdminToastProvider>
      <AdminRealtimeToasts currentAdminId={me?.id ?? null} />
      <div className="adminShell">
        <aside className="adminSidebar" style={{ display: sidebarOpen ? "flex" : "none" }}>
          <div className="adminBrandRow">
            <button
              className="adminHamburger adminHamburger-inBrand"
              type="button"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="adminHamburgerIcon">
                <span />
                <span />
                <span />
              </div>
            </button>
            <div className="adminBrand">LemariHub Admin</div>
          </div>

          <div>
            <div className="adminNavSectionTitle">Dashboard</div>
            <div className="adminNavList">
              <Link
                href="/admin"
                className={"adminNavItem" + (current === "overview" ? " adminNavItem-primary" : "")}
              >
                <div className="adminNavItemLabel" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LayoutDashboard size={18} /> {/* Ikon Dashboard */}
                  <span>Overview</span>
                </div>
              </Link>
            </div>
          </div>

          <div>
            <div className="adminNavSectionTitle">Menu</div>
            <div className="adminNavList">

              <Link
                href="/admin/orders"
                className={"adminNavItem" + (current === "orders" ? " adminNavItem-primary" : "")}
              >
                <div className="adminNavItemLabel" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShoppingCart size={18} /> {/* Ikon Keranjang */}
                  <span>Orders &amp; Bukti Transfer</span>
                </div>
                {current === "orders" && <span className="adminNavItemBadge">Now</span>}
              </Link>

              <Link
                href="/admin/kyc"
                className={"adminNavItem" + (current === "kyc" ? " adminNavItem-primary" : "")}
              >
                <div className="adminNavItemLabel" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShieldCheck size={18} />
                  <span>KYC Approvals</span>
                </div>
                {current === "kyc" && <span className="adminNavItemBadge">Now</span>}
              </Link>

              <Link
                href="/admin/users"
                className={"adminNavItem" + (current === "users" ? " adminNavItem-primary" : "")}
              >
                <div className="adminNavItemLabel" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Users size={18} />
                  <span>Users &amp; Roles</span>
                </div>
                {current === "users" && <span className="adminNavItemBadge">Now</span>}
              </Link>

            </div>
          </div>

          {isSuperAdmin && (
            <div>
              <div className="adminNavSectionTitle">Super Admin</div>
              <div className="adminNavList">
                <Link
                  href="/admin/admins"
                  className={
                    "adminNavItem" + (current === "admins" ? " adminNavItem-primary" : "")
                  }
                >
                  <div className="adminNavItemLabel">
                    <span>Kelola Admin</span>
                  </div>
                  {current === "admins" && <span className="adminNavItemBadge">Now</span>}
                </Link>
              </div>
            </div>
          )}

          <div className="adminSidebarFooter">
            <div className="small">
              Login sebagai
              <br />
              <b>{me?.role ?? "admin"}</b>
              {me?.email ? ` · ${me.email}` : ""}
            </div>
          </div>
        </aside>

        <main className="adminMain">
          <header className="adminHeader">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {!sidebarOpen && (
                <button
                  className="adminHamburger"
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                >
                  <div className="adminHamburgerIcon">
                    <span />
                    <span />
                    <span />
                  </div>
                </button>
              )}
              <div>
                <div className="adminHeaderTitle">{headerTitleMap[current]}</div>
                <div className="adminHeaderSubtitle">{headerSubtitleMap[current]}</div>
              </div>
            </div>
            <div className="adminHeaderActions">
              <div className="small" style={{ textAlign: "right" }}>
                Halo <b>{me?.role ?? "admin"}</b>
                {me?.email ? ` (${me.email})` : ""}
              </div>
              <button className="btn" onClick={logout}>
                Logout
              </button>
            </div>
          </header>

          {children}
        </main>
      </div>
    </AdminToastProvider>
  );
}

function AdminRealtimeToasts({ currentAdminId }: { currentAdminId: string | null }) {
  const { pushToast } = useAdminToast();

  // Toast untuk bukti transfer baru yang di-upload pembeli.
  useEffect(() => {
    const sb = supabaseBrowser();

    const channel = sb
      .channel("admin-toast-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          const newRow = (payload.new as { id?: string; payment_proof_url?: string | null } | null) ?? null;
          const oldRow = (payload.old as { payment_proof_url?: string | null } | null) ?? null;

          const before = !!(oldRow && oldRow.payment_proof_url && oldRow.payment_proof_url.trim().length > 0);
          const after = !!(newRow && newRow.payment_proof_url && newRow.payment_proof_url.trim().length > 0);

          // Hanya ketika sebelumnya tidak ada bukti transfer lalu sekarang ada.
          if (!before && after && newRow?.id) {
            pushToast({
              kind: "info",
              message: `Bukti transfer baru diunggah untuk order ${newRow.id}.`,
            });
          }
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [pushToast]);

  // Toast untuk pengajuan KYC baru (status berubah menjadi pending_verification).
  useEffect(() => {
    const sb = supabaseBrowser();

    const channel = sb
      .channel("admin-toast-kyc")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        (payload) => {
          const newStatus = (payload.new as { kyc_status?: string | null } | null)?.kyc_status;
          const oldStatus = (payload.old as { kyc_status?: string | null } | null)?.kyc_status;

          if (newStatus === "pending_verification" && oldStatus !== "pending_verification") {
            pushToast({
              kind: "info",
              message: "Ada pengajuan KYC baru yang menunggu review.",
            });
          }
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [pushToast]);

  // Toast untuk aktivitas admin penting (misalnya perubahan role / status KYC).
  useEffect(() => {
    const sb = supabaseBrowser();

    const channel = sb
      .channel("admin-toast-activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_activity_logs" },
        (payload) => {
          const row = payload.new as
            | {
              admin_user_id?: string | null;
              action?: string | null;
              from_role?: string | null;
              to_role?: string | null;
              from_kyc_status?: string | null;
              to_kyc_status?: string | null;
            }
            | null;

          if (!row) return;

          const actorId = row.admin_user_id ?? null;

          // Jangan munculkan notifikasi untuk aktivitas yang kita sendiri lakukan,
          // karena biasanya sudah ada toast "success" lokal dari aksi tombol.
          if (currentAdminId && actorId && actorId === currentAdminId) {
            return;
          }

          const actionText = row.action ?? "";
          const fromRole = row.from_role ?? null;
          const toRole = row.to_role ?? null;
          const fromKyc = row.from_kyc_status ?? null;
          const toKyc = row.to_kyc_status ?? null;

          // Susun pesan yang ringkas berdasarkan perubahan yang tercatat.
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

          const message = parts.join(" \u00b7 ") || actionText;

          if (!message) return;

          pushToast({
            kind: "info",
            message,
          });
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [currentAdminId, pushToast]);

  return null;
}
