import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminServer } from '@/lib/supabase/adminServerClient';
import { requireAdmin } from '@/lib/admin/serverRequireAdmin';

type Body = {
  bucket: string;
  path: string;
  expiresIn?: number;
};

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const body = (await req.json()) as Body;
  if (!body?.bucket || !body?.path) return NextResponse.json({ error: 'Missing bucket or path' }, { status: 400 });

  const sb = supabaseAdminServer();
  const expiresIn = Math.min(Math.max(body.expiresIn ?? 60 * 10, 60), 60 * 60); // 1m..60m

  const { data, error } = await sb.storage.from(body.bucket).createSignedUrl(body.path, expiresIn);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl, expiresIn });
}