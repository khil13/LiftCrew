// Price estimate shown to posters: helpers × hours × rate + platform fee.
// All amounts are integer cents.

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
