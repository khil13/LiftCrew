import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import JobStatusBadge from "@/components/JobStatusBadge";
import { requireOnboarded, type Session } from "@/lib/auth";
import { JOB_TYPE_LABELS, type JobType } from "@/lib/compliance/jobTypes";
import { TIME_ZONE, formatCents, formatHours, formatJobTime } from "@/lib/format";
import { estimateJobPrice } from "@/lib/pricing";
import { getPlatformFeePercent } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, Job } from "@/lib/types";
import CheckInButton from "./CheckInButton";
import {
  acceptApplication,
  applyToJob,
  changeJobStatus,
  checkOut,
  declineApplication,
  payForJob,
  reportNoShow,
  submitReview,
  withdrawApplication,
} from "./actions";

type HelperSummary = {
  id: string;
  years_experience: number;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  is_verified: boolean;
  profile: { full_name: string; avatar_url: string | null } | null;
};

type Applicant = { id: string; status: ApplicationStatus; message: string | null; helper: HelperSummary | null };

type Assignment = {
  id: string;
  helper_id: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  hours_worked: number | null;
  check_in_distance_miles: number | null;
  no_show: boolean;
};

type Payment = { status: string; amount_cents: number; refunded_cents: number };

const OPEN_STATUSES = ["open", "filled"];

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" });
}

export default async function JobPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { paid?: string };
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

      {searchParams.paid && isPoster && job.status === "draft" && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Payment received. Your job goes live as soon as Stripe confirms it (usually a few seconds). Refresh to check.
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
        <PosterPanel job={job} session={session} />
      ) : session.profile.role === "helper" ? (
        <HelperPanel job={job} session={session} />
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

// ---------------------------------------------------------------------------
// Poster
// ---------------------------------------------------------------------------

async function PosterPanel({ job, session }: { job: Job; session: Session }) {
  const supabase = createClient();
  const [{ data: apps }, { data: assignmentRows }, { data: payment }, { data: myReviews }, feePercent] =
    await Promise.all([
      supabase
        .from("job_applications")
        .select(
          "id, status, message, helper:helper_profiles(id, years_experience, rating_avg, rating_count, jobs_completed, is_verified, profile:profiles(full_name, avatar_url))",
        )
        .eq("job_id", job.id)
        .order("created_at"),
      supabase
        .from("job_assignments")
        .select("id, helper_id, checked_in_at, checked_out_at, hours_worked, check_in_distance_miles, no_show")
        .eq("job_id", job.id),
      supabase.from("payments").select("status, amount_cents, refunded_cents").eq("job_id", job.id).maybeSingle<Payment>(),
      supabase.from("reviews").select("reviewee_id").eq("job_id", job.id).eq("reviewer_id", session.userId),
      getPlatformFeePercent(),
    ]);
  const applicants = (apps ?? []) as unknown as Applicant[];
  const assignments = new Map(((assignmentRows ?? []) as Assignment[]).map((a) => [a.helper_id, a]));
  const reviewed = new Set((myReviews ?? []).map((r) => r.reviewee_id as string));
  const crew = applicants.filter((a) => a.status === "accepted");
  const pending = applicants.filter((a) => a.status === "applied");
  const fields = { job_id: job.id };
  const started = Date.now() >= new Date(job.scheduled_start).getTime() + 30 * 60 * 1000;
  const lateCancel = new Date(job.scheduled_start).getTime() - Date.now() < 24 * 3_600_000;

  if (job.status === "draft") {
    const estimate = estimateJobPrice({
      helpers: job.helpers_needed,
      hours: Number(job.estimated_hours),
      rateCents: job.pay_rate_cents,
      feePercent,
    });
    return (
      <div className="card space-y-3 text-sm">
        <p className="font-semibold">Pay to publish your job</p>
        <p className="text-slate-600">
          Helpers can see and apply to your job once it&apos;s paid. Total {formatCents(estimate.totalCents)}, held until the
          job is done.
        </p>
        <div className="flex gap-2">
          <ActionForm action={payForJob} fields={fields} label="Pay with Stripe" variant="primary" />
          <ActionForm action={changeJobStatus} fields={{ ...fields, status: "cancelled" }} label="Discard" confirm="Discard this draft?" />
        </div>
      </div>
    );
  }

  return (
    <>
      {payment && <PaymentSummary payment={payment} />}

      <section className="space-y-2">
        <h2 className="font-semibold">
          Crew ({crew.length} of {job.helpers_needed})
        </h2>
        {crew.length === 0 ? (
          <p className="text-sm text-slate-500">No helpers booked yet.</p>
        ) : (
          crew.map((a) => {
            const assignment = a.helper ? assignments.get(a.helper.id) : undefined;
            return (
              <ApplicantCard key={a.id} applicant={a}>
                {assignment && <Attendance assignment={assignment} />}
                {assignment &&
                  !assignment.checked_in_at &&
                  !assignment.no_show &&
                  started &&
                  [...OPEN_STATUSES, "in_progress"].includes(job.status) && (
                    <ActionForm
                      action={reportNoShow}
                      fields={{ ...fields, assignment_id: assignment.id }}
                      label="Report no-show"
                      variant="danger"
                      confirm="Report this helper as a no-show? They won't be paid and will get a strike."
                    />
                  )}
                {job.status === "completed" && a.helper && assignment && !assignment.no_show && !reviewed.has(a.helper.id) && (
                  <ReviewForm jobId={job.id} revieweeId={a.helper.id} name={a.helper.profile?.full_name ?? "this helper"} />
                )}
              </ApplicantCard>
            );
          })
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

      <div className="flex flex-wrap gap-2">
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
          <>
            <ActionForm
              action={changeJobStatus}
              fields={{ ...fields, status: "completed" }}
              label="Confirm job complete"
              variant="primary"
              confirm="Confirm the job is done? Your helpers get paid right away."
            />
            <ActionForm
              action={changeJobStatus}
              fields={{ ...fields, status: "disputed" }}
              label="Report a problem"
              variant="danger"
              confirm="Report a problem? Payment stays on hold until our team reviews it."
            />
          </>
        )}
        {OPEN_STATUSES.includes(job.status) && (
          <ActionForm
            action={changeJobStatus}
            fields={{ ...fields, status: "cancelled" }}
            label="Cancel job"
            variant="danger"
            confirm={
              crew.length > 0 && lateCancel
                ? "Cancel within 24 hours of the start? Each booked helper is paid 1 hour; the rest is refunded."
                : "Cancel this job? You'll get a full refund."
            }
          />
        )}
      </div>
      {job.status === "in_progress" && (
        <p className="text-xs text-slate-500">
          If you don&apos;t confirm or report a problem, the job is confirmed automatically 48 hours after it ends.
        </p>
      )}
    </>
  );
}

function PaymentSummary({ payment }: { payment: Payment }) {
  const label: Record<string, string> = {
    pending: "Awaiting payment",
    held: "Paid · held until the job is done",
    released: "Paid · released to your crew",
    refunded: "Refunded",
    failed: "Payment not completed",
  };
  return (
    <div className="card space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-slate-600">{label[payment.status] ?? payment.status}</span>
        <span className="font-semibold">{formatCents(payment.amount_cents)}</span>
      </div>
      {payment.refunded_cents > 0 && (
        <div className="flex justify-between text-slate-600">
          <span>Refunded to you</span>
          <span>{formatCents(payment.refunded_cents)}</span>
        </div>
      )}
    </div>
  );
}

function Attendance({ assignment }: { assignment: Assignment }) {
  if (assignment.no_show) return <p className="text-sm font-medium text-red-700">Reported as a no-show</p>;
  if (!assignment.checked_in_at) return <p className="text-sm text-slate-500">Not checked in yet</p>;
  return (
    <p className="text-sm text-slate-600">
      Checked in {clock(assignment.checked_in_at)}
      {assignment.check_in_distance_miles !== null && ` (${assignment.check_in_distance_miles} mi from the address)`}
      {assignment.checked_out_at &&
        ` · out ${clock(assignment.checked_out_at)} · ${formatHours(Number(assignment.hours_worked ?? 0))}`}
    </p>
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
            {h?.profile?.full_name ?? "Helper"} {h?.is_verified && <span className="text-brand-600">✓ Verified</span>}
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

function ReviewForm({ jobId, revieweeId, name }: { jobId: string; revieweeId: string; name: string }) {
  return (
    <ActionForm action={submitReview} fields={{ job_id: jobId, reviewee_id: revieweeId }} label="Submit review">
      <label className="label" htmlFor={`rating-${revieweeId}`}>
        Rate {name}
      </label>
      <select id={`rating-${revieweeId}`} name="rating" className="input" defaultValue="">
        <option value="" disabled>
          Choose a rating
        </option>
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {"★".repeat(n)} ({n})
          </option>
        ))}
      </select>
      <textarea name="comment" rows={2} maxLength={1000} className="input" placeholder="Anything others should know? (optional)" />
    </ActionForm>
  );
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function HelperPanel({ job, session }: { job: Job; session: Session }) {
  const supabase = createClient();
  const [{ data: application }, { data: assignment }] = await Promise.all([
    supabase
      .from("job_applications")
      .select("id, status")
      .eq("job_id", job.id)
      .eq("helper_id", session.userId)
      .maybeSingle<{ id: string; status: ApplicationStatus }>(),
    supabase
      .from("job_assignments")
      .select("id, helper_id, checked_in_at, checked_out_at, hours_worked, check_in_distance_miles, no_show")
      .eq("job_id", job.id)
      .eq("helper_id", session.userId)
      .maybeSingle<Assignment>(),
  ]);
  const fields = { job_id: job.id };

  if (assignment) {
    const [{ data: payout }, { data: review }] = await Promise.all([
      supabase
        .from("payouts")
        .select("amount_cents, status")
        .eq("assignment_id", assignment.id)
        .maybeSingle<{ amount_cents: number; status: string }>(),
      supabase
        .from("reviews")
        .select("id")
        .eq("job_id", job.id)
        .eq("reviewer_id", session.userId)
        .maybeSingle(),
    ]);
    const canCheckIn =
      !assignment.checked_in_at && !assignment.no_show && [...OPEN_STATUSES, "in_progress"].includes(job.status);

    return (
      <div className="space-y-3">
        <div className="card space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold">You&apos;re booked</span>
            <JobStatusBadge status="accepted" />
          </div>
          <Attendance assignment={assignment} />
          {payout && (
            <p className="text-slate-600">
              Payout {formatCents(payout.amount_cents)} ·{" "}
              {payout.status === "released"
                ? "sent to your Stripe account"
                : session.helper?.stripe_onboarded
                  ? "processing"
                  : "waiting for your payout setup"}
            </p>
          )}
        </div>
        {canCheckIn && <CheckInButton jobId={job.id} />}
        {assignment.checked_in_at && !assignment.checked_out_at && job.status === "in_progress" && (
          <ActionForm action={checkOut} fields={fields} label="Check out" variant="primary" confirm="Check out now?" />
        )}
        {job.status === "completed" && !assignment.no_show && !review && (
          <ReviewForm jobId={job.id} revieweeId={job.poster_id} name="the poster" />
        )}
      </div>
    );
  }

  if (application) {
    return (
      <div className="card space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Your application</span>
          <JobStatusBadge status={application.status} />
        </div>
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
  const helper = session.helper;
  if (helper?.suspended_at) {
    return <p className="card text-sm text-red-700">Your account is suspended after repeated no-shows.</p>;
  }
  if (!helper?.agreed_labor_only_terms_at) {
    return (
      <Link href="/onboarding/helper" className="btn-primary">
        Finish your profile to apply
      </Link>
    );
  }
  if (!helper.stripe_onboarded) {
    return (
      <div className="card space-y-2 text-sm">
        <p>Set up payouts so we can pay you, then come back to apply.</p>
        <Link href="/earnings" className="btn-primary">
          Set up payouts
        </Link>
      </div>
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
