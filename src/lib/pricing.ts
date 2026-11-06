// Price estimate shown to posters: helpers × hours × rate + platform fee.
// All amounts are integer cents.

/** Every job is booked for at least this many hours (keep in sync with the jobs_min_hours DB check). */
export const MIN_JOB_HOURS = 2;
export const MAX_JOB_HOURS = 12;

/**
 * Suggested pay per helper per hour, in cents. Prefilled when posting a job and
 * used for the example prices on the landing page. Checked against local
 * labor-only prices in Nov 2026 (two-helper crews around $100–$145/hr).
 */
export const SUGGESTED_RATE_CENTS = 4500;

/** Typical jobs shown as example prices. */
export const TYPICAL_JOBS = [
  { label: "Quick job", note: "Stairs or a few heavy items", helpers: 1, hours: 2 },
  { label: "Small move", note: "Studio or 1-bedroom truck load", helpers: 2, hours: 2 },
  { label: "Apartment move", note: "1–2 bedrooms, load or unload", helpers: 2, hours: 3 },
  { label: "Bigger move", note: "2–3 bedrooms or a house", helpers: 3, hours: 3 },
] as const;

export type PriceEstimate = { laborCents: number; feeCents: number; totalCents: number };

export function estimateJobPrice(input: {
  helpers: number;
  hours: number;
  rateCents: number;
  feePercent: number;
}): PriceEstimate {
  const laborCents = Math.round(input.helpers * input.hours * input.rateCents);
  const feeCents = Math.round((laborCents * input.feePercent) / 100);
  return { laborCents, feeCents, totalCents: laborCents + feeCents };
}
