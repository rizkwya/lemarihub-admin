"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminGet, adminPost } from "@/lib/admin/apiClient";
import { useAdminToast } from "../_components/AdminToastProvider";
import { Search, ShieldAlert, ShieldCheck, UserX, ArrowDownRight, Users, Loader2 } from "lucide-react";

export type AdminRow = {
  id: string;
  email: string | null;
  role: "admin" | "super_admin";
  lastSignInAt: string | null;
  lastSeenAt: string | null;
  online: boolean;
};

type Props = {
  initial: AdminRow[];
};

export function AdminManageAdminsClient({ initial }: Props) {
  const [rows, setRows] = useState<AdminRow[]>(initial);
  const [initialLoading, setInitialLoading] = useState<boolean>(initial.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "super_admin">("all");
  const { pushToast } = useAdminToast();

  const refresh = useCallback(async () => {
    setError(null);
    setInitialLoading(true);
    try {
      const data = await adminGet<{ admins: AdminRow[] }>("/api/admin/admins/list");
      setRows(data.admins ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gagal memuat data staf admin";
      setError(message);
      pushToast({ kind: "error", message });
    } finally {
      setInitialLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (initial.length === 0) {
      void refresh();
    }
  }, [initial.length, refresh]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQuery = !q || (r.email ?? r.id).toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" ? true : r.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [rows, query, roleFilter]);

  async function updateRole(id: string, role: string) {
    setLoadingId(id);
    try {
      await adminPost("/api/admin/users/update", { userId: id, role });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, role: role as AdminRow["role"] } : r)));
      pushToast({ kind: "success", message: `Akses berhasil dicabut. Akun dipindahkan ke grup ${role}.` });
      void refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gagal memperbarui otoritas admin";
      pushToast({ kind: "error", message });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* ALERTS SYSTEM */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium rounded-lg flex items-center gap-2">
          <ShieldAlert size={14} className="flex-shrink-0" />
          <span>Sistem Error: {error}</span>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 placeholder-slate-400 transition-all"
            placeholder="Cari admin berdasarkan alamat email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="bg-white border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-w-[140px] cursor-pointer font-medium"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
        >
          <option value="all">Semua Tingkat Role</option>
          <option value="admin">Admin Standar</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      {/* DATA WORKSPACE TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Akun Pengguna</th>
                <th className="py-3 px-4 text-center">Level Otoritas</th>
                <th className="py-3 px-4">Aktivitas Terakhir</th>
                <th className="py-3 px-4">Sesi Masuk</th>
                <th className="py-3 px-4 text-right">Tindakan Otoritas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {initialLoading && rows.length === 0 ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="p-4"><div className="h-3.5 bg-slate-100 rounded w-48"></div></td>
                    <td className="p-4"><div className="h-5 bg-slate-100 rounded-full w-24 mx-auto"></div></td>
                    <td className="p-4"><div className="h-3.5 bg-slate-100 rounded w-32"></div></td>
                    <td className="p-4"><div className="h-3.5 bg-slate-100 rounded w-32"></div></td>
                    <td className="p-4"><div className="h-7 bg-slate-100 rounded-lg w-40 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 italic bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <UserX size={20} className="text-slate-300" />
                      <span>Tidak ditemukan staf administrator yang cocok dengan kriteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((a) => {
                  const isSuperAdmin = a.role === "super_admin";
                  const isCurrentActionLoading = loadingId === a.id;

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* EMAIL & ONLINE STATUS */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <span 
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${a.online ? 'bg-emerald-500 ring-4 ring-emerald-500/10' : 'bg-slate-300'}`}
                            title={a.online ? "Sedang Aktif" : "Offline"}
                          />
                          <span className="truncate max-w-[220px]">{a.email ?? a.id}</span>
                        </div>
                      </td>

                      {/* BADGE ROLE */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px]">
                            <ShieldCheck size={11} /> Super Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                            Admin Staf
                          </span>
                        )}
                      </td>

                      {/* LAST SEEN */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                        {a.online ? (
                          <span className="text-emerald-600 font-semibold">Aktif Sekarang</span>
                        ) : a.lastSeenAt ? (
                          new Date(a.lastSeenAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* LAST SIGN IN */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                        {a.lastSignInAt ? (
                          new Date(a.lastSignInAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isSuperAdmin ? (
                          <span className="text-[11px] text-slate-400 italic font-light">Hak Akses Permanen</span>
                        ) : (
                          <div className="inline-flex items-center gap-1 bg-slate-50 p-1 border border-slate-200 rounded-lg">
                            <button
                              type="button"
                              disabled={isCurrentActionLoading}
                              onClick={() => void updateRole(a.id, "verified_seller")}
                              className="px-2 py-1 text-[10px] bg-white border border-slate-200 hover:border-amber-200 hover:bg-amber-50 text-slate-600 hover:text-amber-700 font-medium rounded transition-colors disabled:opacity-40 inline-flex items-center gap-0.5"
                            >
                              {isCurrentActionLoading ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <ArrowDownRight size={11} />
                              )}
                              <span>ke Seller</span>
                            </button>
                            <button
                              type="button"
                              disabled={isCurrentActionLoading}
                              onClick={() => void updateRole(a.id, "buyer")}
                              className="px-2 py-1 text-[10px] bg-white border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-medium rounded transition-colors disabled:opacity-40 inline-flex items-center gap-0.5"
                            >
                              {isCurrentActionLoading ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <ArrowDownRight size={11} />
                              )}
                              <span>ke Buyer</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}