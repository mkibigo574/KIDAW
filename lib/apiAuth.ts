import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { officialFor, can, type Official, type Permission } from "@/lib/roles";

type Authed = {
  db: ReturnType<typeof supabaseAdmin>;
  email: string;
  official: Official;
};

// Verifies the caller's Supabase session. Returns either the authenticated
// context or a ready-to-send error response — never both.
export async function authenticate(
  req: NextRequest
): Promise<{ ok: true; ctx: Authed } | { ok: false; res: NextResponse }> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "You are not signed in. Please sign in again." },
        { status: 401 }
      ),
    };
  }

  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Your session has expired. Please sign out and sign in again." },
        { status: 401 }
      ),
    };
  }

  return { ok: true, ctx: { db, email, official: await officialFor(db, email) } };
}

// As above, but also requires a specific committee permission.
export async function requirePermission(
  req: NextRequest,
  permission: Permission
): Promise<{ ok: true; ctx: Authed } | { ok: false; res: NextResponse }> {
  const auth = await authenticate(req);
  if (!auth.ok) return auth;

  if (!can(auth.ctx.official, permission)) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Your committee role does not allow this." },
        { status: 403 }
      ),
    };
  }
  return auth;
}
