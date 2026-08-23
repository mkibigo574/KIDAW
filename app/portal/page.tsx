"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabaseBrowser";

function ConfigNotice() {
  return (
    <main className="page page-narrow">
      <div className="panel" style={{ maxWidth: 520, margin: "0 auto", padding: 32 }}>
        <div className="kicker">Setup required</div>
        <h1 style={{ fontSize: 32, fontWeight: 400, margin: "12px 0 8px" }}>
          Database not configured
        </h1>
        <p className="text-muted" style={{ fontSize: 14 }}>
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
          <code>.env.local</code>, then restart the dev server.
        </p>
      </div>
    </main>
  );
}

type Member = {
  id: string;
  member_number: string;
  full_name: string;
  email: string;
  status: string;
  branch: string | null;
  next_of_kin: { name_relationship?: string | null; phone?: string | null } | null;
  created_at: string;
};

type Beneficiary = {
  id: string;
  full_name: string;
  relationship: string;
  date_of_birth: string | null;
};

type Contribution = {
  id: string;
  amount_cents: number;
  type: string;
  paid_at: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function refFor(c: Contribution) {
  return `KW‑${c.type === "registration" ? "R" : "C"}‑${c.id.slice(0, 4).toUpperCase()}`;
}

export default function PortalPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured) return <ConfigNotice />;
  if (!checked) {
    return (
      <main className="page page-wide">
        <p className="text-muted">Loading…</p>
      </main>
    );
  }
  return session ? <Dashboard session={session} /> : <SignIn />;
}

function SignIn() {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = supabaseBrowser();
    const normalized = email.trim().toLowerCase();
    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });
      setLoading(false);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: { emailRedirectTo: `${window.location.origin}/portal` },
      });
      setLoading(false);
      if (error) setError(error.message);
      else setSent(true);
    }
  }

  async function forgotPassword() {
    setError("");
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError("Enter your email address first, then choose “Forgot password?”.");
      return;
    }
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(normalized, {
      redirectTo: `${window.location.origin}/portal/reset`,
    });
    if (error) setError(error.message);
    else setResetSent(true);
  }

  return (
    <main className="page page-narrow">
      <div className="panel" style={{ maxWidth: 460, margin: "0 auto", padding: 32 }}>
        <div className="kicker">Member portal</div>
        <h1 style={{ fontSize: 36, fontWeight: 400, margin: "12px 0 8px" }}>Sign in</h1>
        <p className="text-muted" style={{ fontSize: 13 }}>
          Access your community account with the email address you registered
          with.
        </p>
        <div className="seg" style={{ marginTop: 14 }}>
          <label className="seg-opt">
            <input
              type="radio"
              name="signin-mode"
              checked={mode === "password"}
              onChange={() => setMode("password")}
            />
            <span>Password</span>
          </label>
          <label className="seg-opt">
            <input
              type="radio"
              name="signin-mode"
              checked={mode === "link"}
              onChange={() => setMode("link")}
            />
            <span>Email link</span>
          </label>
        </div>
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {mode === "password" && (
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          <button className="btn btn-primary btn-block" disabled={loading || sent}>
            {loading
              ? "Signing in…"
              : mode === "password"
                ? "Sign in"
                : sent
                  ? "Link sent"
                  : "Send sign‑in link"}
          </button>
        </form>
        {mode === "password" && (
          <p style={{ fontSize: 13, marginTop: 12, marginBottom: 0 }}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                forgotPassword();
              }}
            >
              Forgot password?
            </a>{" "}
            <span className="text-muted">
              No password yet? Use the same link to set one.
            </span>
          </p>
        )}
        {sent && (
          <div className="notice notice-ok">
            Check your inbox and follow the link to sign in.
          </div>
        )}
        {resetSent && (
          <div className="notice notice-ok">
            Check your inbox for a link to set a new password.
          </div>
        )}
        {error && <div className="notice notice-error">{error}</div>}
      </div>
    </main>
  );
}

function Dashboard({ session }: { session: Session }) {
  const [member, setMember] = useState<Member | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState("25");
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = supabaseBrowser();
      const { data: m } = await supabase.from("members").select("*").maybeSingle();
      setMember(m);
      if (m) {
        const { data: c } = await supabase
          .from("contributions")
          .select("id, amount_cents, type, paid_at")
          .order("paid_at", { ascending: false });
        setContributions(c ?? []);
        const { data: b } = await supabase
          .from("beneficiaries")
          .select("id, full_name, relationship, date_of_birth")
          .order("created_at");
        setBeneficiaries(b ?? []);
      }
      setLoaded(true);
    }
    load();
  }, []);

  async function contribute(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPaying(true);
    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment could not be started.");
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setError(err.message);
      setPaying(false);
    }
  }

  if (!loaded) {
    return (
      <main className="page page-wide">
        <p className="text-muted">Loading your statement…</p>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="page page-narrow">
        <div className="panel" style={{ maxWidth: 460, margin: "0 auto", padding: 32 }}>
          <h2 style={{ fontWeight: 400 }}>No member record found</h2>
          <p className="text-muted" style={{ fontSize: 14 }}>
            We couldn&apos;t find a membership for {session.user.email}. If you
            haven&apos;t joined yet, please <a href="/register">register here</a>.
          </p>
          <button className="btn btn-secondary" onClick={() => supabaseBrowser().auth.signOut()}>
            Sign out
          </button>
        </div>
      </main>
    );
  }

  const total = contributions.reduce((s, c) => s + c.amount_cents, 0);
  const regPaid = contributions.some((c) => c.type === "registration");
  const lastPayment = contributions[0];

  const stats = [
    { label: "Member number", value: member.member_number, note: `Issued ${fmtDate(member.created_at)}` },
    { label: "Total contributed", value: `$${(total / 100).toFixed(2)}`, note: "Since registration" },
    {
      label: "Registration fee",
      value: regPaid ? "Paid" : "Pending",
      note: regPaid ? "$100 registration contribution" : "Complete checkout to activate",
    },
    {
      label: "Last contribution",
      value: lastPayment ? fmtDate(lastPayment.paid_at) : "—",
      note: lastPayment ? `$${(lastPayment.amount_cents / 100).toFixed(2)}` : "No payments yet",
    },
  ];

  return (
    <main className="page page-wide" style={{ paddingTop: 48 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="kicker">
            {member.member_number} · {member.status === "active" ? "Member in good standing" : "Registration pending"}
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 400, margin: "10px 0 0" }}>{member.full_name}</h1>
        </div>
        <button className="btn btn-secondary" onClick={() => supabaseBrowser().auth.signOut()}>
          Sign out
        </button>
      </div>
      <hr className="hr" style={{ margin: "28px 0 32px" }} />

      <div className="grid-portal-stats">
        {stats.map((k) => (
          <div key={k.label}>
            <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
              {k.label}
            </div>
            <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 30, marginTop: 6 }}>
              {k.value}
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>{k.note}</div>
          </div>
        ))}
      </div>

      <div className="grid-portal-main">
        <div>
          <h3 style={{ fontWeight: 400, margin: 0 }}>Contribution statement</h3>
          <div className="table-wrap">
            <table className="table" style={{ marginTop: 14 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Method</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contributions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted">No contributions recorded yet.</td>
                  </tr>
                )}
                {contributions.map((c) => (
                  <tr key={c.id}>
                    <td className="tabular" style={{ whiteSpace: "nowrap" }}>{fmtDate(c.paid_at)}</td>
                    <td className="tabular">{refFor(c)}</td>
                    <td>{c.type === "registration" ? "Registration contribution" : "Contribution"}</td>
                    <td className="text-muted">Stripe Checkout</td>
                    <td className="tabular" style={{ textAlign: "right" }}>
                      ${(c.amount_cents / 100).toFixed(2)}
                    </td>
                    <td><span className="tag tag-accent">Cleared</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card">
            <div className="card-kicker">Contribute</div>
            <div className="card-title">Make a contribution</div>
            <p className="card-body">
              Paid by card through Stripe Checkout; a receipt follows by email
              and the payment appears on your statement.
            </p>
            <form onSubmit={contribute}>
              <div className="field">
                <label htmlFor="amount">Amount (USD)</label>
                <input
                  id="amount"
                  className="input tabular"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-block" disabled={paying}>
                {paying ? "Redirecting…" : `Contribute $${amount || "0"}`}
              </button>
            </form>
            {error && <div className="notice notice-error">{error}</div>}
          </div>

          <div className="card">
            <div className="card-kicker">Records</div>
            <div className="card-title">Your details</div>
            <p className="card-body">
              Home address and contact details on file with the Record Keeping
              Officer. Email records@kidawelfare.org to request an update.
              Your next of kin and beneficiaries are managed below.
            </p>
            <div className="card-meta">{member.branch ?? "No address on file"}</div>
          </div>
        </div>
      </div>

      <FamilySection
        session={session}
        member={member}
        beneficiaries={beneficiaries}
        setBeneficiaries={setBeneficiaries}
      />
    </main>
  );
}

function FamilySection({
  session,
  member,
  beneficiaries,
  setBeneficiaries,
}: {
  session: Session;
  member: Member;
  beneficiaries: Beneficiary[];
  setBeneficiaries: React.Dispatch<React.SetStateAction<Beneficiary[]>>;
}) {
  const [kinName, setKinName] = useState(member.next_of_kin?.name_relationship ?? "");
  const [kinPhone, setKinPhone] = useState(member.next_of_kin?.phone ?? "");
  const [kinSaved, setKinSaved] = useState(false);
  const [benName, setBenName] = useState("");
  const [benRel, setBenRel] = useState("spouse");
  const [benDob, setBenDob] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function callFamily(payload: object) {
    const res = await fetch("/api/family", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  async function saveKin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setKinSaved(false);
    setBusy(true);
    try {
      await callFamily({
        nextOfKin: { name_relationship: kinName, phone: kinPhone },
      });
      setKinSaved(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addBeneficiary(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await callFamily({
        addBeneficiary: {
          fullName: benName,
          relationship: benRel,
          dateOfBirth: benDob,
        },
      });
      setBeneficiaries((b) => [...b, data.beneficiary]);
      setBenName("");
      setBenDob("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeBeneficiary(id: string) {
    setError("");
    setBusy(true);
    try {
      await callFamily({ removeBeneficiaryId: id });
      setBeneficiaries((b) => b.filter((x) => x.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: 44 }}>
      <h3 style={{ fontWeight: 400, margin: 0 }}>Next of kin &amp; beneficiaries</h3>
      <p className="text-muted" style={{ fontSize: 13, marginTop: 6, maxWidth: "64ch" }}>
        Your next of kin is the person we contact first. Beneficiaries are
        your nuclear family members — spouse and children — recognised for
        welfare support.
      </p>
      {error && <div className="notice notice-error">{error}</div>}
      <div className="grid-family">
        <div className="card">
          <div className="card-kicker">Next of kin</div>
          <form onSubmit={saveKin}>
            <div className="field">
              <label htmlFor="kinName">Name and relationship</label>
              <input
                id="kinName"
                className="input"
                required
                placeholder="e.g. Jane Wanjiru — sister"
                value={kinName}
                onChange={(e) => setKinName(e.target.value)}
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="kinPhone">Mobile number</label>
              <input
                id="kinPhone"
                className="input"
                value={kinPhone}
                onChange={(e) => setKinPhone(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy}>
              {member.next_of_kin ? "Update next of kin" : "Save next of kin"}
            </button>
          </form>
          {kinSaved && <div className="notice notice-ok">Next of kin saved.</div>}
        </div>

        <div className="card">
          <div className="card-kicker">Beneficiaries — nuclear family</div>
          {beneficiaries.length === 0 && (
            <p className="card-body">No beneficiaries recorded yet.</p>
          )}
          {beneficiaries.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Relationship</th>
                    <th>Date of birth</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map((b) => (
                    <tr key={b.id}>
                      <td>{b.full_name}</td>
                      <td>
                        <span className="tag tag-accent" style={{ textTransform: "capitalize" }}>
                          {b.relationship}
                        </span>
                      </td>
                      <td className="tabular">{b.date_of_birth ?? "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "3px 10px", fontSize: 12 }}
                          disabled={busy}
                          onClick={() => removeBeneficiary(b.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <form onSubmit={addBeneficiary} className="family-add">
            <div className="field">
              <label htmlFor="benName">Full name</label>
              <input
                id="benName"
                className="input"
                required
                value={benName}
                onChange={(e) => setBenName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="benRel">Relationship</label>
              <select
                id="benRel"
                className="input"
                value={benRel}
                onChange={(e) => setBenRel(e.target.value)}
              >
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="benDob">Date of birth (optional)</label>
              <input
                id="benDob"
                className="input"
                value={benDob}
                onChange={(e) => setBenDob(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" disabled={busy}>
              Add beneficiary
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
