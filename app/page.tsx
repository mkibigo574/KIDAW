import Link from "next/link";

const STEPS = [
  { n: "01", title: "Register", body: "One form: your details, next of kin and branch." },
  { n: "02", title: "Contribute $100", body: "The mandatory registration contribution, paid securely by card." },
  { n: "03", title: "Receive your number", body: "A permanent number in the KIDAW series, emailed with your receipt." },
  { n: "04", title: "Use the portal", body: "Contribute monthly, view your statement, download receipts." },
];

const OFFICIALS = [
  {
    role: "Chairperson",
    name: "Zablon Pingo",
    duty: "Chairs the committee and general meetings; approves welfare disbursements.",
    contact: "chair@kidawelfare.org",
  },
  {
    role: "Communication & Record Keeping Officer",
    name: "Michael Kibigo",
    duty: "Holds the member register, issues member numbers and keeps minutes.",
    contact: "records@kidawelfare.org",
  },
  {
    role: "Treasurer",
    name: "Eugene Simiyu",
    duty: "Keeps the contribution ledger, reconciles payments and reports to members.",
    contact: "treasurer@kidawelfare.org",
  },
  {
    role: "Welfare Officer",
    name: "Eric Outa",
    duty: "Receives welfare cases and coordinates support with the committee.",
    contact: "welfare@kidawelfare.org",
  },
];

export default function HomePage() {
  return (
    <main className="page page-wide" style={{ paddingTop: 64 }}>
      <div className="grid-hero">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-mark.png"
            alt=""
            style={{ height: 76, width: "auto", marginBottom: 18 }}
          />
          <div className="kicker">Established registry · Membership open</div>
          <h1 style={{ fontSize: 66, fontWeight: 400, lineHeight: 1.02, margin: "18px 0 20px" }}>
            A welfare society
            <br />
            held together by
            <br />
            its members.
          </h1>
          <p style={{ textAlign: "justify", maxWidth: "52ch", fontSize: 16, lineHeight: 1.75 }}>
            Kenyans in Darwin Welfare Association (KIDAW) keeps one register,
            one ledger, and one number for every member. Registration issues
            your permanent member number and records
            your founding contribution. Everything after that — monthly
            contributions, receipts, statements — happens in the member portal.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href="/register">
              Register as a member
            </Link>
            <Link className="btn btn-secondary" href="/portal">
              Member sign in
            </Link>
          </div>
          <hr className="hr" style={{ margin: "44px 0 24px" }} />
          <div className="grid-stats">
            <div>
              <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 34 }}>$100</div>
              <div className="text-muted" style={{ fontSize: 12 }}>One-off registration contribution</div>
            </div>
            <div>
              <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 34 }}>KIDAW‑001</div>
              <div className="text-muted" style={{ fontSize: 12 }}>Member numbers issued in sequence</div>
            </div>
            <div>
              <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 34 }}>04</div>
              <div className="text-muted" style={{ fontSize: 12 }}>Elected officials serving</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h6 style={{ color: "var(--color-accent-700)" }}>How membership works</h6>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
            {STEPS.map((s) => (
              <div
                key={s.n}
                style={{
                  display: "grid",
                  gridTemplateColumns: "34px 1fr",
                  gap: 14,
                  padding: "16px 0",
                  borderBottom: "1px solid var(--color-divider)",
                }}
              >
                <div
                  className="tabular"
                  style={{ fontFamily: "var(--font-heading)", fontSize: 15, color: "var(--color-accent)", paddingTop: 2 }}
                >
                  {s.n}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>{s.title}</div>
                  <div className="text-muted" style={{ fontSize: 13, marginTop: 3 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <hr className="hr" style={{ margin: "72px 0 36px" }} />
      <div className="grid-officials">
        <div>
          <h2 style={{ fontSize: 34, fontWeight: 400, margin: 0 }}>Officials</h2>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 10 }}>
            The committee elected to hold the register, the records and the funds.
          </p>
        </div>
        <div className="grid-officials-cards">
          {OFFICIALS.map((o) => (
            <div className="card" key={o.name}>
              <div className="card-kicker">{o.role}</div>
              <div className="card-title" style={{ fontSize: 22 }}>{o.name}</div>
              <p className="card-body">{o.duty}</p>
              <div className="card-meta">{o.contact}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
