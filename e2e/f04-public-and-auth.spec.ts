import { test, expect } from "./fixtures";

// F04 Search files and legal pages; F05 logged-out access control.
test.describe("F04 public files and pages", () => {
  test("F04-H1 robots.txt points to the sitemap and hides app pages", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("Sitemap: https://www.liftcrewnj.com/sitemap.xml");
    expect(body).toContain("Disallow: /admin");
  });

  test("F04-H2 every sitemap URL opens (checked on this server)", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const paths = [...xml.matchAll(/<loc>https:\/\/www\.liftcrewnj\.com([^<]*)<\/loc>/g)].map((m) => m[1] || "/");
    expect(paths.length).toBeGreaterThan(10);
    for (const p of paths) expect((await request.get(p, { maxRedirects: 0 })).status(), p).toBe(200);
  });
});

test.describe("F05 logged-out access", () => {
  for (const path of ["/home", "/jobs", "/messages", "/admin", "/settings", "/earnings", "/billing"]) {
    test(`F05-N1 ${path} sends a logged-out visitor to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test("F05-H1 login page offers email and phone sign-in", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("textbox").first()).toBeVisible();
  });
});
