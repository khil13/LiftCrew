import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { autocompleteAddress } from "@/lib/google/places";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const sessionToken = request.nextUrl.searchParams.get("session") ?? undefined;
  if (q.length < 3) return NextResponse.json({ suggestions: [] });

  try {
    const suggestions = await autocompleteAddress(q.slice(0, 200), sessionToken);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Address lookup is unavailable" }, { status: 502 });
  }
}
