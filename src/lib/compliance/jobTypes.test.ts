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

  it("does not flag labor-only descriptions", () => {
    expect(matchModerationPhrases("Load my rental truck, 2nd floor walkup, heavy dresser")).toEqual([]);
  });
});
