"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNewQuote } from "@/lib/notify";
import { QuoteSchema, formatQuoteForAlert, moveDateProblem, quoteFlags } from "@/lib/quotes";

export type QuoteState = { error?: string; sent?: boolean };

export async function requestQuote(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  const parsed = QuoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const q = parsed.data;
  const dateProblem = moveDateProblem(q.move_date);
  if (dateProblem) return { error: dateProblem };

  const admin = createAdminClient();
  if (!admin) {
    console.error("Quote request failed: SUPABASE_SERVICE_ROLE_KEY is not configured");
    return { error: "We couldn't send your request. Please try again in a minute." };
  }

  // Light abuse limits: 3 requests per phone per hour, 60 overall per hour.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [{ count: perPhone }, { count: overall }] = await Promise.all([
    admin
      .from("quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("phone", q.phone)
      .gte("created_at", hourAgo),
    admin.from("quote_requests").select("id", { count: "exact", head: true }).gte("created_at", hourAgo),
  ]);
  if ((perPhone ?? 0) >= 3 || (overall ?? 0) >= 60) {
    return { error: "We already have your request. We'll be in touch shortly." };
  }

  const flagged = quoteFlags(q);
  const { data: saved, error } = await admin
    .from("quote_requests")
    .insert({
      name: q.name,
      phone: q.phone,
      town: q.town,
      move_date: q.move_date,
      helpers: q.helpers,
      details: q.details,
      flagged_phrases: flagged,
    })
    .select("id")
    .single();
  if (error || !saved) {
    console.error("Quote insert failed", error);
    return { error: "We couldn't send your request. Please try again in a minute." };
  }

  const alertStatus = await notifyNewQuote(formatQuoteForAlert({ ...q, flagged }), q.name, q.town);
  await admin
    .from("quote_requests")
    .update({ alert_status: alertStatus.slice(0, 500) })
    .eq("id", saved.id);
  return { sent: true };
}
