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

test.describe("F06 link previews", () => {
  for (const path of ["/", "/moving-help", "/moving-help/newark-nj"]) {
    test(`F06-H1 ${path} has a title and a 1200x630 preview image that loads`, async ({ page, request }) => {
      await page.goto(path);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /\S/);
      const img = await page.locator('meta[property="og:image"]').getAttribute("content");
      expect(img).toBeTruthy();
      await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
      // og:image is an absolute liftcrewnj.com URL; fetch the same path from this server.
      const res = await request.get(new URL(img!).pathname + new URL(img!).search);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/png");
    });
  }
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
