import { describe, expect, it } from "vitest";
import { parseBusinessPhone, quoteConfirmationText } from "./contact";

describe("business phone", () => {
  it("formats a US number for display and links", () => {
    expect(parseBusinessPhone(" 973-555-0123 ")).toEqual({ e164: "+19735550123", display: "(973) 555-0123" });
    expect(parseBusinessPhone("+1 (973) 555 0123")?.e164).toBe("+19735550123");
  });
  it("returns null when unset or invalid, which hides the buttons", () => {
    expect(parseBusinessPhone(undefined)).toBeNull();
    expect(parseBusinessPhone("555")).toBeNull();
  });
});

describe("quote confirmation text", () => {
  it("greets by first name and includes opt-out", () => {
    const text = quoteConfirmationText("Dana Smith", parseBusinessPhone("9735550123"));
    expect(text).toMatch(/^Hi Dana, thanks for contacting LiftCrew!/);
    expect(text).toContain("(973) 555-0123");
    expect(text).toMatch(/Reply STOP to opt out\.$/);
  });
  it("leaves out the phone line when no business phone is set", () => {
    expect(quoteConfirmationText("Dana", null)).not.toMatch(/call or text us/);
  });
});
