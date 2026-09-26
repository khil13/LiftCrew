"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string };

const ProfileSchema = z.object({
  role: z.enum(["helper", "customer", "company"], { message: "Choose how you'll use LiftCrew." }),
  full_name: z.string().trim().min(2, "Enter your full name.").max(100),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+()\-.\s]*$/, "Enter a valid phone number.")
    .optional()
    .transform((v) => v || null),
  city: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || null),
});

export async function createProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = ProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("profiles").insert({ id: user.id, ...parsed.data });
  if (error) return { error: "Could not save your profile. Please try again." };

  redirect(
    parsed.data.role === "helper"
      ? "/onboarding/helper"
      : parsed.data.role === "company"
        ? "/onboarding/company"
        : "/home",
  );
}
