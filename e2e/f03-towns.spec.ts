import { test, expect, axe, overflowsX } from "./fixtures";
import { TOWNS } from "../src/lib/towns";

// F03 Service-area (town) pages
test.describe("F03 town pages", () => {
  for (const town of TOWNS) {
    test(`F03-H1 ${town.slug} renders with its own title, canonical, FAQ schema and prefilled town`, async ({
      page,
    }) => {
      await page.goto(`/moving-help/${town.slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Moving help in ${town.name}, NJ`);
      await expect(page).toHaveTitle(`Moving Help & Labor in ${town.name}, NJ | LiftCrew`);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `https://www.liftcrewnj.com/moving-help/${town.slug}`,
      );
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      const types = blocks
        .map((b) => JSON.parse(b))
        .map((d) => d["@type"] ?? d["@graph"]?.map((g: { "@type": string }) => g["@type"]).join(","));
      expect(types.join(",")).toContain("FAQPage");
      expect(types.join(",")).toContain("Service");
      await expect(page.getByLabel(/town or zip/i)).toHaveValue(`${town.name}, NJ`);
      expect(await overflowsX(page)).toBe(false);
    });
  }

  test("F03-H2 every 'Also serving' link opens a real page", async ({ page, request }) => {
    await page.goto("/moving-help/irvington-nj");
    const hrefs = await page
      .getByRole("link", { name: /^Moving help in / })
      .evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of hrefs) expect((await request.get(h!)).status(), h!).toBe(200);
  });

  test("F03-N1 an unknown town is a 404", async ({ request }) => {
    expect((await request.get("/moving-help/atlantis-nj")).status()).toBe(404);
  });

  test("F03-E1 accessibility of a town page and the hub", async ({ page }) => {
    await page.goto("/moving-help/newark-nj");
    expect(await axe(page)).toEqual([]);
    await page.goto("/moving-help");
    expect(await axe(page)).toEqual([]);
  });
});
