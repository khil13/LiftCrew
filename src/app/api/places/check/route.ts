import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePlace } from "@/lib/google/places";
import { getAllowedStates } from "@/lib/settings";
import { isAllowedState, outOfStateMessage } from "@/lib/compliance/states";

// Form-level check for Section 7, Rule 1: resolves the picked address and says
// whether it is in an allowed state. The server action re-checks on submit.
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const placeId = request.nextUrl.searchParams.get("placeId") ?? "";
  const session = request.nextUrl.searchParams.get("session") ?? undefined;
  try {
    const [place, allowed] = await Promise.all([resolvePlace(placeId, session), getAllowedStates()]);
    const ok = place.country === "US" && isAllowedState(place.state, allowed);
    return NextResponse.json({
      ok,
      state: place.state,
      formattedAddress: place.formattedAddress,
      error: ok ? null : outOfStateMessage(allowed),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "We couldn't verify that address." }, { status: 502 });
  }
}
