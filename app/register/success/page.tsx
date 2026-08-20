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
        <Link href="/portal" className="btn btn-primary">
          Open the member portal
        </Link>
      </div>
    </main>
  );
}
