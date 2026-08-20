# KIDA Welfare Association Website

A full-stack membership and contributions platform built with **Next.js**,
**Supabase** (open-source Postgres database + auth) and **Stripe** payments.
The visual design follows the "Classical" design system from the KIDA Welfare
Claude Design project (Cormorant Garamond + Lora, parchment ground, gold accent).

## Features

| Feature | How it works |
|---|---|
| Member registration | `/register` — full form (ID, branch, next of kin) → mandatory **$100** registration contribution via Stripe Checkout |
| Member numbers | Assigned automatically by a Postgres trigger in the format `KIDAW-001`, `KIDAW-002`, … |
| Registration email | Welcome email (with member number) sent via Resend when Stripe confirms payment |
| Member portal | `/portal` — passwordless email sign-in (Supabase magic link), stats strip, contribution statement, and "make a contribution" checkout |
| Member register | `/registry` — officials-only view of all members with totals, search, filters and CSV export (gated by `OFFICIALS_EMAILS`) |
| Payments | Stripe Checkout (registration + ongoing contributions), recorded via webhook. Open-source alternatives: **Hyperswitch** or **BTCPay Server** |
| Database | Supabase — open-source, hosted Postgres with Row Level Security so members only see their own data |
| Officials | Chairperson Zablon Pingo, Communication & Record Keeping Officer Michael Kibigo, Treasurer Eugene Simiyu, Welfare Officer Eric Outa — on the home page |
| Stack page | `/stack` — the suggested open-source stack and core schema, from the design |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase (database + portal sign-in)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `supabase/migrations/001_init.sql` (creates the
   `members` and `contributions` tables, the member-number trigger, and RLS policies).
3. In **Authentication → Providers**, ensure the **Email** provider is enabled
   (magic links are on by default).
4. In **Authentication → URL Configuration**, add your site URL
   (`http://localhost:3000` in development) to the redirect allow list.

### 3. Stripe (payments)

1. Get your secret key from the [Stripe dashboard](https://dashboard.stripe.com/apikeys).
2. Create a webhook endpoint pointing at `https://your-domain/api/stripe/webhook`
   listening for `checkout.session.completed`, and copy its signing secret.
   For local development run:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

### 4. Resend (emails)

Create a free API key at [resend.com](https://resend.com) and verify your
sending domain (or use the test `onboarding@resend.dev` sender while developing).
To use your own SMTP server instead, swap the `sendEmail` function in
`lib/email.ts` for Nodemailer.

### 5. Environment variables

```bash
cp .env.example .env.local
# then fill in the values
```

### 6. Run

```bash
npm run dev        # http://localhost:3000
```

## Flow overview

1. Visitor registers at `/register` → a `pending` member row is created and the
   Postgres trigger issues the next member number.
2. They are redirected to Stripe Checkout for the $100 registration fee.
3. Stripe calls `/api/stripe/webhook` → the payment is recorded in
   `contributions`, the member becomes `active`, and the welcome email with the
   member number is sent.
4. The member signs into `/portal` with a magic link sent to their registered
   email, views their history, and makes further contributions (each one is
   recorded by the same webhook and confirmed with a receipt email).

## Notes

- All writes happen server-side with the Supabase service-role key; the browser
  only reads through Row Level Security.
- The webhook is idempotent (`stripe_session_id` is unique), so Stripe retries
  never double-record a payment.
- Currency is USD; change `currency` in the API routes and the fee in
  `lib/stripe.ts` (`REGISTRATION_FEE_CENTS`) if needed.
