import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminServer } from '@/lib/supabase/adminServerClient';
import { requireAdmin } from '@/lib/admin/serverRequireAdmin';

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const email = new URL(req.url).searchParams.get('email')?.trim() ?? '';
  if (!email) return NextResponse.json({ error: 'Missing email query param' }, { status: 400 });

  const sb = supabaseAdminServer();

  // Find auth user by email
  const { data: authUsers, error: authErr } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  const authUser = authUsers.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
  if (!authUser) return NextResponse.json({ user: null });

  // Fetch app user row
  const { data: userRow, error: userErr } = await sb
    .from('users')
    .select('id, full_name, phone, role, kyc_status, kyc_ktp_image_url, kyc_selfie_image_url, kyc_submitted_at, created_at, updated_at')
    .eq('id', authUser.id)
    .maybeSingle();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });

  return NextResponse.json({
    user: {
      id: authUser.id,
      email: authUser.email,
      email_confirmed_at: authUser.email_confirmed_at,
      last_sign_in_at: authUser.last_sign_in_at,
      app: userRow,
    },
  });
}