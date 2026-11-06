import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Every test fails on browser console errors, any 5xx response, and any missing
 * file on this site (except Vercel Analytics, which only exists on Vercel).
 */
export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      // Vercel Analytics only exists on Vercel, so its script 404s locally.
      const vercelOnly = (url: string) => url.includes("/_vercel/");
      page.on("console", (m) => {
        // Failed loads are checked by URL in the response handler below.
        if (m.type() === "error" && !m.text().startsWith("Failed to load resource"))
          problems.push(`console: ${m.text()}`);
      });
      page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
      page.on("response", (r) => {
        const sameOriginMissing = r.status() === 404 && r.url().startsWith(new URL(page.url() || "http://x").origin);
        if ((r.status() >= 500 || sameOriginMissing) && !vercelOnly(r.url())) problems.push(`${r.status()} ${r.url()}`);
      });
      await use();
      expect(problems, problems.join("\n")).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** WCAG 2.1 A/AA scan. Returns violations as readable lines. */
export async function axe(page: Page): Promise<string[]> {
  // AxeBuilder is typed against its own Playwright version; the runtime API matches.
  const results = await new AxeBuilder({ page: page as never })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.map(
    (v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target.join(" ")}`,
  );
}

/** True when the page scrolls sideways (broken mobile layout). */
export async function overflowsX(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}
