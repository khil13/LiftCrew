import Link from "next/link";
import { getAllowedStates } from "@/lib/settings";
import { formatAllowedStates } from "@/lib/compliance/states";
import { HELPER_LABOR_ONLY_TERMS } from "@/lib/compliance/jobTypes";

// Placeholder terms covering Section 7, Rule 5. Must be reviewed by a lawyer before launch.
export default async function TermsPage() {
  const states = formatAllowedStates(await getAllowedStates()) || "our launch state";
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-10 text-sm leading-relaxed text-slate-700">
      <h1 className="text-2xl font-bold text-slate-900">Terms of Service (draft)</h1>
      <p>
        <strong>Labor-only marketplace.</strong> LiftCrew connects customers and companies with independent helpers who
        provide moving labor. LiftCrew is not a moving company, carrier, or broker, and does not book, rent, recommend,
        or resell trucks, containers, or transportation services.
      </p>
      <p>
        <strong>Service area.</strong> LiftCrew is currently available only for jobs within {states}. Every job&apos;s
        addresses must be in {states}.
      </p>
      <p>
        <strong>No transport.</strong> {HELPER_LABOR_ONLY_TERMS}
      </p>
      <p>
        <strong>Independent contractors.</strong> Helpers are independent contractors, not employees of LiftCrew.
      </p>
      <Link href="/" className="inline-block underline">
        Back
      </Link>
    </main>
  );
}
