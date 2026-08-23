import type { SupabaseClient } from "@supabase/supabase-js";

type AuditEntry = {
  actor: string;
  action: string; // 'role.appoint', 'member.update', 'ledger.record', …
  entity: string; // table the action touched
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
};

// Writes one line to the append-only audit log. Failures are logged rather
// than thrown: an audit write must never be the reason a legitimate action is
// rolled back, and the database triggers guarantee nothing can be rewritten
// afterwards.
export async function recordAudit(db: SupabaseClient, entry: AuditEntry) {
  const { error } = await db.from("audit_log").insert({
    actor_email: entry.actor,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
  if (error) console.error("Audit write failed:", entry.action, error.message);
}
