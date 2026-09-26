import { describe, expect, it } from "vitest";
import { toE164 } from "./phone";

describe("toE164", () => {
  it("normalizes US numbers", () => {
    expect(toE164("(201) 555-0123")).toBe("+12015550123");
    expect(toE164("1-201-555-0123")).toBe("+12015550123");
    expect(toE164("+1 201 555 0123")).toBe("+12015550123");
  });

  it("rejects anything else", () => {
    expect(toE164("555-0123")).toBeNull();
    expect(toE164(null)).toBeNull();
  });
});
