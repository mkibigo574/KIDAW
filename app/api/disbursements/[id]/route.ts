import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/apiAuth";
import { can } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/disbursements/:id — move a request through its lifecycle.
//   { action: "approve" | "reject", note? }   — Chairperson (second signature)
//   { action: "pay", method, reference }      — Treasurer, once approved
//   { action: "cancel" }                      — Treasurer, while still requested
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.res;
  const { db, email: actor, official } = auth.ctx;
  const { id } = await ctx.params;
  const { action, note, method, reference } = await req.json();

  const { data: d } = await db
    .from("disbursements")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!d) {
    return NextResponse.json({ error: "Disbursement not found." }, { status: 404 });
  }
  if (d.status === "paid" || d.status === "rejected" || d.status === "cancelled") {
    return NextResponse.json(
      { error: `This disbursement is already ${d.status} and cannot be changed.` },
      { status: 409 }
    );
  }

  let patch: Record<string, unknown>;

  if (action === "approve" || action === "reject") {
    if (!can(official, "disbursement.approve")) {
      return NextResponse.json(
        { error: "Only the Chairperson can approve a disbursement." },
        { status: 403 }
      );
    }
    if (d.status !== "requested") {
      return NextResponse.json(
        { error: "Only a requested disbursement can be decided." },
        { status: 409 }
      );
    }
    // The second signature must be a different person, whatever roles they hold.
    if (d.initiated_by === actor) {
      return NextResponse.json(
        { error: "You requested this payment, so you cannot also approve it." },
        { status: 403 }
      );
    }
    if (action === "reject" && !note?.trim()) {
      return NextResponse.json(
        { error: "Give a reason for rejecting it." },
        { status: 400 }
      );
    }
    patch = {
      status: action === "approve" ? "approved" : "rejected",
      decided_by: actor,
      decided_at: new Date().toISOString(),
      decision_note: note?.trim() || null,
    };
  } else if (action === "pay") {
    if (!can(official, "ledger.record")) {
      return NextResponse.json(
        { error: "Only the Treasurer can record a payment." },
        { status: 403 }
      );
    }
    if (d.status !== "approved") {
      return NextResponse.json(
        { error: "This payment has not been approved by the Chairperson yet." },
        { status: 409 }
      );
    }
    if (!["cash", "bank", "other"].includes(method)) {
      return NextResponse.json(
        { error: "Say how the payment was made: cash, bank or other." },
        { status: 400 }
      );
    }
    if (!reference?.trim()) {
      return NextResponse.json(
        { error: "A payment reference is required." },
        { status: 400 }
      );
    }
    patch = {
      status: "paid",
      paid_at: new Date().toISOString(),
      paid_by: actor,
      payment_method: method,
      payment_reference: reference.trim(),
    };
  } else if (action === "cancel") {
    if (!can(official, "disbursement.initiate")) {
      return NextResponse.json(
        { error: "Only the Treasurer can withdraw a request." },
        { status: 403 }
      );
    }
    if (d.status !== "requested") {
      return NextResponse.json(
        { error: "Only a request still awaiting approval can be withdrawn." },
        { status: 409 }
      );
    }
    patch = { status: "cancelled", decision_note: note?.trim() || null };
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { data: after, error } = await db
    .from("disbursements")
    .update(patch)
    .eq("id", id)
    // Guard against two officers acting at once: the row must still be in the
    // state we checked.
    .eq("status", d.status)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!after) {
    return NextResponse.json(
      { error: "Someone else changed this disbursement. Reload and try again." },
      { status: 409 }
    );
  }

  await recordAudit(db, {
    actor,
    action: `disbursement.${action}`,
    entity: "disbursements",
    entityId: id,
    before: { status: d.status },
    after: patch,
  });

  return NextResponse.json({ ok: true, disbursement: after });
}
