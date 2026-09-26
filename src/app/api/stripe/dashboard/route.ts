import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createExpressDashboardLink } from "@/lib/payments";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", request.url), 303);
  try {
    const url = await createExpressDashboardLink(session.userId);
    if (url) return NextResponse.redirect(url, 303);
  } catch (err) {
    console.error(err);
  }
  return NextResponse.redirect(new URL("/earnings?payouts=error", request.url), 303);
}
