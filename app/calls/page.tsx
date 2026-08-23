"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabaseBrowser";
import CallCard, { type Call } from "@/components/CallCard";

export default function CallsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [calls, setCalls] = useState<Call[] | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [me, setMe] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabaseConfigured) {
      setChecked(true);
      return;
    }
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    if (!session) return;
    const res = await fetch("/api/calls", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load the calls.");
      return;
    }
    setCalls(data.calls);
    setPermissions(data.permissions ?? []);
    setMe(data.me ?? "");
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  if (!checked) {
    return (
      <main className="page page-wide">
        <p className="text-muted">Loading…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page page-narrow">
        <div className="panel" style={{ maxWidth: 460, margin: "0 auto", padding: 32 }}>
          <div className="kicker">Members only</div>
          <h1 style={{ fontSize: 34, fontWeight: 400, margin: "12px 0 8px" }}>
            Calls for contributions
          </h1>
          <p className="text-muted" style={{ fontSize: 13 }}>
            <a href="/portal">Sign in</a> to see what the association is
            currently raising and what you have paid.
          </p>
        </div>
      </main>
    );
  }

  const canCreate = permissions.includes("calls.create");
  const proposed = (calls ?? []).filter((c) => c.status === "proposed");
  const active = (calls ?? []).filter((c) => c.status === "active");
  const past = (calls ?? []).filter((c) => c.status === "closed" || c.status === "rejected");

  return (
    <main className="page page-wide" style={{ paddingTop: 48 }}>
      <h1 style={{ fontSize: 42, fontWeight: 400, margin: 0 }}>Calls for contributions</h1>
      <p className="text-muted" style={{ margin: "8px 0 0", maxWidth: "66ch" }}>
        When the association raises money for a purpose — a bereavement, a
        project — the Treasurer proposes the call and the Chairperson approves
        it. Once approved it appears here for every member.
      </p>
      <hr className="hr" style={{ margin: "28px 0" }} />

      {error && <div className="notice notice-error">{error}</div>}
      {canCreate && <NewCall session={session} onDone={load} />}

      {proposed.length > 0 && (
        <Section title="Awaiting the Chairperson">
          {proposed.map((c) => (
            <CallCard key={c.id} call={c} session={session} me={me} permissions={permissions} onChange={load} />
          ))}
        </Section>
      )}

      <Section title={active.length > 0 ? "Open now" : "Nothing open"}>
        {active.map((c) => (
          <CallCard key={c.id} call={c} session={session} me={me} permissions={permissions} onChange={load} />
        ))}
        {active.length === 0 && (
          <p className="text-muted" style={{ fontSize: 14 }}>
            There is no call for contributions at the moment.
          </p>
        )}
      </Section>

      {past.length > 0 && (
        <Section title="Past calls">
          {past.map((c) => (
            <CallCard key={c.id} call={c} session={session} me={me} permissions={permissions} onChange={load} />
          ))}
        </Section>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h3 style={{ fontWeight: 400, margin: "0 0 14px" }}>{title}</h3>
      <div className="grid-calls">{children}</div>
    </section>
  );
}

function NewCall({ session, onDone }: { session: Session; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", purpose: "", amount: "", dueDate: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set(f: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((s) => ({ ...s, [f]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The call was not created.");
      setForm({ title: "", purpose: "", amount: "", dueDate: "" });
      setOpen(false);
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)} style={{ marginBottom: 28 }}>
        Propose a call for contributions
      </button>
    );
  }

  return (
    <div className="panel panel-surface" style={{ marginBottom: 28 }}>
      <h6 style={{ color: "var(--color-accent-700)" }}>Propose a call</h6>
      <p className="text-muted" style={{ fontSize: 13, margin: "8px 0 16px", maxWidth: "62ch" }}>
        Members will not see this until the Chairperson approves it.
      </p>
      <form onSubmit={submit} className="grid-ledger-form">
        <div className="field" style={{ gridColumn: "1/-1" }}>
          <label htmlFor="ctitle">Title</label>
          <input id="ctitle" className="input" required placeholder="e.g. Bereavement support — the Otieno family" value={form.title} onChange={set("title")} />
        </div>
        <div className="field">
          <label htmlFor="camount">Amount per member (AUD)</label>
          <input id="camount" className="input tabular" type="number" min="0.01" step="0.01" required value={form.amount} onChange={set("amount")} />
        </div>
        <div className="field">
          <label htmlFor="cdue">Due by (optional)</label>
          <input id="cdue" className="input" type="date" value={form.dueDate} onChange={set("dueDate")} />
        </div>
        <div className="field" style={{ gridColumn: "1/-1" }}>
          <label htmlFor="cpurpose">Why the association is raising this</label>
          <input id="cpurpose" className="input" value={form.purpose} onChange={set("purpose")} />
        </div>
        <div style={{ gridColumn: "1/-1", display: "flex", gap: 10 }}>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Sending…" : "Send to the Chairperson"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
      {error && <div className="notice notice-error">{error}</div>}
    </div>
  );
}
