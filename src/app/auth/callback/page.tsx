'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browserClient';

function AuthCallbackInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const flowType = searchParams.get('type');
    const redirectTo = searchParams.get('redirectTo') ?? '/admin';

    const supabase = useMemo(() => supabaseBrowser(), []);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            // Route non-admin auth flows explicitly so they never land on admin dashboard by default.
            if (flowType === 'signup') {
                const tokenHash = searchParams.get('token_hash');
                const target = tokenHash
                    ? `/confirm-signup?token_hash=${encodeURIComponent(tokenHash)}&type=signup`
                    : '/confirm-signup';
                router.replace(target);
                return;
            }
            const code = searchParams.get('code');
            if (code && !searchParams.get('redirectTo')) {
                router.replace(`/confirm-signup?code=${encodeURIComponent(code)}`);
                return;
            }
            if (flowType === 'recovery' && !searchParams.get('redirectTo')) {
                router.replace('/reset-password');
                return;
            }

            // Remove hash fragments early so transient tokens are not kept in the URL bar.
            if (typeof window !== 'undefined' && window.location.hash) {
                window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
            }

            // For OAuth/magic-link flows, Supabase may deliver a `code` query param.
            // We exchange it explicitly to avoid relying on implicit parsing.
            if (code) {
                const { error: exchError } = await supabase.auth.exchangeCodeForSession(code);
                if (cancelled) return;
                if (exchError) {
                    setError(exchError.message);
                    return;
                }
            }

            const { data, error } = await supabase.auth.getSession();
            if (cancelled) return;

            if (error) {
                setError(error.message);
                return;
            }

            if (data.session) {
                router.replace(redirectTo);
            } else {
                router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
            }
        }

        void run();
        return () => {
            cancelled = true;
        };
    }, [flowType, router, redirectTo, searchParams, supabase]);

    return (
        <div className="container">
            <h1>Signing you in…</h1>
            {error && <p className="small">{error}</p>}
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="container">
                    <h1>Signing you in…</h1>
                </div>
            }
        >
            <AuthCallbackInner />
        </Suspense>
    );
}