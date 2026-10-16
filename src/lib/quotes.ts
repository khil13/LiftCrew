import { z } from "zod";
import { toE164 } from "@/lib/phone";
import { matchModerationPhrases } from "@/lib/compliance/moderation";

// Quick-quote requests from the landing page (no account needed).

export const QuoteSchema = z.object({
  name: z.string().trim().min(1, "Add your name.").max(100),
  phone: z.string().transform((v, ctx) => {
    const e164 = toE164(v);
    if (!e164) {
      ctx.addIssue({ code: "custom", message: "Enter a 10-digit US phone number." });
      return z.NEVER;
    }
    return e164;
  }),
  town: z.string().trim().min(2, "Add your town or ZIP code.").max(100),
  move_date: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Pick a valid date."),
  helpers: z.coerce.number().int().min(1).max(4).default(2),
  details: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || null),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(0, "Something went wrong. Please try again.").optional(),
});

export type QuoteInput = z.output<typeof QuoteSchema>;

/** Rejects dates in the past or more than 180 days out (dates are YYYY-MM-DD, compared in UTC). */
export function moveDateProblem(date: string | null, today = new Date()): string | null {
  if (!date) return null;
  const d = Date.parse(`${date}T00:00:00Z`);
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - 24 * 60 * 60 * 1000;
  if (Number.isNaN(d) || d < start) return "Pick a date from today on.";
  if (d > start + 181 * 24 * 60 * 60 * 1000) return "We book up to 6 months ahead.";
  return null;
}

/** Transport / brokering language, so the follow-up call can restate labor only (Section 7, Rule 4). */
export function quoteFlags(input: Pick<QuoteInput, "details">): string[] {
  return input.details ? matchModerationPhrases(input.details) : [];
}

export function formatQuoteForAlert(q: QuoteInput & { flagged: string[] }): string {
  const lines = [
    `Name: ${q.name}`,
    `Phone: ${q.phone}`,
    `Town: ${q.town}`,
    `Date: ${q.move_date ?? "not sure yet"}`,
    `Helpers: ${q.helpers}`,
    `Details: ${q.details ?? "(none)"}`,
  ];
  if (q.flagged.length) {
    lines.push(
      "",
      `Heads up: mentions ${q.flagged.join(", ")}. Remind them LiftCrew is labor only (no truck, no driving).`,
    );
  }
  return lines.join("\n");
}
