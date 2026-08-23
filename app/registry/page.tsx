"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabaseBrowser";
import { ROLE_LABELS, roleLabel } from "@/lib/roles";

type Row = {
  id: string;
  member_number: string | null;
  full_name: string;
  email: string;
  branch: string | null;
  status: string;
  created_at: string;
  total_cents: number;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function RegistryPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "pending">("all");
  const [myRoles, setMyRoles] = useState<string[]>([]);
  const [myPermissions, setMyPermissions] = useState<string[]>([]);

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

  useEffect(() => {
    if (!session) return;
    fetch("/api/registry", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not load the register.");
        setRows(data.members);
        setMyRoles(data.roles ?? []);
        setMyPermissions(data.permissions ?? []);
      })
      .catch((e) => setError(e.message));
  }, [session]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((m) => {
      if (filter !== "all" && m.status !== filter) return false;
      if (!q) return true;
      return [m.member_number, m.full_name, m.email, m.branch]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [rows, query, filter]);

  function exportCsv() {
    if (!rows) return;
    const header = "member_number,full_name,email,branch,status,registered,total_aud";
    const lines = rows.map((m) =>
      [
        m.member_number ?? "",
        `"${m.full_name.replace(/"/g, '""')}"`,
        m.email,
        m.branch ?? "",
        m.status,
        fmtDate(m.created_at),
        (m.total_cents / 100).toFixed(2),
      ].join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kida-member-register.csv";
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
          <h1 style={{ fontSize: 36, fontWeight: 400, margin: "12px 0 8px" }}>Member register</h1>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Sign in through the <a href="/portal">member portal</a> with an
            official&apos;s email address to open the register.
          </p>
        </div>
      </main>
    );
  }

  const counts = rows
    ? {
        all: rows.length,
        active: rows.filter((m) => m.status === "active").length,
        pending: rows.filter((m) => m.status === "pending").length,
      }
    : null;

  return (
    <main className="page page-wide" style={{ paddingTop: 48 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 44, fontWeight: 400, margin: 0 }}>Member register</h1>
          <p className="text-muted" style={{ margin: "8px 0 0" }}>
            {myRoles.length > 0 ? (
              <>
                Signed in as{" "}
                {myRoles.map((r) => roleLabel(r)).join(" · ")}
              </>
            ) : (
              "Officials’ view of the register."
            )}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportCsv} disabled={!rows?.length}>
          Export CSV
        </button>
      </div>
      <hr className="hr" style={{ margin: "28px 0" }} />

      {error && <div className="notice notice-error">{error}</div>}

      {rows && (
        <>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="Search name, number or email"
              style={{ maxWidth: 320 }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="seg">
              {(
                [
                  ["all", `All ${counts!.all}`],
                  ["active", `Active ${counts!.active}`],
                  ["pending", `Pending ${counts!.pending}`],
                ] as const
              ).map(([key, label]) => (
                <label className="seg-opt" key={key}>
                  <input
                    type="radio"
                    name="f"
                    checked={filter === key}
                    onChange={() => setFilter(key)}
                  />
                  <span style={{ whiteSpace: "nowrap" }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Member</th>
                  <th>Registered</th>
                  <th>Home address</th>
                  <th style={{ textAlign: "right" }}>Total contributed</th>
                  <th>Standing</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td className="tabular" style={{ whiteSpace: "nowrap" }}>
                      {m.member_number ?? "—"}
                    </td>
                    <td>
                      {m.full_name}
                      <span className="text-muted" style={{ fontSize: 12 }}> · {m.email}</span>
                    </td>
                    <td className="tabular" style={{ whiteSpace: "nowrap" }}>{fmtDate(m.created_at)}</td>
                    <td className="text-muted">{m.branch ?? "—"}</td>
                    <td className="tabular" style={{ textAlign: "right" }}>
                      A${(m.total_cents / 100).toFixed(2)}
                    </td>
                    <td>
                      {m.status === "active" ? (
                        <span className="tag tag-accent">Good</span>
                      ) : m.status === "pending" ? (
                        <span className="tag tag-neutral">Pending</span>
                      ) : (
                        <span className="tag tag-outline">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted">No members match.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {myPermissions.includes("roles.manage") && session && (
        <CommitteePanel session={session} />
      )}
    </main>
  );
}

type Appointment = {
  id: string;
  email: string;
  role: string;
  appointed_at: string;
};

// Appoint and revoke officers. Shown only to roles carrying "roles.manage":
// the Chairperson and the Public Officer & Record Keeping Officer.
function CommitteePanel({ session }: { session: Session }) {
  const [officials, setOfficials] = useState<Appointment[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("treasurer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/roles", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (res.ok) setOfficials(data.officials);
    else setError(data.error);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(payload: object) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That did not work.");
      await load();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function appoint(e: React.FormEvent) {
    e.preventDefault();
    if (await send({ appoint: { email, role } })) setEmail("");
  }

  return (
    <section style={{ marginTop: 56 }}>
      <hr className="hr" style={{ marginBottom: 32 }} />
      <h3 style={{ fontWeight: 400, margin: 0 }}>Committee &amp; roles</h3>
      <p className="text-muted" style={{ fontSize: 13, marginTop: 6, maxWidth: "64ch" }}>
        Each office grants only what that officer needs. A welfare claim is
        recorded and initiated by the Treasurer, approved by the Chairperson and never paid
        by the Treasurer, so no single account can move money on its own.
      </p>
      {error && <div className="notice notice-error">{error}</div>}

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Office</th>
              <th>Held by</th>
              <th>Appointed</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {officials?.map((o) => (
              <tr key={o.id}>
                <td>{roleLabel(o.role)}</td>
                <td className="text-muted">{o.email}</td>
                <td className="tabular" style={{ whiteSpace: "nowrap" }}>
                  {fmtDate(o.appointed_at)}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "3px 10px", fontSize: 12 }}
                    disabled={busy}
                    onClick={() => send({ revoke: { email: o.email, role: o.role } })}
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
            {officials?.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted">
                  No officers appointed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={appoint} className="family-add" style={{ marginTop: 18 }}>
        <div className="field">
          <label htmlFor="officerEmail">Officer&apos;s email address</label>
          <input
            id="officerEmail"
            type="email"
            className="input"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="officerRole">Office</label>
          <select
            id="officerRole"
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" disabled={busy}>
          Appoint
        </button>
      </form>
    </section>
  );
}
