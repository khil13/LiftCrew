"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { emailAboutJob } from "@/lib/email";

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

  const supabase = createClient();
  const { error } = await supabase
    .from("job_applications")
    .insert({ job_id: jobId.data, helper_id: session.userId, message: message.data || null });
  if (error) {
    return { error: error.code === "23505" ? "You already applied." : "This job isn't taking applications." };
  }

  const { data: job } = await supabase.from("jobs").select("poster_id, title").eq("id", jobId.data).single();
  if (job) {
    await emailAboutJob(
      job.poster_id,
      jobId.data,
      `New applicant for "${job.title}"`,
      `${session.profile!.full_name} applied to your job "${job.title}".`,
    );
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
    await emailAboutJob(
      app.helper_id,
      jobId.data,
      `You're booked: "${job.title}"`,
      `Good news: you've been accepted for "${job.title}". Open the job to see the details and message the poster.`,
    );
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
  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return { ok: true };
}
