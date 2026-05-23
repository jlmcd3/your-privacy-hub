#!/usr/bin/env node
/**
 * Responsive screenshot script (Phase 4).
 *
 * Captures full-page screenshots of the top public routes at five widths
 * each, writing them to /tmp/responsive/ for manual review. Use this
 * locally after layout changes to eyeball anything that broke between
 * the standard sm/md/lg/xl breakpoints.
 *
 * Usage:
 *   # Against the local dev server (must already be running):
 *   node scripts/responsive-screenshots.mjs
 *
 *   # Against any other host:
 *   BASE_URL=https://enduserprivacy.lovable.app node scripts/responsive-screenshots.mjs
 *
 * Requires: playwright (already a project dev-dep via lovable-agent-playwright-config).
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const OUT_DIR = process.env.OUT_DIR || "/tmp/responsive";

const ROUTES = [
  "/",
  "/updates",
  "/cookie-consent",
  "/cross-border-transfers",
  "/health-data-privacy",
  "/biometric-privacy",
  "/global-privacy-authorities",
  "/us-state-comparison",
  "/glossary",
  "/subscribe",
];

const WIDTHS = [360, 600, 900, 1200, 1600];

const slugify = (p) => p.replace(/^\//, "").replace(/\//g, "_") || "home";

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`Base URL : ${BASE_URL}`);
  console.log(`Output   : ${OUT_DIR}`);
  console.log(`Routes   : ${ROUTES.length}`);
  console.log(`Widths   : ${WIDTHS.join(", ")}`);
  console.log("");

  let count = 0;
  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      try {
        await page.goto(`${BASE_URL}${route}`, {
          waitUntil: "networkidle",
          timeout: 30000,
        });
        await page.waitForTimeout(400);
        const file = join(OUT_DIR, `${slugify(route)}_${width}.png`);
        await page.screenshot({ path: file, fullPage: true });
        count++;
        console.log(`  ✓ ${route} @ ${width}px → ${file}`);
      } catch (err) {
        console.warn(`  ✗ ${route} @ ${width}px — ${err.message}`);
      }
    }
  }

  await browser.close();
  console.log(`\nDone. ${count} screenshots written to ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
