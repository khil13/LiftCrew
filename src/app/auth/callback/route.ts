import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link sign in: exchange the code for a session, then continue onboarding.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
