import { describe, expect, it } from "vitest";
import { invalidJobTypes, isAllowedJobType } from "./jobTypes";
import { matchModerationPhrases } from "./moderation";

describe("job types", () => {
  it("accepts labor-only job types", () => {
    expect(invalidJobTypes(["loading", "packing", "heavy_item_lifting"])).toEqual([]);
  });

  it("rejects transport job types", () => {
    expect(invalidJobTypes(["loading", "delivery", "truck_rental"])).toEqual(["delivery", "truck_rental"]);
    expect(isAllowedJobType("driving")).toBe(false);
  });
});

describe("moderation", () => {
  it("flags transport language", () => {
    expect(matchModerationPhrases("Can you BRING YOUR TRUCK and haul my couch?")).toEqual([
      "bring your truck",
      "your truck",
      "haul",
    ]);
  });

  it("ignores truck-rental brand names but still catches hauling", () => {
    expect(matchModerationPhrases("Load a 15' U-Haul, then a Uhaul trailer and a U Haul box")).toEqual([]);
    expect(matchModerationPhrases("Can you haul my couch? I rented a U-Haul")).toEqual(["haul"]);
  });

  it("matches at the start of words only", () => {
    expect(matchModerationPhrases("Can you do the delivery?")).toEqual(["deliver"]);
    expect(matchModerationPhrases("Shalhaul street, apartment 2")).toEqual([]);
  });

  it("does not flag labor-only descriptions", () => {
    expect(matchModerationPhrases("Load my rental truck, 2nd floor walkup, heavy dresser")).toEqual([]);
  });
});
