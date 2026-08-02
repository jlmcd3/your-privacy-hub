/**
 * ITEM 360 — published-app render verification against the LIVE v2 payload.
 *
 * The fixture in `fixtures/item360-live-secondary.json` is the verbatim
 * `report_data` (minus `_meta`) and `intake_data` persisted by the flipped
 * production route (`run-cppa-risk-assessment-v2`, assessment
 * 945428e2-e80c-4d4f-89ae-91341ced128b). These tests exercise the exact
 * components the published report page renders.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CPPARiskReportBody from "@/components/report-bodies/CPPARiskReportBody";
import SecondaryActivityFollowUps from "@/components/cppa/SecondaryActivityFollowUps";
import { secondaryRecommendationSentence } from "../../supabase/functions/_shared/ltp/secondary-recommendation";
import live from "./fixtures/item360-live-secondary.json";

const report = (live as any).report;
const intake = (live as any).intake;

describe("ITEM 360 — live v2 payload renders in the shipped viewer", () => {
  it("renders the report body without hitting the unrecognized-shape fallback", () => {
    const { container } = render(
      <MemoryRouter>
        <CPPARiskReportBody report={report} createdAt={new Date().toISOString()} />
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-testid="cppa-risk-unrecognized-shape"]')).toBeNull();
    expect(container.textContent && container.textContent.length).toBeGreaterThan(500);
  });

  it("carries a genuine risk band (not 'Insufficient basis') on the complete record", () => {
    expect(report.risk_level).toBe("Low");
  });

  it("carries the § 7156(a) directive material and all five § 7152 deliverables", () => {
    const blob = JSON.stringify(report);
    expect(blob).toContain("7156(a)");
    for (const key of [
      "necessity_analysis",
      "harm_causation",
      "consequence",
      "safeguard_map",
      "weighing",
    ]) {
      expect(Object.keys(report.activity_analytics[0])).toContain(key);
    }
  });

  it("shows the follow-up panel for the non-bundleable secondary activity, verbatim", () => {
    render(
      <MemoryRouter>
        <SecondaryActivityFollowUps intake={intake} sourceAssessmentId="945428e2" />
      </MemoryRouter>,
    );
    const card = screen.getByTestId("secondary-followup-Lookalike modelling");
    const expected = secondaryRecommendationSentence(
      intake.secondary_activities[0] as never,
    );
    expect(card.textContent).toContain(expected);
    expect(card.textContent).toContain(
      "Recommended: conduct a separate risk assessment for Lookalike modelling",
    );
  });
});
