import { test, expect, axe, overflowsX } from "./fixtures";

// F01 Landing page (logged out)
test.describe("F01 landing", () => {
  test("F01-H1 shows the offer, quote form and town links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Get a free quote" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get my free quote" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Moving help in Irvington" })).toHaveAttribute(
      "href",
      "/moving-help/irvington-nj",
    );
    await expect(page.getByText(/labor-only marketplace/i).first()).toBeVisible();
  });

  test("F01-H2 has a canonical URL and business schema with no street address", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.liftcrewnj.com");
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
    expect(ld["@type"]).toBe("LocalBusiness");
    expect(ld.address).toBeUndefined();
    expect(ld.areaServed.length).toBeGreaterThan(3);
  });

  test("F01-E1 no sideways scroll", async ({ page }) => {
    await page.goto("/");
    expect(await overflowsX(page)).toBe(false);
  });

  test("F01-E2 accessibility (WCAG AA)", async ({ page }) => {
    await page.goto("/");
    expect(await axe(page)).toEqual([]);
  });
});
