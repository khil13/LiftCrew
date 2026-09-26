import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/auth";
import { formatCents, formatJobTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type PayoutRow = {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  assignment: { job: { id: string; title: string; scheduled_start: string } | null } | null;
};

const NOTICES: Record<string, { text: string; tone: string }> = {
  ready: { text: "Payouts are set up. You can apply to jobs.", tone: "bg-green-50 text-green-800" },
  incomplete: {
    text: "Stripe still needs a few details before you can get paid. Continue setup to finish.",
    tone: "bg-amber-50 text-amber-800",
  },
  error: { text: "Payouts are unavailable right now. Please try again later.", tone: "bg-red-50 text-red-700" },
};

export default async function EarningsPage({ searchParams }: { searchParams: { payouts?: string } }) {
  const { profile, helper } = await requireOnboarded();
  if (profile.role !== "helper" || !helper) redirect("/home");

  const supabase = createClient();
  const { data } = await supabase
    .from("payouts")
    .select("id, amount_cents, status, created_at, assignment:job_assignments(job:jobs(id, title, scheduled_start))")
    .order("created_at", { ascending: false })
    .limit(100);
  const payouts = (data ?? []) as unknown as PayoutRow[];
  const paid = payouts.filter((p) => p.status === "released").reduce((s, p) => s + p.amount_cents, 0);
  const pending = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount_cents, 0);
  const notice = NOTICES[searchParams.payouts ?? ""];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Earnings</h1>
      {notice && <p className={`rounded-lg px-3 py-2 text-sm ${notice.tone}`}>{notice.text}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-slate-500">Paid out</p>
          <p className="text-xl font-bold">{formatCents(paid)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="text-xl font-bold">{formatCents(pending)}</p>
        </div>
      </div>

      {helper.stripe_onboarded ? (
        <form action="/api/stripe/dashboard" method="post">
          <button className="btn-secondary">Open Stripe payouts dashboard</button>
        </form>
      ) : (
        <div className="card space-y-2 text-sm">
          <p className="font-semibold">Set up payouts</p>
          <p className="text-slate-600">
            LiftCrew pays you through Stripe. Add your bank details once and you can start applying to jobs.
          </p>
          <form action="/api/stripe/connect" method="post">
            <button className="btn-primary">Set up payouts with Stripe</button>
          </form>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">History</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-slate-500">Your payouts show up here after each completed job.</p>
        ) : (
          <ul className="space-y-2">
            {payouts.map((p) => {
              const job = p.assignment?.job;
              return (
                <li key={p.id}>
                  <Link
                    href={job ? `/jobs/${job.id}` : "/earnings"}
                    className="card flex items-center justify-between gap-2 text-sm"
                  >
                    <span>
                      <span className="block font-semibold">{job?.title ?? "Job"}</span>
                      <span className="text-slate-600">{job ? formatJobTime(job.scheduled_start) : ""}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold">{formatCents(p.amount_cents)}</span>
                      <span className="text-xs text-slate-500">{p.status === "released" ? "Paid" : "Pending"}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
