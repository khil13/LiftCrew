import { redirect } from "next/navigation";
import { getSession, nextOnboardingStep } from "@/lib/auth";
import ProfileForm from "./ProfileForm";

export default async function OnboardingPage({ searchParams }: { searchParams: { intent?: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile) redirect(nextOnboardingStep(session) ?? "/home");

  const defaultRole = searchParams.intent === "helper" ? "helper" : undefined;
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Welcome to LiftCrew</h1>
      <p className="mt-1 text-sm text-slate-600">Tell us a bit about you.</p>
      <div className="mt-6">
        <ProfileForm defaultRole={defaultRole} defaultPhone={session.phone ?? ""} />
      </div>
    </main>
  );
}
