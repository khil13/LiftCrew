import type { Page } from "@playwright/test";
import { test, expect, axe } from "./fixtures";

// Next.js adds an empty role="alert" route announcer, so match the one with text.
const formError = (page: Page) => page.getByRole("alert").filter({ hasText: /\S/ });

// F02 Quick quote form. Only invalid submissions are sent, so nothing is saved.
test.describe("F02 quote form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#quote");
  });

  test("F02-E1 required fields block an empty submit", async ({ page }) => {
    await page.getByRole("button", { name: "Get my free quote" }).click();
    const valid = await page.getByLabel("Name").evaluate((el) => (el as HTMLInputElement).validity.valid);
    expect(valid).toBe(false);
  });

  test("F02-N1 a bad phone number shows a clear error", async ({ page }) => {
    await page.getByLabel("Name").fill("Test Person");
    await page.getByLabel(/mobile number/i).fill("555");
    await page.getByLabel(/town or zip/i).fill("Irvington");
    await page.getByRole("button", { name: "Get my free quote" }).click();
    await expect(formError(page)).toHaveText("Enter a 10-digit US phone number.");
  });

  test("F02-E2 accents and emoji in the name don't break validation", async ({ page }) => {
    await page.getByLabel("Name").fill("José Ñúñez 🚚");
    await page.getByLabel(/mobile number/i).fill("12");
    await page.getByLabel(/town or zip/i).fill("Maplewood");
    await page.getByRole("button", { name: "Get my free quote" }).click();
    await expect(formError(page)).toHaveText("Enter a 10-digit US phone number.");
  });

  test("F02-E3 very long input is capped by the field", async ({ page }) => {
    await page.getByLabel("Name").fill("x".repeat(300));
    expect((await page.getByLabel("Name").inputValue()).length).toBe(100);
  });

  test("F02-E4 a filled honeypot is rejected", async ({ page }) => {
    await page.getByLabel("Name").fill("Bot");
    await page.getByLabel(/mobile number/i).fill("973-555-0100");
    await page.getByLabel(/town or zip/i).fill("Newark");
    await page.locator("#q-website").fill("http://spam.example");
    await page.getByRole("button", { name: "Get my free quote" }).click();
    await expect(formError(page)).toHaveText("Something went wrong. Please try again.");
  });

  test("F02-E5 the earliest move date is today in New Jersey, even late in the evening", async ({ page }) => {
    // 11:30 pm EDT on Mar 14 2027 is already Mar 15 in UTC. A date this far out
    // also proves the page doesn't reuse a date baked in when it was built.
    await page.clock.setFixedTime(new Date("2027-03-15T03:30:00Z"));
    await page.reload(); // beforeEach already loaded /#quote, so a goto would only change the hash
    await expect(page.getByLabel(/move date/i)).toHaveAttribute("min", "2027-03-14");
    await page.goto("/moving-help/union-nj#quote");
    await expect(page.getByLabel(/move date/i)).toHaveAttribute("min", "2027-03-14");
  });

  test("F02-E6 keyboard only: every field is reachable with Tab", async ({ page }) => {
    await page.getByLabel("Name").focus();
    const seen = new Set<string>();
    // Date inputs take several Tab presses (month, day, year), so press enough to pass them.
    for (let i = 0; i < 14; i++) {
      seen.add(await page.evaluate(() => document.activeElement?.getAttribute("name") ?? ""));
      await page.keyboard.press("Tab");
    }
    for (const f of ["name", "phone", "town", "move_date", "helpers", "details"]) expect(seen).toContain(f);
    expect(seen).not.toContain("website");
  });

  test("F02-E7 accessibility of the quote section", async ({ page }) => {
    expect(await axe(page)).toEqual([]);
  });
});
