import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stripe, appUrl, REGISTRATION_FEE_CENTS } from "@/lib/stripe";

// POST /api/register
// Creates a pending member (member number is assigned by the DB trigger)
// and returns a Stripe Checkout URL for the mandatory $100 registration fee.
export async function POST(req: NextRequest) {
  const {
    fullName,
    email,
    phone,
    dateOfBirth,
    branch,
    referredBy,
    password,
    confirmPassword,
  } = await req.json();

  if (!fullName?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "Full name and email are required." },
      { status: 400 }
    );
  }

  // A portal password is set at registration, so the browser check is repeated
  // here: the form is not the only way this endpoint can be called.
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "A portal password of at least 8 characters is required." },
      { status: 400 }
    );
  }
  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "The two passwords do not match." },
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

  // Create the portal account so the member can sign in with email + password.
  let passwordApplied = true;
  const { error: authError } = await db.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
  });
  if (authError) {
    // Never overwrite an existing account's password here — anyone could
    // otherwise take over a member's account by "registering" with their
    // email. Only an active member is turned away (handled above); reaching
    // this point means the registration fee is still outstanding, so the
    // payment must stay reachable. Carry on to checkout with the existing
    // password untouched and tell the caller it was not applied.
    if (/already|exists|registered/i.test(authError.message)) {
      passwordApplied = false;
    } else {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }
  }


  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: normalizedEmail,
    line_items: [
      {
        price_data: {
          currency: "aud",
          unit_amount: REGISTRATION_FEE_CENTS,
          product_data: { name: "KIDAW — Registration Contribution" },
        },
        quantity: 1,
      },
    ],
    metadata: { member_id: memberId, type: "registration" },
    success_url: `${appUrl()}/register/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/register?cancelled=1`,
  });

  return NextResponse.json({ checkoutUrl: session.url, passwordApplied });
}
