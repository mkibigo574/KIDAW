import Stripe from "stripe";

export const REGISTRATION_FEE_CENTS = 10000; // A$100 mandatory registration contribution

// Base URL for Stripe return links. Trailing slashes are stripped so a value
// like "https://example.com/" cannot produce "https://example.com//portal".
export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
}

export function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20",
  });
}
