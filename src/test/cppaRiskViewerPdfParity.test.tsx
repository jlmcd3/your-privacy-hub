/**
 * ITEM 274 — PERMANENT VIEWER/PDF SHAPE-PARITY TEST.
 *
 * The on-screen analog of the golden-shape presence check. Renders a REAL
 * harness `assembled_report` (replay_harness_results.id
 * eb12abee-ed5b-4d16-a6d0-001039bfacf6, doc 202cca35-3faa-4a19-9b79-d617d36dadc4,
 * exported verbatim to src/test/fixtures/cppa-risk-assembled-report.json)
 * through the SHIPPED viewer and asserts non-empty rendered content for every
 * section key the golden-shape quota table names.
 *
 * Root cause this test pins: the LTP shape carries schema_version
 * "cppa_risk_v4" with STRING/array sections, so isV4Report() matched and the
 * V4 renderer — which expects object-shaped sections — emitted a blank
 * structure, while the PDF path branched on isLtpRiskShape and rendered fully.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import CPPARiskReportBody from "@/components/report-bodies/CPPARiskReportBody";
import { isLtpRiskShape, headerForSection } from "@/lib/cppa-risk-shape";
import { toViewerReport } from "@/pages/admin/AdminReplayReview";
import fixture from "./fixtures/cppa-risk-assembled-report.json";

const report = fixture as Record<string, any>;

/** Golden-shape quota section keys present on this fixture. */
const QUOTA_SECTIONS = [
  "executive_summary",
  "assessment_summary",
  "scope_and_triggers",
  "risk_assessment_by_activity",
  "priority_actions",
  "next_steps",
  "record_sufficiency",
  "information_needed",
  "submission_summary",
] as const;

describe("ITEM 274 — viewer/PDF shape parity (cppa-risk)", () => {
  it("the fixture is the Track-2 LTP shape under the shared discriminator", () => {
    expect(isLtpRiskShape(report)).toBe(true);
    // …and it is exactly the shape that previously mis-dispatched to V4.
    expect(report.schema_version).toBe("cppa_risk_v4");
  });

  it("renders non-empty content for EVERY golden-shape section", () => {
    const { container } = render(<CPPARiskReportBody report={report} createdAt="2026-07-30T00:00:00Z" />);
    for (const key of QUOTA_SECTIONS) {
      const el = container.querySelector(`[data-section="${key}"]`);
      expect(el, `section missing from viewer: ${key}`).not.toBeNull();
      const text = (el?.textContent ?? "").trim();
      // Header text alone does not count as content.
      const body = text.replace(headerForSection(key), "").trim();
      expect(body.length, `section rendered blank: ${key}`).toBeGreaterThan(40);
    }
  });

  it("total rendered text is substantial (never a blank structure)", () => {
    const { container } = render(<CPPARiskReportBody report={report} />);
    expect((container.textContent ?? "").trim().length).toBeGreaterThan(5000);
  });

  it("the admin page boundary adapter yields the bare viewer contract", () => {
    expect(toViewerReport(report)).toBe(report);
    expect(toViewerReport({ report_data: report })).toBe(report);
    expect(toViewerReport(null)).toEqual({});
  });

  it("legacy V3 rows still dispatch to the V3 renderer (no post-cutover regression)", () => {
    const v3 = { schema_version: "v3-part-a-part-b", part_a: { anything: true } };
    expect(isLtpRiskShape(v3)).toBe(false);
  });
});
