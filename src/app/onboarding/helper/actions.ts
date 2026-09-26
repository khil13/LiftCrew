"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { getAllowedStates } from "@/lib/settings";
import { resolvePlace } from "@/lib/google/places";
import { formatAllowedStates, isAllowedState } from "@/lib/compliance/states";
import { ALLOWED_JOB_TYPES } from "@/lib/compliance/jobTypes";
import { dollarsToCents } from "@/lib/format";
import type { FormState } from "../actions";

const HelperSchema = z.object({
  bio: z.string().trim().max(1000).optional(),
  years_experience: z.coerce.number().int().min(0).max(60),
  skills: z
    .array(z.enum(ALLOWED_JOB_TYPES, { message: "Pick skills from the list." }))
    .min(1, "Pick at least one skill."),
  hourly_rate: z.string().transform((v, ctx) => {
    const cents = dollarsToCents(v);
    if (cents === null || cents < 1500 || cents > 20000) {
      ctx.addIssue({ code: "custom", message: "Hourly rate must be between $15 and $200." });
      return z.NEVER;
    }
    return cents;
  }),
  has_own_ride_to_jobs: z.literal("on").optional(),
  service_radius_miles: z.coerce.number().int().min(1).max(100),
  home_place_id: z.string().optional(),
  home_session: z.string().optional(),
  avatar_url: z.string().optional(),
  agree_labor_only: z.literal("on", { message: "You must agree to the labor-only terms." }),
});

export async function saveHelperProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile?.role !== "helper") redirect("/home");

  const parsed = HelperSchema.safeParse({
    ...Object.fromEntries(formData),
    skills: formData.getAll("skills"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const input = parsed.data;

  // Home location must be in an allowed state (Section 7, Rule 1). The state
  // comes from Google Places, never from the form.
  let home: { home_lat: number; home_lng: number; home_state: string } | null = null;
  if (input.home_place_id) {
    const allowed = await getAllowedStates();
    let place;
    try {
      place = await resolvePlace(input.home_place_id, input.home_session);
    } catch (err) {
      console.error(err);
      return { error: "We couldn't verify that address. Please try again." };
    }
    if (place.country !== "US" || !isAllowedState(place.state, allowed)) {
      return {
        error: `Right now LiftCrew is only available to helpers who live in ${formatAllowedStates(allowed) || "our launch state"}.`,
      };
    }
    home = { home_lat: place.lat, home_lng: place.lng, home_state: place.state! };
  } else if (!session.helper?.home_state) {
    return { error: "Pick your home address from the list." };
  }

  let avatarUrl: string | null = null;
  if (input.avatar_url) {
    const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${session.userId}/`;
    if (!input.avatar_url.startsWith(prefix)) return { error: "Please re-upload your photo." };
    avatarUrl = input.avatar_url;
  }

  const supabase = createClient();
  const fields = {
    bio: input.bio || null,
    years_experience: input.years_experience,
    skills: input.skills,
    hourly_rate_cents: input.hourly_rate,
    has_own_ride_to_jobs: input.has_own_ride_to_jobs === "on",
    service_radius_miles: input.service_radius_miles,
    ...home,
    agreed_labor_only_terms_at: session.helper?.agreed_labor_only_terms_at ?? new Date().toISOString(),
  };
  // Insert or update rather than upsert: users may not write the id column on update.
  const { error } = session.helper
    ? await supabase.from("helper_profiles").update(fields).eq("id", session.userId)
    : await supabase.from("helper_profiles").insert({ id: session.userId, ...fields });
  if (error) {
    console.error(error);
    return { error: "Could not save your profile. Please try again." };
  }

  if (avatarUrl && avatarUrl !== session.profile.avatar_url) {
    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", session.userId);
  }

  redirect("/home");
}
