import { supabaseBrowser } from '@/lib/supabase/browserClient';

export type AdminGuardResult =
  | { ok: true; userId: string; role: AppRole; email: string | null }
  | { ok: false; reason: 'SIGNED_OUT' | 'NOT_ADMIN' };

type AppRole = 'buyer' | 'verified_seller' | 'admin' | 'super_admin';

/**
 * Client-side guard only.
 * Real security must be enforced via Supabase RLS.
 */
export async function requireAdminClient(): Promise<AdminGuardResult> {
  const supabase = supabaseBrowser();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: 'SIGNED_OUT' };

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const row = data as { role: AppRole } | null;
  if (error || !row) return { ok: false, reason: 'NOT_ADMIN' };
  if (row.role !== 'admin' && row.role !== 'super_admin') return { ok: false, reason: 'NOT_ADMIN' };

  return { ok: true, userId: user.id, role: row.role, email: user.email ?? null };
}