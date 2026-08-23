import Link from "next/link";

const STEPS = [
  { n: "01", title: "Register", body: "One form: your details, next of kin and branch." },
  { n: "02", title: "Contribute $100", body: "The mandatory registration contribution, paid securely by card." },
  { n: "03", title: "Receive your number", body: "A permanent number in the KIDAW series, emailed with your receipt." },
  { n: "04", title: "Use the portal", body: "Contribute monthly, view your statement, download receipts." },
];

const VALUES = [
  { name: "Compassion", body: "We stand with members and their families in bereavement, illness and hardship." },
  { name: "Unity", body: "One community of Kenyans in Darwin, whatever the branch or home area." },
  { name: "Transparency", body: "One open register and one open ledger; every contribution is accounted for." },
  { name: "Dignity", body: "Support is given respectfully, as a right of membership, never as charity." },
  { name: "Responsibility", body: "Every member contributes; every official is answerable to the members." },
  { name: "Sustainability", body: "Steady contributions and prudent records keep the fund able to help tomorrow." },
];

const INVOLVEMENT = [
  {
    title: "Become a member",
    body: "Register, pay the $100 registration contribution and receive your permanent KIDAW number.",
    cta: "Register now",
    href: "/register",
  },
  {
    title: "Keep contributing",
    body: "Monthly contributions through the portal keep the fund ready when a member needs it.",
    cta: "Open the portal",
    href: "/portal",
  },
  {
    title: "Refer a friend",
    body: "Know a Kenyan in Darwin who isn't a member yet? Have them name you as their referrer when they register.",
    cta: "Share the registry",
    href: "/registry",
  },
  {
    title: "Serve the community",
    body: "Volunteer with welfare cases or stand for office at the next general meeting — write to the committee.",
    cta: "Email the committee",
    href: "mailto:welfare@kidawelfare.org",
  },
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
      <div className="grid-mission">
        <div className="panel">
          <h6 style={{ color: "var(--color-accent-700)" }}>Our mission</h6>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: 24, lineHeight: 1.35, margin: "12px 0 0" }}>
            To provide sustainable welfare support to Kenyans in Darwin,
            fostering mutual assistance through transparent records and a
            fund every member can trust.
          </p>
        </div>
        <div className="panel">
          <h6 style={{ color: "var(--color-accent-3)" }}>Our vision</h6>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: 24, lineHeight: 1.35, margin: "12px 0 0" }}>
            A united and resilient community where shared responsibility means
            no member faces bereavement or hardship alone.
          </p>
        </div>
      </div>

      <hr className="hr" style={{ margin: "56px 0 36px" }} />
      <div>
        <h2 style={{ fontSize: 34, fontWeight: 400, margin: 0 }}>Core values</h2>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 10, maxWidth: "60ch" }}>
          Six principles that govern how the register is kept, how the fund is
          run, and how members treat one another.
        </p>
        <div className="grid-values">
          {VALUES.map((v) => (
            <div className="card" key={v.name}>
              <div className="card-title" style={{ fontSize: 19 }}>{v.name}</div>
              <p className="card-body">{v.body}</p>
            </div>
          ))}
        </div>
      </div>

      <hr className="hr" style={{ margin: "56px 0 36px" }} />
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
              <div className="avatar" aria-hidden>
                {o.name.split(" ").map((p) => p[0]).join("")}
              </div>
              <div className="card-kicker">{o.role}</div>
              <div className="card-title" style={{ fontSize: 22 }}>{o.name}</div>
              <p className="card-body">{o.duty}</p>
              <div className="card-meta">{o.contact}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel commitment" style={{ marginTop: 36 }}>
        <h6 style={{ color: "var(--color-accent-700)" }}>Our commitment</h6>
        <p
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 23,
            lineHeight: 1.45,
            margin: "14px 0 0",
            maxWidth: "58ch",
          }}
        >
          We, the elected officials of KIDAW, commit to serve every member with
          fairness and without favour: to keep the register accurate, the
          ledger open to inspection, and every contribution accounted for; to
          respond to every welfare case with urgency and dignity; and to hand
          over to those elected after us records they can trust.
        </p>
        <p className="text-muted" style={{ fontSize: 13, margin: "16px 0 0" }}>
          — The KIDAW Committee, on taking office
        </p>
      </div>

      <hr className="hr" style={{ margin: "56px 0 36px" }} />
      <div>
        <h2 style={{ fontSize: 34, fontWeight: 400, margin: 0 }}>Get involved</h2>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 10, maxWidth: "60ch" }}>
          The association is only as strong as what its members put in. Four
          ways to take part.
        </p>
        <div className="grid-involve">
          {INVOLVEMENT.map((item) => (
            <div className="card" key={item.title}>
              <div className="card-title" style={{ fontSize: 19 }}>{item.title}</div>
              <p className="card-body">{item.body}</p>
              {item.href.startsWith("mailto:") ? (
                <a className="btn btn-secondary" href={item.href}>{item.cta}</a>
              ) : (
                <Link className="btn btn-secondary" href={item.href}>{item.cta}</Link>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="cta-banner">
        <h3 style={{ fontSize: 30, fontWeight: 400, margin: 0 }}>
          Ready to join our community?
        </h3>
        <p className="text-muted" style={{ fontSize: 14, margin: "10px 0 0", maxWidth: "52ch" }}>
          Become a member today and stand with a welfare fund that stands with
          you — one register, one ledger, one number.
        </p>
        <Link className="btn btn-primary" href="/register" style={{ marginTop: 18 }}>
          Join now
        </Link>
      </div>
    </main>
  );
}
