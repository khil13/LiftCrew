"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PaymentsUnavailableError, notifyCrew, settleJob } from "@/lib/payments";
import { notifyUser } from "@/lib/notify";

type State = { error?: string; ok?: boolean };

async function requireAdmin(): Promise<string | null> {
  const session = await getSession();
  return session?.profile?.role === "admin" ? session.userId : null;
}

function fail(error: PostgrestError | null, fallback: string): State {
  return { error: error?.code === "P0001" ? error.message : fallback };
}

export async function setCompanyApproved(_prev: State, formData: FormData): Promise<State> {
  if (!(await requireAdmin())) return { error: "Admins only." };
  const id = z.uuid().safeParse(formData.get("company_id"));
  if (!id.success) return { error: "Something went wrong." };
  const approved = formData.get("approved") === "true";
  const { error } = await createClient().rpc("admin_set_company_approved", {
    p_company_id: id.data,
    p_approved: approved,
  });
  if (error) return fail(error, "Could not update the company.");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function setHelperVerified(_prev: State, formData: FormData): Promise<State> {
  if (!(await requireAdmin())) return { error: "Admins only." };
  const id = z.uuid().safeParse(formData.get("helper_id"));
  if (!id.success) return { error: "Something went wrong." };
  const { error } = await createClient().rpc("admin_set_helper_verified", {
    p_helper_id: id.data,
    p_verified: formData.get("verified") === "true",
  });
  if (error) return fail(error, "Could not update the helper.");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function setHelperSuspended(_prev: State, formData: FormData): Promise<State> {
  if (!(await requireAdmin())) return { error: "Admins only." };
  const id = z.uuid().safeParse(formData.get("helper_id"));
  if (!id.success) return { error: "Something went wrong." };
  const { error } = await createClient().rpc("admin_set_helper_suspended", {
    p_helper_id: id.data,
    p_suspended: formData.get("suspended") === "true",
  });
  if (error) return fail(error, "Could not update the helper.");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const Resolution = z.object({
  job_id: z.uuid(),
  outcome: z.enum(["released", "refunded"]),
  note: z.string().trim().max(1000).optional(),
});

export async function resolveDispute(_prev: State, formData: FormData): Promise<State> {
  if (!(await requireAdmin())) return { error: "Admins only." };
  const parsed = Resolution.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Something went wrong." };
  const { job_id: jobId, outcome, note } = parsed.data;

  const supabase = createClient();
  const { error } = await supabase.rpc("admin_resolve_dispute", {
    p_job_id: jobId,
    p_outcome: outcome,
    p_note: note || null,
  });
  if (error) return fail(error, "Could not resolve the dispute.");

  try {
    await settleJob(jobId);
  } catch (err) {
    if (!(err instanceof PaymentsUnavailableError)) console.error(`Settling ${jobId} failed`, err); // cron retries
  }

  const { data: job } = await supabase.from("jobs").select("title, poster_id").eq("id", jobId).single();
  if (job) {
    const text =
      outcome === "released"
        ? `We reviewed the problem reported on "${job.title}" and released payment to the crew.`
        : `We reviewed the problem reported on "${job.title}" and refunded the poster in full.`;
    await Promise.all([
      notifyUser(job.poster_id, jobId, { subject: `Update on "${job.title}"`, text }),
      notifyCrew(jobId, { subject: `Update on "${job.title}"`, text }),
    ]);
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function resolveFlag(_prev: State, formData: FormData): Promise<State> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Admins only." };
  const id = z.uuid().safeParse(formData.get("flag_id"));
  if (!id.success) return { error: "Something went wrong." };
  const { error } = await createClient()
    .from("content_flags")
    .update({ resolved_at: new Date().toISOString(), resolved_by: adminId })
    .eq("id", id.data);
  if (error) return { error: "Could not resolve the flag." };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function updatePlatformFee(_prev: State, formData: FormData): Promise<State> {
  if (!(await requireAdmin())) return { error: "Admins only." };
  const fee = z.coerce.number().min(0).max(30).safeParse(formData.get("fee"));
  if (!fee.success) return { error: "Enter a fee between 0 and 30%." };
  const value = Math.round(fee.data * 10) / 10;
  const { error } = await createClient().from("app_settings").update({ value }).eq("key", "platform_fee_percent");
  if (error) return { error: "Could not save the fee." };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
