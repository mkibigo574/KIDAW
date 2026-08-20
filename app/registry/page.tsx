"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabaseBrowser";

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
    const header = "member_number,full_name,email,branch,status,registered,total_usd";
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
            Officials&apos; view — Record Keeping Officer and Treasurer.
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
                  <th>Branch</th>
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
                      ${(m.total_cents / 100).toFixed(2)}
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
    </main>
  );
}
