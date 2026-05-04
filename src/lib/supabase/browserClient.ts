import { createClient } from '@supabase/supabase-js';
import { assertClientEnv, env } from '@/lib/env';

let _client: ReturnType<typeof createClient> | null = null;

export function supabaseBrowser() {
  if (typeof window === 'undefined') {
    // This module may get imported during build/prerender.
    // We only support using Supabase client in the browser.
    return new Proxy(
      {},
      {
        get() {
          throw new Error('supabaseBrowser() called on the server');
        },
      },
    ) as unknown as ReturnType<typeof createClient>;
  }
  if (_client) return _client;
  assertClientEnv();
  _client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}