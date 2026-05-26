"use client";

import { useEffect, useState } from "react";
import { adminGet } from "@/lib/admin/apiClient";
import { supabaseBrowser } from "@/lib/supabase/browserClient";
import { AdminShell } from "./AdminShell";

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

// Badge dengan warna yang lebih serasi (Muted Theme) agar menyatu dengan dashboard
function ActionBadge({ action }: { action: string }) {
  const text = action.toLowerCase();
  let colors = { bg: 'rgba(71, 85, 105, 0.2)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };

  if (text.includes("kyc")) {
    colors = { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };
  } else if (text.includes("role") || text.includes("promote")) {
    colors = { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.2)' };
  } else if (text.includes("order") || text.includes("verified")) {
    colors = { bg: 'rgba(16, 185, 129, 0.1)', text: '#34d399', border: 'rgba(16, 185, 129, 0.2)' };
  }

  return (
    <span style={{
      padding: '2px 10px',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: '600',
      backgroundColor: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      display: 'inline-block',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>
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
      {/* STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>TOTAL ORDERS</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff' }}>124 <span style={{ color: '#10b981', fontSize: '14px' }}>↑ 12%</span></div>
        </div>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>PENDING KYC</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff' }}>8 <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 'normal' }}>Butuh review</span></div>
        </div>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>ADMIN ONLINE</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff' }}>{onlineAdmins.filter(a => a.online).length} <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 'normal' }}>Aktif</span></div>
        </div>
      </div>

      {/* LAYOUT ATAS-BAWAH (FULL WIDTH) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* ADMIN ONLINE TABLE */}
        <section className="card" style={{ padding: '24px' }}>
          <div className="adminCardTitle" style={{ marginBottom: '20px' }}>Admin Online Sekarang</div>
          {loadingOnline ? (
            <div style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>Memuat daftar admin...</div>
          ) : (
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {onlineAdmins.map((a) => (
                  <tr key={a.id}>
                    <td style={{ color: '#fff', fontWeight: '500' }}>{a.email}</td>
                    <td style={{ color: '#94a3b8' }}>{a.role}</td>
                    <td>
                      <span className={a.online ? "adminPillOnline" : "adminPillOffline"}>
                        {a.online ? "Online" : "Offline"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* AKTIVITAS TERBARU TABLE */}
        <section className="card" style={{ padding: '24px' }}>
          <div className="adminCardTitle" style={{ marginBottom: '20px' }}>Aktivitas Admin Terbaru</div>
          {loadingActivity ? (
            <div style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>Memuat aktivitas terbaru...</div>
          ) : (
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Admin</th>
                  <th>Target</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: '#64748b', fontSize: '13px' }}>{formatRelativeTime(log.createdAt)}</td>
                    <td style={{ color: '#fff', fontWeight: '500' }}>{log.adminEmail}</td>
                    <td style={{ color: '#94a3b8' }}>{log.targetEmail ?? '-'}</td>
                    <td><ActionBadge action={log.action} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

      </div>
    </AdminShell>
  );
}