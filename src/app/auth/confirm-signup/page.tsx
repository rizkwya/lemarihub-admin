'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browserClient';

function ConfirmSignupInner() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verifySignup() {
      try {
        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        let verifyError: { message: string } | null = null;

        if (tokenHash && (type == null || type === 'signup')) {
          const { error } = await supabase.auth.verifyOtp({
            type: 'signup',
            token_hash: tokenHash,
          });
          verifyError = error ? { message: error.message } : null;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          verifyError = error ? { message: error.message } : null;
        } else {
          setError('Link konfirmasi tidak valid atau sudah kadaluarsa.');
          return;
        }

        if (verifyError) {
          const msg = verifyError.message.toLowerCase();
          if (msg.includes('expired') || msg.includes('invalid') || msg.includes('already')) {
            setError('Link konfirmasi tidak valid, sudah terpakai, atau sudah kadaluarsa.');
          } else {
            setError(verifyError.message);
          }
          return;
        }

        // Keep confirmation flow independent from admin web session.
        await supabase.auth.signOut();
        setSuccess(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void verifySignup();
    return () => {
      cancelled = true;
    };
  }, [searchParams, supabase]);

  return (
    <div className="authShell">
      <div className="authCard">
        <div className="authBadge">Akun LemariHub</div>
        <h1 className="authHeaderTitle">Konfirmasi Email</h1>
        <p className="authHeaderSubtitle">Selesaikan aktivasi akun kamu dengan aman.</p>

        {loading ? (
          <p className="small">Memverifikasi konfirmasi akun...</p>
        ) : success ? (
          <div className="authAlert" style={{ borderColor: 'rgba(34, 197, 94, 0.8)', background: 'rgba(34, 197, 94, 0.12)' }}>
            Selamat, akun Anda sudah terdaftar. Silakan login kembali melalui aplikasi LemariHub.
          </div>
        ) : (
          <div className="authAlert">{error ?? 'Terjadi kesalahan saat konfirmasi email.'}</div>
        )}
      </div>
    </div>
  );
}

export default function ConfirmSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="authShell">
          <div className="authCard">
            <div className="authBadge">Akun LemariHub</div>
            <h1 className="authHeaderTitle">Konfirmasi Email</h1>
            <p className="small">Memuat halaman...</p>
          </div>
        </div>
      }
    >
      <ConfirmSignupInner />
    </Suspense>
  );
}
