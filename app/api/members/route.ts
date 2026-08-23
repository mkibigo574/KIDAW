import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { recordAudit } from "@/lib/audit";

// POST /api/members — enter a member in the register directly.
// For people who joined at a meeting or paid offline; the Records Officer
// creates the record and the Treasurer posts their payment.
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "members.create");
  if (!auth.ok) return auth.res;
  const { db, email: actor } = auth.ctx;

  const { fullName, email, phone, dateOfBirth, branch, referredBy } =
    await req.json();

  if (!fullName?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "A full name and email address are required." },
      { status: 400 }
    );
  }

  const normalized = email.trim().toLowerCase();
  const { data: existing } = await db
    .from("members")
    .select("id, member_number, deleted_at")
    .eq("email", normalized)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      {
        error: existing.deleted_at
          ? `That email belongs to removed member ${existing.member_number}. Restore that record instead of creating a new one.`
          : `That email is already registered as ${existing.member_number}.`,
      },
      { status: 409 }
    );
  }

  const { data: member, error } = await db
    .from("members")
    .insert({
      full_name: fullName.trim(),
      email: normalized,
      phone: phone?.trim() || null,
      date_of_birth: dateOfBirth?.trim() || null,
      branch: branch?.trim() || null,
      referred_by: referredBy?.trim() || null,
    })
    .select("id, member_number, full_name, email, status")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit(db, {
    actor,
    action: "member.create",
    entity: "members",
    entityId: member.id,
    before: null,
    after: member,
  });

  return NextResponse.json({ ok: true, member });
}
