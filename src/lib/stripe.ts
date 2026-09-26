import "server-only";
import Stripe from "stripe";
import { envValue } from "@/lib/env";

let client: Stripe | null = null;

/** Server-only Stripe client, or null when STRIPE_SECRET_KEY isn't set. */
export function getStripe(): Stripe | null {
  const key = envValue("STRIPE_SECRET_KEY");
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}
