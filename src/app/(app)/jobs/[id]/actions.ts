"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";
import { PaymentsUnavailableError, createJobCheckout, notifyCrew, settleJob } from "@/lib/payments";

export type ActionState = { error?: string; ok?: boolean };

const uuid = z.uuid();

/** Messages raised on purpose by the DB functions (errcode P0001) are safe to show. */
function friendly(error: PostgrestError, fallback: string): string {
  return error.code === "P0001" ? error.message : fallback;
}

async function requireUser() {
  const session = await getSession();
  if (!session?.profile) redirect("/login");
  return session;
}

export async function applyToJob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const jobId = uuid.safeParse(formData.get("job_id"));
  const message = z.string().trim().max(500).safeParse(formData.get("message") ?? "");
  if (!jobId.success || !message.success) return { error: "Check your message and try again." };
  if (session.profile!.role !== "helper") return { error: "Only helpers can apply." };
  if (!session.helper?.agreed_labor_only_terms_at) return { error: "Agree to the labor-only terms in your profile first." };
  if (!session.helper.stripe_onboarded) return { error: "Set up payouts before applying." };
  if (session.helper.suspended_at) return { error: "Your account is suspended. Contact support." };

  const supabase = createClient();
  const { error } = await supabase
    .from("job_applications")
    .insert({ job_id: jobId.data, helper_id: session.userId, message: message.data || null });
  if (error) {
    return { error: error.code === "23505" ? "You already applied." : "This job isn't taking applications." };
  }

  const { data: job } = await supabase.from("jobs").select("poster_id, title").eq("id", jobId.data).single();
  if (job) {
    await notifyUser(job.poster_id, jobId.data, {
      subject: `New applicant for "${job.title}"`,
      text: `${session.profile!.full_name} applied to your job "${job.title}".`,
    });
  }
  revalidatePath(`/jobs/${jobId.data}`);
  return { ok: true };
}

export async function withdrawApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const applicationId = uuid.safeParse(formData.get("application_id"));
  const jobId = uuid.safeParse(formData.get("job_id"));
  if (!applicationId.success || !jobId.success) return { error: "Something went wrong." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId.data)
    .eq("helper_id", session.userId)
    .select("id");
  if (error || !data?.length) return { error: "This application can't be withdrawn." };
  revalidatePath(`/jobs/${jobId.data}`);
  return { ok: true };
}

export async function acceptApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const applicationId = uuid.safeParse(formData.get("application_id"));
  const jobId = uuid.safeParse(formData.get("job_id"));
  if (!applicationId.success || !jobId.success) return { error: "Something went wrong." };

  const supabase = createClient();
  const { error } = await supabase.rpc("accept_application", { p_application_id: applicationId.data });
  if (error) return { error: friendly(error, "Could not accept this helper.") };

  const [{ data: app }, { data: job }] = await Promise.all([
    supabase.from("job_applications").select("helper_id").eq("id", applicationId.data).single(),
    supabase.from("jobs").select("title").eq("id", jobId.data).single(),
  ]);
  if (app && job) {
    await notifyUser(app.helper_id, jobId.data, {
      subject: `You're booked: "${job.title}"`,
      text: `Good news: you've been accepted for "${job.title}". Open the job to see the details and message the poster.`,
      sms: `You're booked for "${job.title}".`,
    });
  }
  revalidatePath(`/jobs/${jobId.data}`);
  return { ok: true };
}

export async function declineApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const applicationId = uuid.safeParse(formData.get("application_id"));
  const jobId = uuid.safeParse(formData.get("job_id"));
  if (!applicationId.success || !jobId.success) return { error: "Something went wrong." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .update({ status: "declined" })
    .eq("id", applicationId.data)
    .select("id");
  if (error || !data?.length) return { error: "This application can't be declined." };
  revalidatePath(`/jobs/${jobId.data}`);
  return { ok: true };
}

const StatusChange = z.object({
  job_id: z.uuid(),
  status: z.enum(["cancelled", "in_progress", "completed"]),
});

export async function changeJobStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = StatusChange.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Something went wrong." };

  const supabase = createClient();
  const { error } = await supabase.rpc("set_job_status", {
    p_job_id: parsed.data.job_id,
    p_status: parsed.data.status,
  });
  if (error) return { error: friendly(error, "Could not update this job.") };

  const jobId = parsed.data.job_id;
  if (parsed.data.status === "cancelled") {
    const { data: job } = await supabase.from("jobs").select("title").eq("id", jobId).single();
    await notifyCrew(jobId, {
      subject: `Cancelled: "${job?.title}"`,
      text: `The poster cancelled "${job?.title}". If it was within 24 hours of the start, you'll receive your minimum pay.`,
      sms: `"${job?.title}" was cancelled.`,
    });
  }
  if (parsed.data.status === "cancelled" || parsed.data.status === "completed") {
    await settleSafely(jobId);
  }
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

/** Settlement failures are retried by the hourly cron, so they never fail the action. */
async function settleSafely(jobId: string) {
  try {
    await settleJob(jobId);
  } catch (err) {
    if (!(err instanceof PaymentsUnavailableError)) console.error(`Settling ${jobId} failed`, err);
  }
}

export async function payForJob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const jobId = uuid.safeParse(formData.get("job_id"));
  if (!jobId.success) return { error: "Something went wrong." };
  let url: string;
  try {
    url = await createJobCheckout(jobId.data, session.userId, session.email);
  } catch (err) {
    if (err instanceof PaymentsUnavailableError) return { error: err.message };
    console.error(err);
    return { error: err instanceof Error ? err.message : "Could not start checkout." };
  }
  redirect(url);
}

const Coordinates = z.object({
  job_id: z.uuid(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export async function checkIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const raw = Object.fromEntries([...formData].filter(([, v]) => v !== ""));
  const parsed = Coordinates.safeParse(raw);
  if (!parsed.success) return { error: "Something went wrong." };
  const supabase = createClient();
  const { error } = await supabase.rpc("check_in", {
    p_job_id: parsed.data.job_id,
    p_lat: parsed.data.lat ?? null,
    p_lng: parsed.data.lng ?? null,
  });
  if (error) return { error: friendly(error, "Could not check in.") };
  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return { ok: true };
}

export async function checkOut(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const jobId = uuid.safeParse(formData.get("job_id"));
  if (!jobId.success) return { error: "Something went wrong." };
  const supabase = createClient();
  const { error } = await supabase.rpc("check_out", { p_job_id: jobId.data });
  if (error) return { error: friendly(error, "Could not check out.") };
  revalidatePath(`/jobs/${jobId.data}`);
  return { ok: true };
}

export async function reportNoShow(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const assignmentId = uuid.safeParse(formData.get("assignment_id"));
  const jobId = uuid.safeParse(formData.get("job_id"));
  if (!assignmentId.success || !jobId.success) return { error: "Something went wrong." };
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_no_show", { p_assignment_id: assignmentId.data });
  if (error) return { error: friendly(error, "Could not report this no-show.") };
  revalidatePath(`/jobs/${jobId.data}`);
  return { ok: true };
}

const Review = z.object({
  job_id: z.uuid(),
  reviewee_id: z.uuid(),
  rating: z.coerce.number().int().min(1, "Pick a rating.").max(5),
  comment: z.string().trim().max(1000).optional(),
});

export async function submitReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = Review.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_job_id: parsed.data.job_id,
    p_reviewee_id: parsed.data.reviewee_id,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment || null,
  });
  if (error) return { error: friendly(error, "Could not save your review.") };
  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return { ok: true };
}

export async function openDispute(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const jobId = uuid.safeParse(formData.get("job_id"));
  const reason = z.string().trim().max(2000).safeParse(formData.get("reason") ?? "");
  if (!jobId.success || !reason.success) return { error: "Something went wrong." };
  const supabase = createClient();
  const { error } = await supabase.rpc("open_dispute", { p_job_id: jobId.data, p_reason: reason.data });
  if (error) return { error: friendly(error, "Could not report the problem.") };
  revalidatePath(`/jobs/${jobId.data}`);
  return { ok: true };
}

export async function toggleFavorite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const helperId = uuid.safeParse(formData.get("helper_id"));
  const jobId = uuid.optional().safeParse(formData.get("job_id") ?? undefined);
  if (!helperId.success || !jobId.success) return { error: "Something went wrong." };
  if (session.profile!.role !== "company") return { error: "Favorites are for companies." };
  const supabase = createClient();
  const { error } =
    formData.get("favorite") === "remove"
      ? await supabase.from("favorite_helpers").delete().eq("company_id", session.userId).eq("helper_id", helperId.data)
      : await supabase.from("favorite_helpers").insert({ company_id: session.userId, helper_id: helperId.data });
  if (error && error.code !== "23505") return { error: "Could not update favorites." };
  if (jobId.data) revalidatePath(`/jobs/${jobId.data}`);
  revalidatePath("/favorites");
  return { ok: true };
}

export async function inviteHelper(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const helperId = uuid.safeParse(formData.get("helper_id"));
  const jobId = uuid.safeParse(formData.get("job_id"));
  if (!helperId.success || !jobId.success) return { error: "Something went wrong." };
  const supabase = createClient();
  const { error } = await supabase.rpc("invite_helper", { p_job_id: jobId.data, p_helper_id: helperId.data });
  if (error) return { error: friendly(error, "Could not send the invite.") };

  const { data: job } = await supabase.from("jobs").select("title").eq("id", jobId.data).single();
  const from = session.company?.business_name ?? session.profile!.full_name;
  await notifyUser(helperId.data, jobId.data, {
    subject: `${from} invited you to "${job?.title}"`,
    text: `${from} would like you on their crew for "${job?.title}". Open the job to apply.`,
    sms: `${from} invited you to "${job?.title}".`,
  });
  revalidatePath(`/jobs/${jobId.data}`);
  return { ok: true };
}
