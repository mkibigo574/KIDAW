import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/roles";

type Notice = {
  audience: Role | Role[];
  event: string;
  title: string;
  body?: string;
  link?: string;
  entityId?: string;
  actor?: string;
};

// Sends a notice to one or more offices. All audiences go in a single insert,
// because the database is far away and each round trip is expensive.
//
// Failures are logged, never thrown: a notification is a courtesy, and must
// never be the reason a payment or a registration fails.
export async function notify(db: SupabaseClient, notice: Notice) {
  const audiences = Array.isArray(notice.audience)
    ? notice.audience
    : [notice.audience];

  const rows = audiences.map((audience) => ({
    audience,
    event: notice.event,
    title: notice.title,
    body: notice.body ?? null,
    link: notice.link ?? null,
    entity_id: notice.entityId ?? null,
    actor: notice.actor ?? null,
  }));

  const { error } = await db.from("notifications").insert(rows);
  if (error) console.error("Notification failed:", notice.event, error.message);
}

export function money(cents: number) {
  return `A$${(Math.abs(cents) / 100).toFixed(2)}`;
}
