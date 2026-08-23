"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabaseBrowser";
import { getMe, clearMe } from "@/lib/me";

// Navigation that reflects the signed-in person. Officers' tools are hidden
// from ordinary members rather than shown and then refused.
export default function NavLinks() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = supabaseBrowser();

    async function refresh() {
      const me = await getMe();
      setSignedIn(Boolean(me));
      setPermissions(me?.permissions ?? []);
    }

    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      clearMe();
      refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const has = (p: string) => permissions.includes(p);

  return (
    <div className="nav-links">
      <Link href="/">Home</Link>
      {!signedIn && <Link href="/register">Register</Link>}
      <Link href="/portal">{signedIn ? "My portal" : "Member portal"}</Link>
      {has("registry.read") && <Link href="/registry">Registry</Link>}
      {has("ledger.read") && <Link href="/ledger">Ledger</Link>}
      {has("ledger.read") && <Link href="/disbursements">Disbursements</Link>}
      <Link href="/gallery">Gallery</Link>
      <a href="mailto:contact@kidawelfare.org">Contact us</a>
      {!signedIn && (
        <Link href="/register" className="btn btn-primary" style={{ padding: "6px 14px" }}>
          Join now
        </Link>
      )}
    </div>
  );
}
