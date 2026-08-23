"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabaseBrowser";

type Disbursement = {
  id: string;
  member_id: string | null;
  member_number: string | null;
  full_name: string | null;
  amount_cents: number;
  purpose: string;
  status: string;
  initiated_by: string;
  initiated_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  paid_at: string | null;
  paid_by: string | null;
  payment_method: string | null;
  payment_reference: string | null;
};

type MemberOption = { id: string; member_number: string | null; full_name: string };

type Position = {
  received_cents: number;
  paid_out_cents: number;
  committed_cents: number;
  available_cents: number;
};

function money(cents: number) {
  return `A$${(cents / 100).toFixed(2)}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUS_TAG: Record<string, string> = {
  requested: "tag tag-neutral",
  approved: "tag tag-outline",
  paid: "tag tag-accent",
  rejected: "tag tag-accent-2",
  cancelled: "tag tag-neutral",
};

export default function DisbursementsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<Disbursement[] | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [position, setPosition] = useState<Position | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [me, setMe] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
    const res = await fetch("/api/disbursements", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load disbursements.");
      return;
    }
    setRows(data.disbursements);
    setMembers(data.members ?? []);
    setPosition(data.position);
    setPermissions(data.permissions ?? []);
    setMe(data.me ?? "");
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, body: object, msg: string) {
    setError("");
    setNotice("");
    const res = await fetch(`/api/disbursements/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session!.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "That did not work.");
    else {
      setNotice(msg);
      await load();
    }
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
          <h1 style={{ fontSize: 34, fontWeight: 400, margin: "12px 0 8px" }}>Disbursements</h1>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Sign in through the <a href="/portal">member portal</a> with an
            official&apos;s email address.
          </p>
        </div>
      </main>
    );
  }

  const canInitiate = permissions.includes("disbursement.initiate");
  const canApprove = permissions.includes("disbursement.approve");
  const canPay = permissions.includes("ledger.record");

  return (
    <main className="page page-wide" style={{ paddingTop: 48 }}>
      <Link href="/ledger" className="text-muted" style={{ fontSize: 13 }}>
        ← Back to the ledger
      </Link>
      <div style={{ marginTop: 10 }}>
        <h1 style={{ fontSize: 42, fontWeight: 400, margin: 0 }}>Disbursements</h1>
        <p className="text-muted" style={{ margin: "8px 0 0", maxWidth: "66ch" }}>
          Money paid out of the fund. Every payment takes two signatures: the
          Treasurer requests it, the Chairperson approves it, and only then does
          the Treasurer record it as paid. Nobody can do two of those steps on
          the same payment.
        </p>
      </div>
      <hr className="hr" style={{ margin: "28px 0" }} />

      {notice && <div className="notice notice-ok">{notice}</div>}
      {error && <div className="notice notice-error">{error}</div>}

      {position && (
        <div className="grid-portal-stats" style={{ marginBottom: 28 }}>
          <div>
            <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
              Received
            </div>
            <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 30, marginTop: 6 }}>
              {money(position.received_cents)}
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>Contributions to date</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
              Paid out
            </div>
            <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 30, marginTop: 6 }}>
              {money(position.paid_out_cents)}
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>Disbursements settled</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
              Committed
            </div>
            <div className="tabular" style={{ fontFamily: "var(--font-heading)", fontSize: 30, marginTop: 6 }}>
              {money(position.committed_cents)}
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>Approved, not yet paid</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
              Available
            </div>
            <div
              className="tabular"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 30,
                marginTop: 6,
                color: position.available_cents < 0 ? "var(--color-accent-2)" : undefined,
              }}
            >
              {money(position.available_cents)}
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>After commitments</div>
          </div>
        </div>
      )}

      {canInitiate && position && (
        <RequestForm
          session={session}
          members={members}
          available={position.available_cents}
          onDone={load}
        />
      )}

      <h3 style={{ fontWeight: 400, margin: "36px 0 0" }}>All disbursements</h3>
      <div className="table-wrap">
        <table className="table" style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Requested</th>
              <th>For</th>
              <th>Purpose</th>
              <th style={{ textAlign: "right" }}>Amount</th>
              <th>Status</th>
              <th>Signatures</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((d) => (
              <tr key={d.id}>
                <td className="tabular" style={{ whiteSpace: "nowrap" }}>{fmtDate(d.initiated_at)}</td>
                <td>
                  {d.member_number ? (
                    <>
                      <Link href={`/registry/${d.member_id}`} className="tabular">{d.member_number}</Link>{" "}
                      <span className="text-muted" style={{ fontSize: 12 }}>{d.full_name}</span>
                    </>
                  ) : (
                    <span className="text-muted">Association</span>
                  )}
                </td>
                <td style={{ maxWidth: 240, fontSize: 13 }}>
                  {d.purpose}
                  {d.decision_note && (
                    <div className="text-muted" style={{ fontSize: 11 }}>{d.decision_note}</div>
                  )}
                  {d.payment_reference && (
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      {d.payment_method} · {d.payment_reference}
                    </div>
                  )}
                </td>
                <td className="tabular" style={{ textAlign: "right" }}>{money(d.amount_cents)}</td>
                <td>
                  <span className={STATUS_TAG[d.status] ?? "tag tag-neutral"} style={{ textTransform: "capitalize" }}>
                    {d.status}
                  </span>
                </td>
                <td className="text-muted" style={{ fontSize: 11 }}>
                  <div>requested {d.initiated_by}</div>
                  {d.decided_by && <div>decided {d.decided_by}</div>}
                  {d.paid_by && <div>paid {d.paid_by}</div>}
                </td>
                <td style={{ textAlign: "right" }}>
                  <RowActions
                    d={d}
                    me={me}
                    canApprove={canApprove}
                    canPay={canPay}
                    canInitiate={canInitiate}
                    onAct={act}
                  />
                </td>
              </tr>
            ))}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted">Nothing has been paid out yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function RowActions({
  d,
  me,
  canApprove,
  canPay,
  canInitiate,
  onAct,
}: {
  d: Disbursement;
  me: string;
  canApprove: boolean;
  canPay: boolean;
  canInitiate: boolean;
  onAct: (id: string, body: object, msg: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"" | "reject" | "pay">("");
  const [text, setText] = useState("");
  const [method, setMethod] = useState("bank");

  const small = { padding: "3px 10px", fontSize: 12 } as const;

  if (d.status === "requested" && canApprove) {
    // The person who requested it cannot also approve it.
    if (d.initiated_by === me) {
      return (
        <span className="text-muted" style={{ fontSize: 11 }}>
          you requested this
        </span>
      );
    }
    if (mode === "reject") {
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAct(d.id, { action: "reject", note: text }, "Disbursement rejected.");
          }}
          style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}
        >
          <input
            className="input"
            style={{ minWidth: 160, fontSize: 12 }}
            placeholder="Reason"
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-primary" style={small}>Confirm</button>
          <button type="button" className="btn btn-secondary" style={small} onClick={() => setMode("")}>
            Cancel
          </button>
        </form>
      );
    }
    return (
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button
          className="btn btn-primary"
          style={small}
          onClick={() => onAct(d.id, { action: "approve" }, "Disbursement approved.")}
        >
          Approve
        </button>
        <button className="btn btn-secondary" style={small} onClick={() => setMode("reject")}>
          Reject
        </button>
      </div>
    );
  }

  if (d.status === "requested" && canInitiate) {
    return (
      <button
        className="btn btn-secondary"
        style={small}
        onClick={() => onAct(d.id, { action: "cancel" }, "Request withdrawn.")}
      >
        Withdraw
      </button>
    );
  }

  if (d.status === "approved" && canPay) {
    if (mode === "pay") {
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAct(d.id, { action: "pay", method, reference: text }, "Payment recorded.");
          }}
          style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}
        >
          <select className="input" style={{ fontSize: 12, width: 90 }} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
          <input
            className="input"
            style={{ minWidth: 140, fontSize: 12 }}
            placeholder="Payment reference"
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-primary" style={small}>Confirm</button>
          <button type="button" className="btn btn-secondary" style={small} onClick={() => setMode("")}>
            Cancel
          </button>
        </form>
      );
    }
    return (
      <button className="btn btn-primary" style={small} onClick={() => setMode("pay")}>
        Mark as paid
      </button>
    );
  }

  if (d.status === "approved" && !canPay) {
    return <span className="text-muted" style={{ fontSize: 11 }}>awaiting the Treasurer</span>;
  }
  if (d.status === "requested") {
    return <span className="text-muted" style={{ fontSize: 11 }}>awaiting the Chairperson</span>;
  }
  return null;
}

function RequestForm({
  session,
  members,
  available,
  onDone,
}: {
  session: Session;
  members: MemberOption[];
  available: number;
  onDone: () => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const overspend = Number(amount) * 100 > available;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/disbursements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ memberId, amount, purpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The request was not created.");
      setAmount("");
      setPurpose("");
      setMemberId("");
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel panel-surface">
      <h6 style={{ color: "var(--color-accent-700)" }}>Request a payment out</h6>
      <p className="text-muted" style={{ fontSize: 13, margin: "8px 0 16px", maxWidth: "62ch" }}>
        This does not move any money. It goes to the Chairperson for approval,
        and you record it as paid once the money has actually left the account.
      </p>
      <form onSubmit={submit} className="grid-ledger-form">
        <div className="field">
          <label htmlFor="dmember">For member (optional)</label>
          <select id="dmember" className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">The association itself</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.member_number} — {m.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="damount">Amount (AUD)</label>
          <input
            id="damount"
            className="input tabular"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="field" style={{ gridColumn: "1/-1" }}>
          <label htmlFor="dpurpose">What is it for</label>
          <input
            id="dpurpose"
            className="input"
            required
            placeholder="e.g. bereavement support for the family of KIDAW-002"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" disabled={busy} style={{ gridColumn: "1/-1", justifySelf: "start" }}>
          {busy ? "Sending…" : "Send to the Chairperson"}
        </button>
      </form>
      {amount && overspend && (
        <div className="notice notice-error">
          That is more than the fund has available ({money(available)} after
          existing commitments). You can still request it, but the Chairperson
          should know.
        </div>
      )}
      {error && <div className="notice notice-error">{error}</div>}
    </div>
  );
}
