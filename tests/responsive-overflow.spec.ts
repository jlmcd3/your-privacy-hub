import { test, expect } from "../playwright-fixture";

/**
 * Responsive guardrail (Phase 4).
 *
 * Asserts that key public pages do not produce horizontal page overflow at
 * common in-between viewport widths. Catches regressions where someone adds
 * a fixed-width element (e.g. min-w-[800px]) that breaks narrow layouts.
 *
 * Horizontal scroll inside designated containers (e.g. tables wrapped in
 * .overflow-x-auto, code blocks) is fine — we only check `document.body`
 * and `document.documentElement` for scrollWidth > clientWidth.
 */

const PAGES = [
  "/",
  "/updates",
  "/cookie-consent",
  "/cross-border-transfers",
  "/health-data-privacy",
  "/biometric-privacy",
  "/global-privacy-authorities",
  "/glossary",
  "/subscribe",
];

const WIDTHS = [360, 600, 900, 1280, 1600] as const;

// Allow up to 1px of fractional overflow caused by sub-pixel layout rounding.
const TOLERANCE_PX = 1;

for (const path of PAGES) {
  for (const width of WIDTHS) {
    test(`no horizontal overflow: ${path} @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);

      const overflow = await page.evaluate(() => {
        const html = document.documentElement;
        const body = document.body;
        return {
          htmlScroll: html.scrollWidth,
          htmlClient: html.clientWidth,
          bodyScroll: body.scrollWidth,
          bodyClient: body.clientWidth,
        };
      });

      const htmlOverflow = overflow.htmlScroll - overflow.htmlClient;
      const bodyOverflow = overflow.bodyScroll - overflow.bodyClient;

      expect(
        htmlOverflow,
        `<html> overflows viewport by ${htmlOverflow}px at ${path} @ ${width}px (scrollWidth=${overflow.htmlScroll}, clientWidth=${overflow.htmlClient})`,
      ).toBeLessThanOrEqual(TOLERANCE_PX);

      expect(
        bodyOverflow,
        `<body> overflows viewport by ${bodyOverflow}px at ${path} @ ${width}px (scrollWidth=${overflow.bodyScroll}, clientWidth=${overflow.bodyClient})`,
      ).toBeLessThanOrEqual(TOLERANCE_PX);
    });
  }
}
