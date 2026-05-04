"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

export type AdminToastKind = "success" | "error" | "info";

export type AdminToast = {
  id: number;
  kind: AdminToastKind;
  message: string;
};

type AdminToastContextValue = {
  pushToast: (toast: Omit<AdminToast, "id">) => void;
};

const AdminToastContext = createContext<AdminToastContextValue | null>(null);

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<AdminToast[]>([]);

  // Fungsi manual untuk menghapus (saat klik tombol x)
  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // LOGIKA AUTO-DISMISS MENGGUNAKAN useEffect
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        // Menghapus toast pertama (yang paling lama muncul)
        setToasts((prev) => prev.slice(1));
      }, 3000); // 3 detik

      return () => clearTimeout(timer); // Penting untuk membersihkan timer
    }
  }, [toasts]);

  const value = useMemo<AdminToastContextValue>(
    () => ({
      pushToast: ({ kind, message }) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setToasts((prev) => [...prev, { id, kind, message }]);
      },
    }),
    []
  );

  return (
    <AdminToastContext.Provider value={value}>
      {children}

      <div className="adminToastStack" style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none' // Agar area kosong di sekitar stack tidak menghalangi klik di bawahnya
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`adminToast adminToast-${t.kind}`}
            onClick={() => dismiss(t.id)}
            style={{
              pointerEvents: 'auto', // Aktifkan klik kembali untuk toast-nya saja
              cursor: 'pointer',
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            <span className="adminToastMessage">{t.message}</span>
            <button
              type="button"
              className="adminToastClose"
              aria-label="Close notification"
              onClick={(e) => {
                e.stopPropagation();
                dismiss(t.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </AdminToastContext.Provider>
  );
}

export function useAdminToast() {
  const ctx = useContext(AdminToastContext);
  if (!ctx) {
    throw new Error("useAdminToast must be used inside <AdminToastProvider>");
  }
  return ctx;
}