import { describe, expect, it } from "vitest";
import { estimateJobPrice } from "./pricing";

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
