import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/apiAuth";
import { can } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";
import { notify, money } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/calls/:id
//   { action: "approve" | "reject", note? }  — Chairperson (second signature)
//   { action: "close" }                      — Treasurer, once the call has run
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.res;
  const { db, email: actor, official } = auth.ctx;
  const { id } = await ctx.params;
  const { action, note } = await req.json();

  const { data: call } = await db
    .from("contribution_calls")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!call) {
    return NextResponse.json({ error: "Call not found." }, { status: 404 });
  }

  let patch: Record<string, unknown>;

  if (action === "approve" || action === "reject") {
    if (!can(official, "calls.approve")) {
      return NextResponse.json(
        { error: "Only the Chairperson can approve a call for contributions." },
        { status: 403 }
      );
    }
    if (call.status !== "proposed") {
      return NextResponse.json(
        { error: `This call is already ${call.status}.` },
        { status: 409 }
      );
    }
    if (call.initiated_by === actor) {
      return NextResponse.json(
        { error: "You proposed this call, so you cannot also approve it." },
        { status: 403 }
      );
    }
    if (action === "reject" && !note?.trim()) {
      return NextResponse.json({ error: "Give a reason." }, { status: 400 });
    }
    patch = {
      status: action === "approve" ? "active" : "rejected",
      decided_by: actor,
      decided_at: new Date().toISOString(),
      decision_note: note?.trim() || null,
    };
  } else if (action === "close") {
    if (!can(official, "calls.create")) {
      return NextResponse.json(
        { error: "Only the Treasurer can close a call." },
        { status: 403 }
      );
    }
    if (call.status !== "active") {
      return NextResponse.json(
        { error: "Only an active call can be closed." },
        { status: 409 }
      );
    }
    patch = { status: "closed", closed_at: new Date().toISOString() };
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { data: after, error } = await db
    .from("contribution_calls")
    .update(patch)
    .eq("id", id)
    .eq("status", call.status)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!after) {
    return NextResponse.json(
      { error: "Someone else changed this call. Reload and try again." },
      { status: 409 }
    );
  }

  if (action === "approve") {
    // Now live for the whole membership; the Treasurer runs the collection.
    await notify(db, {
      audience: ["treasurer", "records"],
      event: "call.approved",
      title: `${call.title} is now open to members`,
      body: `${money(call.amount_cents)} per member`,
      link: "/calls",
      entityId: id,
      actor,
    });
  } else if (action === "reject") {
    await notify(db, {
      audience: "treasurer",
      event: "call.rejected",
      title: `${call.title} was not approved`,
      body: note?.trim(),
      link: "/calls",
      entityId: id,
      actor,
    });
  }

  await recordAudit(db, {
    actor,
    action: `call.${action}`,
    entity: "contribution_calls",
    entityId: id,
    before: { status: call.status },
    after: patch,
  });

  return NextResponse.json({ ok: true, call: after });
}
