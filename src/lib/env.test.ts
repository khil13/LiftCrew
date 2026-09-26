import { afterEach, describe, expect, it } from "vitest";
import { envValue } from "./env";

describe("envValue", () => {
  afterEach(() => {
    delete process.env.TEST_KEY;
  });

  it("strips whitespace, line breaks, and quotes pasted with a key", () => {
    for (const raw of ["sk_test_123", " sk_test_123 ", "sk_test_123\n", '"sk_test_123"', "'sk_test_123'\r\n"]) {
      process.env.TEST_KEY = raw;
      expect(envValue("TEST_KEY")).toBe("sk_test_123");
    }
  });

  it("treats missing or blank values as unset", () => {
    expect(envValue("TEST_KEY")).toBeUndefined();
    process.env.TEST_KEY = "  ";
    expect(envValue("TEST_KEY")).toBeUndefined();
  });
});
