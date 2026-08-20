const SECTIONS = [
  {
    n: "01",
    title: "What we collect",
    body: "When you register we collect your full name, national ID or passport number, email address, mobile number, date of birth, home area or branch, and your next of kin's name, relationship and phone number. As you use the portal we also record your member number, your contributions (amount, date, reference and payment method), and the emails we have sent you.",
  },
  {
    n: "02",
    title: "Why we collect it",
    body: "This information exists for one purpose: running the welfare association. It identifies you in the register, records your contributions in the ledger, lets the Welfare Officer reach your next of kin in a welfare case, and lets us send you receipts, statements and notices. We do not sell member information, share it for marketing, or use it for anything beyond the association's work.",
  },
  {
    n: "03",
    title: "Payments",
    body: "Payments are processed by Stripe on Stripe's own hosted checkout. Your card number, expiry and security code go directly to Stripe and never touch the association's servers or database. We keep only the payment's reference, amount, date and status, as required for the ledger. Stripe's handling of your card details is governed by Stripe's privacy policy.",
  },
  {
    n: "04",
    title: "Where it is stored",
    body: "Member records and the contribution ledger are stored in the association's database, hosted on Supabase (PostgreSQL) in the European Union. Access is restricted: each member can see only their own record and statement, and the full register is available only to the elected officials who need it — the Record Keeping Officer and the Treasurer.",
  },
  {
    n: "05",
    title: "Emails",
    body: "We send transactional email only: the welcome email with your member number, payment receipts, portal sign-in links, and notices the constitution requires. Emails are delivered through our email provider, which processes your address solely to deliver the message.",
  },
  {
    n: "06",
    title: "Your rights",
    body: "You may view your record and statement in the member portal at any time. You may request a correction of any inaccurate detail, a copy of the personal information we hold about you, or — on leaving the association — deletion of your record, subject to any retention the constitution or the law requires for the register and the ledger. Write to records@kidawelfare.org.",
  },
  {
    n: "07",
    title: "Retention and security",
    body: "Records are kept for as long as membership lasts and thereafter only as long as the constitution and applicable law require. Access to systems is protected by passwordless sign-in links sent to your registered email, and officials' access to the register is limited to named accounts.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="page page-narrow">
      <div className="kicker">How member information is handled</div>
      <h1 style={{ fontSize: 46, fontWeight: 400, margin: "12px 0 0" }}>
        Privacy policy
      </h1>
      <p className="text-muted" style={{ maxWidth: "62ch", marginTop: 10 }}>
        KIDA Welfare Association keeps one register and one ledger. This policy
        explains what goes into them, why, where it is kept, and the rights
        every member has over their own record.
      </p>
      <hr className="hr" style={{ margin: "32px 0 0" }} />

      <div style={{ display: "flex", flexDirection: "column" }}>
        {SECTIONS.map((s) => (
          <div
            key={s.n}
            style={{
              display: "grid",
              gridTemplateColumns: "48px 1fr",
              gap: 20,
              padding: "26px 0",
              borderBottom: "1px solid var(--color-divider)",
            }}
          >
            <div
              className="tabular"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 17,
                color: "var(--color-accent)",
                paddingTop: 2,
              }}
            >
              {s.n}
            </div>
            <div>
              <h3 style={{ fontWeight: 400, fontSize: 24, margin: "0 0 6px" }}>{s.title}</h3>
              <p style={{ margin: 0, fontSize: 14, textAlign: "justify", lineHeight: 1.7 }}>
                {s.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-muted" style={{ fontSize: 12, marginTop: 28, textAlign: "justify" }}>
        Privacy questions and requests: Michael Kibigo, Communication and Record
        Keeping Officer — records@kidawelfare.org. Contribution and payment
        queries: Eugene Simiyu, Treasurer — treasurer@kidawelfare.org.
      </p>
    </main>
  );
}
