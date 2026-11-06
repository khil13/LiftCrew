import { defineConfig, devices } from "@playwright/test";

// End-to-end tests for the public site. Run against a local server:
//   npm run build && npm run start   (in another terminal), then npm run test:e2e
// or set E2E_BASE_URL. These tests only read pages and submit forms that fail
// validation, so they never write to the database or send texts and emails.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL, timezoneId: "America/New_York", locale: "en-US" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run start", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
