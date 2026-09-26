import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const Subscription = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
});

async function currentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Subscription.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  const { endpoint, keys } = parsed.data;

  // The same browser may have been subscribed under another account; the
  // endpoint now belongs to whoever is signed in.
  await createAdminClient()?.from("push_subscriptions").delete().eq("endpoint", endpoint);
  const { error } = await supabase
    .from("push_subscriptions")
    .insert({ profile_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth });
  if (error) return NextResponse.json({ error: "Could not save subscription" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const endpoint = z.url().safeParse((await request.json().catch(() => ({})))?.endpoint);
  if (!endpoint.success) return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint.data);
  return NextResponse.json({ ok: true });
}
