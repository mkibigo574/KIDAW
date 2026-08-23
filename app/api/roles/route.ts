import { NextRequest, NextResponse } from "next/server";
import { authenticate, requirePermission } from "@/lib/apiAuth";
import { ROLES, invalidateRoles, type Role } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";

// GET /api/roles — the committee as it currently stands.
// Any signed-in member may see who holds which office; the association's
// officers are public information.
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.res;
  const { db, official } = auth.ctx;

  const { data, error } = await db
    .from("official_roles")
    .select("id, email, role, appointed_at, appointed_by")
    .is("revoked_at", null)
    .order("appointed_at");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    officials: data ?? [],
    mine: official.roles,
    permissions: official.permissions,
  });
}

// POST /api/roles — appoint or revoke an officer. Requires "roles.manage",
// held by the Chairperson and the Public Officer & Record Keeping Officer.
//   { appoint: { email, role } }  |  { revoke: { email, role } }
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "roles.manage");
  if (!auth.ok) return auth.res;
  const { db, email: actor } = auth.ctx;
  const body = await req.json();

  const target = String(body.appoint?.email ?? body.revoke?.email ?? "")
    .trim()
    .toLowerCase();
  const role = String(body.appoint?.role ?? body.revoke?.role ?? "") as Role;

  if (!target || !ROLES.includes(role)) {
    return NextResponse.json(
      { error: "An email address and a valid office are required." },
      { status: 400 }
    );
  }

  if (body.appoint) {
    const { error } = await db
      .from("official_roles")
      .insert({ email: target, role, appointed_by: actor });
    if (error) {
      // The partial unique index rejects a second live appointment.
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `${target} already holds that office.` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    invalidateRoles();
    await recordAudit(db, {
      actor,
      action: "role.appoint",
      entity: "official_roles",
      entityId: target,
      before: null,
      after: { email: target, role },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.revoke) {
    // Never leave the association without someone who can appoint officers.
    if (role === "chairperson") {
      const { count } = await db
        .from("official_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "chairperson")
        .is("revoked_at", null);
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          {
            error:
              "This is the last office that can appoint officers. Appoint a replacement before revoking it.",
          },
          { status: 409 }
        );
      }
    }

    const { error } = await db
      .from("official_roles")
      .update({ revoked_at: new Date().toISOString(), revoked_by: actor })
      .eq("email", target)
      .eq("role", role)
      .is("revoked_at", null);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    invalidateRoles();
    await recordAudit(db, {
      actor,
      action: "role.revoke",
      entity: "official_roles",
      entityId: target,
      before: { email: target, role },
      after: null,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
}
