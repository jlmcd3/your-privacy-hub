/**
 * ITEM 369 PHASE 2, step 3b — VIEWER EVIDENCE (the R6 check).
 *
 * The R6 defect shipped a blank on-screen report while the PDF was fine,
 * because nothing asserted on the customer-visible render. This test renders
 * the REAL viewer dispatch (CPPARiskReportBody) against the REAL persisted
 * prose-9 payloads produced by scripts/item369/prove.ts and asserts the DOM is
 * not blank, carries all nine sections, and leaks no sentinels or raw JSON.
 *
 * It also pins the live-shape regression: an LTP payload must still dispatch to
 * the LTP renderer, never to the prose-9 one.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import CPPARiskReportBody from "@/components/report-bodies/CPPARiskReportBody";
import { describeCppaRiskShape, hasProse9Document } from "@/lib/cppa-risk-shape";

const DIR = path.join(process.cwd(), "docs/reviews/item369");
const SLUGS = ["perfect-item350-", "messy-item350-", "risk-saas-clean-tuning"];
const SECTIONS = [
  "executive_lead",
  "record_card",
  "determination",
  "why_required",
  "risk_analysis",
  "corpus_analogies",
  "general_conclusions",
  "record_completeness_summary",
  "what_to_do_next",
];

const load = (slug: string) =>
  JSON.parse(fs.readFileSync(path.join(DIR, `payload-${slug}.json`), "utf8"));

describe("Item 369 — prose-9 viewer evidence", () => {
  for (const slug of SLUGS) {
    it(`renders a non-blank viewer body for ${slug}`, () => {
      const report = load(slug);
      expect(hasProse9Document(report)).toBe(true);
      expect(describeCppaRiskShape(report, () => false).shape).toBe("prose9");

      const { container } = render(<CPPARiskReportBody report={report} />);
      const text = (container.textContent ?? "").replace(/\s+/g, " ").trim();

      // R6: not blank.
      expect(text.length).toBeGreaterThan(1500);
      expect(container.querySelector("[data-testid='cppa-risk-prose9-empty']")).toBeNull();

      // All nine sections reached the DOM.
      for (const id of SECTIONS) {
        expect(container.querySelector(`[data-section-id="${id}"]`)).not.toBeNull();
      }

      // No sentinels, no raw JSON, no undefined.
      expect(/[\uE000\uE001]/.test(text)).toBe(false);
      expect(text).not.toMatch(/\[object Object\]|undefined|_meta|\{"/);

      // Record card renders as labelled data, not sentences.
      expect(container.querySelector("[data-section-id='record_card'] dl")).not.toBeNull();
    });
  }

  it("does not hijack the live LTP shape", () => {
    const ltp = {
      executive_summary: "The company completed the assessment.",
      assessment_summary: { narrative: "Narrative." },
    };
    expect(hasProse9Document(ltp)).toBe(false);
    expect(describeCppaRiskShape(ltp, () => false).shape).toBe("ltp");
    render(<CPPARiskReportBody report={ltp} />);
    expect(screen.queryByTestId("cppa-risk-prose9")).toBeNull();
  });
});
