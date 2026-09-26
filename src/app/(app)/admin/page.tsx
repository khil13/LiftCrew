import Link from "next/link";
import { formatCents } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Metrics = {
  jobs_posted: number;
  jobs_filled: number;
  jobs_completed: number;
  gmv_cents: number;
  fees_cents: number;
  helpers: number;
  helpers_unverified: number;
  companies_pending: number;
  disputes_open: number;
  flags_open: number;
};

export default async function AdminOverview({ searchParams }: { searchParams: { days?: string } }) {
  const days = [7, 30, 90].includes(Number(searchParams.days)) ? Number(searchParams.days) : 30;
  const { data, error } = await createClient().rpc("admin_metrics", { p_days: days });
  if (error || !data) return <p className="card text-sm text-red-700">Could not load metrics.</p>;
  const m = data as Metrics;
  const fillRate = m.jobs_posted > 0 ? Math.round((m.jobs_filled / m.jobs_posted) * 100) : 0;

  const stats = [
    { label: "Jobs posted", value: String(m.jobs_posted) },
    { label: "Fill rate", value: `${fillRate}%` },
    { label: "Completed", value: String(m.jobs_completed) },
    { label: "GMV", value: formatCents(m.gmv_cents) },
    { label: "Fees earned", value: formatCents(m.fees_cents) },
    { label: "Helpers", value: String(m.helpers) },
  ];
  const queues = [
    { href: "/admin/companies", label: "Companies awaiting approval", count: m.companies_pending },
    { href: "/admin/helpers", label: "Helpers to verify", count: m.helpers_unverified },
    { href: "/admin/disputes", label: "Open disputes", count: m.disputes_open },
    { href: "/admin/flags", label: "Flagged content", count: m.flags_open },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm">
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            href={`/admin?days=${d}`}
            className={`rounded-md px-2 py-1 ${d === days ? "bg-slate-800 text-white" : "text-slate-600"}`}
          >
            {d} days
          </Link>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <dt className="text-xs text-slate-500">{s.label}</dt>
            <dd className="text-xl font-bold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-500">
        Fill rate: posted (paid) jobs that got at least a full crew or started. GMV: payments collected minus refunds.
      </p>
      <section className="space-y-2">
        <h2 className="font-semibold">To review</h2>
        <ul className="space-y-2">
          {queues.map((q) => (
            <li key={q.href}>
              <Link href={q.href} className="card flex items-center justify-between text-sm">
                <span>{q.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    q.count > 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {q.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
