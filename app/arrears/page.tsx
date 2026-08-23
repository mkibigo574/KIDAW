"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabaseBrowser";

type Row = {
  id: string;
  member_number: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  months_as_member: number;
  expected_cents: number;
  paid_cents: number;
  arrears_cents: number;
  months_behind: number;
  registration_outstanding: boolean;
  last_contribution: string | null;
};

type Summary = {
  members: number;
  in_arrears: number;
  total_arrears_cents: number;
  registration_outstanding: number;
  monthly_contribution_cents: number;
  arrears_grace_months: number;
};

function money(cents: number) {
  return `A$${(cents / 100).toFixed(2)}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ArrearsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [only, setOnly] = useState<"behind" | "all">("behind");

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
    const res = await fetch("/api/arrears", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not build the report.");
      return;
    }
    setRows(data.rows);
    setSummary(data.summary);
    setPermissions(data.permissions ?? []);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    if (!rows) return [];
    const list =
      only === "behind"
        ? rows.filter((r) => r.arrears_cents > 0 || r.registration_outstanding)
        : rows;
    return [...list].sort((a, b) => b.arrears_cents - a.arrears_cents);
  }, [rows, only]);

  function exportCsv() {
    if (!rows) return;
    const header =
      "member_number,full_name,email,phone,status,months_as_member,expected_aud,paid_aud,arrears_aud,months_behind,registration_outstanding,last_contribution";
    const lines = rows.map((r) =>
      [
        r.member_number ?? "",
        `"${r.full_name.replace(/"/g, '""')}"`,
        r.email,
        r.phone ?? "",
        r.status,
        r.months_as_member,
        (r.expected_cents / 100).toFixed(2),
        (r.paid_cents / 100).toFixed(2),
        (r.arrears_cents / 100).toFixed(2),
        r.months_behind,
        r.registration_outstanding ? "yes" : "no",
        r.last_contribution ? fmtDate(r.last_contribution) : "never",
      ].join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kida-arrears.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

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
          <h1 style={{ fontSize: 34, fontWeight: 400, margin: "12px 0 8px" }}>Arrears</h1>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Sign in through the <a href="/portal">member portal</a> with an
            official&apos;s email address.
          </p>
        </div>
      </main>
    );
  }

  const canSetRate = permissions.includes("settings.manage");
  const behindEmails = shown.filter((r) => r.arrears_cents > 0).map((r) => r.email);

  return (
    <main className="page page-wide" style={{ paddingTop: 48 }}>
      <Link href="/ledger" className="text-muted" style={{ fontSize: 13 }}>
        ← Back to the ledger
      </Link>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          marginTop: 10,
        }}
      >
        <div>
          <h1 style={{ fontSize: 42, fontWeight: 400, margin: 0 }}>Arrears</h1>
          <p className="text-muted" style={{ margin: "8px 0 0", maxWidth: "64ch" }}>
            Worked out from the ledger each time this page loads, so a payment
            posted a moment ago counts immediately and no stale flag can
            contradict the accounts.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportCsv} disabled={!rows?.length}>
          Export CSV
        </button>
      </div>
      <hr className="hr" style={{ margin: "28px 0" }} />

      {error && <div className="notice notice-error">{error}</div>}

      {summary && (
        <>
          <div className="grid-portal-stats" style={{ marginBottom: 28 }}>
            <div>
              <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
                Members behind
              </div>
              <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 30, marginTop: 6 }}>
                {summary.in_arrears}
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>of {summary.members} on the register</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
                Total outstanding
              </div>
              <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 30, marginTop: 6 }}>
                {money(summary.total_arrears_cents)}
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>Contributions only</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
                Registration unpaid
              </div>
              <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 30, marginTop: 6 }}>
                {summary.registration_outstanding}
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>Joining fee not received</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
                Agreed rate
              </div>
              <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 30, marginTop: 6 }}>
                {money(summary.monthly_contribution_cents)}
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                monthly, after {summary.arrears_grace_months} month
                {summary.arrears_grace_months === 1 ? "" : "s"} grace
              </div>
            </div>
          </div>

          {canSetRate && <RateForm session={session} summary={summary} onSaved={load} />}

          <div style={{ display: "flex", gap: 14, alignItems: "center", margin: "24px 0 16px", flexWrap: "wrap" }}>
            <div className="seg">
              {(
                [
                  ["behind", `Behind ${rows?.filter((r) => r.arrears_cents > 0 || r.registration_outstanding).length ?? 0}`],
                  ["all", `Everyone ${rows?.length ?? 0}`],
                ] as const
              ).map(([key, label]) => (
                <label className="seg-opt" key={key}>
                  <input type="radio" name="only" checked={only === key} onChange={() => setOnly(key)} />
                  <span style={{ whiteSpace: "nowrap" }}>{label}</span>
                </label>
              ))}
            </div>
            {behindEmails.length > 0 && (
              <a className="btn btn-secondary" href={`mailto:?bcc=${behindEmails.join(",")}&subject=${encodeURIComponent("KIDAW — contributions outstanding")}`}>
                Email everyone behind ({behindEmails.length})
              </a>
            )}
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Standing</th>
                  <th className="tabular" style={{ textAlign: "right" }}>Months</th>
                  <th className="tabular" style={{ textAlign: "right" }}>Expected</th>
                  <th className="tabular" style={{ textAlign: "right" }}>Paid</th>
                  <th className="tabular" style={{ textAlign: "right" }}>Arrears</th>
                  <th>Last contribution</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/registry/${r.id}`} className="tabular">
                        {r.member_number ?? "—"}
                      </Link>{" "}
                      <span className="text-muted" style={{ fontSize: 12 }}>{r.full_name}</span>
                    </td>
                    <td>
                      {r.registration_outstanding ? (
                        <span className="tag tag-accent-2">Registration unpaid</span>
                      ) : r.arrears_cents > 0 ? (
                        <span className="tag tag-outline">
                          {r.months_behind} month{r.months_behind === 1 ? "" : "s"} behind
                        </span>
                      ) : (
                        <span className="tag tag-accent">Up to date</span>
                      )}
                    </td>
                    <td className="tabular" style={{ textAlign: "right" }}>{r.months_as_member}</td>
                    <td className="tabular" style={{ textAlign: "right" }}>{money(r.expected_cents)}</td>
                    <td className="tabular" style={{ textAlign: "right" }}>{money(r.paid_cents)}</td>
                    <td
                      className="tabular"
                      style={{ textAlign: "right", color: r.arrears_cents > 0 ? "var(--color-accent-2)" : undefined }}
                    >
                      {money(r.arrears_cents)}
                    </td>
                    <td className="text-muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {fmtDate(r.last_contribution)}
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-muted">
                      Nobody is behind. Every member is up to date.
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

function RateForm({
  session,
  summary,
  onSaved,
}: {
  session: Session;
  summary: Summary;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState((summary.monthly_contribution_cents / 100).toFixed(2));
  const [grace, setGrace] = useState(String(summary.arrears_grace_months));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/arrears", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ monthlyAmount: amount, graceMonths: grace }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That was not saved.");
      setMsg("Rate saved. Arrears recalculated.");
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel panel-surface">
      <h6 style={{ color: "var(--color-accent-700)" }}>Agreed contribution rate</h6>
      <p className="text-muted" style={{ fontSize: 13, margin: "8px 0 16px", maxWidth: "62ch" }}>
        What the committee has resolved every member contributes each month, and
        how long a new member has before contributions are expected. Changing
        this recalculates every figure on this page and is recorded in the audit
        log.
      </p>
      <form onSubmit={submit} style={{ display: "flex", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
        <div className="field">
          <label htmlFor="rate">Monthly contribution (AUD)</label>
          <input
            id="rate"
            className="input tabular"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="grace">Grace period (months)</label>
          <input
            id="grace"
            className="input tabular"
            type="number"
            min="0"
            max="12"
            value={grace}
            onChange={(e) => setGrace(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save rate"}
        </button>
      </form>
      {msg && <div className="notice notice-ok">{msg}</div>}
      {error && <div className="notice notice-error">{error}</div>}
    </div>
  );
}
