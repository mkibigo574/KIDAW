"use client";

import { useState } from "react";

// Newsletter subscription form used in the site footer.
export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Subscription failed.");
      setState("done");
      setMessage("Subscribed — you'll hear from us.");
      setEmail("");
    } catch (err: any) {
      setState("error");
      setMessage(err.message);
    }
  }

  return (
    <div className="newsletter">
      <div className="newsletter-title">Newsletter</div>
      <p className="newsletter-blurb">
        News from the association: meetings, welfare cases supported, and
        announcements from the committee.
      </p>
      <form className="newsletter-form" onSubmit={handleSubmit}>
        <input
          type="email"
          className="input"
          placeholder="Email address"
          aria-label="Email address for the newsletter"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn btn-primary" disabled={state === "loading"}>
          {state === "loading" ? "Signing up…" : "Sign up"}
        </button>
      </form>
      {message && (
        <div className={state === "error" ? "newsletter-msg is-error" : "newsletter-msg"}>
          {message}
        </div>
      )}
    </div>
  );
}
