import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stripe } from "@/lib/stripe";

// POST /api/contribute
// Creates a Stripe Checkout session for an ongoing welfare contribution.
// The caller must be a signed-in member; we verify the Supabase access token.
export async function POST(req: NextRequest) {
  const { amount } = await req.json();
  const amountCents = Math.round(Number(amount) * 100);

  if (!Number.isFinite(amountCents) || amountCents < 100) {
    return NextResponse.json(
      { error: "Enter a valid amount of at least $1." },
      { status: 400 }
    );
  }

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: userData, error: authError } = await db.auth.getUser(token);
  if (authError || !userData.user?.email) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: userData.user.email,
    line_items: [
      {
        price_data: {
          currency: "aud",
          unit_amount: amountCents,
          product_data: { name: "KIDAW — Member Contribution" },
        },
        quantity: 1,
      },
    ],
    metadata: { member_id: member.id, type: "contribution" },
    success_url: `${appUrl}/portal?paid=1`,
    cancel_url: `${appUrl}/portal?cancelled=1`,
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
