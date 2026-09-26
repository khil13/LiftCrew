import Link from "next/link";
import { requireOnboarded } from "@/lib/auth";
import { formatCents } from "@/lib/format";
import { JOB_TYPE_LABELS, type JobType } from "@/lib/compliance/jobTypes";

export default async function HomePage() {
  const { profile, helper, company } = await requireOnboarded();
  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Hi, {firstName}</h1>

      {profile.role === "helper" && helper && (
        <>
          <div className="card space-y-1 text-sm">
            <p className="font-semibold">Your helper profile</p>
            <p className="text-slate-600">
              {formatCents(helper.hourly_rate_cents)}/hr · within {helper.service_radius_miles} mi
            </p>
            <p className="text-slate-600">{helper.skills.map((s) => JOB_TYPE_LABELS[s as JobType] ?? s).join(", ")}</p>
            <p className="text-slate-600">
              {helper.is_verified ? "✓ Verified" : "Verification pending"} ·{" "}
              {helper.stripe_onboarded ? "Payouts set up" : "Payouts not set up yet"}
            </p>
            <Link href="/onboarding/helper" className="inline-block pt-1 font-semibold text-brand-600">
              Edit profile
            </Link>
          </div>
          <div className="card text-sm text-slate-600">Job feed opens soon. We&apos;ll alert you when jobs near you are posted.</div>
        </>
      )}

      {profile.role === "customer" && (
        <div className="card text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Need moving help?</p>
          <p className="mt-1">Posting jobs opens soon. You bring the truck, LiftCrew helpers handle the lifting.</p>
        </div>
      )}

      {profile.role === "company" && company && (
        <div className="card text-sm">
          <p className="font-semibold">{company.business_name}</p>
          {company.is_approved ? (
            <p className="mt-1 text-slate-600">Approved. Posting shifts opens soon.</p>
          ) : (
            <p className="mt-1 text-amber-700">
              Approval pending. We&apos;re reviewing your company; you&apos;ll be able to post shifts once approved.
            </p>
          )}
          <Link href="/onboarding/company" className="inline-block pt-2 font-semibold text-brand-600">
            Edit company details
          </Link>
        </div>
      )}

      {profile.role === "admin" && (
        <div className="card text-sm text-slate-600">Admin tools are coming in a later phase.</div>
      )}
    </div>
  );
}
