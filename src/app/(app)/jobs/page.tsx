import ComingSoon from "@/components/ComingSoon";
import { requireOnboarded } from "@/lib/auth";

export default async function JobsPage() {
  const { profile } = await requireOnboarded();
  return profile.role === "helper" ? (
    <ComingSoon title="Find jobs">Nearby jobs will show up here, with filters for date, distance, pay, and job type.</ComingSoon>
  ) : (
    <ComingSoon title="My jobs">Jobs you post will show up here with their applicants and status.</ComingSoon>
  );
}
