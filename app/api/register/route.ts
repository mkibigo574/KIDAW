import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stripe, REGISTRATION_FEE_CENTS } from "@/lib/stripe";

// POST /api/register
// Creates a pending member (member number is assigned by the DB trigger)
// and returns a Stripe Checkout URL for the mandatory $100 registration fee.
export async function POST(req: NextRequest) {
  const { fullName, email, phone, dateOfBirth, branch, referredBy, password } =
    await req.json();

  if (!fullName?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "Full name and email are required." },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existing } = await db
    .from("members")
    .select("id, status")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existing?.status === "active") {
    return NextResponse.json(
      { error: "This email is already registered. Use the member portal to sign in." },
      { status: 409 }
    );
  }

  let memberId = existing?.id;
  if (!memberId) {
    const { data: member, error } = await db
      .from("members")
      .insert({
        full_name: fullName.trim(),
        email: normalizedEmail,
        phone,
        date_of_birth: dateOfBirth || null,
        branch: branch || null,
        referred_by: referredBy || null,
      })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    memberId = member.id;
  }

  // Optional portal password: create the auth account now so the member can
  // sign in with email + password (otherwise they use the email-link flow).
  if (typeof password === "string" && password.length >= 8) {
    const { error: authError } = await db.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });
    // An existing auth account is fine — they keep their current credentials.
    if (authError && !/already|exists/i.test(authError.message)) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: normalizedEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: REGISTRATION_FEE_CENTS,
          product_data: { name: "KIDAW — Registration Contribution" },
        },
        quantity: 1,
      },
    ],
    metadata: { member_id: memberId, type: "registration" },
    success_url: `${appUrl}/register/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/register?cancelled=1`,
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
