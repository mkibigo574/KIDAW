import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stripe, appUrl } from "@/lib/stripe";

// POST /api/contribute
// Creates a Stripe Checkout session for an ongoing welfare contribution.
// The caller must be a signed-in member; we verify the Supabase access token.
export async function POST(req: NextRequest) {
  const { amount, callId } = await req.json();
  const amountCents = Math.round(Number(amount) * 100);

  if (!Number.isFinite(amountCents) || amountCents < 100) {
    return NextResponse.json(
      { error: "Enter a valid amount of at least $1." },
      { status: 400 }
    );
  }

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "You are not signed in. Please sign in again." }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: userData, error: authError } = await db.auth.getUser(token);
  if (authError || !userData.user?.email) {
    return NextResponse.json({ error: "Your session has expired. Please sign out and sign in again." }, { status: 401 });
  }

  const { data: member } = await db
    .from("members")
    .select("id, status")
    .eq("email", userData.user.email.toLowerCase())
    .maybeSingle();

  if (!member) {
    return NextResponse.json(
      { error: "No member record found for this email." },
      { status: 404 }
    );
  }


  // Naming the call on the Stripe page tells the member what they are paying,
  // and confirms the call is still open before taking their money.
  let callName: string | null = null;
  if (callId) {
    const { data: call } = await db
      .from("contribution_calls")
      .select("title, status")
      .eq("id", callId)
      .maybeSingle();
    if (!call || call.status !== "active") {
      return NextResponse.json(
        { error: "That call is no longer open for contributions." },
        { status: 409 }
      );
    }
    callName = `KIDAW — ${call.title}`;
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: userData.user.email,
    line_items: [
      {
        price_data: {
          currency: "aud",
          unit_amount: amountCents,
          product_data: { name: callName ?? "KIDAW — Member Contribution" },
        },
        quantity: 1,
      },
    ],
    metadata: {
      member_id: member.id,
      type: "contribution",
      ...(callId ? { call_id: String(callId) } : {}),
    },
    success_url: `${appUrl()}/portal?paid=1`,
    cancel_url: `${appUrl()}/portal?cancelled=1`,
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
