import { describe, expect, it } from "vitest";
import { QuoteSchema, formatQuoteForAlert, moveDateProblem, quoteFlags } from "./quotes";

const base = { name: "Dana", phone: "(973) 555-0142", town: "Irvington", helpers: "2", details: "", website: "" };

describe("QuoteSchema", () => {
  it("normalizes the phone and fills defaults", () => {
    const r = QuoteSchema.parse(base);
    expect(r.phone).toBe("+19735550142");
    expect(r.move_date).toBeNull();
    expect(r.details).toBeNull();
    expect(r.helpers).toBe(2);
  });
  it("rejects bad phones, missing towns, and filled honeypots", () => {
    expect(QuoteSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
    expect(QuoteSchema.safeParse({ ...base, town: "" }).success).toBe(false);
    expect(QuoteSchema.safeParse({ ...base, website: "http://spam" }).success).toBe(false);
    expect(QuoteSchema.safeParse({ ...base, helpers: "9" }).success).toBe(false);
  });
});

describe("moveDateProblem", () => {
  const today = new Date("2026-10-16T15:00:00Z");
  it("accepts today, the future, and no date", () => {
    expect(moveDateProblem(null, today)).toBeNull();
    expect(moveDateProblem("2026-10-16", today)).toBeNull();
    expect(moveDateProblem("2026-12-01", today)).toBeNull();
  });
  it("rejects the past and far future", () => {
    expect(moveDateProblem("2026-10-01", today)).toMatch(/today/);
    expect(moveDateProblem("2027-08-01", today)).toMatch(/6 months/);
  });
});

describe("quote alerts", () => {
  it("flags transport language and says so in the alert", () => {
    const q = QuoteSchema.parse({ ...base, details: "Can you haul my couch to Newark?" });
    const flagged = quoteFlags(q);
    expect(flagged).toContain("haul");
    expect(formatQuoteForAlert({ ...q, flagged })).toMatch(/labor only/);
  });
});
