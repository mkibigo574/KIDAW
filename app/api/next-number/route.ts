import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/next-number
// Returns the most recently issued member number and the next in sequence,
// for display on the registration page. The authoritative assignment still
// happens in the database trigger at insert time.
export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("members")
    .select("member_number")
    .not("member_number", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const last = data?.member_number ?? null;
  const lastN = last ? parseInt(last.replace(/\D/g, ""), 10) : 0;
  const next = `KIDAW-${String(lastN + 1).padStart(3, "0")}`;

  return NextResponse.json({ last, next });
}
