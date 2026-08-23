import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { recordAudit } from "@/lib/audit";

// Complete months between two dates — a member who joined three weeks ago owes
// nothing yet.
function monthsBetween(from: Date, to: Date) {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

// GET /api/arrears — who is behind on their contributions, and by how much.
//
// Arrears are computed from the ledger every time rather than stored, so a
// payment posted a moment ago is reflected immediately and no stale flag can
// contradict the accounts.
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "ledger.read");
  if (!auth.ok) return auth.res;
  const { db, official } = auth.ctx;

  const [{ data: settingRows }, { data: members }, { data: entries }] =
    await Promise.all([
      db.from("association_settings").select("key, value"),
      db
        .from("members")
        .select("id, member_number, full_name, email, phone, status, created_at")
        .is("deleted_at", null)
        .order("member_number"),
      db.from("contributions").select("member_id, amount_cents, type, paid_at"),
    ]);
  const settings = Object.fromEntries(
    (settingRows ?? []).map((r) => [r.key, r.value])
  );
  const monthlyCents = Number(settings.monthly_contribution_cents ?? 2500);
  const graceMonths = Number(settings.arrears_grace_months ?? 1);

  // Reversals carry a negative amount, so summing gives the net position.
  const paid = new Map<string, { contributions: number; registration: number; last: string | null }>();
  for (const e of entries ?? []) {
    const row = paid.get(e.member_id) ?? { contributions: 0, registration: 0, last: null };
    if (e.type === "registration") row.registration += e.amount_cents;
    else row.contributions += e.amount_cents;
    if (e.amount_cents > 0 && (!row.last || e.paid_at > row.last)) row.last = e.paid_at;
    paid.set(e.member_id, row);
  }

  const today = new Date();
  const rows = (members ?? []).map((m) => {
    const p = paid.get(m.id) ?? { contributions: 0, registration: 0, last: null };
    const monthsAsMember = monthsBetween(new Date(m.created_at), today);
    const chargeableMonths = Math.max(0, monthsAsMember - graceMonths);
    const expectedCents = chargeableMonths * monthlyCents;
    const arrearsCents = Math.max(0, expectedCents - p.contributions);

    return {
      id: m.id,
      member_number: m.member_number,
      full_name: m.full_name,
      email: m.email,
      phone: m.phone,
      status: m.status,
      months_as_member: monthsAsMember,
      expected_cents: expectedCents,
      paid_cents: p.contributions,
      arrears_cents: arrearsCents,
      months_behind: monthlyCents > 0 ? Math.floor(arrearsCents / monthlyCents) : 0,
      registration_outstanding: p.registration <= 0,
      last_contribution: p.last,
    };
  });

  const inArrears = rows.filter((r) => r.arrears_cents > 0);

  return NextResponse.json({
    rows,
    summary: {
      members: rows.length,
      in_arrears: inArrears.length,
      total_arrears_cents: inArrears.reduce((s, r) => s + r.arrears_cents, 0),
      registration_outstanding: rows.filter((r) => r.registration_outstanding).length,
      monthly_contribution_cents: monthlyCents,
      arrears_grace_months: graceMonths,
    },
    permissions: official.permissions,
  });
}

// PATCH /api/arrears — record the contribution rate the committee has agreed.
// Setting dues is a governance decision, so it sits with the Chairperson while
// the Treasurer reports against it.
export async function PATCH(req: NextRequest) {
  const auth = await requirePermission(req, "settings.manage");
  if (!auth.ok) return auth.res;
  const { db, email: actor } = auth.ctx;

  const { monthlyAmount, graceMonths } = await req.json();
  const patch: Record<string, number> = {};

  if (monthlyAmount !== undefined) {
    const cents = Math.round(Number(monthlyAmount) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      return NextResponse.json(
        { error: "Enter the agreed monthly contribution." },
        { status: 400 }
      );
    }
    patch.monthly_contribution_cents = cents;
  }
  if (graceMonths !== undefined) {
    const months = Math.trunc(Number(graceMonths));
    if (!Number.isFinite(months) || months < 0 || months > 12) {
      return NextResponse.json(
        { error: "The grace period must be between 0 and 12 months." },
        { status: 400 }
      );
    }
    patch.arrears_grace_months = months;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const { data: existing } = await db
    .from("association_settings")
    .select("key, value")
    .in("key", Object.keys(patch));
  const before = Object.fromEntries((existing ?? []).map((r) => [r.key, r.value]));

  for (const [key, value] of Object.entries(patch)) {
    const { error } = await db
      .from("association_settings")
      .upsert(
        { key, value, updated_at: new Date().toISOString(), updated_by: actor },
        { onConflict: "key" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAudit(db, {
    actor,
    action: "settings.update",
    entity: "association_settings",
    entityId: Object.keys(patch).join(","),
    before,
    after: patch,
  });

  return NextResponse.json({ ok: true });
}
