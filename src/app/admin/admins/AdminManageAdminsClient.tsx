"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminGet, adminPost } from "@/lib/admin/apiClient";
import { useAdminToast } from "../_components/AdminToastProvider";

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
      const message = e instanceof Error ? e.message : "Gagal load data admin";
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
      pushToast({ kind: "success", message: `Role admin berhasil diubah menjadi ${role}.` });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gagal update role admin";
      pushToast({ kind: "error", message });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div style={{ overflowX: "auto" }}>
      {error && (
        <div className="small" style={{ marginBottom: 8 }}>
          Error: {error}
        </div>
      )}

      {!initialLoading && rows.length === 0 && !error && (
        <div className="small" style={{ marginBottom: 8 }}>
          Belum ada admin yang terdaftar di aplikasi.
        </div>
      )}

      <>
        <div className="row" style={{ marginBottom: 10, gap: 8, alignItems: "center" }}>
          <input
            className="input"
            style={{ maxWidth: 260 }}
            placeholder="Cari admin berdasar email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="input"
            style={{ maxWidth: 180, paddingRight: 24 }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          >
            <option value="all">Semua role</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </select>
        </div>

        <table className="adminTable">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Last seen</th>
              <th>Last sign-in</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {initialLoading && rows.length === 0 &&
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="skeletonRow">
                  <td>
                    <span className="skeletonBox" />
                  </td>
                  <td>
                    <span className="skeletonBox" />
                  </td>
                  <td>
                    <span className="skeletonBox" />
                  </td>
                  <td>
                    <span className="skeletonBox" />
                  </td>
                  <td>
                    <span className="skeletonBox" />
                  </td>
                </tr>
              ))}

            {filteredRows.map((a) => {
              const lastSeenDisplay = a.online
                ? "Sekarang"
                : a.lastSeenAt
                  ? new Date(a.lastSeenAt).toLocaleString("id-ID")
                  : "-";
              const lastSignIn = a.lastSignInAt
                ? new Date(a.lastSignInAt).toLocaleString("id-ID")
                : "-";
              const isSuperAdmin = a.role === "super_admin";

              return (
                <tr key={a.id}>
                  <td className="small">{a.email ?? a.id}</td>
                  <td className="small">{a.role}</td>
                  <td className="small">{lastSeenDisplay}</td>
                  <td className="small">{lastSignIn}</td>
                  <td>
                    {isSuperAdmin ? (
                      <span className="small">Super admin tidak dapat diubah di sini.</span>
                    ) : (
                      <div className="adminActionGroup">
                        <button
                          type="button"
                          className="btn btnSm btnGhost"
                          disabled={loadingId === a.id}
                          onClick={() => void updateRole(a.id, "verified_seller")}
                        >
                          Demote ke verified_seller
                        </button>
                        <button
                          type="button"
                          className="btn btnSm btnGhost"
                          disabled={loadingId === a.id}
                          onClick={() => void updateRole(a.id, "buyer")}
                        >
                          Demote ke buyer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {!initialLoading && filteredRows.length === 0 && (
              <tr>
                <td className="small" colSpan={5}>
                  Tidak ada admin yang cocok dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </>
    </div>
  );
}