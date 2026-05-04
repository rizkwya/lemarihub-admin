import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminServer } from '@/lib/supabase/adminServerClient';
import { requireAdmin } from '@/lib/admin/serverRequireAdmin';

type AppRole = 'buyer' | 'verified_seller' | 'admin' | 'super_admin';

export type AdminListItem = {
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: AdminListItem[] = [];

  if (appUsers && appUsers.length > 0) {
    const ids = appUsers.map((u) => u.id as string);

    // Get last_seen_at for these admins
    const { data: sessions } = await sb
      .from('admin_online_sessions')
      .select('admin_user_id, last_seen_at')
      .in('admin_user_id', ids);

    const now = Date.now();
    const ONLINE_WINDOW_MS = 60 * 1000; // 1 menit, sama seperti /api/admin/online

    const lastSeenMap = new Map<
      string,
      {
        iso: string | null;
        online: boolean;
      }
    >();

    sessions?.forEach((s) => {
      const iso = (s.last_seen_at as string | null) ?? null;
      const ts = iso ? new Date(iso).getTime() : null;
      const online = !!ts && now - ts < ONLINE_WINDOW_MS;
      lastSeenMap.set(s.admin_user_id as string, { iso, online });
    });

    // Fetch auth metadata (email, last_sign_in_at) in a single call
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

    for (const u of appUsers) {
      const auth = authMap.get(u.id as string) ?? { email: null, lastSignInAt: null };
      const presence = lastSeenMap.get(u.id as string) ?? { iso: null, online: false };
      rows.push({
        id: u.id as string,
        role: u.role as AppRole,
        email: auth.email,
        lastSignInAt: auth.lastSignInAt,
        lastSeenAt: presence.iso,
        online: presence.online,
      });
    }
  }

  rows.sort((a, b) => {
    // super_admin first
    if (a.role === 'super_admin' && b.role !== 'super_admin') return -1;
    if (b.role === 'super_admin' && a.role !== 'super_admin') return 1;
    return (a.email ?? '').localeCompare(b.email ?? '');
  });

  return NextResponse.json({ admins: rows });
}