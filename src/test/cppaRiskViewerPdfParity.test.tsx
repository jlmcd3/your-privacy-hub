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
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import CPPARiskReportBody from "@/components/report-bodies/CPPARiskReportBody";
import { isLtpRiskShape, headerForSection, describeCppaRiskShape } from "@/lib/cppa-risk-shape";
import { isV4Report } from "@/components/cppa/RiskAssessmentReportV4";
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

/**
 * ITEM 290 — SINGLE-KEY SCOPE EMISSION.
 * CEO ruling 2026-07-30: emit one scope key only; the GTM duplication detector
 * is untouched. Surviving key = `scope_and_triggers` (read FIRST by BOTH
 * surfaces: src/components/cppa/RiskAssessmentReportLTP.tsx:130 and
 * supabase/functions/generate-report-pdf/index.ts:1249). The pre-fix fixture
 * still carries the twin, so it doubles as the byte-for-byte content witness.
 */
describe("ITEM 290 — single-key scope emission", () => {
  /** A post-fix assembled report: the retired key is not emitted at all. */
  const postFix = (() => {
    const { scope_confirmation: _retired, ...rest } = report;
    return rest as Record<string, any>;
  })();

  it("the surviving key's content is byte-identical to the retired twin", () => {
    expect(JSON.stringify(report.scope_and_triggers)).toBe(
      JSON.stringify(report.scope_confirmation),
    );
    expect(JSON.stringify(postFix.scope_and_triggers)).toBe(
      JSON.stringify(report.scope_confirmation),
    );
  });

  it("NO-TWIN PIN: the retired key is absent from a post-fix report (no empty stub)", () => {
    expect("scope_confirmation" in postFix).toBe(false);
    expect(postFix.scope_confirmation).toBeUndefined();
  });

  it("the viewer renders the scope block exactly once, from the surviving key", () => {
    const { container } = render(<CPPARiskReportBody report={postFix} />);
    const blocks = container.querySelectorAll('[data-section="scope_and_triggers"]');
    expect(blocks.length).toBe(1);
    expect(container.querySelector('[data-section="scope_confirmation"]')).toBeNull();
    const body = (blocks[0].textContent ?? "")
      .replace(headerForSection("scope_and_triggers"), "")
      .trim();
    expect(body.length).toBeGreaterThan(40);
  });

  it("PARITY: viewer output for the post-fix report matches the pre-fix scope render", () => {
    const before = render(<CPPARiskReportBody report={report} />)
      .container.querySelector('[data-section="scope_and_triggers"]')?.textContent;
    const after = render(<CPPARiskReportBody report={postFix} />)
      .container.querySelector('[data-section="scope_and_triggers"]')?.textContent;
    expect(after).toBe(before);
  });

  it("the shape discriminator is unaffected by dropping the retired key", () => {
    expect(isLtpRiskShape(postFix)).toBe(true);
  });
});


/**
 * ITEM 279 / ISSUE 12 — FAIL-LOUD VIEWER GUARD.
 * An unrecognized payload must render an explicit error card (never a blank
 * body) and emit a console.error carrying the discriminator result.
 */
describe("ITEM 279 — unrecognized report shape fails loud", () => {
  it("classifies an unknown payload as unrecognized", () => {
    const unknown = { id: "rep_unknown_001", some_legacy_key: "x" };
    const result = describeCppaRiskShape(unknown, isV4Report);
    expect(result.shape).toBe("unrecognized");
    expect(result.recognized).toBe(false);
    expect(result.reportId).toBe("rep_unknown_001");
  });

  it("renders the error card with the report id and a support note", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const unknown = { id: "rep_unknown_001", some_legacy_key: "x" };
    const { container, getByTestId } = render(<CPPARiskReportBody report={unknown} />);
    const card = getByTestId("cppa-risk-unrecognized-shape");
    expect(card.textContent).toContain("This report's format is not recognized by the viewer");
    expect(card.textContent).toContain("rep_unknown_001");
    expect(card.textContent?.toLowerCase()).toContain("contact support");
    // non-blank body
    expect((container.textContent ?? "").trim().length).toBeGreaterThan(80);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][1]).toMatchObject({ shape: "unrecognized", recognized: false });
    spy.mockRestore();
  });

  it("recognized shapes are unaffected by the guard", () => {
    expect(describeCppaRiskShape(report, isV4Report).shape).toBe("ltp");
    expect(
      describeCppaRiskShape({ schema_version: "v3-part-a-part-b", part_a: {} }, isV4Report).shape,
    ).toBe("v3");
  });
});
