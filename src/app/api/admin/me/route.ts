import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminServer } from '@/lib/supabase/adminServerClient';
import { requireAdmin } from '@/lib/admin/serverRequireAdmin';

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const sb = supabaseAdminServer();
  const { data: authUserData, error: authErr } = await sb.auth.admin.getUserById(gate.userId);
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  return NextResponse.json({ me: { role: gate.role, email: authUserData.user?.email ?? null } });
}