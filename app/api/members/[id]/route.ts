import { NextRequest, NextResponse } from "next/server";
import { authenticate, requirePermission } from "@/lib/apiAuth";
import { can } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";

const STATUSES = ["pending", "active", "inactive"] as const;

// Fields the Records Officer may correct. Member number is deliberately absent:
// it is issued once by the database and never reassigned.
const EDITABLE = {
  fullName: "full_name",
  email: "email",
  phone: "phone",
  dateOfBirth: "date_of_birth",
  branch: "branch",
  referredBy: "referred_by",
} as const;

type Ctx = { params: Promise<{ id: string }> };

// GET /api/members/:id — one member, with their contributions. Family details
// (next of kin, beneficiaries) are included only for roles allowed to see them.
export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission(req, "registry.read");
  if (!auth.ok) return auth.res;
  const { db, official } = auth.ctx;
  const { id } = await ctx.params;

  const { data: member, error } = await db
    .from("members")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const { data: contributions } = await db
    .from("contributions")
    .select("id, amount_cents, type, method, note, reversal_of, paid_at")
    .eq("member_id", id)
    .order("paid_at", { ascending: false });

  const showFamily = can(official, "family.read");
  let beneficiaries: unknown[] = [];
  if (showFamily) {
    const { data } = await db
      .from("beneficiaries")
      .select("id, full_name, relationship, date_of_birth")
      .eq("member_id", id)
      .order("created_at");
    beneficiaries = data ?? [];
  }

  return NextResponse.json({
    member: {
      ...member,
      // Family data is withheld rather than blanked, so the page can tell the
      // difference between "none recorded" and "not yours to see".
      next_of_kin: showFamily ? member.next_of_kin : undefined,
    },
    contributions: contributions ?? [],
    beneficiaries,
    showFamily,
    permissions: official.permissions,
  });
}

// PATCH /api/members/:id — correct details, change standing, or update the
// member's next of kin.
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.res;
  const { db, email: actor, official } = auth.ctx;
  const { id } = await ctx.params;
  const body = await req.json();

  const { data: before } = await db
    .from("members")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!before) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};

  // Detail corrections
  const wantsEdit = Object.keys(EDITABLE).some((k) => k in body);
  if (wantsEdit) {
    if (!can(official, "members.edit")) {
      return NextResponse.json(
        { error: "Your committee role does not allow editing member details." },
        { status: 403 }
      );
    }
    for (const [field, column] of Object.entries(EDITABLE)) {
      if (!(field in body)) continue;
      const value = typeof body[field] === "string" ? body[field].trim() : body[field];
      if (field === "fullName" && !value) {
        return NextResponse.json({ error: "A full name is required." }, { status: 400 });
      }
      if (field === "email") {
        const normalized = String(value ?? "").toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
          return NextResponse.json(
            { error: "Enter a valid email address." },
            { status: 400 }
          );
        }
        patch[column] = normalized;
        continue;
      }
      patch[column] = value === "" ? null : value;
    }
  }

  // Standing
  if ("status" in body) {
    if (!can(official, "members.status")) {
      return NextResponse.json(
        { error: "Your committee role does not allow changing standing." },
        { status: 403 }
      );
    }
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Unknown standing." }, { status: 400 });
    }
    patch.status = body.status;
  }

  // Next of kin
  if ("nextOfKin" in body) {
    if (!can(official, "family.edit")) {
      return NextResponse.json(
        { error: "Your committee role does not allow editing family details." },
        { status: 403 }
      );
    }
    patch.next_of_kin = body.nextOfKin?.name_relationship?.trim()
      ? {
          name_relationship: body.nextOfKin.name_relationship.trim(),
          phone: body.nextOfKin.phone?.trim() || null,
        }
      : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const { data: after, error } = await db
    .from("members")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Another member already uses that email address." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The email is also the member's sign-in identity, so move their portal
  // account with it. A member who has never signed in has no account to move.
  let signInMoved = false;
  if (patch.email && patch.email !== before.email) {
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = list?.users?.find(
      (u) => u.email?.toLowerCase() === String(before.email).toLowerCase()
    );
    if (user) {
      const { error: authErr } = await db.auth.admin.updateUserById(user.id, {
        email: String(patch.email),
        email_confirm: true,
      });
      signInMoved = !authErr;
    }
  }

  await recordAudit(db, {
    actor,
    action: "member.update",
    entity: "members",
    entityId: id,
    before: Object.fromEntries(Object.keys(patch).map((k) => [k, before[k]])),
    after: { ...Object.fromEntries(Object.keys(patch).map((k) => [k, after[k]])), signInMoved },
  });

  return NextResponse.json({ ok: true, member: after, signInMoved });
}

// DELETE /api/members/:id — remove a member from the register.
// A soft delete: the record stays for the historical register and the ledger.
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission(req, "members.delete");
  if (!auth.ok) return auth.res;
  const { db, email: actor } = auth.ctx;
  const { id } = await ctx.params;

  const { data: before } = await db
    .from("members")
    .select("id, member_number, full_name, status, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!before) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const restore = req.nextUrl.searchParams.get("restore") === "1";
  const patch = restore
    ? { deleted_at: null, deleted_by: null }
    : { deleted_at: new Date().toISOString(), deleted_by: actor, status: "inactive" };

  const { error } = await db.from("members").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit(db, {
    actor,
    action: restore ? "member.restore" : "member.delete",
    entity: "members",
    entityId: id,
    before: { deleted_at: before.deleted_at, status: before.status },
    after: patch,
  });

  return NextResponse.json({ ok: true });
}
