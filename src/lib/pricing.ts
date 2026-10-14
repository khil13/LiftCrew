// Price estimate shown to posters: helpers × hours × rate + platform fee.
// All amounts are integer cents.

/** Every job is booked for at least this many hours (keep in sync with the jobs_min_hours DB check). */
export const MIN_JOB_HOURS = 2;
export const MAX_JOB_HOURS = 12;

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
