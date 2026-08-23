import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/apiAuth";
import { can } from "@/lib/roles";

// GET /api/notifications — what an officer needs to know, in two parts:
//
//   "waiting"  — work that is still outstanding, derived from live data so it
//                is always accurate and clears itself once acted on
//   "recent"   — things that have happened, from the notifications table
//
// Ordinary members hold no office, so they get an empty result.
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.res;
  const { db, email, official } = auth.ctx;

  if (official.roles.length === 0) {
    return NextResponse.json({ waiting: [], recent: [], unread: 0 });
  }

  const [{ data: notices }, { data: reads }, { data: pending }, { data: members }] =
    await Promise.all([
      db
        .from("notifications")
        .select("id, event, title, body, link, actor, created_at")
        .in("audience", official.roles)
        .order("created_at", { ascending: false })
        .limit(30),
      db.from("notification_reads").select("notification_id").eq("email", email),
      can(official, "ledger.read")
        ? db.from("disbursements").select("id, status, amount_cents").in("status", ["requested", "approved"])
        : Promise.resolve({ data: [] as { id: string; status: string; amount_cents: number }[] }),
      can(official, "registry.read")
        ? db.from("members").select("id, status").is("deleted_at", null).eq("status", "pending")
        : Promise.resolve({ data: [] as { id: string; status: string }[] }),
    ]);

  const readIds = new Set((reads ?? []).map((r) => r.notification_id));
  const recent = (notices ?? []).map((n) => ({ ...n, read: readIds.has(n.id) }));

  // Outstanding work, phrased as the office's own next action.
  const waiting: { label: string; link: string; count: number }[] = [];
  const requested = (pending ?? []).filter((d) => d.status === "requested");
  const approved = (pending ?? []).filter((d) => d.status === "approved");

  if (can(official, "disbursement.approve") && requested.length > 0) {
    waiting.push({
      label: `${requested.length} disbursement${requested.length === 1 ? "" : "s"} awaiting your approval`,
      link: "/disbursements",
      count: requested.length,
    });
  }
  if (can(official, "ledger.record") && approved.length > 0) {
    waiting.push({
      label: `${approved.length} approved payment${approved.length === 1 ? "" : "s"} to pay out`,
      link: "/disbursements",
      count: approved.length,
    });
  }
  if (can(official, "members.status") && (members ?? []).length > 0) {
    waiting.push({
      label: `${members!.length} member${members!.length === 1 ? "" : "s"} pending registration`,
      link: "/registry",
      count: members!.length,
    });
  }

  return NextResponse.json({
    waiting,
    recent,
    unread: recent.filter((n) => !n.read).length,
  });
}

// POST /api/notifications — mark notices read. Omit the id to clear them all.
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.res;
  const { db, email, official } = auth.ctx;
  if (official.roles.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { id } = await req.json().catch(() => ({ id: undefined }));

  let ids: string[];
  if (id) {
    ids = [id];
  } else {
    const { data } = await db
      .from("notifications")
      .select("id")
      .in("audience", official.roles)
      .order("created_at", { ascending: false })
      .limit(30);
    ids = (data ?? []).map((n) => n.id);
  }
  if (ids.length === 0) return NextResponse.json({ ok: true });

  const { error } = await db
    .from("notification_reads")
    .upsert(
      ids.map((notification_id) => ({ notification_id, email })),
      { onConflict: "notification_id,email", ignoreDuplicates: true }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
