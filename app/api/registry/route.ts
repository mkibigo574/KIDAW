import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/registry
// Officials-only view of the full member register with contribution totals.
// Access is limited to signed-in users whose email is in OFFICIALS_EMAILS
// (comma-separated list in the environment).
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: userData, error: authError } = await db.auth.getUser(token);
  const email = userData.user?.email?.toLowerCase();
  if (authError || !email) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const officials = (process.env.OFFICIALS_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!officials.includes(email)) {
    return NextResponse.json(
      { error: "The register is available to officials only." },
      { status: 403 }
    );
  }

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
  });
}
