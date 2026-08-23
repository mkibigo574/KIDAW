import Link from "next/link";

export default function RegisterSuccessPage() {
  return (
    <main className="page page-narrow">
      <div className="panel" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: 44 }}>
        <div className="kicker">Registration complete</div>
        <h1 style={{ fontSize: 40, fontWeight: 400, margin: "14px 0 10px" }}>
          Payment received
        </h1>
        <p className="text-muted" style={{ maxWidth: "44ch", margin: "0 auto" }}>
          You have been entered in the register. A welcome email with your
          member number and receipt is on its way to your inbox.
        </p>
        <hr className="hr" style={{ margin: "28px 0" }} />
        <div className="panel panel-surface" style={{ padding: 20, textAlign: "left" }}>
          <div className="card-kicker">Next step</div>
          <p style={{ fontSize: 14, margin: "8px 0 0" }}>
            Sign in to the member portal and add your <strong>next of kin</strong>{" "}
            and your <strong>beneficiaries</strong> — your nuclear family
            members (spouse and children) — so the committee knows who to
            support on your behalf.
          </p>
        </div>
        <Link href="/portal" className="btn btn-primary" style={{ marginTop: 24 }}>
          Open the member portal
        </Link>
      </div>
    </main>
  );
}
