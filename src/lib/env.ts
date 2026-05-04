export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  appBaseUrl: process.env.NEXT_PUBLIC_APP_BASE_URL ?? 'https://lemarihub.stackuniversal.web.id',
};

export function assertClientEnv() {
  if (!env.supabaseUrl) throw new Error('Missing env NEXT_PUBLIC_SUPABASE_URL');
  if (!env.supabaseAnonKey) throw new Error('Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!env.appBaseUrl) throw new Error('Missing env NEXT_PUBLIC_APP_BASE_URL');
}