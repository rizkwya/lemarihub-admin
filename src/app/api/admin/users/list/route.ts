import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminServer } from '@/lib/supabase/adminServerClient';
import { requireAdmin } from '@/lib/admin/serverRequireAdmin';

export type AppRole = 'buyer' | 'verified_seller' | 'admin' | 'super_admin';

export type AdminUserListItem = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  kyc_status: string;
  created_at: string | null;
  last_sign_in_at: string | null;
};

export type AdminUserListResponse = {
  users: AdminUserListItem[];
};

const VALID_ROLES: AppRole[] = ['buyer', 'verified_seller', 'admin', 'super_admin'];

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const url = new URL(req.url);
  const roleParam = url.searchParams.get('role')?.trim() ?? '';
  const kycParam = url.searchParams.get('kyc_status')?.trim() ?? '';

  const sb = supabaseAdminServer();

  let query = sb
    .from('users')
    .select('id, full_name, phone, role, kyc_status, created_at');

  if (roleParam && VALID_ROLES.includes(roleParam as AppRole)) {
    query = query.eq('role', roleParam as AppRole);
  }

  if (kycParam) {
    query = query.eq('kyc_status', kycParam);
  }

  // Untuk sekarang kita batasi maksimal 500 row supaya ringan.
  query = query.limit(500);

  const { data: appUsers, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users: AdminUserListItem[] = [];

  if (appUsers && appUsers.length > 0) {
    // Ambil metadata auth (email, last_sign_in_at) dalam satu panggilan.
    const { data: authPage, error: authErr } = await sb.auth.admin.listUsers({ perPage: 1000 });

    const authMap = new Map<
      string,
      {
        email: string | null;
        lastSignInAt: string | null;
      }
    >();

    if (!authErr && authPage?.users) {
      for (const user of authPage.users) {
        authMap.set(user.id, {
          email: user.email ?? null,
          lastSignInAt: (user.last_sign_in_at as string | null) ?? null,
        });
      }
    }

    for (const u of appUsers) {
      const auth = authMap.get(u.id as string) ?? { email: null, lastSignInAt: null };
      users.push({
        id: u.id as string,
        full_name: (u.full_name as string | null) ?? null,
        phone: (u.phone as string | null) ?? null,
        role: u.role as AppRole,
        kyc_status: (u.kyc_status as string | null) ?? '',
        created_at: (u.created_at as string | null) ?? null,
        email: auth.email,
        last_sign_in_at: auth.lastSignInAt,
      });
    }
  }

  // Sort by created_at desc as default; fallback ke email kalau null.
  users.sort((a, b) => {
    if (a.created_at && b.created_at) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (a.created_at && !b.created_at) return -1;
    if (!a.created_at && b.created_at) return 1;
    return (a.email ?? '').localeCompare(b.email ?? '');
  });

  return NextResponse.json<AdminUserListResponse>({ users });
}