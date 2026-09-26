import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAllowedStates } from "@/lib/settings";
import { formatAllowedStates } from "@/lib/compliance/states";
import HelperForm from "./HelperForm";

export default async function HelperOnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/onboarding");
  if (session.profile.role !== "helper") redirect("/home");

  const serviceArea = formatAllowedStates(await getAllowedStates());
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">{session.helper ? "Edit your helper profile" : "Set up your helper profile"}</h1>
      <p className="mt-1 text-sm text-slate-600">
        This is what customers and companies see when you apply.
        {serviceArea && ` We currently serve helpers in ${serviceArea}.`}
      </p>
      <div className="mt-6">
        <HelperForm userId={session.userId} avatarUrl={session.profile.avatar_url} helper={session.helper} />
      </div>
    </main>
  );
}
