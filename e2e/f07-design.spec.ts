import { test, expect } from "./fixtures";

// F07 Booking calls to action and design system behaviour.
test.describe("F07 calls to action", () => {
  test("F07-H1 the primary CTA reads 'Book Moving Help' and starts booking", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Book Moving Help" }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/login?intent=hire");
    await expect(page.getByRole("link", { name: "Get a Free Quote" }).first()).toHaveAttribute("href", "#quote");
  });

  test("F07-H2 phones get a pinned booking bar; desktops don't", async ({ page, isMobile }) => {
    await page.goto("/moving-help/union-nj");
    const bar = page.locator("div.fixed.bottom-0");
    if (isMobile) {
      await expect(bar).toBeVisible();
      await expect(bar.getByRole("link", { name: "Book Moving Help" })).toBeVisible();
      await expect(bar.getByRole("link", { name: "Get a Free Quote" })).toHaveAttribute("href", "#quote");
    } else {
      await expect(bar).toBeHidden();
    }
  });

  test("F07-H3 legal pages send 'Get a Free Quote' to the home page form", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the bar only shows on phones");
    await page.goto("/terms");
    await expect(page.locator("div.fixed.bottom-0").getByRole("link", { name: "Get a Free Quote" })).toHaveAttribute(
      "href",
      "/#quote",
    );
  });

  test("F07-E1 helper count buttons: 2 is preselected and a tap selects another", async ({ page }) => {
    await page.goto("/#quote");
    await expect(page.getByRole("radio", { name: "2" })).toBeChecked();
    await page.locator("#quote fieldset").getByText("3", { exact: true }).click();
    await expect(page.getByRole("radio", { name: "3" })).toBeChecked();
  });

  test("F07-E2 keyboard focus is visible on the primary CTA", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Book Moving Help" }).first();
    await cta.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).toBe("solid");
  });
});
