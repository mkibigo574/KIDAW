"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabaseBrowser";

// Landing page for the password-recovery email link. The link signs the
// member in with a recovery session; from here they choose a new password.
export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setHasSession(Boolean(s))
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setSaving(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setSaving(false);
    if (error) setError(error.message);
    else setDone(true);
  }

  return (
    <main className="page page-narrow">
      <div className="panel" style={{ maxWidth: 460, margin: "0 auto", padding: 32 }}>
        <div className="kicker">Member portal</div>
        <h1 style={{ fontSize: 36, fontWeight: 400, margin: "12px 0 8px" }}>
          Set a new password
        </h1>
        {!ready && <p className="text-muted">Loading…</p>}
        {ready && !hasSession && (
          <p className="text-muted" style={{ fontSize: 14 }}>
            This page only works from the password-reset link we email you.
            Go to the <a href="/portal">member portal</a>, enter your email and
            choose “Forgot password?”.
          </p>
        )}
        {ready && hasSession && !done && (
          <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                type="password"
                className="input"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="confirm">Confirm new password</label>
              <input
                id="confirm"
                type="password"
                className="input"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={saving}>
              {saving ? "Saving…" : "Save password"}
            </button>
          </form>
        )}
        {done && (
          <div className="notice notice-ok">
            Password saved. <a href="/portal">Continue to your portal</a>.
          </div>
        )}
        {error && <div className="notice notice-error">{error}</div>}
      </div>
    </main>
  );
}
