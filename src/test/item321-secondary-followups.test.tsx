/**
 * ITEM 321 (PROMPT C) — the follow-up panel appears ONLY for secondary
 * activities the Item-319 recommendation flags for a separate assessment.
 *
 * Also pins that the panel reads its verdict and prose from the shared
 * recommendation module (the one the report composer uses), and that the
 * "Start a new assessment" action stashes the activity as the new PRIMARY.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SecondaryActivityFollowUps from "@/components/cppa/SecondaryActivityFollowUps";
import { RISK_PREFILL_KEY, consumeRiskPrefill } from "@/lib/riskIntakePrefill";
import {
  secondaryFollowUps,
  secondaryRecommendationSentence,
} from "../../supabase/functions/_shared/ltp/secondary-recommendation";

const navigateSpy = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateSpy };
});

const DIMS = ["data", "purpose", "systems", "people", "risks"] as const;
const allSame = () => Object.fromEntries(DIMS.map((d) => [d, "Same"]));
const withDiff = (k: string) => ({ ...allSame(), [k]: "Different" });
const withUnsure = (k: string) => ({ ...allSame(), [k]: "Not sure" });

const BUNDLED = { name: "Fraud scoring", purpose: "Detect fraud", divergence: allSame() };
const SEPARATE = { name: "Lookalike modelling", purpose: "Marketing", divergence: withDiff("purpose") };
const UNRESOLVED = { name: "Partner analytics", purpose: "Reporting", divergence: withUnsure("systems") };

const renderPanel = (activities: unknown) =>
  render(
    <MemoryRouter>
      <SecondaryActivityFollowUps intake={{ secondary_activities: activities }} sourceAssessmentId="a-1" />
    </MemoryRouter>,
  );

describe("ITEM 321 — secondary-activity follow-up panel", () => {
  beforeEach(() => {
    cleanup();
    navigateSpy.mockReset();
    sessionStorage.clear();
  });

  it("renders NO panel when every secondary activity can be bundled", () => {
    const { container } = renderPanel([BUNDLED]);
    expect(container.querySelector('[data-testid="secondary-followups"]')).toBeNull();
  });

  it("renders NO panel when there are no secondary activities", () => {
    const { container } = renderPanel([]);
    expect(container.querySelector('[data-testid="secondary-followups"]')).toBeNull();
    cleanup();
    const b = render(
      <MemoryRouter>
        <SecondaryActivityFollowUps intake={{}} />
      </MemoryRouter>,
    );
    expect(b.container.querySelector('[data-testid="secondary-followups"]')).toBeNull();
  });

  it("renders a panel ONLY for the activities flagged for separate assessment", () => {
    renderPanel([BUNDLED, SEPARATE, UNRESOLVED]);
    expect(screen.getByTestId("secondary-followups")).toBeTruthy();
    expect(screen.queryByTestId(`secondary-followup-${BUNDLED.name}`)).toBeNull();
    expect(screen.getByTestId(`secondary-followup-${SEPARATE.name}`)).toBeTruthy();
    expect(screen.getByTestId(`secondary-followup-${UNRESOLVED.name}`)).toBeTruthy();
    // one action per flagged activity, none for the bundled one
    const actions = screen.getAllByRole("button", { name: /Start a new assessment for/i });
    expect(actions).toHaveLength(2);
    expect(screen.queryByRole("button", { name: new RegExp(BUNDLED.name) })).toBeNull();
  });

  it("shows the Item-319 recommendation text verbatim, not a re-derivation", () => {
    renderPanel([SEPARATE]);
    const card = screen.getByTestId(`secondary-followup-${SEPARATE.name}`);
    expect(card.textContent).toContain(secondaryRecommendationSentence(SEPARATE as never));
    // directive framing, not "the law requires"
    expect(card.textContent).toContain("Recommended: conduct a separate risk assessment");
    expect(card.textContent).not.toMatch(/the law requires/i);
    // the underlying comparison is still shown alongside the recommendation
    expect(card.textContent).toContain("recorded as different from the assessed activity");
  });

  it("closes on the advisory disclaimer", () => {
    renderPanel([SEPARATE]);
    expect(screen.getByTestId("secondary-followups").textContent).toContain(
      "is not legal advice",
    );
  });

  it("the action pre-populates a new intake with the activity as the new PRIMARY", () => {
    renderPanel([SEPARATE]);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(SEPARATE.name) }));
    expect(sessionStorage.getItem(RISK_PREFILL_KEY)).toBeTruthy();
    const pre = consumeRiskPrefill();
    expect(pre?.primary_activity_name).toBe(SEPARATE.name);
    expect(pre?.primary_activity_purpose).toBe(SEPARATE.purpose);
    expect(pre?.source_assessment_id).toBe("a-1");
    expect(navigateSpy).toHaveBeenCalledWith("/cppa-risk-assessment?prefill=1");
    // consumed once, then cleared
    expect(consumeRiskPrefill()).toBeNull();
  });

  it("tolerates the JSON-string shape the ledger carries", () => {
    renderPanel(JSON.stringify([BUNDLED, SEPARATE]));
    expect(screen.getByTestId(`secondary-followup-${SEPARATE.name}`)).toBeTruthy();
    expect(screen.queryByTestId(`secondary-followup-${BUNDLED.name}`)).toBeNull();
  });

  it("panel set === shared-module follow-up set (no UI-side threshold drift)", () => {
    const rows = [BUNDLED, SEPARATE, UNRESOLVED];
    const expected = secondaryFollowUps(rows).map((f) => f.row.name);
    expect(expected).toEqual([SEPARATE.name, UNRESOLVED.name]);
    renderPanel(rows);
    for (const name of expected) {
      expect(screen.getByTestId(`secondary-followup-${name}`)).toBeTruthy();
    }
  });
});
