import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminServer } from '@/lib/supabase/adminServerClient';
import { requireAdmin } from '@/lib/admin/serverRequireAdmin';

type AppRole = 'buyer' | 'verified_seller' | 'admin' | 'super_admin';

type OnlineAdmin = {
  id: string;
  email: string | null;
  role: AppRole;
  lastSignInAt: string | null;
  lastSeenAt: string | null;
  online: boolean;
};

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const sb = supabaseAdminServer();

  const { data: appUsers, error } = await sb
    .from('users')
    .select('id, role')
    .in('role', ['admin', 'super_admin']);

  if (error || !appUsers) {
    return NextResponse.json({ error: error?.message ?? 'Failed to load admins' }, { status: 500 });
  }

  const enriched: OnlineAdmin[] = [];
  const now = Date.now();
  // Window pendek (mis. 1 menit) berdasarkan heartbeat dari browser.
  const ONLINE_WINDOW_MS = 60 * 1000; // 1 menit.

  // Ambil snapshot user auth sekali saja untuk menghindari banyak request getUserById.
  const { data: authPage, error: authListErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const authMap = new Map<
    string,
    {
      email: string | null;
      lastSignInAt: string | null;
    }
  >();

  if (!authListErr && authPage?.users) {
    for (const user of authPage.users) {
      authMap.set(user.id, {
        email: user.email ?? null,
        lastSignInAt: (user.last_sign_in_at as string | null) ?? null,
      });
    }
  }

  // Ambil semua heartbeat terbaru dari admin_online_sessions.
  const { data: sessions } = await sb
    .from('admin_online_sessions')
    .select('admin_user_id, last_seen_at');

  const lastSeenMap = new Map<string, number>();
  sessions?.forEach((s) => {
    const t = s.last_seen_at ? new Date(s.last_seen_at as string).getTime() : null;
    if (t) {
      lastSeenMap.set(s.admin_user_id as string, t);
    }
  });

  for (const u of appUsers) {
    const auth = authMap.get(u.id as string) ?? { email: null, lastSignInAt: null };
    const lastSeenMs = lastSeenMap.get(u.id as string) ?? null;
    const online = !!lastSeenMs && now - lastSeenMs < ONLINE_WINDOW_MS;
    const lastSeenAt = lastSeenMs ? new Date(lastSeenMs).toISOString() : null;

    enriched.push({
      id: u.id as string,
      role: u.role as AppRole,
      email: auth.email,
      lastSignInAt: auth.lastSignInAt,
      lastSeenAt,
      online,
    });
  }

  enriched.sort((a, b) => {
    const aOnline = a.online ? 0 : 1;
    const bOnline = b.online ? 0 : 1;
    if (aOnline !== bOnline) return aOnline - bOnline;
    const aTs = a.lastSeenAt ?? a.lastSignInAt ?? '';
    const bTs = b.lastSeenAt ?? b.lastSignInAt ?? '';
    return bTs.localeCompare(aTs);
  });

  return NextResponse.json({ admins: enriched });
}