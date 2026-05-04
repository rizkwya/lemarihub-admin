import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/serverRequireAdmin';
import { supabaseAdminServer } from '@/lib/supabase/adminServerClient';

type KycRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  kyc_status: string;
  kyc_ktp_image_url: string | null;
  kyc_selfie_image_url: string | null;
  kyc_submitted_at: string | null;
};

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const sb = supabaseAdminServer();

  const { data, error } = await sb
    .from('users')
    .select('id, full_name, phone, kyc_status, kyc_ktp_image_url, kyc_selfie_image_url, kyc_submitted_at')
    .eq('kyc_status', 'pending_verification')
    .order('kyc_submitted_at', { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build signed links if paths look like storage keys (not full http urls)
  async function toSigned(bucket: string, v: string | null) {
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    const { data, error } = await sb.storage.from(bucket).createSignedUrl(v, 60 * 15);
    if (error) return null;
    return data.signedUrl;
  }

  const rows = (data ?? []) as KycRow[];
  const items = await Promise.all(
    rows.map(async (row) => {
      const kyc_ktp_link = await toSigned('kyc', row.kyc_ktp_image_url);
      const kyc_selfie_link = await toSigned('kyc', row.kyc_selfie_image_url);
      return { ...row, kyc_ktp_link, kyc_selfie_link };
    }),
  );

  return NextResponse.json({ items });
}