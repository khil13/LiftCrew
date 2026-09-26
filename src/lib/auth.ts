import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Company, HelperProfile, Profile } from "@/lib/types";

export type Session = {
  userId: string;
  email: string | null;
  phone: string | null;
  profile: Profile | null;
  helper: HelperProfile | null;
  company: Company | null;
};

/** Cached per request, so layouts and pages can both call it. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.rpc("get_my_profile").maybeSingle<Profile>();

  let helper: HelperProfile | null = null;
  let company: Company | null = null;
  if (profile?.role === "helper") {
    ({ data: helper } = await supabase.rpc("get_my_helper_profile").maybeSingle<HelperProfile>());
  } else if (profile?.role === "company") {
    ({ data: company } = await supabase.from("companies").select("*").eq("id", user.id).maybeSingle<Company>());
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    phone: user.phone || null,
    profile: profile ?? null,
    helper,
    company,
  };
});

/** Where the user must go next to finish onboarding, or null when done. */
export function nextOnboardingStep(session: Session): string | null {
  if (!session.profile) return "/onboarding";
  if (session.profile.role === "helper") {
    const h = session.helper;
    if (!h || !h.home_state || !h.agreed_labor_only_terms_at) return "/onboarding/helper";
  }
  if (session.profile.role === "company" && !session.company) return "/onboarding/company";
  return null;
}

/** For app pages: signed in and fully onboarded. */
export async function requireOnboarded(): Promise<Session & { profile: Profile }> {
  const session = await getSession();
  if (!session) redirect("/login");
  const step = nextOnboardingStep(session);
  if (step) redirect(step);
  return session as Session & { profile: Profile };
}
