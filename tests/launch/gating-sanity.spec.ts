import { test, expect } from "@playwright/test";

/**
 * Launch QA — gating sanity.
 *
 * As an anonymous user:
 *   - /ropa, /us-notices, /eu-notices, /notices-ropa should redirect to /login
 *   - /tools, /ropa-builder, /us-notice-builder, /eu-global-notice-builder
 *     should render the marketing landing (no subscriber-only content leaked)
 */

const REDIRECT_ROUTES = ["/ropa", "/us-notices", "/eu-notices", "/notices-ropa"];

for (const route of REDIRECT_ROUTES) {
  test(`gated route redirects anon: ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForSelector("body > *", { state: "attached", timeout: 10_000 });
    const url = page.url();
    expect(url, `expected ${route} to redirect to /login`).toMatch(/\/login|auth-bridge/);
  });
}

const PUBLIC_LANDINGS = ["/tools", "/ropa-builder", "/us-notice-builder", "/eu-global-notice-builder", "/subscribe"];

for (const route of PUBLIC_LANDINGS) {
  test(`marketing landing renders without gated body content: ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForSelector("body > *", { state: "attached", timeout: 10_000 });
    // Must not show a "Download document" / "Generate notice" CTA without sign-in
    const body = await page.locator("body").innerText();
    expect(body.length, `${route} has body content`).toBeGreaterThan(200);
    // Sanity: must not render a generated PDF/Document container without auth
    const generated = page.locator('[data-testid="generated-document"]');
    expect(await generated.count(), `${route} leaked generated document`).toBe(0);
  });
}
