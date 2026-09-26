import Link from "next/link";
import JobStatusBadge from "@/components/JobStatusBadge";
import { requireOnboarded, type Session } from "@/lib/auth";
import { ALLOWED_JOB_TYPES, JOB_TYPE_LABELS, isAllowedJobType, type JobType } from "@/lib/compliance/jobTypes";
import { TIME_ZONE, dollarsToCents, formatCents, formatHours, formatJobTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, FeedJob, Job } from "@/lib/types";

type SearchParams = { view?: string; miles?: string; date?: string; min_pay?: string; type?: string; paid?: string };

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireOnboarded();
  if (session.profile.role === "helper") {
    return searchParams.view === "mine" ? <HelperMyJobs session={session} /> : <HelperFeed searchParams={searchParams} />;
  }
  return <PosterJobs session={session} paid={Boolean(searchParams.paid)} />;
}

function HelperTabs({ active }: { active: "find" | "mine" }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={`flex-1 rounded-md py-2 text-center text-sm font-medium ${on ? "bg-white shadow-sm" : "text-slate-600"}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex rounded-lg bg-slate-200 p-1">
      {tab("/jobs", "Find jobs", active === "find")}
      {tab("/jobs?view=mine", "My jobs", active === "mine")}
    </div>
  );
}

async function HelperFeed({ searchParams }: { searchParams: SearchParams }) {
  const miles = Number(searchParams.miles);
  const minPay = searchParams.min_pay ? dollarsToCents(searchParams.min_pay) : null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "") ? searchParams.date! : null;
  const type = searchParams.type && isAllowedJobType(searchParams.type) ? searchParams.type : null;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("job_feed", {
    p_max_miles: Number.isInteger(miles) && miles > 0 ? miles : null,
    p_on_date: date,
    p_time_zone: TIME_ZONE,
    p_min_pay_cents: minPay,
    p_job_type: type,
  });
  if (error) console.error(error);
  const jobs = (data ?? []) as FeedJob[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Jobs</h1>
      <HelperTabs active="find" />

      <details className="card text-sm" open={Boolean(searchParams.miles || date || minPay || type)}>
        <summary className="cursor-pointer font-medium">Filters</summary>
        <form className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="miles" className="label">
              Within (miles)
            </label>
            <input id="miles" name="miles" type="number" min={1} max={100} className="input" defaultValue={searchParams.miles} />
          </div>
          <div>
            <label htmlFor="min_pay" className="label">
              Min pay ($/hr)
            </label>
            <input id="min_pay" name="min_pay" inputMode="decimal" className="input" defaultValue={searchParams.min_pay} />
          </div>
          <div>
            <label htmlFor="date" className="label">
              Date
            </label>
            <input id="date" name="date" type="date" className="input" defaultValue={date ?? ""} />
          </div>
          <div>
            <label htmlFor="type" className="label">
              Job type
            </label>
            <select id="type" name="type" className="input" defaultValue={type ?? ""}>
              <option value="">Any</option>
              {ALLOWED_JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {JOB_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary col-span-2 py-2">Apply filters</button>
          <Link href="/jobs" className="col-span-2 text-center text-slate-600 underline">
            Clear
          </Link>
        </form>
      </details>

      {jobs.length === 0 ? (
        <p className="card text-sm text-slate-600">
          No open jobs match right now. New jobs show up here as soon as they&apos;re posted.
        </p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link href={`/jobs/${j.id}`} className="card block space-y-1 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{j.title}</p>
                  <p className="shrink-0 font-semibold text-green-700">{formatCents(j.pay_rate_cents)}/hr</p>
                </div>
                <p className="text-slate-600">
                  {formatJobTime(j.scheduled_start)} · {formatHours(j.estimated_hours)}
                </p>
                <p className="text-slate-600">
                  {j.distance_miles} mi away · {j.helpers_needed} helper{j.helpers_needed === 1 ? "" : "s"}
                  {j.has_stairs ? " · Stairs" : ""}
                  {j.has_heavy_items ? " · Heavy items" : ""}
                </p>
                <p className="text-slate-500">{j.job_type.map((t) => JOB_TYPE_LABELS[t as JobType] ?? t).join(", ")}</p>
                {j.applied && <p className="font-medium text-brand-600">Applied</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type MyApplication = {
  id: string;
  status: ApplicationStatus;
  job: Pick<Job, "id" | "title" | "scheduled_start" | "estimated_hours" | "pay_rate_cents" | "status"> | null;
};

async function HelperMyJobs({ session }: { session: Session }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("job_applications")
    .select("id, status, job:jobs(id, title, scheduled_start, estimated_hours, pay_rate_cents, status)")
    .eq("helper_id", session.userId)
    .order("created_at", { ascending: false });
  const apps = ((data ?? []) as unknown as MyApplication[]).filter((a) => a.job);

  const done = (a: MyApplication) =>
    a.job!.status === "completed" || a.job!.status === "cancelled" || a.status === "declined" || a.status === "withdrawn";
  const sections: [string, MyApplication[]][] = [
    ["Booked", apps.filter((a) => a.status === "accepted" && !done(a))],
    ["Applied", apps.filter((a) => a.status === "applied" && !done(a))],
    ["Past", apps.filter(done)],
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Jobs</h1>
      <HelperTabs active="mine" />
      {sections.map(([title, list]) => (
        <section key={title} className="space-y-2">
          <h2 className="font-semibold">{title}</h2>
          {list.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing here yet.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((a) => (
                <li key={a.id}>
                  <Link href={`/jobs/${a.job!.id}`} className="card flex items-center justify-between gap-2 text-sm">
                    <span>
                      <span className="block font-semibold">{a.job!.title}</span>
                      <span className="text-slate-600">{formatJobTime(a.job!.scheduled_start)}</span>
                    </span>
                    <JobStatusBadge status={a.job!.status === "open" || a.job!.status === "filled" ? a.status : a.job!.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

type PostedJob = Pick<Job, "id" | "title" | "scheduled_start" | "helpers_needed" | "status" | "series_id"> & {
  applications: { status: ApplicationStatus }[];
};

async function PosterJobs({ session, paid }: { session: Session; paid: boolean }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, title, scheduled_start, helpers_needed, status, series_id, applications:job_applications(status)")
    .eq("poster_id", session.userId)
    .order("scheduled_start", { ascending: false });
  const jobs = (data ?? []) as unknown as PostedJob[];
  const canPost = session.profile!.role === "customer" || Boolean(session.company?.is_approved);
  const isCompany = session.profile!.role === "company";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My jobs</h1>
        {canPost && (
          <Link href="/jobs/new" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white">
            {isCompany ? "Post a shift" : "Post a job"}
          </Link>
        )}
      </div>
      {paid && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Payment received. Your shifts go live as soon as Stripe confirms it. Refresh to check.
        </p>
      )}
      {isCompany && (
        <div className="flex gap-4 text-sm font-semibold text-brand-600">
          <Link href="/favorites">Favorite helpers</Link>
          <Link href="/billing">Billing</Link>
        </div>
      )}
      {!canPost && (
        <p className="card text-sm text-amber-700">You can post shifts once your company is approved.</p>
      )}
      {jobs.length === 0 ? (
        <p className="card text-sm text-slate-600">
          You haven&apos;t posted anything yet. You bring the truck; LiftCrew helpers do the lifting.
        </p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((j) => {
            const booked = j.applications.filter((a) => a.status === "accepted").length;
            const pending = j.applications.filter((a) => a.status === "applied").length;
            return (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className="card block space-y-1 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{j.title}</p>
                    <JobStatusBadge status={j.status} />
                  </div>
                  <p className="text-slate-600">
                    {formatJobTime(j.scheduled_start)}
                    {j.series_id && <span className="ml-1 text-xs font-medium text-brand-600">· Weekly</span>}
                  </p>
                  <p className="text-slate-600">
                    {booked} of {j.helpers_needed} booked
                    {j.status === "open" && pending > 0 && (
                      <span className="font-medium text-brand-600"> · {pending} new applicant{pending === 1 ? "" : "s"}</span>
                    )}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
