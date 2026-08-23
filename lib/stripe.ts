import Stripe from "stripe";

export const REGISTRATION_FEE_CENTS = 10000; // A$100 mandatory registration contribution

export function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20",
  });
}
