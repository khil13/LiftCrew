import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { TIME_ZONE, formatCents, formatJobTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { resolveDispute } from "../actions";

type DisputedJob = {
  id: string;
  title: string;
  scheduled_start: string;
  estimated_hours: number;
  dispute_reason: string | null;
  poster: { full_name: string } | null;
  payments: { amount_cents: number; status: string }[];
  assignments: {
    no_show: boolean;
    checked_in_at: string | null;
    checked_out_at: string | null;
    hours_worked: number | null;
    check_in_distance_miles: number | null;
    helper: { profile: { full_name: string } | null } | null;
  }[];
};

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" });

export default async function AdminDisputes() {
  const { data } = await createClient()
    .from("jobs")
    .select(
      "id, title, scheduled_start, estimated_hours, dispute_reason, poster:profiles!jobs_poster_id_fkey(full_name), payments(amount_cents, status), assignments:job_assignments(no_show, checked_in_at, checked_out_at, hours_worked, check_in_distance_miles, helper:helper_profiles(profile:profiles(full_name)))",
    )
    .eq("status", "disputed")
    .order("scheduled_start");
  const jobs = (data ?? []) as unknown as DisputedJob[];

  if (jobs.length === 0) return <p className="card text-sm text-slate-600">No open disputes.</p>;
  return (
    <ul className="space-y-3">
      {jobs.map((j) => (
        <li key={j.id} className="card space-y-3 text-sm">
          <div>
            <Link href={`/jobs/${j.id}`} className="font-semibold underline">
              {j.title}
            </Link>
            <p className="text-slate-600">
              {formatJobTime(j.scheduled_start)} · posted by {j.poster?.full_name ?? "unknown"}
              {j.payments[0] ? ` · ${formatCents(j.payments[0].amount_cents)} ${j.payments[0].status}` : ""}
            </p>
          </div>
          <blockquote className="whitespace-pre-line border-l-2 border-red-300 pl-3 text-slate-800">
            {j.dispute_reason ?? "No reason given."}
          </blockquote>
          <div>
            <p className="font-medium">Crew</p>
            <ul className="text-slate-600">
              {j.assignments.map((a, i) => (
                <li key={i}>
                  {a.helper?.profile?.full_name ?? "Helper"}:{" "}
                  {a.no_show
                    ? "no-show"
                    : a.checked_in_at
                      ? `in ${clock(a.checked_in_at)}${a.check_in_distance_miles !== null ? ` (${a.check_in_distance_miles} mi)` : ""}` +
                        (a.checked_out_at
                          ? `, out ${clock(a.checked_out_at)} (${a.hours_worked} of ${j.estimated_hours} hrs)`
                          : ", never checked out")
                      : "never checked in"}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <ActionForm
              action={resolveDispute}
              fields={{ job_id: j.id, outcome: "released" }}
              label="Release payment to crew"
              variant="primary"
              confirm="Release payment to the crew (no-shows excluded)?"
            >
              <textarea
                name="note"
                rows={2}
                maxLength={1000}
                className="input"
                placeholder="Note to both sides (optional)"
              />
            </ActionForm>
            <ActionForm
              action={resolveDispute}
              fields={{ job_id: j.id, outcome: "refunded" }}
              label="Refund poster in full"
              variant="danger"
              confirm="Refund the poster in full? The crew won't be paid for this job."
            >
              <textarea
                name="note"
                rows={2}
                maxLength={1000}
                className="input"
                placeholder="Note to both sides (optional)"
              />
            </ActionForm>
          </div>
        </li>
      ))}
    </ul>
  );
}
