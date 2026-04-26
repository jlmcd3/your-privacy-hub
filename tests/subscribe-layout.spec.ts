import { test, expect } from "../playwright-fixture";
import * as fs from "fs";
import * as path from "path";

/**
 * UI regression test for /subscribe.
 *
 * Captures full-page screenshots at multiple viewport sizes and runs DOM
 * heuristics that flag layout anomalies — most importantly, large empty
 * rectangles inside grid/flex containers (the "blank gray rectangle" bug
 * caused by sibling cards stretching to match a taller neighbor).
 *
 * Screenshots and a JSON report are written to test-results/subscribe-layout/.
 */

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1536, height: 960 },
] as const;

// Threshold: a child whose bounding box has more than this fraction of
// vertical empty space below its rendered content is considered a likely
// "stretched empty card" anomaly.
const EMPTY_SPACE_RATIO_THRESHOLD = 0.35;
const MIN_ANOMALY_HEIGHT_PX = 120;

const OUT_DIR = path.join("test-results", "subscribe-layout");

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

for (const vp of VIEWPORTS) {
  test(`/subscribe layout @ ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/subscribe", { waitUntil: "networkidle" });

    // Give any client-side animations / fonts a beat to settle.
    await page.waitForTimeout(500);

    // Full-page screenshot for human review.
    const screenshotPath = path.join(OUT_DIR, `${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // DOM heuristic: walk every grid/flex container and check whether any
    // direct child has substantial empty vertical space inside its box.
    const anomalies = await page.evaluate(
      ({ ratioThreshold, minHeight }) => {
        type Anomaly = {
          containerSelector: string;
          childIndex: number;
          childTag: string;
          boxHeight: number;
          contentHeight: number;
          emptyRatio: number;
          rect: { x: number; y: number; w: number; h: number };
        };

        const results: Anomaly[] = [];

        const describe = (el: Element): string => {
          const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : "";
          const cls = (el.className && typeof el.className === "string"
            ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
            : "");
          return `${el.tagName.toLowerCase()}${id}${cls}`;
        };

        const containers = Array.from(
          document.querySelectorAll<HTMLElement>("*")
        ).filter((el) => {
          const cs = getComputedStyle(el);
          return (
            (cs.display === "grid" || cs.display === "flex") &&
            el.children.length >= 2
          );
        });

        for (const container of containers) {
          const cs = getComputedStyle(container);
          // items-start / flex-start prevents the stretch bug; skip those.
          const alignItems = cs.alignItems;
          const isStretching =
            alignItems === "stretch" || alignItems === "normal";
          if (!isStretching) continue;

          const children = Array.from(container.children) as HTMLElement[];
          // Find the tallest sibling — that's what the others stretch to match.
          const heights = children.map((c) => c.getBoundingClientRect().height);
          const maxH = Math.max(...heights);
          if (maxH < minHeight) continue;

          children.forEach((child, idx) => {
            const box = child.getBoundingClientRect();
            if (box.height < minHeight) return;

            // Measure how tall the child's actual content is by summing
            // visible descendant text/image extents.
            let contentBottom = box.top;
            const walker = document.createTreeWalker(
              child,
              NodeFilter.SHOW_ELEMENT
            );
            let node = walker.nextNode() as HTMLElement | null;
            while (node) {
              const r = node.getBoundingClientRect();
              const text = (node.textContent || "").trim();
              const isVisible =
                r.width > 0 &&
                r.height > 0 &&
                getComputedStyle(node).visibility !== "hidden" &&
                getComputedStyle(node).display !== "none";
              if (
                isVisible &&
                (text.length > 0 ||
                  node.tagName === "IMG" ||
                  node.tagName === "SVG" ||
                  node.tagName === "BUTTON" ||
                  node.tagName === "INPUT")
              ) {
                if (r.bottom > contentBottom) contentBottom = r.bottom;
              }
              node = walker.nextNode() as HTMLElement | null;
            }

            const contentHeight = Math.max(0, contentBottom - box.top);
            const emptyRatio = 1 - contentHeight / box.height;

            if (emptyRatio > ratioThreshold) {
              results.push({
                containerSelector: describe(container),
                childIndex: idx,
                childTag: describe(child),
                boxHeight: Math.round(box.height),
                contentHeight: Math.round(contentHeight),
                emptyRatio: Number(emptyRatio.toFixed(3)),
                rect: {
                  x: Math.round(box.left),
                  y: Math.round(box.top),
                  w: Math.round(box.width),
                  h: Math.round(box.height),
                },
              });
            }
          });
        }

        return results;
      },
      {
        ratioThreshold: EMPTY_SPACE_RATIO_THRESHOLD,
        minHeight: MIN_ANOMALY_HEIGHT_PX,
      }
    );

    // Write a per-viewport JSON report.
    const reportPath = path.join(OUT_DIR, `${vp.name}.json`);
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        { viewport: vp, screenshot: screenshotPath, anomalies },
        null,
        2
      )
    );

    // Soft-fail: log anomalies and assert none exceed the threshold.
    if (anomalies.length > 0) {
      console.warn(
        `\n[subscribe-layout] ${anomalies.length} anomaly/anomalies @ ${vp.name}:`
      );
      for (const a of anomalies) {
        console.warn(
          `  • ${a.childTag} inside ${a.containerSelector} — ${(
            a.emptyRatio * 100
          ).toFixed(0)}% empty (box ${a.boxHeight}px / content ${a.contentHeight}px)`
        );
      }
    }

    expect(
      anomalies,
      `Found ${anomalies.length} likely blank/stretched rectangle(s) on /subscribe @ ${vp.name}. ` +
        `See ${reportPath} and ${screenshotPath}.`
    ).toEqual([]);
  });
}
