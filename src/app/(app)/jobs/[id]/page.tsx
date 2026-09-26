import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import JobStatusBadge from "@/components/JobStatusBadge";
import { requireOnboarded } from "@/lib/auth";
import { JOB_TYPE_LABELS, type JobType } from "@/lib/compliance/jobTypes";
import { formatCents, formatHours, formatJobTime } from "@/lib/format";
import { estimateJobPrice } from "@/lib/pricing";
import { getPlatformFeePercent } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, Job } from "@/lib/types";
import {
  acceptApplication,
  applyToJob,
  changeJobStatus,
  declineApplication,
  withdrawApplication,
} from "./actions";

type Applicant = {
  id: string;
  status: ApplicationStatus;
  message: string | null;
  helper: {
    id: string;
    years_experience: number;
    rating_avg: number;
    rating_count: number;
    jobs_completed: number;
    is_verified: boolean;
    profile: { full_name: string; avatar_url: string | null } | null;
  } | null;
};

export default async function JobPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { posted?: string };
}) {
  const session = await requireOnboarded();
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();

  const supabase = createClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", params.id).maybeSingle<Job>();
  if (!job) notFound();

  const isPoster = job.poster_id === session.userId;
  const { data: conversation } = await supabase.from("conversations").select("id").eq("job_id", job.id).maybeSingle();

  return (
    <div className="space-y-4">
      <Link href="/jobs" className="text-sm text-slate-500">
        ← Jobs
      </Link>

      {searchParams.posted && isPoster && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Your job is posted. We&apos;ll let you know when helpers apply.
        </p>
      )}

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-bold">{job.title}</h1>
        <JobStatusBadge status={job.status} />
      </div>

      <JobDetails job={job} />

      {conversation && (
        <Link href={`/messages/${conversation.id}`} className="btn-secondary">
          {isPoster ? "Message your crew" : "Message the poster"}
        </Link>
      )}

      {isPoster ? (
        <PosterPanel job={job} />
      ) : session.profile.role === "helper" ? (
        <HelperPanel job={job} helperId={session.userId} termsAgreed={Boolean(session.helper?.agreed_labor_only_terms_at)} />
      ) : null}
    </div>
  );
}

function JobDetails({ job }: { job: Job }) {
  return (
    <div className="card space-y-3 text-sm">
      <div>
        <p className="font-semibold">{formatJobTime(job.scheduled_start)}</p>
        <p className="text-slate-600">
          {formatHours(job.estimated_hours)} · {job.helpers_needed} helper{job.helpers_needed === 1 ? "" : "s"} ·{" "}
          {formatCents(job.pay_rate_cents)}/hr each
        </p>
      </div>
      <div>
        <p className="text-slate-500">Address</p>
        <p>{job.start_address}</p>
        {job.end_address && (
          <>
            <p className="mt-2 text-slate-500">Second address</p>
            <p>{job.end_address}</p>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {job.job_type.map((t) => (
          <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
            {JOB_TYPE_LABELS[t as JobType] ?? t}
          </span>
        ))}
        {job.has_stairs && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">Stairs</span>}
        {job.has_heavy_items && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">Heavy items</span>}
      </div>
      {job.description && <p className="whitespace-pre-line text-slate-700">{job.description}</p>}
      <p className="text-xs text-slate-500">Labor only. The customer provides the truck or container.</p>
    </div>
  );
}

async function PosterPanel({ job }: { job: Job }) {
  const supabase = createClient();
  const [{ data }, feePercent] = await Promise.all([
    supabase
      .from("job_applications")
      .select(
        "id, status, message, helper:helper_profiles(id, years_experience, rating_avg, rating_count, jobs_completed, is_verified, profile:profiles(full_name, avatar_url))",
      )
      .eq("job_id", job.id)
      .order("created_at"),
    getPlatformFeePercent(),
  ]);
  const applicants = (data ?? []) as unknown as Applicant[];
  const crew = applicants.filter((a) => a.status === "accepted");
  const pending = applicants.filter((a) => a.status === "applied");
  const estimate = estimateJobPrice({
    helpers: job.helpers_needed,
    hours: Number(job.estimated_hours),
    rateCents: job.pay_rate_cents,
    feePercent,
  });
  const fields = { job_id: job.id };

  return (
    <>
      <div className="card flex justify-between text-sm">
        <span className="text-slate-600">Estimated total (incl. {feePercent}% fee)</span>
        <span className="font-semibold">{formatCents(estimate.totalCents)}</span>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">
          Crew ({crew.length} of {job.helpers_needed})
        </h2>
        {crew.length === 0 ? (
          <p className="text-sm text-slate-500">No helpers booked yet.</p>
        ) : (
          crew.map((a) => <ApplicantCard key={a.id} applicant={a} />)
        )}
      </section>

      {job.status === "open" && (
        <section className="space-y-2">
          <h2 className="font-semibold">Applicants ({pending.length})</h2>
          {pending.length === 0 && <p className="text-sm text-slate-500">No new applicants yet.</p>}
          {pending.map((a) => (
            <ApplicantCard key={a.id} applicant={a}>
              <div className="flex gap-2">
                <ActionForm
                  action={acceptApplication}
                  fields={{ ...fields, application_id: a.id }}
                  label="Accept"
                  variant="primary"
                />
                <ActionForm action={declineApplication} fields={{ ...fields, application_id: a.id }} label="Decline" />
              </div>
            </ApplicantCard>
          ))}
        </section>
      )}

      <div className="flex gap-2">
        {(job.status === "filled" || (job.status === "open" && crew.length > 0)) && (
          <ActionForm
            action={changeJobStatus}
            fields={{ ...fields, status: "in_progress" }}
            label="Start job"
            variant="primary"
            confirm={job.status === "open" ? "Start with the helpers you have? Other applicants will be declined." : undefined}
          />
        )}
        {job.status === "in_progress" && (
          <ActionForm
            action={changeJobStatus}
            fields={{ ...fields, status: "completed" }}
            label="Mark complete"
            variant="primary"
            confirm="Mark this job complete?"
          />
        )}
        {(job.status === "open" || job.status === "filled" || job.status === "draft") && (
          <ActionForm
            action={changeJobStatus}
            fields={{ ...fields, status: "cancelled" }}
            label="Cancel job"
            variant="danger"
            confirm="Cancel this job? Your helpers will be notified."
          />
        )}
      </div>
    </>
  );
}

function ApplicantCard({ applicant, children }: { applicant: Applicant; children?: React.ReactNode }) {
  const h = applicant.helper;
  return (
    <div className="card space-y-3 text-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {h?.profile?.avatar_url && <img src={h.profile.avatar_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div>
          <p className="font-semibold">
            {h?.profile?.full_name ?? "Helper"} {h?.is_verified && <span className="text-brand-600">✓</span>}
          </p>
          <p className="text-slate-600">
            {h && h.rating_count > 0 ? `★ ${h.rating_avg} (${h.rating_count})` : "New"} · {h?.jobs_completed ?? 0} jobs ·{" "}
            {h?.years_experience ?? 0} yrs exp.
          </p>
        </div>
      </div>
      {applicant.message && <p className="text-slate-700">&ldquo;{applicant.message}&rdquo;</p>}
      {children}
    </div>
  );
}

async function HelperPanel({ job, helperId, termsAgreed }: { job: Job; helperId: string; termsAgreed: boolean }) {
  const supabase = createClient();
  const { data: application } = await supabase
    .from("job_applications")
    .select("id, status")
    .eq("job_id", job.id)
    .eq("helper_id", helperId)
    .maybeSingle<{ id: string; status: ApplicationStatus }>();
  const fields = { job_id: job.id };

  if (application) {
    return (
      <div className="card space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Your application</span>
          <JobStatusBadge status={application.status} />
        </div>
        {application.status === "accepted" && (
          <p className="text-slate-600">You&apos;re booked. Be on time, and message the poster if anything changes.</p>
        )}
        {application.status === "applied" && (
          <ActionForm
            action={withdrawApplication}
            fields={{ ...fields, application_id: application.id }}
            label="Withdraw application"
            confirm="Withdraw your application?"
          />
        )}
      </div>
    );
  }

  if (job.status !== "open") return null;
  if (!termsAgreed) {
    return (
      <Link href="/onboarding/helper" className="btn-primary">
        Finish your profile to apply
      </Link>
    );
  }
  return (
    <ActionForm action={applyToJob} fields={fields} label="Apply" variant="primary">
      <label htmlFor="message" className="label">
        Message to the poster <span className="font-normal text-slate-500">(optional)</span>
      </label>
      <textarea
        id="message"
        name="message"
        rows={3}
        maxLength={500}
        className="input"
        placeholder="I've done lots of apartment moves and I'm available all day."
      />
    </ActionForm>
  );
}
