import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";

// GET /api/audit — the audit trail. Chairperson only: they hold full read
// access, including over the officers who operate the system.
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "audit.read");
  if (!auth.ok) return auth.res;

  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 100) || 100,
    500
  );

  const { data, error } = await auth.ctx.db
    .from("audit_log")
    .select("id, actor_email, action, entity, entity_id, before, after, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}
