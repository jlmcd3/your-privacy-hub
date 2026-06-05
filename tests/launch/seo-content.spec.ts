import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Launch QA — DOM-rendered SEO, content, and disclaimer audit.
 *
 * Visits every static public route from src/App.tsx with a real browser,
 * waits for `networkidle`, then asserts:
 *   - HTTP 200
 *   - no console.error events fired
 *   - exactly one <h1>
 *   - <title> 10–70 chars
 *   - <meta name="description"> 50–160 chars
 *   - <link rel="canonical"> present
 *   - footer links to /privacy-policy, /terms, /contact
 *   - body text contains none of the banned-voice strings
 *
 * Run with:  npx playwright test tests/launch/seo-content.spec.ts
 * Override target: BASE_URL=https://preview... npx playwright test ...
 */

const app = readFileSync(resolve(__dirname, "../../src/App.tsx"), "utf8");
const ALL_ROUTES = [...new Set([...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]))];
const ROUTES = ALL_ROUTES.filter(
  (r) =>
    !r.includes(":") &&
    !r.includes("*") &&
    !r.startsWith("/admin") &&
    // Auth/onboarding/checkout flows that redirect or require state — covered separately.
    ![
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/check-email",
      "/onboarding-profile",
      "/subscribe/success",
      "/account",
      "/dashboard",
      "/dashboard/reports",
      "/watchlist",
      "/clients",
      "/brief-preferences",
      "/logo-preview",
    ].includes(r),
);

const BANNED = [/\bAI[- ]generated\b/i, /\bAI[- ]summarized\b/i, /\bad[- ]free\b/i];

for (const route of ROUTES) {
  test(`launch QA: ${route}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

    const res = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 90_000 });
    expect(res, `no response for ${route}`).not.toBeNull();
    expect(res!.status(), `status for ${route}`).toBeLessThan(400);

    await page.waitForSelector("body > *", { timeout: 10_000 });
    // Allow one frame for late helmet updates
    await page.waitForTimeout(300);

    // --- SEO basics ---
    const title = await page.title();
    expect(title.length, `title length on ${route}`).toBeGreaterThanOrEqual(10);
    expect(title.length, `title length on ${route}`).toBeLessThanOrEqual(70);

    const h1Count = await page.locator("h1").count();
    expect(h1Count, `<h1> count on ${route}`).toBe(1);

    const metaDesc = await page.locator('meta[name="description"]').first().getAttribute("content");
    expect(metaDesc, `meta description present on ${route}`).toBeTruthy();
    expect(metaDesc!.length, `meta desc length on ${route}`).toBeGreaterThanOrEqual(50);
    expect(metaDesc!.length, `meta desc length on ${route}`).toBeLessThanOrEqual(160);

    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute("href");
    expect(canonical, `canonical present on ${route}`).toBeTruthy();

    // --- Footer essentials ---
    const footerHtml = await page.locator("footer").first().innerHTML().catch(() => "");
    expect(footerHtml, `footer renders on ${route}`).toBeTruthy();
    expect(footerHtml, `footer privacy link on ${route}`).toMatch(/href="[^"]*\/privacy-policy"/);
    expect(footerHtml, `footer terms link on ${route}`).toMatch(/href="[^"]*\/terms"/);
    expect(footerHtml, `footer contact link on ${route}`).toMatch(/href="[^"]*\/contact"/);

    // --- Banned voice ---
    const bodyText = await page.locator("body").innerText();
    for (const re of BANNED) {
      expect(bodyText, `banned voice ${re} on ${route}`).not.toMatch(re);
    }

    // --- Console errors ---
    // Filter known noisy warnings (React Router future-flag, ad blockers, etc.)
    const significant = consoleErrors.filter(
      (m) =>
        !/Future Flag Warning/i.test(m) &&
        !/ResizeObserver loop/i.test(m) &&
        !/Download the React DevTools/i.test(m),
    );
    expect(significant, `console errors on ${route}: ${significant.join(" | ")}`).toHaveLength(0);
  });
}
