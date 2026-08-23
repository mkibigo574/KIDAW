"use client";

import { useEffect, useState } from "react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: "",
    nationalId: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    branch: "",
    kinName: "",
    kinPhone: "",
    referredBy: "",
    password: "",
    confirmPassword: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [nextNumber, setNextNumber] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/next-number")
      .then((r) => r.json())
      .then((d) => setNextNumber(d.next))
      .catch(() => {});
  }, []);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!accepted) {
      setError("Please accept the constitution and by-laws to continue.");
      return;
    }
    if (form.password && form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          nationalId: form.nationalId,
          dateOfBirth: form.dateOfBirth,
          branch: form.branch,
          nextOfKin: { name_relationship: form.kinName, phone: form.kinPhone },
          referredBy: form.referredBy,
          password: form.password || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed.");
      window.location.href = data.checkoutUrl; // Stripe Checkout
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="page page-mid">
      <h1 style={{ fontSize: 46, fontWeight: 400, margin: 0 }}>Member registration</h1>
      <p className="text-muted" style={{ maxWidth: "60ch", marginTop: 10 }}>
        Your member number is reserved when this form is submitted and confirmed
        once the $100 registration contribution clears.
      </p>
      <hr className="hr" style={{ margin: "32px 0" }} />

      <div className="grid-register">
        <form className="grid-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" className="input" required value={form.fullName} onChange={set("fullName")} />
          </div>
          <div className="field">
            <label htmlFor="nationalId">National ID / Passport</label>
            <input id="nationalId" className="input" value={form.nationalId} onChange={set("nationalId")} />
          </div>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" className="input" required value={form.email} onChange={set("email")} />
          </div>
          <div className="field">
            <label htmlFor="phone">Mobile number</label>
            <input id="phone" className="input" value={form.phone} onChange={set("phone")} />
          </div>
          <div className="field">
            <label htmlFor="dob">Date of birth</label>
            <input id="dob" className="input" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
          </div>
          <div className="field">
            <label htmlFor="branch">Home area / branch</label>
            <input id="branch" className="input" value={form.branch} onChange={set("branch")} />
          </div>
          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label htmlFor="kinName">Next of kin — name and relationship</label>
            <input id="kinName" className="input" value={form.kinName} onChange={set("kinName")} />
          </div>
          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label htmlFor="kinPhone">Next of kin — mobile number</label>
            <input id="kinPhone" className="input" value={form.kinPhone} onChange={set("kinPhone")} />
          </div>
          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label htmlFor="referredBy">Referred by (optional)</label>
            <input
              id="referredBy"
              className="input"
              placeholder="Name or member number of the member who referred you"
              value={form.referredBy}
              onChange={set("referredBy")}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Portal password (optional)</label>
            <input
              id="password"
              type="password"
              className="input"
              minLength={8}
              placeholder="At least 8 characters"
              value={form.password}
              onChange={set("password")}
            />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
            />
          </div>
          <p className="text-muted" style={{ gridColumn: "1/-1", fontSize: 12, margin: 0 }}>
            Set a password to sign in to the member portal directly. Leave it
            blank to sign in with an email link instead.
          </p>

          <div style={{ gridColumn: "1/-1" }}>
            <div className="field"><label>Registration contribution</label></div>
            <div className="seg" style={{ marginTop: 2 }}>
              <label className="seg-opt">
                <input type="radio" name="pay" defaultChecked />
                <span>Card — Stripe</span>
              </label>
              <label className="seg-opt is-disabled" title="Coming soon">
                <input type="radio" name="pay" disabled />
                <span>Bank transfer</span>
              </label>
            </div>
          </div>

          <label className="radio" style={{ gridColumn: "1/-1", marginTop: 6 }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span className="dot" style={{ borderRadius: "50%" }}></span>
            <span>
              I accept the <a href="/policy">constitution and by‑laws</a> and the{" "}
              <a href="/privacy">privacy policy</a> of KIDAW.
            </span>
          </label>

          <div style={{ gridColumn: "1/-1", display: "flex", gap: 12, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Redirecting to checkout…" : "Pay $100 and register"}
            </button>
          </div>

          {error && (
            <div className="notice notice-error" style={{ gridColumn: "1/-1" }}>
              {error}
            </div>
          )}
        </form>

        <div className="panel panel-surface" style={{ padding: 22 }}>
          <h6 style={{ color: "var(--color-accent-700)" }}>Number to be issued</h6>
          <div
            className="tabular"
            style={{ fontFamily: "var(--font-heading)", fontSize: 40, margin: "8px 0 4px" }}
          >
            {nextNumber ?? "KIDAW-···"}
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            Next in sequence. Assigned permanently when your form is submitted.
          </div>
          <hr className="hr" />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span>Registration contribution</span>
            <span className="tabular">$100.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginTop: 8 }}>
            <span className="text-muted">Processing fee</span>
            <span className="text-muted tabular">$0.00</span>
          </div>
          <hr className="hr" />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-heading)",
              fontSize: 19,
            }}
          >
            <span>Due today</span>
            <span className="tabular">$100.00</span>
          </div>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 16, marginBottom: 0 }}>
            A welcome email with your member number and receipt is sent the
            moment payment clears.
          </p>
        </div>
      </div>
    </main>
  );
}
