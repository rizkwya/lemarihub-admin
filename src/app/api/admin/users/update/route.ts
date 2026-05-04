import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminServer } from '@/lib/supabase/adminServerClient';
import { requireAdmin } from '@/lib/admin/serverRequireAdmin';
import { requireSuperAdmin } from '@/lib/admin/serverRequireSuperAdmin';

type AppRole = 'buyer' | 'verified_seller' | 'admin' | 'super_admin';

type Body = {
  userId: string;
  role?: AppRole;
  kyc_status?: string;
};

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const body = (await req.json()) as Body;
  if (!body?.userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let previousUser: { role: AppRole; kyc_status?: string } | null = null;

  // Only super_admin can grant/revoke admin privileges.
  // Regular admins can still set verified_seller and update KYC status.
  if (body.role) {
    // Safety: don't allow demoting yourself from super_admin via this endpoint.
    // (It reduces the chance of lockout.)
    if (body.userId === gate.userId && body.role !== 'super_admin') {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    const sb = supabaseAdminServer();
    const { data: currentUser, error: currentErr } = await sb
      .from('users')
      .select('role, kyc_status')
      .eq('id', body.userId)
      .maybeSingle();

    previousUser = currentUser as { role: AppRole; kyc_status?: string } | null;
    const currentRole = previousUser?.role;
    if (currentErr || !currentRole) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Any update that sets role to admin/super_admin OR modifies an existing admin/super_admin
    // must be performed by a super_admin.
    const touchesPrivilegedRole =
      currentRole === 'admin' ||
      currentRole === 'super_admin' ||
      body.role === 'admin' ||
      body.role === 'super_admin';

    if (touchesPrivilegedRole) {
      const superGate = await requireSuperAdmin(req);
      if (!superGate.ok) {
        return NextResponse.json({ error: superGate.message }, { status: superGate.status });
      }
    }

    patch.role = body.role;
  }
  if (body.kyc_status) patch.kyc_status = body.kyc_status;

  if (Object.keys(patch).length <= 1) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const sb = supabaseAdminServer();
  const { data, error } = await sb
    .from('users')
    .update(patch)
    .eq('id', body.userId)
    .select('id, role, kyc_status, updated_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Fire-and-forget activity log; failures here shouldn't break the main action.
  try {
    const fromRole = previousUser?.role ?? null;
    const fromKyc = previousUser?.kyc_status ?? null;
    const toRole = (data as { role?: AppRole } | null)?.role ?? fromRole;
    const toKyc = (data as { kyc_status?: string | null } | null)?.kyc_status ?? fromKyc;

    let action = '';
    if (fromRole !== toRole && toRole) {
      action = `Role: ${fromRole ?? '-'} → ${toRole}`;
    }
    if (fromKyc !== toKyc) {
      const kAction = `KYC: ${fromKyc ?? '-'} → ${toKyc ?? '-'}`;
      action = action ? `${action}; ${kAction}` : kAction;
    }

    if (action) {
      await sb.from('admin_activity_logs').insert({
        admin_user_id: gate.userId,
        target_user_id: body.userId,
        action,
      });
    }
  } catch {
    // ignore
  }
  return NextResponse.json({ ok: true, user: data });
}