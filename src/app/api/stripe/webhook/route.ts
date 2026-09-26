import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { envValue } from "@/lib/env";
import { handleCheckoutCompleted, handleCheckoutExpired, syncConnectAccount } from "@/lib/payments";

// Stripe events are the only way a job becomes paid (never a client callback).
// Add this URL as two endpoints in Stripe: one for your account
// (checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.expired) signed with STRIPE_WEBHOOK_SECRET, and one for
// connected accounts (account.updated) signed with STRIPE_CONNECT_WEBHOOK_SECRET.
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secrets = [envValue("STRIPE_WEBHOOK_SECRET"), envValue("STRIPE_CONNECT_WEBHOOK_SECRET")].filter(
    (s): s is string => Boolean(s),
  );
  if (!stripe || secrets.length === 0) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const body = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret);
      break;
    } catch {
      // try the next endpoint secret
    }
  }
  if (!event) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object);
        break;
      case "account.updated":
        await syncConnectAccount(event.data.object);
        break;
    }
  } catch (err) {
    console.error(`Webhook ${event.type} failed`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
