import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/apiAuth";

// GET /api/me — who the signed-in person is and what office, if any, they hold.
// Used by the navigation and the portal so officers see their tools and
// ordinary members are not shown links they cannot open.
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.res;
  const { official } = auth.ctx;

  return NextResponse.json({
    email: official.email,
    roles: official.roles,
    permissions: official.permissions,
  });
}
