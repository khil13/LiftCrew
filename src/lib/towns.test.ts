import { describe, expect, it } from "vitest";
import { TOWNS, getTown } from "./towns";

const words = (t: (typeof TOWNS)[number]) =>
  [t.intro, ...t.local, ...t.faqs.flat()].join(" ").split(/\s+/).filter(Boolean).length;

describe("service-area towns", () => {
  it("has unique slugs in the town-nj format", () => {
    const slugs = TOWNS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z-]+-nj$/);
  });

  it("links only to real nearby towns, never itself", () => {
    for (const t of TOWNS) {
      expect(t.nearby.length).toBeGreaterThan(0);
      for (const n of t.nearby) {
        expect(getTown(n), `${t.slug} -> ${n}`).toBeDefined();
        expect(n).not.toBe(t.slug);
      }
    }
  });

  it("gives every town its own substantial copy (no city-name swaps)", () => {
    for (const t of TOWNS) expect(words(t), t.slug).toBeGreaterThanOrEqual(180);
    const intros = TOWNS.map((t) => t.intro.replaceAll(t.name, "X"));
    expect(new Set(intros).size).toBe(intros.length);
    const local = TOWNS.flatMap((t) => t.local);
    expect(new Set(local).size).toBe(local.length);
  });
});
