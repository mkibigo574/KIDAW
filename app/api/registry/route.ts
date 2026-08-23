import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";

// GET /api/registry
// The full member register with contribution totals, for any officer whose
// role carries "registry.read".
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "registry.read");
  if (!auth.ok) return auth.res;
  const { db, official } = auth.ctx;

  const { data: members, error } = await db
    .from("members")
    .select("id, member_number, full_name, email, branch, status, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: sums } = await db
    .from("contributions")
    .select("member_id, amount_cents");
  const totals = new Map<string, number>();
  for (const c of sums ?? []) {
    totals.set(c.member_id, (totals.get(c.member_id) ?? 0) + c.amount_cents);
  }

  return NextResponse.json({
    members: (members ?? []).map((m) => ({
      ...m,
      total_cents: totals.get(m.id) ?? 0,
    })),
    // Lets the page show only the controls this officer may actually use.
    roles: official.roles,
    permissions: official.permissions,
  });
}
