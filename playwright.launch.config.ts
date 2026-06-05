import { defineConfig, devices } from "@playwright/test";

/**
 * Self-contained Playwright config for the launch QA suite.
 * Avoids the project's lovable-agent fixture (which is harness-only)
 * so the suite can run against any BASE_URL from a plain shell.
 *
 *   BASE_URL=https://enduserprivacy.com npx playwright test --config=playwright.launch.config.ts
 */
export default defineConfig({
  testDir: "./tests/launch",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 4,
  retries: 1,
  reporter: [["line"], ["json", { outputFile: "scripts/qa/playwright-report.json" }]],
  use: {
    baseURL: process.env.BASE_URL || "https://enduserprivacy.com",
    actionTimeout: 15_000,
    navigationTimeout: 90_000,
    ignoreHTTPSErrors: true,
    userAgent: "EUP-QA-Playwright/1.0",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
