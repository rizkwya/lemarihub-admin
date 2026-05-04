import { NextRequest } from 'next/server';
import { supabaseAdminServer } from '@/lib/supabase/adminServerClient';
import { getBearerToken, verifyAccessTokenAndGetUserId } from '@/lib/admin/serverAuth';

export type RequireAdminOk = { ok: true; userId: string; role: AppRole };
export type RequireAdminFail = { ok: false; status: 401 | 403; message: string };

type AppRole = 'buyer' | 'verified_seller' | 'admin' | 'super_admin';

export async function requireAdmin(req: NextRequest): Promise<RequireAdminOk | RequireAdminFail> {
  const token = getBearerToken(req);
  if (!token) return { ok: false, status: 401, message: 'Missing Authorization bearer token' };

  const userId = await verifyAccessTokenAndGetUserId(token);
  if (!userId) return { ok: false, status: 401, message: 'Invalid access token' };

  const sb = supabaseAdminServer();
  const { data, error } = await sb.from('users').select('role').eq('id', userId).maybeSingle();

  const row = data as { role: AppRole } | null;
  if (error || !row) return { ok: false, status: 403, message: 'Forbidden' };
  if (row.role !== 'admin' && row.role !== 'super_admin') {
    return { ok: false, status: 403, message: 'Not an admin' };
  }

  return { ok: true, userId, role: row.role };
}