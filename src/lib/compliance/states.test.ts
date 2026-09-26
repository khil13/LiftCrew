import { describe, expect, it } from "vitest";
import { isAllowedState, outOfStateMessage, validateJobLocation } from "./states";

const allowed = ["NJ"];
const error = "Right now we only support moves within New Jersey. Both addresses must be in New Jersey.";

describe("validateJobLocation", () => {
  it("passes an in-state job", () => {
    expect(validateJobLocation({ startState: "NJ", endState: "NJ" }, allowed)).toEqual({ ok: true });
  });

  it("passes an in-state job with a single address", () => {
    expect(validateJobLocation({ startState: "NJ" }, allowed)).toEqual({ ok: true });
  });

  it("fails an out-of-state start", () => {
    expect(validateJobLocation({ startState: "NY" }, allowed)).toEqual({ ok: false, error });
  });

  it("fails an out-of-state end", () => {
    expect(validateJobLocation({ startState: "NJ", endState: "PA" }, allowed)).toEqual({ ok: false, error });
  });

  it("fails a cross-state job even when both states are allowed", () => {
    expect(validateJobLocation({ startState: "NJ", endState: "NY" }, ["NJ", "NY"])).toMatchObject({ ok: false });
  });

  it("fails a job with both addresses out of state", () => {
    expect(validateJobLocation({ startState: "NY", endState: "NY" }, allowed)).toMatchObject({ ok: false });
  });

  it("fails when an end address has no resolved state", () => {
    expect(validateJobLocation({ startState: "NJ", endState: null, hasEndAddress: true }, allowed)).toMatchObject({
      ok: false,
    });
  });

  it("fails when the start state is missing or unknown", () => {
    expect(validateJobLocation({ startState: null }, allowed)).toMatchObject({ ok: false });
    expect(validateJobLocation({ startState: "XX" }, ["XX"])).toMatchObject({ ok: false });
  });

  it("is case-insensitive", () => {
    expect(validateJobLocation({ startState: "nj", endState: "Nj" }, allowed)).toEqual({ ok: true });
  });
});

describe("isAllowedState", () => {
  it("checks membership in the allowed list", () => {
    expect(isAllowedState("NJ", allowed)).toBe(true);
    expect(isAllowedState("NY", allowed)).toBe(false);
    expect(isAllowedState(undefined, allowed)).toBe(false);
  });
});

describe("outOfStateMessage", () => {
  it("names every allowed state", () => {
    expect(outOfStateMessage(["NJ", "NY"])).toBe(
      "Right now we only support moves within New Jersey or New York. Both addresses must be in New Jersey or New York.",
    );
  });
});
