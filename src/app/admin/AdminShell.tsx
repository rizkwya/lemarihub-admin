"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browserClient";
import { requireAdminClient } from "@/lib/admin/guards";
import { adminDelete, adminPost } from "@/lib/admin/apiClient";
import { AdminToastProvider, useAdminToast } from "./_components/AdminToastProvider";
import { LayoutDashboard, ShoppingCart, ShieldCheck, Users, Package } from "lucide-react";

type AppRole = "buyer" | "verified_seller" | "admin" | "super_admin";

type Me = { id: string; role: AppRole; email: string | null } | null;

type AdminShellProps = {
  current: "overview" | "orders" | "kyc" | "users" | "admins" | "products";
  children: React.ReactNode;
};

export function AdminShell({ current, children }: AdminShellProps) {
  const router = useRouter();
  const [supabase, setSupabase] = useState<ReturnType<typeof supabaseBrowser> | null>(null);

  const [status, setStatus] = useState<"loading" | "ok">("loading");
  const [me, setMe] = useState<Me>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function ping() {
      try {
        await adminPost("/api/admin/heartbeat", {});
      } catch {}
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
    try {
      await adminDelete("/api/admin/heartbeat");
    } catch {}
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
    products: "Manajemen Produk",
  };

  const headerSubtitleMap: Record<AdminShellProps["current"], string> = {
    overview: "Monitoring order, KYC, dan aktivitas admin secara cepat.",
    orders: "Review bukti transfer dan status pesanan.",
    kyc: "Kelola pengajuan KYC dan verifikasi penjual.",
    users: "Promosi / demote role buyer, seller, admin, dan super_admin.",
    admins: "Kelola akun admin dan super_admin.",
    products: "Kelola daftar produk yang ada di platform.",
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
                <span /><span /><span />
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
                  <LayoutDashboard size={18} />
                  <span>Overview</span>
                </div>
              </Link>
            </div>
          </div>

          <div>
            <div className="adminNavSectionTitle">Menu</div>
            <div className="adminNavList">
              <Link
                href="/admin/products"
                className={"adminNavItem" + (current === "products" ? " adminNavItem-primary" : "")}
              >
                <div className="adminNavItemLabel" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Package size={18} />
                  <span>Manajemen Produk</span>
                </div>
                {current === "products" && <span className="adminNavItemBadge">Now</span>}
              </Link>

              <Link
                href="/admin/orders"
                className={"adminNavItem" + (current === "orders" ? " adminNavItem-primary" : "")}
              >
                <div className="adminNavItemLabel" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShoppingCart size={18} />
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
                  className={"adminNavItem" + (current === "admins" ? " adminNavItem-primary" : "")}
                >
                  <div className="adminNavItemLabel"><span>Kelola Admin</span></div>
                  {current === "admins" && <span className="adminNavItemBadge">Now</span>}
                </Link>
              </div>
            </div>
          )}

          <div className="adminSidebarFooter">
            <div className="small">
              Login sebagai<br /><b>{me?.role ?? "admin"}</b>
            </div>
          </div>
        </aside>

        <main className="adminMain">
          <header className="adminHeader">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {!sidebarOpen && (
                <button className="adminHamburger" type="button" onClick={() => setSidebarOpen(true)}>
                  <div className="adminHamburgerIcon"><span /><span /><span /></div>
                </button>
              )}
              <div>
                <div className="adminHeaderTitle">{headerTitleMap[current]}</div>
                <div className="adminHeaderSubtitle">{headerSubtitleMap[current]}</div>
              </div>
            </div>
            <div className="adminHeaderActions">
              <button className="btn" onClick={logout}>Logout</button>
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

  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb.channel("admin-toast-all").on(
      "postgres_changes", { event: "*", schema: "public", table: "orders" },
      (payload) => {
        // Logic existing...
      }
    ).subscribe();
    return () => { sb.removeChannel(channel); };
  }, [pushToast]);

  return null;
}