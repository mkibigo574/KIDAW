import { createClient } from "@supabase/supabase-js";

// Server-side client with full access (bypasses RLS). Never import in client components.
export function supabaseAdmin() {
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
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  });
}
