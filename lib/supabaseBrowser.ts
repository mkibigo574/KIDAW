"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

let client: SupabaseClient | null = null;

// Browser client using the public anon key; RLS restricts what it can read.
// Check `supabaseConfigured` before calling when the env may be absent.
export function supabaseBrowser() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
