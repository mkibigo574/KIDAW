"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";

type Notice = {
  id: string;
  event: string;
  title: string;
  body: string | null;
  link: string | null;
  actor: string | null;
  created_at: string;
  read: boolean;
};

type Waiting = { label: string; link: string; count: number };

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// What an office needs to know: outstanding work first, then what has happened.
export default function OfficerNotices({ session }: { session: Session }) {
  const [waiting, setWaiting] = useState<Waiting[]>([]);
  const [recent, setRecent] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const d = await res.json();
      setWaiting(d.waiting ?? []);
      setRecent(d.recent ?? []);
      setUnread(d.unread ?? 0);
    } catch {
      /* a failed notice fetch must not disturb the page */
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  async function markAllRead() {
    setUnread(0);
    setRecent((r) => r.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    });
  }

  if (waiting.length === 0 && recent.length === 0) return null;

  const shown = open ? recent : recent.slice(0, 4);

  return (
    <div className="notices">
      {waiting.length > 0 && (
        <div className="notices-waiting">
          {waiting.map((w) => (
            <Link key={w.label} href={w.link} className="notice-action">
              <span className="notice-count">{w.count}</span>
              <span>{w.label}</span>
            </Link>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <>
          <div className="notices-head">
            <span className="notices-title">
              Recent activity{unread > 0 && <span className="notice-badge">{unread} new</span>}
            </span>
            {unread > 0 && (
              <button type="button" className="link-button" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <ul className="notice-list">
            {shown.map((n) => (
              <li key={n.id} className={n.read ? "notice" : "notice is-unread"}>
                <div className="notice-main">
                  <span className="notice-headline">{n.title}</span>
                  {n.body && <span className="notice-body">{n.body}</span>}
                </div>
                <div className="notice-meta">
                  {ago(n.created_at)}
                  {n.link && (
                    <>
                      {" · "}
                      <Link href={n.link}>open</Link>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {recent.length > 4 && (
            <button type="button" className="link-button" onClick={() => setOpen((o) => !o)}>
              {open ? "Show less" : `Show all ${recent.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
