import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { recordAudit } from "@/lib/audit";

// POST /api/ledger/reverse — correct a posted transaction.
// The ledger is append-only, so a mistake is corrected by posting an equal and
// opposite entry that references the original, leaving both on the record.
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "ledger.reverse");
  if (!auth.ok) return auth.res;
  const { db, email: actor } = auth.ctx;

  const { contributionId, reason } = await req.json();

  if (!reason?.trim()) {
    return NextResponse.json(
      { error: "A reason is required — it becomes part of the ledger." },
      { status: 400 }
    );
  }

  const { data: original } = await db
    .from("contributions")
    .select("id, member_id, amount_cents, currency, type, method, reversal_of")
    .eq("id", contributionId)
    .maybeSingle();
  if (!original) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }
  if (original.reversal_of) {
    return NextResponse.json(
      { error: "That entry is itself a reversal and cannot be reversed." },
      { status: 409 }
    );
  }

  const { data: existing } = await db
    .from("contributions")
    .select("id")
    .eq("reversal_of", original.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "That transaction has already been reversed." },
      { status: 409 }
    );
  }

  const { data: entry, error } = await db
    .from("contributions")
    .insert({
      member_id: original.member_id,
      amount_cents: -original.amount_cents,
      currency: original.currency,
      type: original.type,
      method: original.method,
      note: `Reversal: ${reason.trim()}`,
      recorded_by: actor,
      reversal_of: original.id,
    })
    .select("id, amount_cents, paid_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit(db, {
    actor,
    action: "ledger.reverse",
    entity: "contributions",
    entityId: original.id,
    before: { amount_cents: original.amount_cents },
    after: { reversal_id: entry.id, amount_cents: entry.amount_cents, reason: reason.trim() },
  });

  return NextResponse.json({ ok: true, entry });
}
