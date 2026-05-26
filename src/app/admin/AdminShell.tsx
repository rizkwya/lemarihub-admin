"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browserClient";
import { requireAdminClient } from "@/lib/admin/guards";
import { adminDelete, adminPost } from "@/lib/admin/apiClient";
import { AdminToastProvider } from "./_components/AdminToastProvider";
import { AdminRealtimeToasts } from "./_components/AdminRealtimeToasts";
import { LayoutDashboard, ShoppingCart, ShieldCheck, Users, Menu, X, LogOut, UserCheck, Loader2 } from "lucide-react";

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

  useEffect(() => {
    let cancelled = false;
    async function ping() {
      try {
        await adminPost("/api/admin/heartbeat", {});
      } catch { /* ignore */ }
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
    return () => { mounted = false; };
  }, [router]);

  useEffect(() => {
    setSupabase(supabaseBrowser());
  }, []);

  async function logout() {
    if (!supabase) return;
    try { await adminDelete("/api/admin/heartbeat"); } catch { /* ignore */ }
    await supabase.auth.signOut();
    router.replace("/");
  }

  // FIXED: Premium Dark Mode Loading Animation
  if (status === "loading") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0b1329] text-white font-sans">
        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-[#111c40]/50 border border-slate-800 backdrop-blur-md">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide">Autentikasi Dekrit Admin...</p>
            <p className="text-xs text-slate-500 mt-1">Menyiapkan Dashboard LemariHub</p>
          </div>
        </div>
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
    orders: "Review bukti transfer dan status pesanan konsumen.",
    kyc: "Kelola pengajuan KYC dan verifikasi merchant/penjual.",
    users: "Atur hak akses akun buyer, seller, admin, hingga super_admin.",
    admins: "Manajemen kredensial dan akun internal tim admin.",
  };

  const getNavItemClass = (itemType: AdminShellProps["current"]) => {
    const baseClass = "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group mb-1.5";
    return current === itemType
      ? `${baseClass} bg-indigo-600 text-white shadow-lg shadow-indigo-600/20`
      : `${baseClass} text-slate-400 hover:bg-[#16224f] hover:text-white`;
  };

  return (
    <AdminToastProvider>
      <AdminRealtimeToasts currentAdminId={me?.id ?? null} />
      
      <div className="flex min-h-screen bg-[#0b1329] text-slate-100 font-sans antialiased">
        
        {/* SIDEBAR NAVIGATION */}
        <aside 
          className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0f1938] text-slate-100 border-r border-slate-800/60 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Sidebar Header */}
          <div className="flex h-20 items-center justify-between px-6 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-md shadow-indigo-600/30 tracking-wider">LH</div>
              <span className="font-bold text-base bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">LemariHub Admin</span>
            </div>
            <button 
              type="button" 
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[#16224f] hover:text-white lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          {/* Sidebar Navigation Items */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Utama</p>
              <nav>
                <Link href="/admin" className={getNavItemClass("overview")}>
                  <div className="flex items-center gap-3">
                    <LayoutDashboard size={18} className={current === "overview" ? "text-white" : "text-slate-400 group-hover:text-indigo-400"} />
                    <span>Overview</span>
                  </div>
                </Link>
              </nav>
            </div>

            <div className="mt-6">
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Operasional</p>
              <nav>
                <Link href="/admin/orders" className={getNavItemClass("orders")}>
                  <div className="flex items-center gap-3">
                    <ShoppingCart size={18} className={current === "orders" ? "text-white" : "text-slate-400 group-hover:text-indigo-400"} />
                    <span>Orders & Bukti</span>
                  </div>
                  {current === "orders" && <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase">Live</span>}
                </Link>

                <Link href="/admin/kyc" className={getNavItemClass("kyc")}>
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className={current === "kyc" ? "text-white" : "text-slate-400 group-hover:text-indigo-400"} />
                    <span>KYC Approvals</span>
                  </div>
                  {current === "kyc" && <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase">Live</span>}
                </Link>

                <Link href="/admin/users" className={getNavItemClass("users")}>
                  <div className="flex items-center gap-3">
                    <Users size={18} className={current === "users" ? "text-white" : "text-slate-400 group-hover:text-indigo-400"} />
                    <span>Users & Roles</span>
                  </div>
                  {current === "users" && <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase">Live</span>}
                </Link>
              </nav>
            </div>

            {isSuperAdmin && (
              <div className="mt-6">
                <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Otoritas Tertinggi</p>
                <nav>
                  <Link href="/admin/admins" className={getNavItemClass("admins")}>
                    <div className="flex items-center gap-3">
                      <UserCheck size={18} className={current === "admins" ? "text-white" : "text-slate-400 group-hover:text-indigo-400"} />
                      <span>Kelola Admin</span>
                    </div>
                  </Link>
                </nav>
              </div>
            )}
          </div>

          {/* Sidebar Footer Profile */}
          <div className="p-4 border-t border-slate-800/60 bg-[#0b1329]/60">
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="h-9 w-9 rounded-xl bg-[#16224f] flex items-center justify-center font-bold text-sm text-indigo-400 border border-indigo-500/20 uppercase">
                {me?.role?.charAt(0) ?? "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-white capitalize">{me?.role?.replace("_", " ")}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{me?.email ?? "admin@lemarihub.com"}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* CONTAINER UTAMA WORKSPACE PANEL */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          
          {/* TOPBAR HEADER */}
          <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between bg-[#0f1938]/80 backdrop-blur-md px-6 md:px-8 border-b border-slate-800/50 shadow-lg shadow-black/10">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <button
                  type="button"
                  className="rounded-xl p-2 text-slate-400 hover:bg-[#16224f] hover:text-white"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu size={20} />
                </button>
              )}
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">{headerTitleMap[current]}</h1>
                <p className="hidden sm:block text-xs text-slate-400 mt-1">{headerSubtitleMap[current]}</p>
              </div>
            </div>

            {/* Profile Action Topbar */}
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Operator</span>
                <span className="text-xs font-medium text-slate-300 truncate block max-w-[180px] mt-0.5">{me?.email}</span>
              </div>
              
              <div className="h-6 w-px bg-slate-800 hidden md:block"></div>

              {/* FIXED: Logout Button Width Fix */}
              <button 
                className="inline-flex items-center gap-2 bg-[#16224f] hover:bg-rose-950/40 text-slate-200 hover:text-rose-400 px-4 py-2 rounded-xl text-xs font-semibold border border-indigo-500/20 hover:border-rose-500/30 transition-all duration-200 whitespace-nowrap" 
                onClick={logout}
              >
                <LogOut size={13} />
                <span>Keluar</span>
              </button>
            </div>
          </header>

          {/* DYNAMIC VIEWPORT INJECTOR */}
          <main className="flex-1 p-6 md:p-8 max-w-[1600px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminToastProvider>
  );
}