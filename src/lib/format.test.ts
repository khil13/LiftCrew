import { describe, expect, it } from "vitest";
import { dollarsToCents, formatCents } from "./format";

describe("money", () => {
  it("converts dollars to integer cents without float error", () => {
    expect(dollarsToCents("25")).toBe(2500);
    expect(dollarsToCents("19.99")).toBe(1999);
    expect(dollarsToCents("0.1")).toBe(10);
    expect(dollarsToCents("abc")).toBeNull();
    expect(dollarsToCents("1.234")).toBeNull();
  });

  it("formats cents", () => {
    expect(formatCents(2550)).toBe("$25.50");
  });
});
