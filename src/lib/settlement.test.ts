import { describe, expect, it } from "vitest";
import { cancellationSettlement, completionSettlement, type CrewMember } from "./settlement";

// 2 helpers × 3 hrs × $30 = $180 labor + 15% fee ($27) = $207 charged.
const charge = { amountCents: 20700, feeCents: 2700 };
const job = { payRateCents: 3000, estimatedHours: 3 };
const crew: CrewMember[] = [
  { assignmentId: "a1", helperId: "h1", noShow: false },
  { assignmentId: "a2", helperId: "h2", noShow: false },
];
const policy = { full_refund_hours_before: 24, late_cancel_min_paid_hours_per_helper: 1 };
const start = new Date("2026-10-10T14:00:00Z");
const hoursBefore = (h: number) => new Date(start.getTime() - h * 3_600_000);

describe("completionSettlement", () => {
  it("pays each helper the booked hours and keeps the full fee", () => {
    const s = completionSettlement(charge, job, crew);
    expect(s.payouts.map((p) => p.amountCents)).toEqual([9000, 9000]);
    expect(s.retainedFeeCents).toBe(2700);
    expect(s.refundCents).toBe(0);
  });

  it("refunds a no-show's share and its fee", () => {
    const s = completionSettlement(charge, job, [crew[0], { ...crew[1], noShow: true }]);
    expect(s.payouts).toHaveLength(1);
    expect(s.retainedFeeCents).toBe(1350);
    expect(s.refundCents).toBe(20700 - 9000 - 1350);
  });

  it("refunds unfilled spots", () => {
    const s = completionSettlement(charge, job, [crew[0]]);
    expect(s.refundCents).toBe(10350);
  });
});

describe("cancellationSettlement", () => {
  it("refunds everything more than 24 hours before", () => {
    const s = cancellationSettlement(charge, { ...job, scheduledStart: start, cancelledAt: hoursBefore(30) }, crew, policy);
    expect(s).toEqual({ payouts: [], retainedFeeCents: 0, refundCents: 20700 });
  });

  it("pays each booked helper 1 hour inside 24 hours", () => {
    const s = cancellationSettlement(charge, { ...job, scheduledStart: start, cancelledAt: hoursBefore(5) }, crew, policy);
    expect(s.payouts.map((p) => p.amountCents)).toEqual([3000, 3000]);
    expect(s.retainedFeeCents).toBe(900);
    expect(s.refundCents).toBe(20700 - 6000 - 900);
  });

  it("refunds everything when nobody was booked, even last minute", () => {
    const s = cancellationSettlement(charge, { ...job, scheduledStart: start, cancelledAt: hoursBefore(1) }, [], policy);
    expect(s.refundCents).toBe(20700);
  });

  it("never pays more than the booked hours", () => {
    const s = cancellationSettlement(
      charge,
      { ...job, scheduledStart: start, cancelledAt: hoursBefore(1) },
      crew,
      { ...policy, late_cancel_min_paid_hours_per_helper: 5 },
    );
    expect(s.payouts[0].amountCents).toBe(9000);
    expect(s.refundCents).toBe(0);
  });
});
