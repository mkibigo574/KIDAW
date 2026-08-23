import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { recordAudit } from "@/lib/audit";
import { notify, money } from "@/lib/notify";

const METHODS = ["cash", "bank", "other"] as const;
const TYPES = ["registration", "contribution"] as const;

// GET /api/ledger — the contribution ledger. Any officer with "ledger.read":
// the Treasurer who operates it, and the Chairperson and Records Officer who
// may read but not alter it.
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "ledger.read");
  if (!auth.ok) return auth.res;
  const { db, official } = auth.ctx;

  const [{ data: entries, error }, { data: members }] = await Promise.all([
    db
      .from("contributions")
      .select(
        "id, member_id, amount_cents, currency, type, method, note, recorded_by, reversal_of, stripe_session_id, paid_at"
      )
      .order("paid_at", { ascending: false })
      .limit(500),
    db.from("members").select("id, member_number, full_name").is("deleted_at", null),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const byId = new Map((members ?? []).map((m) => [m.id, m]));

  // An entry that has already been reversed should not be reversible twice.
  const reversed = new Set(
    (entries ?? []).map((e) => e.reversal_of).filter(Boolean) as string[]
  );

  return NextResponse.json({
    entries: (entries ?? []).map((e) => ({
      ...e,
      member_number: byId.get(e.member_id)?.member_number ?? null,
      full_name: byId.get(e.member_id)?.full_name ?? "(removed member)",
      is_reversed: reversed.has(e.id),
    })),
    members: (members ?? []).sort((a, b) =>
      (a.member_number ?? "").localeCompare(b.member_number ?? "")
    ),
    permissions: official.permissions,
  });
}

// POST /api/ledger — record a payment taken outside Stripe (cash or bank).
// Treasurer only. Entries are posted, never edited: see /api/ledger/reverse.
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "ledger.record");
  if (!auth.ok) return auth.res;
  const { db, email: actor } = auth.ctx;

  const { memberId, amount, method, type, note, paidAt, callId } = await req.json();

  const amountCents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json(
      { error: "Enter the amount received, greater than zero." },
      { status: 400 }
    );
  }
  if (!METHODS.includes(method)) {
    return NextResponse.json(
      { error: "Choose how the payment was received: cash, bank or other." },
      { status: 400 }
    );
  }
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: "Choose the payment type." }, { status: 400 });
  }
  if (!note?.trim()) {
    return NextResponse.json(
      { error: "A reference or description is required for an offline payment." },
      { status: 400 }
    );
  }

  const { data: member } = await db
    .from("members")
    .select("id, member_number, status")
    .eq("id", memberId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const { data: entry, error } = await db
    .from("contributions")
    .insert({
      member_id: member.id,
      amount_cents: amountCents,
      currency: "aud",
      type,
      method,
      note: note.trim(),
      recorded_by: actor,
      call_id: callId || null,
      ...(paidAt ? { paid_at: new Date(paidAt).toISOString() } : {}),
    })
    .select("id, amount_cents, type, method, paid_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notify(db, {
    audience: "chairperson",
    event: "ledger.recorded",
    title: `${money(entry.amount_cents)} recorded as ${method}`,
    body: `${member.member_number} — ${note.trim()}`,
    link: "/ledger",
    entityId: entry.id,
    actor,
  });

  await recordAudit(db, {
    actor,
    action: "ledger.record",
    entity: "contributions",
    entityId: entry.id,
    before: null,
    after: { ...entry, member_number: member.member_number, note: note.trim() },
  });

  // A registration paid offline activates the member, exactly as the Stripe
  // webhook does when the same fee is paid by card.
  if (type === "registration" && member.status === "pending") {
    await db.from("members").update({ status: "active" }).eq("id", member.id);
    await recordAudit(db, {
      actor,
      action: "member.status",
      entity: "members",
      entityId: member.id,
      before: { status: "pending" },
      after: { status: "active" },
    });
  }

  return NextResponse.json({ ok: true, entry });
}
