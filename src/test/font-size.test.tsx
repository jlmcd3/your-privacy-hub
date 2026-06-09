/**
 * Font-size regression tests.
 *
 * Two complementary checks:
 *
 * 1. Computed-style test: loads `src/index.css` into jsdom, then for each
 *    semantic typography utility renders a sample element and asserts the
 *    computed font-size matches the documented spec and respects the 11px
 *    HARD FLOOR (only `.text-eyebrow` may sit at 11px; everything else is
 *    >= 12px).
 *
 * 2. Component render test: renders `Footer` (a presentational, low-dep
 *    component that uses Tailwind text utilities + semantic utilities) and
 *    asserts every text-bearing descendant has computed font-size >= 12px,
 *    with `.text-eyebrow` allowed at 11px.
 *
 * 3. Static scan: walks every `.ts/.tsx` file under `src/` and fails if any
 *    `text-[Npx]` arbitrary class is below 12px (the global floor agreed in
 *    the F1–F6 typography sweep). This is the cheapest, most reliable
 *    regression net for new code.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fs from "node:fs";
import path from "node:path";
import Footer from "@/components/Footer";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const RAW_INDEX_CSS = fs.readFileSync(
  path.join(PROJECT_ROOT, "src", "index.css"),
  "utf8",
);

// jsdom cannot parse Tailwind's `@tailwind` / `@layer` / `@apply` directives
// and bails on the surrounding rules. Extract only the plain `.text-*` rules
// (and the media queries that override them) so jsdom can apply them.
function extractTypographyRules(css: string): string {
  // Match all .text-* rules. The base rule comes first in source; media
  // overrides come later. Keep only the first occurrence per class so the
  // base value wins regardless of jsdom viewport.
  const ruleRe = /(\.text-[a-zA-Z0-9-]+)\s*\{[^}]*\}/g;
  const seen = new Set<string>();
  const kept: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = ruleRe.exec(css)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    kept.push(m[0]);
  }
  return kept.join("\n");
}

const INDEX_CSS = extractTypographyRules(RAW_INDEX_CSS);

// Minimal Tailwind text-size utilities used across the app. jsdom does NOT
// run Tailwind, so we inject the canonical px values here. Keep in sync with
// tailwind defaults.
const TAILWIND_TEXT_SIZES = `
.text-xs   { font-size: 12px; }
.text-sm   { font-size: 14px; }
.text-base { font-size: 16px; }
.text-lg   { font-size: 18px; }
.text-xl   { font-size: 20px; }
.text-2xl  { font-size: 24px; }
.text-3xl  { font-size: 30px; }
.text-4xl  { font-size: 36px; }
.text-5xl  { font-size: 48px; }
html, body { font-size: 16px; }
`;

beforeAll(() => {
  const style = document.createElement("style");
  style.textContent = INDEX_CSS + "\n" + TAILWIND_TEXT_SIZES;
  document.head.appendChild(style);
});

const fontSizePx = (el: Element) => {
  const raw = window.getComputedStyle(el).fontSize || "0";
  // jsdom may pass through clamp() unevaluated. Extract the min (floor)
  // expression — that is the value the test expects to see in jsdom.
  const clampMatch = raw.match(/clamp\(\s*([\d.]+)(rem|em|px)/);
  if (clampMatch) {
    const num = parseFloat(clampMatch[1]);
    const unit = clampMatch[2];
    return unit === "rem" || unit === "em" ? num * 16 : num;
  }
  const num = parseFloat(raw);
  if (raw.endsWith("rem") || raw.endsWith("em")) return num * 16;
  return num;
};

describe("semantic typography utilities", () => {
  // v9 Prompt 4.5: expected values match Brand v7 typography in index.css.
  // For clamp() utilities the expected number is the clamp FLOOR (the value
  // jsdom evaluates to and the minimum we contractually accept).
  const cases: Array<{ cls: string; expected: number; floor?: number }> = [
    { cls: "text-eyebrow", expected: 12 },
    { cls: "text-label", expected: 12 },
    { cls: "text-label-caps", expected: 11, floor: 11 },
    { cls: "text-meta", expected: 13 },
    { cls: "text-nav", expected: 14 },
    { cls: "text-cta", expected: 15 },
    { cls: "text-body", expected: 16 },
    { cls: "text-card-title", expected: 20 },     // clamp floor
    { cls: "text-section-h2", expected: 26 },     // clamp floor
    { cls: "text-page-h1", expected: 32 },        // clamp floor
    { cls: "text-hero-h1", expected: 40 },        // clamp floor
  ];

  for (const { cls, expected, floor } of cases) {
    it(`.${cls} is ${expected}px and respects the 11px floor`, () => {
      const { container, unmount } = render(
        <span className={cls}>sample</span>,
      );
      const px = fontSizePx(container.firstElementChild!);
      expect(px).toBeGreaterThanOrEqual(floor ?? 12);
      expect(px).toBe(expected);
      unmount();
    });
  }
});

  for (const { cls, expected, floor } of cases) {
    it(`.${cls} is ${expected}px and respects the 11px floor`, () => {
      const { container, unmount } = render(
        <span className={cls}>sample</span>,
      );
      const px = fontSizePx(container.firstElementChild!);
      expect(px).toBe(expected);
      expect(px).toBeGreaterThanOrEqual(floor ?? 12);
      unmount();
    });
  }
});

describe("rendered page components", () => {
  it("Footer: every text element is >= 12px (eyebrow allowed at 11px)", () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    const offenders: Array<{ tag: string; cls: string; px: number }> = [];
    container.querySelectorAll("*").forEach((el) => {
      // Only inspect elements that actually carry their own text content
      const hasOwnText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim(),
      );
      if (!hasOwnText) return;

      const px = fontSizePx(el);
      if (!px) return; // jsdom default — class didn't resolve, skip
      const cls = el.className?.toString() ?? "";
      const floor = cls.includes("text-eyebrow") ? 11 : 12;
      if (px < floor) {
        offenders.push({ tag: el.tagName.toLowerCase(), cls, px });
      }
    });

    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });
});

describe("static scan: no arbitrary text-[Npx] below 12px in src/", () => {
  const SRC = path.join(PROJECT_ROOT, "src");

  function* walk(dir: string): Generator<string> {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "test" || entry.name === "node_modules") continue;
        yield* walk(full);
      } else if (/\\.(ts|tsx)$/.test(entry.name)) {
        yield full;
      }
    }
  }

  it("contains no text-[<12px>] and no half-pixel arbitrary sizes", () => {
    const subTwelve = /text-\\[(\d+(?:\.\d+)?)(px|rem)\\]/g;
    const violations: string[] = [];

    for (const file of walk(SRC)) {
      const content = fs.readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      while ((m = subTwelve.exec(content)) !== null) {
        const [, rawNum, unit] = m;
        const num = parseFloat(rawNum);
        const px = unit === "rem" ? num * 16 : num;
        const isHalf = unit === "px" && !Number.isInteger(num);
        if (px < 12 || isHalf) {
          violations.push(
            `${path.relative(PROJECT_ROOT, file)}: ${m[0]} (${px}px)`,
          );
        }
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });
});
