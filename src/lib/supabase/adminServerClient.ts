import { createClient } from '@supabase/supabase-js';

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

/**
 * Server-side Supabase client using service role key.
 * NEVER import this into client components.
 */
export function supabaseAdminServer() {
  const url = mustGetEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = mustGetEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}