import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { refreshConnectAccount } from "@/lib/payments";

// Stripe sends helpers back here after onboarding.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));
  let ready = false;
  try {
    ready = await refreshConnectAccount(session.userId);
  } catch (err) {
    console.error(err);
  }
  return NextResponse.redirect(new URL(`/earnings?payouts=${ready ? "ready" : "incomplete"}`, request.url));
}
