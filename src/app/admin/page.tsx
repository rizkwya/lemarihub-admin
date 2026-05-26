"use client";

import { useEffect, useState } from "react";
import { adminGet } from "@/lib/admin/apiClient";
import { supabaseBrowser } from "@/lib/supabase/browserClient";
import { AdminShell } from "./AdminShell";
import { 
  Clock, 
  Activity, 
  ArrowUpRight, 
  Users2, 
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Mail,
  CircleDot
} from "lucide-react";

type AppRole = "buyer" | "verified_seller" | "admin" | "super_admin";

type OnlineAdmin = {
  id: string;
  email: string | null;
  role: AppRole;
  online: boolean;
};

type ActivityItem = {
  id: string;
  action: string;
  createdAt: string;
  adminEmail: string | null;
  targetEmail: string | null;
};

function formatRelativeTime(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Baru saja";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mnt lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
  return date.toLocaleDateString("id-ID", { day: 'numeric', month: 'short' });
}

// FIXED: High Contrast Dark Mode Badges
function ActionBadge({ action }: { action: string }) {
  const text = action.toLowerCase();
  
  if (text.includes("kyc")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wide">
        {action}
      </span>
    );
  }
  
  if (text.includes("role") || text.includes("promote") || text.includes("demote")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wide">
        {action}
      </span>
    );
  }
  
  if (text.includes("order") || text.includes("verified") || text.includes("approve")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
        {action}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] bg-slate-500/10 text-slate-300 border border-slate-500/20 uppercase tracking-wide">
      {action}
    </span>
  );
}

export default function AdminHomePage() {
  const [onlineAdmins, setOnlineAdmins] = useState<OnlineAdmin[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    let mounted = true;
    const sb = supabaseBrowser();

    async function loadInitial() {
      try {
        setLoadingOnline(true);
        const online = await adminGet<{ admins: OnlineAdmin[] }>("/api/admin/online");
        if (mounted) setOnlineAdmins(online.admins ?? []);
      } catch {
        if (mounted) setOnlineAdmins([]);
      } finally {
        if (mounted) setLoadingOnline(false);
      }

      try {
        setLoadingActivity(true);
        const recent = await adminGet<{ logs: ActivityItem[] }>("/api/admin/activity/recent");
        if (mounted) setActivity(recent.logs ?? []);
      } catch {
        if (mounted) setActivity([]);
      } finally {
        if (mounted) setLoadingActivity(false);
      }
    }

    void loadInitial();

    const presenceChannel = sb.channel("admin_online_sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_online_sessions" }, () => {
        adminGet<{ admins: OnlineAdmin[] }>("/api/admin/online").then(online => {
          if (mounted) setOnlineAdmins(online.admins ?? []);
        });
      }).subscribe();

    const activityChannel = sb.channel("admin_activity_logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_activity_logs" }, () => {
        adminGet<{ logs: ActivityItem[] }>("/api/admin/activity/recent").then(recent => {
          if (mounted) setActivity(recent.logs ?? []);
        });
      }).subscribe();

    return () => {
      mounted = false;
      sb.removeChannel(presenceChannel);
      sb.removeChannel(activityChannel);
    };
  }, []);

  return (
    <AdminShell current="overview">
      <div className="space-y-8">
        
        {/* METRICS STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* CARD 1: ORDERS */}
          <div className="bg-[#0f1938] border border-slate-800/80 rounded-2xl p-5 shadow-md">
            <div className="flex justify-between items-start">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</div>
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <FileSpreadsheet size={15} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white tracking-tight">124</span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <ArrowUpRight size={10} /> 12%
              </span>
            </div>
          </div>

          {/* CARD 2: KYC */}
          <div className="bg-[#0f1938] border border-slate-800/80 rounded-2xl p-5 shadow-md">
            <div className="flex justify-between items-start">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending KYC</div>
              <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                <Clock size={15} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white tracking-tight">8</span>
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Butuh review</span>
            </div>
          </div>

          {/* CARD 3: ADMIN ONLINE */}
          <div className="bg-[#0f1938] border border-slate-800/80 rounded-2xl p-5 shadow-md">
            <div className="flex justify-between items-start">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admin Online</div>
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Users2 size={15} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white tracking-tight">
                {onlineAdmins.filter(a => a.online).length}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <CircleDot size={12} className="animate-pulse text-emerald-500" /> Aktif
              </span>
            </div>
          </div>
        </div>

        {/* WORKSPACE DATA WORKSPACE */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
          
          {/* AREA 1: ADMIN ONLINE */}
          <section className="bg-[#0f1938] border border-slate-800/80 rounded-2xl p-5 shadow-md xl:col-span-2">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800/60 pb-3">
              <div className="p-1 bg-slate-800 text-indigo-400 rounded-lg">
                <Users2 size={14} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Admin Online Sekarang</h3>
            </div>
            
            {loadingOnline ? (
              <div className="flex items-center justify-center py-10 gap-2 text-xs text-slate-400">
                <Loader2 size={14} className="animate-spin text-indigo-400" />
                <span>Memuat daftar admin...</span>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800 font-bold uppercase text-[10px] tracking-wider">
                        <th className="pb-3 px-1">Email</th>
                        <th className="pb-3 px-1 text-center">Role</th>
                        <th className="pb-3 px-1 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {onlineAdmins.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-3 px-1 text-white font-medium max-w-[160px] truncate">{a.email}</td>
                          <td className="py-3 px-1 text-center text-slate-400 capitalize">{a.role.replace("_", " ")}</td>
                          <td className="py-3 px-1 text-right">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              a.online ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${a.online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                              {a.online ? "Online" : "Offline"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* AREA 2: ACTIVITY LOGS */}
          <section className="bg-[#0f1938] border border-slate-800/80 rounded-2xl p-5 shadow-md xl:col-span-3">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800/60 pb-3">
              <div className="p-1 bg-slate-800 text-indigo-400 rounded-lg">
                <Activity size={14} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Aktivitas Admin Terbaru</h3>
            </div>

            {loadingActivity ? (
              <div className="flex items-center justify-center py-10 gap-2 text-xs text-slate-400">
                <Loader2 size={14} className="animate-spin text-indigo-400" />
                <span>Memuat aktivitas...</span>
              </div>
            ) : activity.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500 italic flex flex-col items-center justify-center gap-2">
                <AlertCircle size={16} className="text-slate-700" />
                <span>Belum ada log aktivitas masuk.</span>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800 font-bold uppercase text-[10px] tracking-wider">
                        <th className="pb-3 px-1">Waktu</th>
                        <th className="pb-3 px-1">Admin</th>
                        <th className="pb-3 px-1">Target</th>
                        <th className="pb-3 px-1 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {activity.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-3 px-1 text-slate-400 whitespace-nowrap">{formatRelativeTime(log.createdAt)}</td>
                          <td className="py-3 px-1 font-medium text-white max-w-[140px] truncate" title={log.adminEmail ?? ""}>
                            {log.adminEmail}
                          </td>
                          <td className="py-3 px-1 text-slate-400 max-w-[140px] truncate">
                            {log.targetEmail ? (
                              <div className="flex items-center gap-1">
                                <Mail size={11} className="text-slate-600 flex-shrink-0" />
                                <span>{log.targetEmail}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3 px-1 text-right whitespace-nowrap">
                            <ActionBadge action={log.action} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

        </div>
      </div>
    </AdminShell>
  );
}