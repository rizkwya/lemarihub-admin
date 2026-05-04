import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminServer } from '@/lib/supabase/adminServerClient';
import { requireAdmin } from '@/lib/admin/serverRequireAdmin';

import type { OrderItemSummary, OrderRow } from '@/app/admin/orders/AdminOrdersTableClient';

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const supabase = supabaseAdminServer();

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, created_at, order_code, buyer_id, seller_id, product_id, payment_id, total_amount, product_price, status, payment_proof_url, payment_verified_at',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = ((data as OrderRow[] | null) ?? []).map((row) => ({ ...row }));

  if (rows.length === 0) {
    return NextResponse.json({ orders: rows });
  }

  const orderIds = rows.map((r) => r.id);
  const buyerIds = Array.from(
    new Set(
      rows
        .map((r) => r.buyer_id)
        .filter((v): v is string => typeof v === 'string' && v.length > 0),
    ),
  );
  const sellerIds = Array.from(
    new Set(
      rows
        .map((r) => r.seller_id)
        .filter((v): v is string => typeof v === 'string' && v.length > 0),
    ),
  );

  // Ambil detail produk per order (nama & harga) untuk ditampilkan di admin.
  const [itemsRes, buyersRes, shopsRes] = await Promise.all([
    supabase
      .from('order_items')
      .select('order_id, product_name, product_price, quantity')
      .in('order_id', orderIds),
    buyerIds.length > 0
      ? supabase.from('users').select('id, full_name').in('id', buyerIds)
      : Promise.resolve({ data: null, error: null } as { data: null; error: null }),
    sellerIds.length > 0
      ? supabase.from('shops').select('seller_id, shop_name').in('seller_id', sellerIds)
      : Promise.resolve({ data: null, error: null } as { data: null; error: null }),
  ]);

  // Map order_items ke masing-masing order.
  if (!itemsRes.error && itemsRes.data) {
    type RawItem = {
      order_id: string;
      product_name: string | null;
      product_price: number | null;
      quantity: number | null;
    };
    const itemsMap = new Map<string, OrderItemSummary[]>();
    for (const it of itemsRes.data as RawItem[]) {
      const orderId = it.order_id;
      const list = itemsMap.get(orderId) ?? [];
      list.push({
        order_id: orderId,
        product_name: it.product_name ?? null,
        product_price: it.product_price ?? null,
        quantity: it.quantity ?? null,
      });
      itemsMap.set(orderId, list);
    }

    for (const row of rows) {
      row.items = itemsMap.get(row.id) ?? [];
    }
  }

  // Map nama buyer.
  if (!buyersRes.error && buyersRes.data) {
    type RawBuyer = { id: string; full_name: string | null };
    const buyerMap = new Map<string, string | null>();
    for (const b of buyersRes.data as RawBuyer[]) {
      buyerMap.set(b.id, b.full_name ?? null);
    }
    for (const row of rows) {
      row.buyer_full_name = row.buyer_id ? buyerMap.get(row.buyer_id) ?? null : null;
    }
  }

  // Map nama toko seller.
  if (!shopsRes.error && shopsRes.data) {
    type RawShop = { seller_id: string; shop_name: string | null };
    const shopMap = new Map<string, string | null>();
    for (const s of shopsRes.data as RawShop[]) {
      shopMap.set(s.seller_id, s.shop_name ?? null);
    }
    for (const row of rows) {
      row.seller_shop_name = row.seller_id ? shopMap.get(row.seller_id) ?? null : null;
    }
  }

  return NextResponse.json({ orders: rows });
}