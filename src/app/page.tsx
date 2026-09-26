import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function LandingPage() {
  if (await getSession()) redirect("/home");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-10">
      <div className="flex-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">LiftCrew</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight">Moving help, by the hour.</h1>
        <p className="mt-3 text-slate-600">
          Book local helpers to load, unload, and pack. You bring the truck, our crew brings the muscle.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-slate-700">
          <li>• Vetted helpers, rated by real customers</li>
          <li>• Pay upfront, released only after the job is done</li>
          <li>• Moving companies: staff up for your busiest days</li>
        </ul>
      </div>
      <div className="space-y-3">
        <Link href="/login?intent=helper" className="btn-primary">
          Find moving work
        </Link>
        <Link href="/login?intent=hire" className="btn-secondary">
          Hire helpers
        </Link>
        <p className="pt-2 text-center text-xs text-slate-500">
          LiftCrew is a labor-only marketplace, not a moving company or broker.{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>
        </p>
      </div>
    </main>
  );
}
