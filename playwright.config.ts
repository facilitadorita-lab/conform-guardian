import { defineConfig, devices } from "@playwright/test";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const isLocalHost = (() => {
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(new URL(supabaseUrl).hostname);
  } catch {
    return false;
  }
})();

if (
  process.env.SUPABASE_ENVIRONMENT !== "local" ||
  process.env.NODE_ENV !== "test" ||
  process.env.E2E_ENVIRONMENT !== "true" ||
  process.env.STRIPE_MODE !== "test" ||
  !isLocalHost
) {
  throw new Error("PLAYWRIGHT_PRODUCTION_GUARD_BLOCKED");
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "artifacts/validation/playwright/report", open: "never" }],
    ["json", { outputFile: "artifacts/validation/playwright/results.json" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 30_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
  outputDir: "artifacts/validation/playwright/test-results",
});
