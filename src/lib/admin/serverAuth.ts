import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

/**
 * Authenticate admin API requests via Supabase access token:
 * Authorization: Bearer <access_token>
 */
export function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

/**
 * Validates the JWT with Supabase and returns the userId.
 */
export async function verifyAccessTokenAndGetUserId(accessToken: string): Promise<string | null> {
  const url = mustGetEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = mustGetEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error) return null;
  return data.user?.id ?? null;
}