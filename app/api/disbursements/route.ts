import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { recordAudit } from "@/lib/audit";

// GET /api/disbursements — payments out of the fund, with the fund's position.
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "ledger.read");
  if (!auth.ok) return auth.res;
  const { db, official } = auth.ctx;

  const [{ data: disbursements, error }, { data: members }, { data: contributions }] =
    await Promise.all([
      db.from("disbursements").select("*").order("created_at", { ascending: false }),
      db
        .from("members")
        .select("id, member_number, full_name")
        .is("deleted_at", null)
        .order("member_number"),
      db.from("contributions").select("amount_cents"),
    ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const byId = new Map((members ?? []).map((m) => [m.id, m]));

  const received = (contributions ?? []).reduce((s, c) => s + c.amount_cents, 0);
  const paidOut = (disbursements ?? [])
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + d.amount_cents, 0);
  const committed = (disbursements ?? [])
    .filter((d) => d.status === "approved")
    .reduce((s, d) => s + d.amount_cents, 0);

  return NextResponse.json({
    disbursements: (disbursements ?? []).map((d) => ({
      ...d,
      member_number: d.member_id ? (byId.get(d.member_id)?.member_number ?? null) : null,
      full_name: d.member_id ? (byId.get(d.member_id)?.full_name ?? "(removed member)") : null,
    })),
    members: members ?? [],
    position: {
      received_cents: received,
      paid_out_cents: paidOut,
      committed_cents: committed,
      // What the fund could still pay out without dipping into approved-but-
      // unpaid commitments.
      available_cents: received - paidOut - committed,
    },
    permissions: official.permissions,
    me: official.email,
  });
}

// POST /api/disbursements — the Treasurer requests a payment out.
// It is not money yet: nothing leaves the fund until the Chairperson approves
// and the Treasurer then records it as paid.
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "disbursement.initiate");
  if (!auth.ok) return auth.res;
  const { db, email: actor } = auth.ctx;

  const { memberId, amount, purpose } = await req.json();

  const amountCents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json(
      { error: "Enter the amount to be paid, greater than zero." },
      { status: 400 }
    );
  }
  if (!purpose?.trim()) {
    return NextResponse.json(
      { error: "State what the payment is for — the Chairperson approves on this." },
      { status: 400 }
    );
  }

  if (memberId) {
    const { data: member } = await db
      .from("members")
      .select("id")
      .eq("id", memberId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }
  }

  const { data: entry, error } = await db
    .from("disbursements")
    .insert({
      member_id: memberId || null,
      amount_cents: amountCents,
      purpose: purpose.trim(),
      initiated_by: actor,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit(db, {
    actor,
    action: "disbursement.request",
    entity: "disbursements",
    entityId: entry.id,
    before: null,
    after: { amount_cents: entry.amount_cents, purpose: entry.purpose, status: entry.status },
  });

  return NextResponse.json({ ok: true, disbursement: entry });
}
