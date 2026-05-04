import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminServer } from "@/lib/supabase/adminServerClient";
import { requireAdmin } from "@/lib/admin/serverRequireAdmin";

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const sb = supabaseAdminServer();

  const { error } = await sb
    .from("admin_online_sessions")
    .upsert({ admin_user_id: gate.userId, last_seen_at: new Date().toISOString() });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const sb = supabaseAdminServer();

  const { error } = await sb
    .from("admin_online_sessions")
    .delete()
    .eq("admin_user_id", gate.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}