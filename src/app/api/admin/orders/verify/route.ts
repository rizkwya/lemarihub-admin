import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdminServer } from '@/lib/supabase/adminServerClient';
import { requireAdmin } from '@/lib/admin/serverRequireAdmin';

import type { OrderRow } from '@/app/admin/orders/AdminOrdersTableClient';

type Body = {
  orderId: string;
  action: 'approve' | 'reject';
};

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const body = (await req.json()) as Body;
  if (!body?.orderId || (body.action !== 'approve' && body.action !== 'reject')) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const sb = supabaseAdminServer();

  if (body.action === 'approve') {
    const patch = {
      payment_verified_at: new Date().toISOString(),
      payment_verified_by: gate.userId,
    };

    const { data, error } = await sb
      .from('orders')
      .update(patch)
      .eq('id', body.orderId)
      .select(
        'id, created_at, buyer_id, seller_id, product_id, total_amount, product_price, status, payment_proof_url, payment_verified_at',
      )
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Order not found' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, order: data as OrderRow });
  }

  // body.action === 'reject'
  const patch = {
    payment_proof_url: null,
    payment_verified_at: null,
    payment_verified_by: null,
  };

  const { data, error } = await sb
    .from('orders')
    .update(patch)
    .eq('id', body.orderId)
    .select(
      'id, created_at, buyer_id, seller_id, product_id, total_amount, product_price, status, payment_proof_url, payment_verified_at',
    )
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Order not found' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, order: data as OrderRow });
}