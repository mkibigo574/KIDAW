import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  officialFor,
  can,
  SENSITIVE_PERMISSIONS,
  type Official,
  type Permission,
} from "@/lib/roles";

type Authed = {
  db: ReturnType<typeof supabaseAdmin>;
  email: string;
  official: Official;
  aal: string; // "aal1" = password only, "aal2" = a second factor was used
};

// Supabase records the assurance level in the access token. The token has
// already been verified by getUser(), so the payload is read, not trusted
// blindly for identity.
function assuranceLevel(token: string) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    return typeof payload.aal === "string" ? payload.aal : "aal1";
  } catch {
    return "aal1";
  }
}

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

  return {
    ok: true,
    ctx: {
      db,
      email,
      official: await officialFor(db, email),
      aal: assuranceLevel(token),
    },
  };
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

  // Actions that move or record money require a second factor. Enforcement is
  // switched on with REQUIRE_MFA once the officers have enrolled, so turning it
  // on cannot lock the committee out of its own system.
  const mfaRequired = process.env.REQUIRE_MFA === "true";
  if (
    mfaRequired &&
    SENSITIVE_PERMISSIONS.includes(permission) &&
    auth.ctx.aal !== "aal2"
  ) {
    return {
      ok: false,
      res: NextResponse.json(
        {
          error:
            "This action needs two-factor authentication. Sign in again with your authenticator app.",
        },
        { status: 403 }
      ),
    };
  }

  return auth;
}
