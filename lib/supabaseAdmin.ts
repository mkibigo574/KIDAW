import { createClient, SupabaseClient } from "@supabase/supabase-js";

// One shared client for the whole server process. Creating a client per request
// meant a fresh TLS handshake to the database region (eu-west-3) on every call;
// reusing it keeps the connection warm, which is the single biggest saving on a
// site whose users are far from Paris.
let admin: SupabaseClient | null = null;

export function supabaseAdmin() {
  if (admin) return admin;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Without this guard an unset or placeholder key surfaces as a bare
  // "Invalid API key" 500 from Supabase, which gives no clue which key.
  // Accepts both key formats: legacy JWT (eyJ...) and current sb_secret_...
  if (!key || key.includes("PASTE") || key.length < 20) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing or still a placeholder in .env.local. " +
        "Copy the service_role key from the Supabase dashboard (Project Settings → API keys) " +
        "and restart the dev server."
    );
  }

  admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
