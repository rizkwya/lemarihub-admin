'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browserClient';
import { env } from '@/lib/env';

type AppRole = 'buyer' | 'verified_seller' | 'admin' | 'super_admin';

// Komponen Pembatas yang rapi
function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '10px' }}>
      <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
      <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        atau gunakan email
      </span>
      <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
    </div>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/admin';
  const supabase = useMemo(() => supabaseBrowser(), []);
  const appBaseUrl = env.appBaseUrl;

  const [email, setEmail] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingMagicLink, setLoadingMagicLink] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [signedInButNotAdmin, setSignedInButNotAdmin] = useState<null | { email: string | null }>(null);

  const cooldownRemainingMs = Math.max(0, (cooldownUntil ?? 0) - now);
  const cooldownRemainingSec = Math.ceil(cooldownRemainingMs / 1000);
  const inCooldown = cooldownUntil !== null && cooldownRemainingMs > 0;

  const tryRedirectIfAllowed = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    const { data: roleRow, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = (roleRow as { role: AppRole } | null)?.role ?? null;
    if (error || !role || (role !== 'admin' && role !== 'super_admin')) {
      setSignedInButNotAdmin({ email: user.email ?? null });
      return;
    }

    router.replace(redirectTo);
  }, [redirectTo, router, supabase]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void tryRedirectIfAllowed();
    });
    return () => subscription.unsubscribe();
  }, [supabase, tryRedirectIfAllowed]);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) void tryRedirectIfAllowed();
    }
    void checkSession();
    return () => { cancelled = true; };
  }, [supabase, tryRedirectIfAllowed]);

  useEffect(() => {
    if (!inCooldown) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [inCooldown]);

  async function signInWithGoogle() {
    setLoadingGoogle(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${appBaseUrl}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}` },
    });
    if (error) {
      setMessage(error.message);
      setLoadingGoogle(false);
    }
  }

  async function signInWithMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (inCooldown || !email.trim()) return;
    setLoadingMagicLink(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${appBaseUrl}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}` },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setCooldownUntil(Date.now() + 60000); // 60 detik cooldown
      setMessage('Cek inbox/spam email Anda untuk link login otomatis.');
    }
    setLoadingMagicLink(false);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#020617', padding: '20px', overflow: 'hidden' }}>

      {/* INJECT ANIMASI CSS RGB */}
      <style>{`
        @keyframes spinRGB {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        .rgb-glow-wrapper {
          position: relative;
          max-width: 420px;
          width: 100%;
          border-radius: 20px;
          padding: 2px; /* Ketebalan garis RGB */
          z-index: 1;
        }

        /* Cahaya Pendar RGB (Glow di luar kotak) */
        .rgb-glow-wrapper::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          background: conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #d946ef, #ef4444);
          animation: spinRGB 4s linear infinite;
          z-index: -2;
          filter: blur(28px);
          opacity: 0.6;
        }

        /* Garis Border RGB Bergerak */
        .rgb-border-clipper {
          position: absolute;
          inset: 0;
          border-radius: 20px;
          overflow: hidden;
          z-index: -1;
        }

        .rgb-border-clipper::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 150%;
          height: 150%;
          background: conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #d946ef, #ef4444);
          animation: spinRGB 4s linear infinite;
        }

        /* Latar Belakang Kartu Bagian Dalam */
        .rgb-inner-card {
          position: relative;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 18px;
          padding: 40px 32px;
          z-index: 5;
        }

        /* Hover Effect untuk Google Button */
        .google-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .google-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(255, 255, 255, 0.15);
        }
      `}</style>

      {/* CARD UTAMA DENGAN RGB WRAPPER */}
      <div className="rgb-glow-wrapper">
        <div className="rgb-border-clipper"></div>

        <div className="rgb-inner-card">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>LemariHub Admin</h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>Masuk ke dashboard tim internal.</p>
          </div>

          {signedInButNotAdmin && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '12px', borderRadius: '10px', marginBottom: '20px' }}>
              <div style={{ color: '#f87171', fontWeight: '600', fontSize: '13px' }}>Akses Ditolak</div>
              <p style={{ color: '#fca5a5', fontSize: '12px', margin: '4px 0 0 0' }}>Akun ({signedInButNotAdmin.email}) tidak memiliki izin admin.</p>
            </div>
          )}

          {/* TOMBOL GOOGLE DENGAN LOGO SVG */}
          <button
            className="btn google-btn"
            onClick={signInWithGoogle}
            disabled={loadingGoogle || loadingMagicLink}
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontWeight: '600',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            {/* SVG Logo Google Standard Resmi */}
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            {loadingGoogle ? 'Menghubungkan...' : 'Masuk dengan Google'}
          </button>

          <Divider />

          <form onSubmit={signInWithMagicLink}>
            <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>Email Bisnis</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@lemarihub.com"
              required
              style={{
                width: '100%',
                marginBottom: '16px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                padding: '12px',
                borderRadius: '10px'
              }}
            />
            <button
              className="btn btnPrimary"
              type="submit"
              disabled={loadingMagicLink || loadingGoogle || inCooldown || !email.trim()}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                opacity: (inCooldown || !email.trim()) ? 0.6 : 1
              }}
            >
              {loadingMagicLink ? 'Mengirim...' : inCooldown ? `Tunggu ${cooldownRemainingSec}s` : 'Kirim Magic Link'}
            </button>
          </form>

          {message && (
            <div style={{
              marginTop: '20px', padding: '12px', borderRadius: '10px', fontSize: '12px', textAlign: 'center',
              backgroundColor: message.includes('Cek') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: message.includes('Cek') ? '#34d399' : '#fca5a5',
              border: `1px solid ${message.includes('Cek') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {message}
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '11px', color: '#475569' }}>
            Dashboard ini terbatas hanya untuk tim internal LemariHub.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#020617' }}>
        <p style={{ color: '#818cf8', animation: 'pulse 2s infinite' }}>Menginisialisasi sistem...</p>
      </div>
    }>
      <LoginInner />
    </Suspense>
  );
}