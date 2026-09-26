"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import type { FormState } from "../actions";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const CompanySchema = z.object({
  business_name: z.string().trim().min(2, "Enter your business name.").max(200),
  license_number: optional(100),
  website: optional(300).refine((v) => !v || /^https?:\/\/\S+\.\S+/.test(v), "Website must start with http:// or https://"),
  transport_credentials: optional(300),
});

export async function saveCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile?.role !== "company") redirect("/home");

  const parsed = CompanySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  // Insert or update rather than upsert: users may not write the id column on update.
  const { error } = session.company
    ? await supabase.from("companies").update(parsed.data).eq("id", session.userId)
    : await supabase.from("companies").insert({ id: session.userId, ...parsed.data });
  if (error) {
    console.error(error);
    return { error: "Could not save your company. Please try again." };
  }
  redirect("/home");
}
