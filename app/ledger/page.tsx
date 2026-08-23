"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabaseBrowser";

type Entry = {
  id: string;
  amount_cents: number;
  type: string;
  method: string;
  note: string | null;
  recorded_by: string | null;
  reversal_of: string | null;
  stripe_session_id: string | null;
  paid_at: string;
  member_number: string | null;
  full_name: string;
  is_reversed: boolean;
};

type MemberOption = { id: string; member_number: string | null; full_name: string };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(cents: number) {
  const sign = cents < 0 ? "−" : "";
  return `${sign}A$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export default function LedgerPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
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
    const res = await fetch("/api/ledger", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load the ledger.");
      return;
    }
    setEntries(data.entries);
    setMembers(data.members ?? []);
    setPermissions(data.permissions ?? []);
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
          <div className="kicker">Officials only</div>
          <h1 style={{ fontSize: 36, fontWeight: 400, margin: "12px 0 8px" }}>Ledger</h1>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Sign in through the <a href="/portal">member portal</a> with an
            official&apos;s email address to open the ledger.
          </p>
        </div>
      </main>
    );
  }

  const canRecord = permissions.includes("ledger.record");
  const canReverse = permissions.includes("ledger.reverse");
  const total = (entries ?? []).reduce((s, e) => s + e.amount_cents, 0);

  return (
    <main className="page page-wide" style={{ paddingTop: 48 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 44, fontWeight: 400, margin: 0 }}>Contribution ledger</h1>
          <p className="text-muted" style={{ margin: "8px 0 0", maxWidth: "64ch" }}>
            Every payment the association has received. The ledger is append-only:
            a mistake is corrected by posting a reversing entry, so nothing already
            recorded is ever edited or removed.
          </p>
        </div>
        <Link className="btn btn-secondary" href="/arrears">
          Arrears report
        </Link>
      </div>
      <hr className="hr" style={{ margin: "28px 0" }} />

      {error && <div className="notice notice-error">{error}</div>}

      {entries && (
        <>
          <div className="grid-portal-stats" style={{ marginBottom: 32 }}>
            <div>
              <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
                Balance on the ledger
              </div>
              <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 30, marginTop: 6 }}>
                {money(total)}
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>Net of reversals</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
                Entries
              </div>
              <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 30, marginTop: 6 }}>
                {entries.length}
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>Posted transactions</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
                Taken offline
              </div>
              <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 30, marginTop: 6 }}>
                {entries.filter((e) => e.method !== "stripe").length}
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>Cash, bank or other</div>
            </div>
          </div>

          {canRecord && (
            <RecordPayment session={session} members={members} onPosted={load} />
          )}

          <h3 style={{ fontWeight: 400, margin: "36px 0 0" }}>All transactions</h3>
          <div className="table-wrap">
            <table className="table" style={{ marginTop: 14 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Type</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  {canReverse && <th />}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="tabular" style={{ whiteSpace: "nowrap" }}>{fmtDate(e.paid_at)}</td>
                    <td>
                      <span className="tabular">{e.member_number ?? "—"}</span>{" "}
                      <span className="text-muted" style={{ fontSize: 12 }}>{e.full_name}</span>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{e.type}</td>
                    <td>
                      <span className={e.method === "stripe" ? "tag tag-neutral" : "tag tag-accent"} style={{ textTransform: "capitalize" }}>
                        {e.method}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: 12, maxWidth: 260 }}>
                      {e.note ?? (e.stripe_session_id ? "Stripe Checkout" : "—")}
                      {e.recorded_by && (
                        <div style={{ fontSize: 11 }}>posted by {e.recorded_by}</div>
                      )}
                    </td>
                    <td
                      className="tabular"
                      style={{ textAlign: "right", color: e.amount_cents < 0 ? "var(--color-accent-2)" : undefined }}
                    >
                      {money(e.amount_cents)}
                    </td>
                    {canReverse && (
                      <td style={{ textAlign: "right" }}>
                        {!e.reversal_of && !e.is_reversed && (
                          <ReverseButton session={session} entry={e} onDone={load} />
                        )}
                        {e.is_reversed && (
                          <span className="text-muted" style={{ fontSize: 11 }}>reversed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={canReverse ? 7 : 6} className="text-muted">
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

function RecordPayment({
  session,
  members,
  onPosted,
}: {
  session: Session;
  members: MemberOption[];
  onPosted: () => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [type, setType] = useState("contribution");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone("");
    setBusy(true);
    try {
      const res = await fetch("/api/ledger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ memberId, amount, method, type, note, paidAt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The payment was not recorded.");
      setDone(`Recorded ${money(data.entry.amount_cents)}.`);
      setAmount("");
      setNote("");
      setPaidAt("");
      onPosted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel panel-surface">
      <h6 style={{ color: "var(--color-accent-700)" }}>Record a payment taken offline</h6>
      <p className="text-muted" style={{ fontSize: 13, margin: "8px 0 16px", maxWidth: "62ch" }}>
        For cash handed over or money paid straight into the association&apos;s
        bank account. Card payments record themselves. Once posted, an entry can
        only be corrected by a reversal.
      </p>
      <form onSubmit={submit} className="grid-ledger-form">
        <div className="field">
          <label htmlFor="member">Member</label>
          <select
            id="member"
            className="input"
            required
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          >
            <option value="">Choose a member…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.member_number} — {m.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="amount">Amount (AUD)</label>
          <input
            id="amount"
            className="input tabular"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="method">Received as</label>
          <select id="method" className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="bank">Bank transfer</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="contribution">Contribution</option>
            <option value="registration">Registration fee</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="paidAt">Date received (optional)</label>
          <input
            id="paidAt"
            className="input"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </div>
        <div className="field" style={{ gridColumn: "1/-1" }}>
          <label htmlFor="note">Reference or description</label>
          <input
            id="note"
            className="input"
            required
            placeholder="e.g. bank deposit ref 88213, or cash received at the June meeting"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" disabled={busy} style={{ gridColumn: "1/-1", justifySelf: "start" }}>
          {busy ? "Posting…" : "Post to the ledger"}
        </button>
      </form>
      {done && <div className="notice notice-ok">{done}</div>}
      {error && <div className="notice notice-error">{error}</div>}
    </div>
  );
}

function ReverseButton({
  session,
  entry,
  onDone,
}: {
  session: Session;
  entry: Entry;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/ledger/reverse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ contributionId: entry.id, reason }),
    });
    setBusy(false);
    setOpen(false);
    setReason("");
    onDone();
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: "3px 10px", fontSize: 12 }}
        onClick={() => setOpen(true)}
      >
        Reverse
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
      <input
        className="input"
        style={{ minWidth: 180, fontSize: 12 }}
        placeholder="Reason for the reversal"
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <button className="btn btn-primary" style={{ padding: "3px 10px", fontSize: 12 }} disabled={busy}>
        {busy ? "…" : "Post"}
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: "3px 10px", fontSize: 12 }}
        onClick={() => setOpen(false)}
      >
        Cancel
      </button>
    </form>
  );
}
