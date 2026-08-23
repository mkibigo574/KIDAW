"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import CallCard, { type Call } from "@/components/CallCard";

// Open calls, shown on every signed-in dashboard: members see what they are
// asked to pay and whether they have; officers additionally see take-up.
export default function ActiveCalls({ session }: { session: Session }) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [me, setMe] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/calls", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const d = await res.json();
      setCalls((d.calls ?? []).filter((c: Call) => c.status === "active"));
      setPermissions(d.permissions ?? []);
      setMe(d.me ?? "");
    } catch {
      /* the dashboard still works without this */
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  if (calls.length === 0) return null;

  return (
    <section style={{ margin: "36px 0 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h3 style={{ fontWeight: 400, margin: 0 }}>Open for contribution</h3>
        <Link href="/calls" className="text-muted" style={{ fontSize: 13 }}>
          All calls
        </Link>
      </div>
      <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 14px", maxWidth: "62ch" }}>
        What the association is raising right now.
      </p>
      <div className="grid-calls">
        {calls.map((c) => (
          <CallCard
            key={c.id}
            call={c}
            session={session}
            me={me}
            permissions={permissions}
            onChange={load}
          />
        ))}
      </div>
    </section>
  );
}
