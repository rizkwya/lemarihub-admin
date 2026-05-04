import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminServer } from '@/lib/supabase/adminServerClient';
import { requireAdmin } from '@/lib/admin/serverRequireAdmin';

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const sb = supabaseAdminServer();

  const { data, error } = await sb
    .from('admin_activity_logs')
    .select('id, admin_user_id, target_user_id, action, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    // If the table doesn't exist yet, fail gracefully with an empty list.
    const code = (error as { code?: string }).code;
    if (code === '42P01' || /admin_activity_logs/.test(error.message)) {
      return NextResponse.json({ logs: [], notConfigured: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) return NextResponse.json({ logs: [], notConfigured: false });

  const ids = Array.from(
    new Set([
      ...data.map((d) => d.admin_user_id as string),
      ...data.map((d) => d.target_user_id as string),
    ]),
  );
  const emailMap = new Map<string, string | null>();

  // Ambil snapshot user auth sekali supaya tidak memanggil getUserById berkali-kali.
  const { data: authPage, error: authListErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (!authListErr && authPage?.users) {
    for (const user of authPage.users) {
      if (ids.includes(user.id)) {
        emailMap.set(user.id, user.email ?? null);
      }
    }
  }

  const logs = data.map((row) => ({
    id: row.id as string,
    action: row.action as string,
    createdAt: row.created_at as string,
    adminUserId: row.admin_user_id as string,
    targetUserId: row.target_user_id as string,
    adminEmail: emailMap.get(row.admin_user_id as string) ?? null,
    targetEmail: emailMap.get(row.target_user_id as string) ?? null,
  }));

  return NextResponse.json({ logs, notConfigured: false });
}