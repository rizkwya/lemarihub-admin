'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browserClient';
import { env } from '@/lib/env';

function ForgotPasswordWebPageInner() {
    const searchParams = useSearchParams();
    const supabase = useMemo(() => supabaseBrowser(), []);
    const appBaseUrl = env.appBaseUrl;

    const [email, setEmail] = useState(searchParams.get('email') ?? '');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const safeEmail = email.trim();
        if (!safeEmail) {
            setError('Email tidak boleh kosong.');
            return;
        }

        setLoading(true);
        setError(null);

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(safeEmail, {
            // For recovery flows we redirect directly to reset page to avoid OAuth state mismatches.
            redirectTo: `${appBaseUrl}/reset-password`,
        });

        if (resetError) {
            setError(resetError.message);
            setLoading(false);
            return;
        }

        setLoading(false);
        setSent(true);
    }

    return (
        <div className="authShell">
            <div className="authCard">
                <div className="authBadge">Password Recovery</div>
                <h1 className="authHeaderTitle">Lupa Password</h1>
                <p className="authHeaderSubtitle">Masukkan email akun kamu, lalu cek inbox untuk link reset.</p>

                {sent ? (
                    <>
                        <div className="authAlert" style={{ borderColor: 'rgba(34, 197, 94, 0.8)', background: 'rgba(34, 197, 94, 0.12)' }}>
                            Link reset sudah dikirim. Cek inbox dan folder spam email kamu.
                        </div>
                        <Link href="/login" className="btn btn-primary">Kembali ke Login</Link>
                    </>
                ) : (
                    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
                        <label className="small" htmlFor="email">Email</label>
                        <input
                            id="email"
                            className="input"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            placeholder="nama@email.com"
                        />

                        {error && <div className="authAlert">{error}</div>}

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Mengirim...' : 'Kirim Link Reset'}
                        </button>

                        <Link href="/login" className="btn btn-ghost">Kembali ke Login</Link>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function ForgotPasswordWebPage() {
    return (
        <Suspense
            fallback={
                <div className="authShell">
                    <div className="authCard">
                        <div className="authBadge">Password Recovery</div>
                        <h1 className="authHeaderTitle">Lupa Password</h1>
                        <p className="small">Memuat halaman...</p>
                    </div>
                </div>
            }
        >
            <ForgotPasswordWebPageInner />
        </Suspense>
    );
}