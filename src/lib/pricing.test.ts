import { describe, expect, it } from "vitest";
import { MIN_JOB_HOURS, SUGGESTED_RATE_CENTS, TYPICAL_JOBS, estimateJobPrice } from "./pricing";

describe("estimateJobPrice", () => {
  it("multiplies helpers × hours × rate and adds the fee", () => {
    expect(estimateJobPrice({ helpers: 2, hours: 3, rateCents: 2500, feePercent: 15 })).toEqual({
      laborCents: 15000,
      feeCents: 2250,
      totalCents: 17250,
    });
  });

  it("handles half hours and rounds to whole cents", () => {
    expect(estimateJobPrice({ helpers: 3, hours: 2.5, rateCents: 2333, feePercent: 15 })).toEqual({
      laborCents: 17498,
      feeCents: 2625,
      totalCents: 20123,
    });
  });
});

describe("suggested pricing", () => {
  it("keeps the typical small move near $200 all-in with the default 15% fee", () => {
    const small = estimateJobPrice({ helpers: 2, hours: 2, rateCents: SUGGESTED_RATE_CENTS, feePercent: 15 });
    expect(small.totalCents).toBe(20700);
    for (const j of TYPICAL_JOBS) expect(j.hours).toBeGreaterThanOrEqual(MIN_JOB_HOURS);
  });
});
