import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/auth";
import { getAllowedStates, getPlatformFeePercent } from "@/lib/settings";
import { outOfStateMessage } from "@/lib/compliance/states";
import PostJobForm from "./PostJobForm";

export default async function NewJobPage() {
  const { profile, company } = await requireOnboarded();
  if (profile.role === "helper" || profile.role === "admin") redirect("/jobs");

  if (profile.role === "company" && !company?.is_approved) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Post a shift</h1>
        <div className="card text-sm text-amber-700">
          Your company is still being reviewed. You&apos;ll be able to post shifts once it&apos;s approved.
        </div>
        <Link href="/jobs" className="btn-secondary">
          Back
        </Link>
      </div>
    );
  }

  const [allowed, feePercent] = await Promise.all([getAllowedStates(), getPlatformFeePercent()]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{profile.role === "company" ? "Post a shift" : "Post a job"}</h1>
      <PostJobForm
        feePercent={feePercent}
        maxHelpers={profile.role === "customer" ? 4 : 10}
        outOfStateMessage={outOfStateMessage(allowed)}
      />
    </div>
  );
}
