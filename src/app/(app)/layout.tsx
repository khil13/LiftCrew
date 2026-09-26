import BottomNav from "@/components/BottomNav";
import PwaSetup from "@/components/PwaSetup";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOnboarded();
  const { count } = await createClient()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return (
    <>
      <main className="mx-auto max-w-md px-4 pb-24 pt-6">{children}</main>
      <PwaSetup />
      <BottomNav role={session.profile.role} unread={count ?? 0} />
    </>
  );
}
