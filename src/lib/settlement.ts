// How a job's upfront payment is split once the job ends. Pure functions so
// the money rules are unit-tested; src/lib/payments.ts moves the money.
// All amounts are integer cents.

export type CrewMember = { assignmentId: string; helperId: string; noShow: boolean };

export type CancellationPolicy = {
  full_refund_hours_before: number;
  late_cancel_min_paid_hours_per_helper: number;
};

export type Settlement = {
  payouts: { assignmentId: string; helperId: string; amountCents: number }[];
  retainedFeeCents: number;
  refundCents: number;
};

type Charge = { amountCents: number; feeCents: number };

/** Keeps the platform fee only on the labor actually paid out; refunds the rest. */
function settle(charge: Charge, payouts: Settlement["payouts"]): Settlement {
  const laborCharged = charge.amountCents - charge.feeCents;
  const delivered = payouts.reduce((sum, p) => sum + p.amountCents, 0);
  if (delivered > laborCharged) throw new Error("Payouts exceed the labor that was charged");
  const retainedFeeCents = laborCharged > 0 ? Math.round((charge.feeCents * delivered) / laborCharged) : 0;
  return { payouts, retainedFeeCents, refundCents: charge.amountCents - delivered - retainedFeeCents };
}

/**
 * Completed job: every helper who showed up is paid for the booked hours.
 * Unfilled spots and no-shows are refunded to the poster.
 */
export function completionSettlement(
  charge: Charge,
  job: { payRateCents: number; estimatedHours: number },
  crew: CrewMember[],
): Settlement {
  const perHelper = Math.round(job.payRateCents * job.estimatedHours);
  return settle(
    charge,
    crew.filter((c) => !c.noShow).map((c) => ({ assignmentId: c.assignmentId, helperId: c.helperId, amountCents: perHelper })),
  );
}

/**
 * Cancelled job: full refund when cancelled early enough (or nobody was
 * booked). Otherwise each booked helper gets the minimum paid hours.
 */
export function cancellationSettlement(
  charge: Charge,
  job: { payRateCents: number; estimatedHours: number; scheduledStart: Date; cancelledAt: Date },
  crew: CrewMember[],
  policy: CancellationPolicy,
): Settlement {
  const hoursBefore = (job.scheduledStart.getTime() - job.cancelledAt.getTime()) / 3_600_000;
  const booked = crew.filter((c) => !c.noShow);
  if (booked.length === 0 || hoursBefore >= policy.full_refund_hours_before) return settle(charge, []);
  const paidHours = Math.min(policy.late_cancel_min_paid_hours_per_helper, job.estimatedHours);
  const perHelper = Math.round(job.payRateCents * paidHours);
  return settle(
    charge,
    booked.map((c) => ({ assignmentId: c.assignmentId, helperId: c.helperId, amountCents: perHelper })),
  );
}
