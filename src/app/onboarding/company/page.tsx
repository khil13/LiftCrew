import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CompanyForm from "./CompanyForm";

export default async function CompanyOnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/onboarding");
  if (session.profile.role !== "company") redirect("/home");

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">{session.company ? "Edit company details" : "Tell us about your company"}</h1>
      <p className="mt-1 text-sm text-slate-600">
        We review every company before it can post shifts. This usually takes a business day.
      </p>
      <div className="mt-6">
        <CompanyForm company={session.company} />
      </div>
    </main>
  );
}
