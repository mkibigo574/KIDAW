import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stripe } from "@/lib/stripe";
import { sendWelcomeEmail, sendContributionReceipt } from "@/lib/email";
import { notify, money } from "@/lib/notify";

// POST /api/stripe/webhook
// Handles checkout.session.completed: records the contribution, activates the
// member on registration payment, and sends the appropriate email.
export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      payload,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const memberId = session.metadata?.member_id;
  const type = session.metadata?.type === "registration" ? "registration" : "contribution";
  if (!memberId || session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const db = supabaseAdmin();

  // Unique stripe_session_id makes retried webhook deliveries a no-op.
  const { error: insertError } = await db.from("contributions").insert({
    member_id: memberId,
    amount_cents: session.amount_total ?? 0,
    currency: session.currency ?? "aud",
    type,
    stripe_session_id: session.id,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true }); // duplicate delivery
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: member } = await db
    .from("members")
    .select("full_name, email, member_number")
    .eq("id", memberId)
    .single();

  if (type === "registration") {
    await db.from("members").update({ status: "active" }).eq("id", memberId);
  }

  // Money arriving is the Treasurer's business; a new member joining is the
  // Records Officer's.
  await notify(db, {
    audience: type === "registration" ? ["treasurer", "records"] : "treasurer",
    event: type === "registration" ? "member.joined" : "payment.received",
    title:
      type === "registration"
        ? `${member?.member_number ?? "A new member"} joined and paid ${money(session.amount_total ?? 0)}`
        : `${money(session.amount_total ?? 0)} contribution received`,
    body: member ? `${member.full_name} — paid by card` : "Paid by card",
    link: type === "registration" ? "/registry" : "/ledger",
    entityId: memberId,
  });

  if (member) {
    try {
      if (type === "registration") {
        await sendWelcomeEmail({
          to: member.email,
          fullName: member.full_name,
          memberNumber: member.member_number,
        });
      } else {
        await sendContributionReceipt({
          to: member.email,
          fullName: member.full_name,
          memberNumber: member.member_number,
          amountCents: session.amount_total ?? 0,
        });
      }
    } catch (e) {
      // Payment is already recorded; log the email failure but ack the webhook.
      console.error("Email send failed:", e);
    }
  }

  return NextResponse.json({ received: true });
}
