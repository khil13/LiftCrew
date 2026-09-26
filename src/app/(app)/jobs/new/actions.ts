"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { getAllowedStates } from "@/lib/settings";
import { resolvePlace, type ResolvedPlace } from "@/lib/google/places";
import { validateJobLocation } from "@/lib/compliance/states";
import { ALLOWED_JOB_TYPES } from "@/lib/compliance/jobTypes";
import { dollarsToCents } from "@/lib/format";
import { PaymentsUnavailableError, createJobCheckout } from "@/lib/payments";

export type PostJobState = { error?: string };

const checkbox = z
  .literal("on")
  .optional()
  .transform((v) => v === "on");

const JobSchema = z.object({
  start_place_id: z.string().min(1, "Pick the starting address from the list."),
  start_session: z.string().optional(),
  end_place_id: z.string().optional(),
  end_session: z.string().optional(),
  scheduled_start: z.iso.datetime({
    offset: true,
    message: "Pick a date and start time.",
  }),
  estimated_hours: z.coerce
    .number()
    .min(1, "Jobs are at least 1 hour.")
    .max(12, "Jobs are at most 12 hours.")
    .refine((h) => Number.isInteger(h * 2), "Use whole or half hours."),
  helpers_needed: z.coerce.number().int().min(1).max(10),
  pay_rate: z.string().transform((v, ctx) => {
    const cents = dollarsToCents(v);
    if (cents === null || cents < 1500 || cents > 20000) {
      ctx.addIssue({
        code: "custom",
        message: "Pay rate must be between $15 and $200 per hour.",
      });
      return z.NEVER;
    }
    return cents;
  }),
  job_type: z
    .array(z.enum(ALLOWED_JOB_TYPES, { message: "Pick job types from the list." }))
    .min(1, "Pick at least one type of help."),
  title: z.string().trim().min(3, "Add a short title.").max(100),
  description: z.string().trim().max(2000).optional(),
  has_stairs: checkbox,
  has_heavy_items: checkbox,
  repeat_weeks: z.coerce.number().int().min(1).max(8).default(1),
  attest_labor_only: z.literal("on", {
    message: "Please confirm you're providing your own truck or container.",
  }),
});

export async function postJob(_prev: PostJobState, formData: FormData): Promise<PostJobState> {
  const session = await getSession();
  if (!session?.profile) redirect("/login");
  const role = session.profile.role;
  if (role !== "customer" && !(role === "company" && session.company?.is_approved)) {
    return { error: "Your account can't post jobs yet." };
  }

  const parsed = JobSchema.safeParse({
    ...Object.fromEntries(formData),
    job_type: formData.getAll("job_type"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const input = parsed.data;

  const maxHelpers = role === "customer" ? 4 : 10;
  if (input.repeat_weeks > 1 && role !== "company") return { error: "Repeating shifts are for companies." };
  if (input.helpers_needed > maxHelpers) return { error: `You can book up to ${maxHelpers} helpers per job.` };

  const start = new Date(input.scheduled_start);
  const now = Date.now();
  if (start.getTime() < now + 60 * 60 * 1000) return { error: "Pick a start time at least 1 hour from now." };
  if (start.getTime() > now + 90 * 24 * 60 * 60 * 1000) return { error: "Jobs can be booked up to 90 days ahead." };

  // Section 7, Rule 1: resolve both addresses from Google and check the states
  // server-side. The DB constraint + trigger check again on insert.
  let startPlace: ResolvedPlace;
  let endPlace: ResolvedPlace | null = null;
  try {
    startPlace = await resolvePlace(input.start_place_id, input.start_session);
    if (input.end_place_id) endPlace = await resolvePlace(input.end_place_id, input.end_session);
  } catch (err) {
    console.error(err);
    return {
      error: "We couldn't verify the addresses. Please pick them again.",
    };
  }
  const allowed = await getAllowedStates();
  const location = validateJobLocation(
    {
      startState: startPlace.country === "US" ? startPlace.state : null,
      endState: endPlace && endPlace.country === "US" ? endPlace.state : null,
      hasEndAddress: endPlace !== null,
    },
    allowed,
  );
  if (!location.ok) return { error: location.error };

  // A weekly series is one draft job per week, paid for in one checkout.
  const seriesId = input.repeat_weeks > 1 ? crypto.randomUUID() : null;
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert(
      Array.from({ length: input.repeat_weeks }, (_, week) => ({
        poster_id: session.userId,
        series_id: seriesId,
        title: input.title,
        description: input.description || null,
        job_type: input.job_type,
        start_address: startPlace.formattedAddress,
        start_state: startPlace.state,
        start_lat: startPlace.lat,
        start_lng: startPlace.lng,
        end_address: endPlace?.formattedAddress ?? null,
        end_state: endPlace?.state ?? null,
        end_lat: endPlace?.lat ?? null,
        end_lng: endPlace?.lng ?? null,
        scheduled_start: new Date(start.getTime() + week * WEEK).toISOString(),
        estimated_hours: input.estimated_hours,
        helpers_needed: input.helpers_needed,
        pay_rate_cents: input.pay_rate,
        has_stairs: input.has_stairs,
        has_heavy_items: input.has_heavy_items,
        truck_provided_by_customer: true,
        customer_attested_labor_only: true,
        status: "draft", // opens when the Stripe webhook confirms payment
      })),
    )
    .select("id");
  if (error || !data?.length) {
    console.error(error);
    return { error: "Could not post your job. Please try again." };
  }

  const ids = data.map((j) => j.id as string);
  let checkoutUrl: string;
  try {
    checkoutUrl = await createJobCheckout(ids, session.userId, session.email);
  } catch (err) {
    if (!(err instanceof PaymentsUnavailableError)) console.error(err);
    redirect(ids.length === 1 ? `/jobs/${ids[0]}` : "/jobs"); // saved as drafts; pay from the job page
  }
  redirect(checkoutUrl);
}
