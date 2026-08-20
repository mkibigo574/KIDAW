const SECTIONS = [
  {
    n: "01",
    title: "Membership",
    body: "Membership is open to persons who complete the registration form, accept this policy and the association's constitution, and pay the mandatory registration contribution of $100. On payment clearing, a permanent member number in the KIDAW series is issued in sequence and entered in the register. A member number is personal, is never transferred, and is never reused.",
  },
  {
    n: "02",
    title: "Contributions",
    body: "The registration contribution is a one-off founding payment. Ongoing contributions are made through the member portal and are recorded in the association's ledger against the member's number. Contributions are applied to the welfare fund and are not refundable except where a payment was made in error, in which case the Treasurer will arrange reversal through the original payment channel.",
  },
  {
    n: "03",
    title: "Good standing",
    body: "A member is in good standing when the registration contribution has cleared and the member's record carries no unresolved arrears. Standing is shown in the member portal. Only members in good standing may receive welfare disbursements, vote at general meetings, or stand for office.",
  },
  {
    n: "04",
    title: "Welfare support",
    body: "Requests for welfare support are made to the Welfare Officer, who presents them to the committee. Disbursements are approved by the Chairperson on the committee's resolution and recorded in the ledger. The committee's decision on a welfare case is final, subject to appeal at a general meeting.",
  },
  {
    n: "05",
    title: "Records",
    body: "The register and the ledger are held by the Communication and Record Keeping Officer and the Treasurer respectively. A member may inspect their own record at any time through the portal, and may request correction of any inaccurate detail by writing to records@kidawelfare.org.",
  },
  {
    n: "06",
    title: "Leaving the association",
    body: "A member may resign by written notice to the Record Keeping Officer. Resignation does not entitle a member to a refund of contributions already made. The member's number is retired with their record and the record is retained as required by the constitution and by law.",
  },
];

export default function PolicyPage() {
  return (
    <main className="page page-narrow">
      <div className="kicker">The association&apos;s rules in brief</div>
      <h1 style={{ fontSize: 46, fontWeight: 400, margin: "12px 0 0" }}>
        Membership policy
      </h1>
      <p className="text-muted" style={{ maxWidth: "62ch", marginTop: 10 }}>
        This policy summarises the constitution and by‑laws of KIDA Welfare
        Association as they apply to registration, contributions and records.
        Where this summary and the constitution differ, the constitution
        prevails.
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
        Questions about this policy: Michael Kibigo, Communication and Record
        Keeping Officer — records@kidawelfare.org. Adopted by the committee of
        KIDA Welfare Association.
      </p>
    </main>
  );
}
