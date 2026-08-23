"use client";

import { supabaseBrowser, supabaseConfigured } from "@/lib/supabaseBrowser";

export type Me = { email: string; roles: string[]; permissions: string[] };

// The navigation and the portal both need to know the signed-in person's
// office. Without sharing, every page made the same call twice. One in-flight
// request is reused, and the answer is held until the auth state changes.
let cached: Me | null = null;
let inFlight: Promise<Me | null> | null = null;

export function clearMe() {
  cached = null;
  inFlight = null;
}

export async function getMe(): Promise<Me | null> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  if (!supabaseConfigured) return null;

  inFlight = (async () => {
    try {
      const { data } = await supabaseBrowser().auth.getSession();
      const token = data.session?.access_token;
      if (!token) return null;
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      cached = await res.json();
      return cached;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
