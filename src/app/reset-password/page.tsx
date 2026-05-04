'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browserClient';

function scrubResetUrl() {
    if (typeof window === 'undefined') return;
    window.history.replaceState({}, document.title, window.location.pathname);
}

function readHashTokens() {
    if (typeof window === 'undefined' || !window.location.hash) return { accessToken: null, refreshToken: null };

    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);

    return {
        accessToken: params.get('access_token'),
        refreshToken: params.get('refresh_token'),
    };
}

function readQueryTokens(searchParams: URLSearchParams) {
    return {
        accessToken: searchParams.get('access_token'),
        refreshToken: searchParams.get('refresh_token'),
        tokenHash: searchParams.get('token_hash'),
        type: searchParams.get('type'),
    };
}

function ResetPasswordPageInner() {
    const searchParams = useSearchParams();
    const supabase = useMemo(() => supabaseBrowser(), []);

    const [loadingSession, setLoadingSession] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function bootstrapRecoverySession() {
            try {
                const errorCode = searchParams.get('error_code');
                if (errorCode === 'otp_expired' || errorCode === 'access_denied') {
                    setError('Link reset sudah kadaluarsa atau sudah terpakai. Minta link baru lalu klik link terbaru satu kali.');
                    return;
                }

                const { accessToken: queryAccessToken, refreshToken: queryRefreshToken, tokenHash, type } = readQueryTokens(searchParams);
                const code = searchParams.get('code');
                if (code) {
                    const { error: exchError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchError) {
                        const message = exchError.message.toLowerCase().includes('code verifier')
                            ? 'Link reset ini tidak valid atau sudah kedaluwarsa. Silakan minta link baru.'
                            : exchError.message;
                        setError(message);
                        return;
                    }
                    scrubResetUrl();
                } else if (tokenHash && (type == null || type === 'recovery')) {
                    const { error: verifyError } = await supabase.auth.verifyOtp({
                        type: 'recovery',
                        token_hash: tokenHash,
                    });
                    if (verifyError) {
                        setError('Link reset ini tidak valid atau sudah kadaluarsa. Silakan minta link baru.');
                        return;
                    }
                    scrubResetUrl();
                } else {
                    const hashTokens = readHashTokens();
                    const accessToken = hashTokens.accessToken ?? queryAccessToken;
                    const refreshToken = hashTokens.refreshToken ?? queryRefreshToken;
                    if (accessToken && refreshToken) {
                        const { error: setSessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                        if (setSessionError) {
                            setError(setSessionError.message);
                            return;
                        }
                        scrubResetUrl();
                    }
                }

                const { data, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) {
                    setError(sessionError.message);
                    return;
                }

                if (!data.session) {
                    setError('Link reset tidak valid atau sudah kadaluarsa. Silakan minta link baru.');
                }
            } finally {
                if (!cancelled) setLoadingSession(false);
            }
        }

        void bootstrapRecoverySession();
        return () => {
            cancelled = true;
        };
    }, [searchParams, supabase]);

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (password.length < 8) {
            setError('Password minimal 8 karakter.');
            return;
        }
        if (password !== confirm) {
            setError('Konfirmasi password tidak cocok.');
            return;
        }

        setSaving(true);
        setError(null);

        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
            setError(updateError.message);
            setSaving(false);
            return;
        }

        await supabase.auth.signOut();
        setSaving(false);
        setSuccess(true);
    }

    return (
        <div className="authShell">
            <div className="authCard">
                <div className="authBadge">Password Recovery</div>
                <h1 className="authHeaderTitle">Reset Password</h1>
                <p className="authHeaderSubtitle">Masukkan password baru untuk akun kamu.</p>

                {loadingSession ? (
                    <p className="small">Memverifikasi link reset...</p>
                ) : success ? (
                    <>
                        <div className="authAlert" style={{ borderColor: 'rgba(34, 197, 94, 0.8)', background: 'rgba(34, 197, 94, 0.12)' }}>
                            Password berhasil diubah. Silakan masuk dengan password baru.
                        </div>
                    </>
                ) : (
                    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
                        <label className="small" htmlFor="password">Password baru</label>
                        <input
                            id="password"
                            className="input"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={saving || !!error?.includes('Link reset')}
                        />

                        <label className="small" htmlFor="confirm">Konfirmasi password baru</label>
                        <input
                            id="confirm"
                            className="input"
                            type="password"
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            disabled={saving || !!error?.includes('Link reset')}
                        />

                        {error && <div className="authAlert">{error}</div>}

                        <button type="submit" className="btn btn-primary" disabled={saving || !!error?.includes('Link reset')}>
                            {saving ? 'Menyimpan...' : 'Simpan Password Baru'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="authShell">
                    <div className="authCard">
                        <div className="authBadge">Password Recovery</div>
                        <h1 className="authHeaderTitle">Reset Password</h1>
                        <p className="small">Memuat halaman...</p>
                    </div>
                </div>
            }
        >
            <ResetPasswordPageInner />
        </Suspense>
    );
}