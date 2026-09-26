import BottomNav from "@/components/BottomNav";
import { requireOnboarded } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOnboarded();
  return (
    <>
      <main className="mx-auto max-w-md px-4 pb-24 pt-6">{children}</main>
      <BottomNav role={session.profile.role} />
    </>
  );
}
