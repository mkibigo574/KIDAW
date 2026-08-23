import type { SupabaseClient } from "@supabase/supabase-js";

// The committee offices. "records" is the combined Public Officer & Record
// Keeping Officer — one office, one account.
export const ROLES = ["chairperson", "treasurer", "records"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  chairperson: "Chairperson",
  treasurer: "Treasurer",
  records: "Public Officer & Record Keeping Officer",
};

// Safe for values arriving from the API, which are plain strings.
export function roleLabel(role: string) {
  return ROLE_LABELS[role as Role] ?? role;
}

export type Permission =
  // register
  | "registry.read"
  | "members.create"
  | "members.edit"
  | "members.status"
  | "members.delete" // soft delete only
  | "family.read" // next of kin and beneficiaries
  | "family.edit"
  // money
  | "ledger.read"
  | "ledger.record" // post an offline payment (cash, bank)
  | "ledger.reconcile" // match payment-provider webhooks to the ledger
  | "ledger.reverse" // post a reversing entry; never edit a posted row
  | "arrears.flag"
  | "disbursement.initiate"
  | "disbursement.approve" // second signature
  | "claims.approve" // second signature on welfare claims
  // communications and governance
  | "reports.export"
  | "reports.send"
  | "comms.send"
  | "minutes.manage"
  | "gallery.moderate"
  | "audit.read"
  | "settings.manage" // the agreed dues rate and similar committee settings
  | "roles.manage";

// Approver vs operator is the spine of this model. The Chairperson approves
// but cannot post money; the Treasurer posts money but approves nothing; the
// Records Officer keeps the register and reads finances without touching them.
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // Approver, not operator. Full read access, including the audit log.
  chairperson: [
    "registry.read",
    "family.read",
    "ledger.read",
    "audit.read",
    "disbursement.approve",
    "claims.approve",
    "reports.export",
    "settings.manage",
    "roles.manage",
  ],

  // Operator, not approver. Cannot create or remove members, cannot approve
  // a disbursement (including one they initiated), and cannot edit a posted
  // transaction — corrections are reversing entries only.
  treasurer: [
    "registry.read",
    "ledger.read",
    "ledger.record",
    "ledger.reconcile",
    "ledger.reverse",
    "arrears.flag",
    "disbursement.initiate",
    "reports.export",
    "reports.send",
  ],

  // Registry and communications. Read-only on financials; no approvals.
  records: [
    "registry.read",
    "members.create",
    "members.edit",
    "members.status",
    "members.delete",
    "family.read",
    "family.edit",
    "ledger.read",
    "reports.export",
    "comms.send",
    "minutes.manage",
    "gallery.moderate",
  ],

};

// Permissions that let an account move or record money. These are the actions
// that warrant a second factor before they are allowed.
export const SENSITIVE_PERMISSIONS: Permission[] = [
  "ledger.record",
  "ledger.reverse",
  "disbursement.initiate",
  "disbursement.approve",
  "claims.approve",
  "members.delete",
  "settings.manage",
  "roles.manage",
];

export type Official = {
  email: string;
  roles: Role[];
  permissions: Permission[];
};

function permissionsFor(roles: Role[]): Permission[] {
  const set = new Set<Permission>();
  for (const r of roles) for (const p of ROLE_PERMISSIONS[r]) set.add(p);
  return [...set];
}

// Bootstrap: until the first appointment is recorded, emails in
// OFFICIALS_EMAILS act as chairperson, which carries roles.manage so the rest
// of the committee can be appointed in the app. Once any live appointment
// exists, the table is the only source of truth.
function bootstrapRoles(email: string): Role[] {
  const seeded = (process.env.OFFICIALS_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return seeded.includes(email) ? ["chairperson"] : [];
}

export async function officialFor(
  db: SupabaseClient,
  email: string
): Promise<Official> {
  const normalized = email.trim().toLowerCase();

  const { data: mine } = await db
    .from("official_roles")
    .select("role")
    .eq("email", normalized)
    .is("revoked_at", null);

  let roles = (mine ?? []).map((r) => r.role as Role);

  if (roles.length === 0) {
    const { count } = await db
      .from("official_roles")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null);
    if (!count) roles = bootstrapRoles(normalized);
  }

  return { email: normalized, roles, permissions: permissionsFor(roles) };
}

export function can(official: Official, permission: Permission) {
  return official.permissions.includes(permission);
}
