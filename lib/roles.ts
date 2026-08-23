import type { SupabaseClient } from "@supabase/supabase-js";

// The four committee offices. "records" is the combined Public Officer &
// Record Keeping Officer — one office held by one account.
export const ROLES = ["chairperson", "records", "treasurer", "welfare"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  chairperson: "Chairperson",
  records: "Public Officer & Record Keeping Officer",
  treasurer: "Treasurer",
  welfare: "Welfare Officer",
};

// Safe for values coming back from the API, which are plain strings.
export function roleLabel(role: string) {
  return ROLE_LABELS[role as Role] ?? role;
}

export type Permission =
  | "registry.read" // see the full member register
  | "members.edit" // correct member details
  | "members.status" // activate, suspend or exit a member
  | "family.read" // next of kin and beneficiaries (family data)
  | "ledger.read" // see the contribution ledger
  | "ledger.record" // record a payment taken outside Stripe
  | "ledger.refund" // reverse or adjust a payment
  | "welfare.cases" // open and progress welfare cases
  | "welfare.approve" // approve a disbursement
  | "comms.send" // newsletters and announcements
  | "gallery.moderate" // remove gallery photos
  | "roles.manage"; // appoint and revoke officers

// Deliberate separation of duties: the officer who recommends a welfare claim
// (welfare) is not the one who approves it (chairperson), and neither can pay
// it (treasurer). No single account can move money end to end.
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  chairperson: [
    "registry.read",
    "ledger.read",
    "welfare.approve",
    "comms.send",
    "roles.manage",
  ],
  records: [
    "registry.read",
    "members.edit",
    "members.status",
    "family.read",
    "comms.send",
    "gallery.moderate",
    "roles.manage",
  ],
  treasurer: ["registry.read", "ledger.read", "ledger.record", "ledger.refund"],
  welfare: ["registry.read", "welfare.cases", "family.read"],
};

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

// Bootstrap: until the first appointment is recorded, emails listed in
// OFFICIALS_EMAILS act as the records officer, which carries roles.manage so
// the rest of the committee can be appointed through the app. Once any live
// appointment exists, the table is the only source of truth.
function bootstrapRoles(email: string): Role[] {
  const seeded = (process.env.OFFICIALS_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return seeded.includes(email) ? ["records"] : [];
}

// Resolves the offices held by an email address.
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
