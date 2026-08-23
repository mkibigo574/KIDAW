"use client";

import { useState } from "react";
import type { Session } from "@supabase/supabase-js";

export type Call = {
  id: string;
  title: string;
  purpose: string | null;
  amount_cents: number;
  due_date: string | null;
  status: string;
  initiated_by: string;
  decided_by: string | null;
  decision_note: string | null;
  my_paid_cents: number;
  i_have_paid: boolean;
  // Officers only
  paid_count?: number;
  eligible_count?: number;
  percent_paid?: number;
  collected_cents?: number;
  expected_cents?: number;
};

function money(cents: number) {
  return `A$${(cents / 100).toFixed(2)}`;
}

// Take-up banding, as the committee asked: below 30% is a problem, above 75%
// is healthy, in between needs a push.
function band(percent: number) {
  if (percent < 30) return { key: "low", label: "Needs attention" };
  if (percent > 75) return { key: "high", label: "On track" };
  return { key: "mid", label: "Coming along" };
}

export default function CallCard({
  call,
  session,
  me,
  permissions,
  onChange,
}: {
  call: Call;
  session: Session;
  me: string;
  permissions: string[];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const canApprove = permissions.includes("calls.approve");
  const canManage = permissions.includes("calls.create");
  const seesTakeUp = call.percent_paid !== undefined;

  async function act(body: object) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/calls/${call.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That did not work.");
      setRejecting(false);
      onChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: ((call.amount_cents - call.my_paid_cents) / 100).toFixed(2),
          callId: call.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment could not be started.");
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  const takeUp = call.percent_paid ?? 0;
  const b = band(takeUp);

  return (
    <div className="call-card">
      <div className="call-head">
        <div>
          <div className="call-title">{call.title}</div>
          {call.purpose && <div className="call-purpose">{call.purpose}</div>}
        </div>
        <div className="call-amount tabular">{money(call.amount_cents)}</div>
      </div>

      <div className="call-meta">
        <span className={`tag ${call.status === "active" ? "tag-accent" : call.status === "proposed" ? "tag-neutral" : "tag-outline"}`} style={{ textTransform: "capitalize" }}>
          {call.status === "proposed" ? "Awaiting approval" : call.status}
        </span>
        {call.due_date && <span>due {new Date(call.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>}
        <span>per member</span>
      </div>

      {seesTakeUp && (
        <div className="call-progress">
          <div className="call-progress-head">
            <span>
              <strong className="tabular">{takeUp}%</strong> of members have paid
              <span className="text-muted"> · {call.paid_count} of {call.eligible_count}</span>
            </span>
            <span className={`take-up take-up-${b.key}`}>{b.label}</span>
          </div>
          <div className="call-bar" role="img" aria-label={`${takeUp}% of members have paid`}>
            <span className={`call-bar-fill call-bar-${b.key}`} style={{ width: `${Math.min(100, takeUp)}%` }} />
          </div>
          <div className="call-progress-foot text-muted">
            {money(call.collected_cents ?? 0)} collected of {money(call.expected_cents ?? 0)} expected
          </div>
        </div>
      )}

      {call.status === "active" && (
        <div className="call-mine">
          {call.i_have_paid ? (
            <span className="tag tag-accent">You have paid</span>
          ) : (
            <>
              <span className="text-muted" style={{ fontSize: 12 }}>
                {call.my_paid_cents > 0
                  ? `You have paid ${money(call.my_paid_cents)} of ${money(call.amount_cents)}`
                  : "You have not paid this yet"}
              </span>
              <button className="btn btn-primary" style={{ padding: "5px 12px", fontSize: 13 }} disabled={busy} onClick={pay}>
                {busy ? "…" : `Pay ${money(call.amount_cents - call.my_paid_cents)}`}
              </button>
            </>
          )}
        </div>
      )}

      {call.status === "proposed" && canApprove && call.initiated_by !== me && (
        <div className="call-actions">
          {rejecting ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act({ action: "reject", note });
              }}
              style={{ display: "flex", gap: 6, width: "100%" }}
            >
              <input className="input" style={{ fontSize: 12 }} placeholder="Reason" required value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn btn-primary" style={{ padding: "3px 10px", fontSize: 12 }}>Confirm</button>
              <button type="button" className="btn btn-secondary" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => setRejecting(false)}>Cancel</button>
            </form>
          ) : (
            <>
              <button className="btn btn-primary" style={{ padding: "4px 12px", fontSize: 13 }} disabled={busy} onClick={() => act({ action: "approve" })}>
                Approve and open to members
              </button>
              <button className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: 13 }} onClick={() => setRejecting(true)}>
                Reject
              </button>
            </>
          )}
        </div>
      )}

      {call.status === "proposed" && call.initiated_by === me && (
        <div className="text-muted" style={{ fontSize: 12 }}>
          You proposed this — the Chairperson approves it.
        </div>
      )}

      {call.status === "active" && canManage && (
        <div className="call-actions">
          <button className="btn btn-secondary" style={{ padding: "3px 10px", fontSize: 12 }} disabled={busy} onClick={() => act({ action: "close" })}>
            Close this call
          </button>
        </div>
      )}

      {call.decision_note && call.status === "rejected" && (
        <div className="text-muted" style={{ fontSize: 12 }}>Not approved: {call.decision_note}</div>
      )}

      {error && <div className="notice notice-error">{error}</div>}
    </div>
  );
}
