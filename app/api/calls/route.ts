import { NextRequest, NextResponse } from "next/server";
import { authenticate, requirePermission } from "@/lib/apiAuth";
import { can } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";
import { notify, money } from "@/lib/notify";

// GET /api/calls
// Everyone signed in sees active calls; officers additionally see proposals
// awaiting a decision. Take-up is only shown to officers who may read the
// ledger — a member sees whether they themselves have paid, not who has not.
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.res;
  const { db, email, official } = auth.ctx;

  const seesLedger = can(official, "ledger.read");

  const [{ data: calls }, { data: paid }, { data: members }, { data: mine }] =
    await Promise.all([
      db
        .from("contribution_calls")
        .select("*")
        .order("created_at", { ascending: false }),
      db.from("contributions").select("call_id, member_id, amount_cents").not("call_id", "is", null),
      db.from("members").select("id, email, status").is("deleted_at", null),
      db.from("members").select("id").eq("email", email).maybeSingle(),
    ]);

  const myMemberId = mine?.id ?? null;
  // Everyone on the register is expected to answer a call.
  const eligible = (members ?? []).filter((m) => m.status === "active");

  // Sum each member's payments per call: part payments add up, reversals net off.
  const perCall = new Map<string, Map<string, number>>();
  for (const c of paid ?? []) {
    if (!c.call_id) continue;
    const byMember = perCall.get(c.call_id) ?? new Map<string, number>();
    byMember.set(c.member_id, (byMember.get(c.member_id) ?? 0) + c.amount_cents);
    perCall.set(c.call_id, byMember);
  }

  const visible = (calls ?? []).filter(
    (c) => c.status === "active" || c.status === "closed" || seesLedger
  );

  return NextResponse.json({
    calls: visible.map((c) => {
      const byMember = perCall.get(c.id) ?? new Map<string, number>();
      const paidCount = eligible.filter(
        (m) => (byMember.get(m.id) ?? 0) >= c.amount_cents
      ).length;
      const collected = [...byMember.values()].reduce((s, v) => s + v, 0);
      const myPaid = myMemberId ? (byMember.get(myMemberId) ?? 0) : 0;

      return {
        ...c,
        // My own position is always mine to see.
        my_paid_cents: myPaid,
        i_have_paid: myPaid >= c.amount_cents,
        // Take-up across the membership is an officer's view.
        ...(seesLedger
          ? {
              paid_count: paidCount,
              eligible_count: eligible.length,
              percent_paid:
                eligible.length > 0
                  ? Math.round((paidCount / eligible.length) * 100)
                  : 0,
              collected_cents: collected,
              expected_cents: eligible.length * c.amount_cents,
            }
          : {}),
      };
    }),
    permissions: official.permissions,
    me: email,
  });
}

// POST /api/calls — the Treasurer proposes a call. It is not visible to members
// until the Chairperson approves it.
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "calls.create");
  if (!auth.ok) return auth.res;
  const { db, email: actor } = auth.ctx;

  const { title, purpose, amount, dueDate } = await req.json();

  const amountCents = Math.round(Number(amount) * 100);
  if (!title?.trim()) {
    return NextResponse.json({ error: "Give the call a title." }, { status: 400 });
  }
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json(
      { error: "Enter the amount each member is asked to contribute." },
      { status: 400 }
    );
  }

  const { data: call, error } = await db
    .from("contribution_calls")
    .insert({
      title: title.trim(),
      purpose: purpose?.trim() || null,
      amount_cents: amountCents,
      due_date: dueDate || null,
      initiated_by: actor,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notify(db, {
    audience: "chairperson",
    event: "call.proposed",
    title: `${money(call.amount_cents)} contribution call awaiting your approval`,
    body: call.title,
    link: "/calls",
    entityId: call.id,
    actor,
  });

  await recordAudit(db, {
    actor,
    action: "call.propose",
    entity: "contribution_calls",
    entityId: call.id,
    before: null,
    after: { title: call.title, amount_cents: call.amount_cents, status: call.status },
  });

  return NextResponse.json({ ok: true, call });
}
