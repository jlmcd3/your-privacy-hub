import { test, expect, type Page } from "@playwright/test";

/**
 * Launch QA — CODEX-3 Item 4 route-guard regression coverage (anonymous).
 *
 * Proves, without touching the route tree:
 *   1. Anonymous users cannot access protected / subscriber / admin pages.
 *   2. Login preserves an allowed destination via ?redirect=.
 *   3. Open-redirect payloads (protocol-relative, absolute, /login self-loop)
 *      are stripped by Login's safeRedirect guard.
 *   4. Direct navigation and refresh produce identical authorization outcomes.
 *   5. Client-side localStorage cannot grant entitlement — flipping fake
 *      "is_premium" flags does not bypass the server-authenticated guard.
 *
 * Subscriber-tier and admin-tier positive-path assertions live in
 * route-guards-authed.spec.ts (requires E2E_TEST_EMAIL / E2E_TEST_PASSWORD).
 */

const PROTECTED_ROUTES = [
  "/dashboard",
  "/dashboard/reports",
  "/account",
  "/account/cppa-runs",
];

const SUBSCRIBER_ROUTES = [
  "/ropa",
  "/us-notices",
  "/eu-notices",
  "/notices-ropa",
];

const ADMIN_ROUTES = [
  "/admin/cron-status",
  "/admin/subscribers",
  "/admin/law-updates",
  "/admin/gating-leaks",
];

async function waitForAuthRedirect(page: Page, timeout = 15_000) {
  await page
    .waitForURL(/\/login|\/auth-bridge/, { timeout })
    .catch(() => {});
}

for (const route of [...PROTECTED_ROUTES, ...SUBSCRIBER_ROUTES, ...ADMIN_ROUTES]) {
  test(`anon → ${route} redirects to /login`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await waitForAuthRedirect(page);
    expect(page.url()).toMatch(/\/login|\/auth-bridge/);
  });
}

test("login preserves an allowed in-app destination via ?redirect=", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 90_000 });
  await waitForAuthRedirect(page);
  const url = new URL(page.url());
  const redirect = url.searchParams.get("redirect");
  expect(redirect, "expected /login to carry a redirect param").toBeTruthy();
  expect(redirect!.startsWith("/dashboard")).toBe(true);
});

test("login page strips open-redirect payloads from the signup link", async ({ page }) => {
  // Protocol-relative URL — must not survive as-is on the signup link.
  await page.goto("/login?redirect=//evil.example.com/pwn", {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  const signupHref = await page.locator('a[href*="/signup"]').first().getAttribute("href");
  expect(signupHref, "signup link renders").toBeTruthy();
  expect(signupHref!).not.toContain("evil.example.com");
  expect(signupHref!).not.toMatch(/redirect=%2F%2F|redirect=\/\//);
});

test("login page strips absolute-URL open-redirect payloads", async ({ page }) => {
  await page.goto("/login?redirect=https://evil.example.com/pwn", {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  const signupHref = await page.locator('a[href*="/signup"]').first().getAttribute("href");
  expect(signupHref!).not.toContain("evil.example.com");
  expect(signupHref!).not.toContain("https%3A%2F%2Fevil");
});

test("login page ignores /login self-loop redirects", async ({ page }) => {
  await page.goto("/login?redirect=/login", {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  const signupHref = await page.locator('a[href*="/signup"]').first().getAttribute("href");
  // safeRedirect drops /login → the signup link should be plain /signup.
  expect(signupHref).toBe("/signup");
});

test("direct nav and refresh yield identical auth outcomes for a gated route", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 90_000 });
  await waitForAuthRedirect(page);
  const firstUrl = new URL(page.url());
  await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
  await waitForAuthRedirect(page);
  const secondUrl = new URL(page.url());
  expect(secondUrl.pathname).toBe(firstUrl.pathname);
  expect(secondUrl.searchParams.get("redirect")).toBe(firstUrl.searchParams.get("redirect"));
});

test("client-side localStorage cannot grant entitlement", async ({ page, context }) => {
  // Prime the origin with forged premium flags before hitting the gate.
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.evaluate(() => {
    try {
      localStorage.setItem("is_premium", "true");
      localStorage.setItem("subscription_tier", "professional");
      localStorage.setItem("role", "admin");
    } catch {}
  });
  await page.goto("/ropa", { waitUntil: "domcontentloaded", timeout: 90_000 });
  await waitForAuthRedirect(page);
  expect(page.url()).toMatch(/\/login|\/auth-bridge/);
  await context.clearCookies();
});
