"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabaseBrowser";
import AddressField from "@/components/AddressField";

type Member = {
  id: string;
  member_number: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  branch: string | null;
  referred_by: string | null;
  status: string;
  created_at: string;
  deleted_at: string | null;
  next_of_kin?: { name_relationship?: string | null; phone?: string | null } | null;
};

type Contribution = {
  id: string;
  amount_cents: number;
  type: string;
  method: string;
  note: string | null;
  reversal_of: string | null;
  paid_at: string;
};

type Beneficiary = {
  id: string;
  full_name: string;
  relationship: string;
  date_of_birth: string | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(cents: number) {
  return `${cents < 0 ? "−" : ""}A$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [showFamily, setShowFamily] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
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
    const res = await fetch(`/api/members/${id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load the member.");
      return;
    }
    setMember(data.member);
    setContributions(data.contributions ?? []);
    setBeneficiaries(data.beneficiaries ?? []);
    setShowFamily(data.showFamily);
    setPermissions(data.permissions ?? []);
  }, [session, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(body: object, successMessage: string) {
    setError("");
    setNotice("");
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session!.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "That change was not saved.");
      return false;
    }
    setNotice(
      data.signInMoved
        ? `${successMessage} Their portal sign-in was moved to the new address.`
        : successMessage
    );
    await load();
    return true;
  }

  async function remove(restore: boolean) {
    setError("");
    setNotice("");
    const res = await fetch(`/api/members/${id}${restore ? "?restore=1" : ""}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session!.access_token}` },
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "That did not work.");
    else {
      setNotice(restore ? "Member restored to the register." : "Member removed from the register.");
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
          <h1 style={{ fontSize: 32, fontWeight: 400, margin: "12px 0 8px" }}>Member record</h1>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Sign in through the <a href="/portal">member portal</a> with an
            official&apos;s email address.
          </p>
        </div>
      </main>
    );
  }

  if (error && !member) {
    return (
      <main className="page page-wide">
        <div className="notice notice-error">{error}</div>
        <Link className="btn btn-secondary" href="/registry" style={{ marginTop: 16 }}>
          Back to the register
        </Link>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="page page-wide">
        <p className="text-muted">Loading the record…</p>
      </main>
    );
  }

  const canEdit = permissions.includes("members.edit");
  const canStatus = permissions.includes("members.status");
  const canDelete = permissions.includes("members.delete");
  const canFamilyEdit = permissions.includes("family.edit");
  const total = contributions.reduce((s, c) => s + c.amount_cents, 0);

  return (
    <main className="page page-wide" style={{ paddingTop: 48 }}>
      <Link href="/registry" className="text-muted" style={{ fontSize: 13 }}>
        ← Back to the register
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
          <div className="kicker">
            {member.member_number} ·{" "}
            {member.deleted_at
              ? "Removed from the register"
              : member.status === "active"
                ? "Member in good standing"
                : member.status === "pending"
                  ? "Registration pending"
                  : "Inactive"}
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 400, margin: "10px 0 0" }}>
            {member.full_name}
          </h1>
          <p className="text-muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
            Joined {fmtDate(member.created_at)} · {money(total)} contributed
          </p>
        </div>
        {canStatus && !member.deleted_at && (
          <div className="field" style={{ minWidth: 200 }}>
            <label htmlFor="status">Standing</label>
            <select
              id="status"
              className="input"
              value={member.status}
              onChange={(e) => patch({ status: e.target.value }, "Standing updated.")}
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}
      </div>

      {notice && <div className="notice notice-ok">{notice}</div>}
      {error && <div className="notice notice-error">{error}</div>}
      {member.deleted_at && (
        <div className="notice notice-error">
          Removed from the register on {fmtDate(member.deleted_at)}. The record and
          its ledger entries are kept.
        </div>
      )}

      <hr className="hr" style={{ margin: "28px 0 32px" }} />

      <div className="grid-member-detail">
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <DetailsForm member={member} canEdit={canEdit} onSave={patch} />

          {showFamily && (
            <NextOfKinForm member={member} canEdit={canFamilyEdit} onSave={patch} />
          )}

          {showFamily && (
            <div>
              <h3 style={{ fontWeight: 400, margin: "0 0 6px" }}>Beneficiaries</h3>
              <p className="text-muted" style={{ fontSize: 12, margin: "0 0 12px" }}>
                Nuclear family nominated by the member. Members add and remove
                these themselves in the portal.
              </p>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Relationship</th>
                      <th>Date of birth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {beneficiaries.map((b) => (
                      <tr key={b.id}>
                        <td>{b.full_name}</td>
                        <td style={{ textTransform: "capitalize" }}>{b.relationship}</td>
                        <td className="tabular">{b.date_of_birth ?? "—"}</td>
                      </tr>
                    ))}
                    {beneficiaries.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-muted">None recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card">
            <div className="card-kicker">Ledger</div>
            <div className="card-title">Contributions</div>
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {contributions.map((c) => (
                    <tr key={c.id}>
                      <td className="tabular" style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                        {fmtDate(c.paid_at)}
                      </td>
                      <td style={{ fontSize: 12, textTransform: "capitalize" }}>
                        {c.reversal_of ? "reversal" : c.method}
                      </td>
                      <td
                        className="tabular"
                        style={{ textAlign: "right", color: c.amount_cents < 0 ? "var(--color-accent-2)" : undefined }}
                      >
                        {money(c.amount_cents)}
                      </td>
                    </tr>
                  ))}
                  {contributions.length === 0 && (
                    <tr>
                      <td className="text-muted" style={{ fontSize: 12 }}>Nothing recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {canDelete && (
            <div className="card">
              <div className="card-kicker">Register</div>
              <div className="card-title">
                {member.deleted_at ? "Restore this member" : "Remove from the register"}
              </div>
              <p className="card-body">
                {member.deleted_at
                  ? "Put this member back on the active register."
                  : "Removal is reversible: the record and its ledger entries are kept, and the member simply stops appearing in the register."}
              </p>
              <button
                className="btn btn-secondary"
                style={{ alignSelf: "flex-start" }}
                onClick={() => remove(Boolean(member.deleted_at))}
              >
                {member.deleted_at ? "Restore member" : "Remove member"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function DetailsForm({
  member,
  canEdit,
  onSave,
}: {
  member: Member;
  canEdit: boolean;
  onSave: (body: object, msg: string) => Promise<boolean>;
}) {
  const [form, setForm] = useState({
    fullName: member.full_name,
    email: member.email,
    phone: member.phone ?? "",
    dateOfBirth: member.date_of_birth ?? "",
    branch: member.branch ?? "",
    referredBy: member.referred_by ?? "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({
      fullName: member.full_name,
      email: member.email,
      phone: member.phone ?? "",
      dateOfBirth: member.date_of_birth ?? "",
      branch: member.branch ?? "",
      referredBy: member.referred_by ?? "",
    });
  }, [member]);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await onSave(form, "Member details saved.");
    setBusy(false);
  }

  return (
    <div>
      <h3 style={{ fontWeight: 400, margin: "0 0 4px" }}>Member details</h3>
      <p className="text-muted" style={{ fontSize: 12, margin: "0 0 14px" }}>
        {canEdit
          ? "The member number is issued once and cannot be changed. Changing the email also moves their portal sign-in."
          : "Read-only: your role does not include editing member details."}
      </p>
      <form onSubmit={submit} className="grid-form">
        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input id="fullName" className="input" disabled={!canEdit} required value={form.fullName} onChange={set("fullName")} />
        </div>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" className="input" disabled={!canEdit} required value={form.email} onChange={set("email")} />
        </div>
        <div className="field">
          <label htmlFor="phone">Mobile number</label>
          <input id="phone" className="input" disabled={!canEdit} value={form.phone} onChange={set("phone")} />
        </div>
        <div className="field">
          <label htmlFor="dob">Date of birth</label>
          <input id="dob" className="input" disabled={!canEdit} value={form.dateOfBirth} onChange={set("dateOfBirth")} />
        </div>
        {canEdit ? (
          <AddressField
            id="branch"
            label="Home address"
            hint="e.g. 20 John St or 1/20 John St"
            value={form.branch}
            onChange={(v) => setForm((f) => ({ ...f, branch: v }))}
            style={{ gridColumn: "1/-1" }}
          />
        ) : (
          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label htmlFor="branch">Home address</label>
            <input id="branch" className="input" disabled value={form.branch} readOnly />
          </div>
        )}
        <div className="field" style={{ gridColumn: "1/-1" }}>
          <label htmlFor="referredBy">Referred by</label>
          <input id="referredBy" className="input" disabled={!canEdit} value={form.referredBy} onChange={set("referredBy")} />
        </div>
        {canEdit && (
          <button className="btn btn-primary" disabled={busy} style={{ justifySelf: "start" }}>
            {busy ? "Saving…" : "Save details"}
          </button>
        )}
      </form>
    </div>
  );
}

function NextOfKinForm({
  member,
  canEdit,
  onSave,
}: {
  member: Member;
  canEdit: boolean;
  onSave: (body: object, msg: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(member.next_of_kin?.name_relationship ?? "");
  const [phone, setPhone] = useState(member.next_of_kin?.phone ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(member.next_of_kin?.name_relationship ?? "");
    setPhone(member.next_of_kin?.phone ?? "");
  }, [member]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await onSave(
      { nextOfKin: { name_relationship: name, phone } },
      "Next of kin saved."
    );
    setBusy(false);
  }

  return (
    <div>
      <h3 style={{ fontWeight: 400, margin: "0 0 4px" }}>Next of kin</h3>
      <p className="text-muted" style={{ fontSize: 12, margin: "0 0 14px" }}>
        The person the committee contacts first in a welfare case.
      </p>
      <form onSubmit={submit} className="grid-form">
        <div className="field">
          <label htmlFor="kin">Name and relationship</label>
          <input id="kin" className="input" disabled={!canEdit} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="kinPhone">Mobile number</label>
          <input id="kinPhone" className="input" disabled={!canEdit} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {canEdit && (
          <button className="btn btn-primary" disabled={busy} style={{ justifySelf: "start" }}>
            {busy ? "Saving…" : "Save next of kin"}
          </button>
        )}
      </form>
    </div>
  );
}
