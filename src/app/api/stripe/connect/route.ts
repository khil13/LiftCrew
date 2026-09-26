import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createConnectOnboardingLink } from "@/lib/payments";

// Starts (or resumes) Stripe Express onboarding for the signed-in helper.
// GET because Stripe sends expired links back here as the refresh_url.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));
  if (session.profile?.role !== "helper" || !session.helper) {
    return NextResponse.redirect(new URL("/home", request.url));
  }
  try {
    return NextResponse.redirect(await createConnectOnboardingLink(session.userId, session.email), 303);
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL("/earnings?payouts=error", request.url), 303);
  }
}

export const POST = GET;
