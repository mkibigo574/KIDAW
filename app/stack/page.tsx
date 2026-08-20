const STACK = [
  {
    need: "Payments",
    pick: "Stripe Checkout",
    licence: "Commercial, but SDKs open",
    why: "Hosted checkout keeps card data off your servers and handles receipts, refunds and subscriptions for the monthly standing orders. Pair it with M-Pesa via the Daraja API, which most members will actually use.",
    alts: "Hyperswitch (Apache-2.0 payments orchestrator, self-hosted), Lago for billing",
  },
  {
    need: "Database",
    pick: "PostgreSQL via Supabase",
    licence: "PostgreSQL / Apache-2.0",
    why: "One Postgres database for members, contributions and payment records, with row-level security so a member sees only their own rows. Supabase adds auth, storage for receipts and an admin table view the officials can use directly.",
    alts: "Plain Postgres + Directus, NocoDB, PocketBase for a smaller footprint",
  },
  {
    need: "Transactional email",
    pick: "Listmonk or Postal",
    licence: "AGPL / MIT",
    why: "Self-hosted senders for the welcome email, receipts and arrears reminders, with templates the Record Keeping Officer can edit. Route through any SMTP provider for deliverability.",
    alts: "Resend, Amazon SES, Brevo free tier",
  },
  {
    need: "Member numbers",
    pick: "Postgres sequence",
    licence: "Built in",
    why: "A database sequence formatted as KIDAW-### guarantees no duplicates and no gaps under concurrent registration. The number is assigned on registration and confirmed when the payment webhook reports success.",
    alts: "Application-side counter with a unique constraint",
  },
  {
    need: "Hosting",
    pick: "Coolify on a small VPS",
    licence: "Apache-2.0",
    why: "Deploys the app, database and mail server from one dashboard, with backups and TLS. Cheap enough to run on annual dues and portable if the committee changes providers.",
    alts: "Dokku, CapRover, Railway or Fly.io managed",
  },
];

const SCHEMA = [
  { col: "member_no", type: "text, unique", note: "KIDAW-### from a sequence; never reused" },
  { col: "full_name", type: "text", note: "As on the national ID" },
  { col: "national_id", type: "text, unique", note: "Encrypted at rest" },
  { col: "email / phone", type: "text", note: "Login identity and M-Pesa number" },
  { col: "branch", type: "text", note: "Home area for welfare coordination" },
  { col: "next_of_kin", type: "jsonb", note: "Name, relationship, phone" },
  { col: "registered_at", type: "timestamptz", note: "Set when the $100 payment clears" },
  { col: "status", type: "enum", note: "pending · good_standing · arrears · exited" },
  { col: "contributions", type: "table", note: "member_no, type, amount, method, provider_ref, status, paid_at" },
];

export default function StackPage() {
  return (
    <main className="page page-mid">
      <h1 style={{ fontSize: 46, fontWeight: 400, margin: 0 }}>
        Suggested open-source stack
      </h1>
      <p className="text-muted" style={{ maxWidth: "62ch", marginTop: 10 }}>
        Recommendations for the payments, database and email pieces of the
        brief. All self-hostable; each has a managed tier if the committee would
        rather not run servers.
      </p>
      <hr className="hr" style={{ margin: "32px 0" }} />

      <div style={{ display: "flex", flexDirection: "column" }}>
        {STACK.map((t) => (
          <div
            key={t.need}
            style={{
              display: "grid",
              gridTemplateColumns: "170px 1fr 210px",
              gap: 32,
              padding: "26px 0",
              borderBottom: "1px solid var(--color-divider)",
            }}
            className="stack-row"
          >
            <div>
              <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
                {t.need}
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, marginTop: 4 }}>{t.pick}</div>
              <div style={{ fontSize: 11, color: "var(--color-accent-700)" }}>{t.licence}</div>
            </div>
            <p style={{ margin: 0, textAlign: "justify", fontSize: 14 }}>{t.why}</p>
            <div className="text-muted" style={{ fontSize: 13 }}>Alternatives: {t.alts}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontWeight: 400, margin: "44px 0 14px" }}>Register table — core fields</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Column</th><th>Type</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {SCHEMA.map((c) => (
              <tr key={c.col}>
                <td style={{ fontFamily: "var(--font-heading)" }}>{c.col}</td>
                <td className="text-muted">{c.type}</td>
                <td style={{ fontSize: 13 }}>{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`@media (max-width: 900px) { .stack-row { grid-template-columns: 1fr !important; gap: 10px !important; } }`}</style>
    </main>
  );
}
