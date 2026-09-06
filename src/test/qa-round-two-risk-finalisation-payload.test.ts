// QA round two (RA-A-09 / RA-B-02 / SUITE-A-02 / SUITE-B04, High, 2026-09-06)
// — the CPPA Risk stage-8 finalisation record was collected and discarded.
//
// Every finalisation field is held in state, rendered in the form, autosaved
// and restored — and NONE of them was written into the `intake` payload the
// generator receives, nor listed in its dependency array. The § 7152(a)(7)
// contract entry even carries the note "The form has emitted this
// finalization-stage field since RK3-A3". It never did.
//
// The consequences the reviewer recorded all follow from that one omission:
// customer A entered "Do not initiate, pending tests and review" and the report
// said "Proceed · Initiate the processing · No conditions attach" without
// mentioning the hold; customer B entered "Do not initiate, Priya Shah reviewed
// only, no approval authority" and the report said no company initiation
// decision was recorded, then mapped the LEGACY a9_* approver fields — the only
// approval signal that did reach it — to "Approved".
//
// This is a structural invariant, checked against the source: a contract key
// the engine reads must actually be emitted by the form.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cppaRiskContract } from "../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment";

const SOURCE = readFileSync(resolve(__dirname, "../pages/CPPARiskAssessment.tsx"), "utf8");

/** The object literal passed to the generator as `intake`, comments stripped. */
function intakePayload(): string {
  const start = SOURCE.indexOf("const intake = useMemo(() => ({");
  expect(start, "the intake payload literal was not found — has the wiring changed?").toBeGreaterThan(-1);
  const end = SOURCE.indexOf("}), [", start);
  return SOURCE.slice(start, end).replace(/\/\/[^\n]*/g, "");
}

/** The dependency array of that same useMemo. */
function intakeDeps(): string {
  const start = SOURCE.indexOf("const intake = useMemo(() => ({");
  const depsStart = SOURCE.indexOf("}), [", start);
  const depsEnd = SOURCE.indexOf("]);", depsStart);
  return SOURCE.slice(depsStart, depsEnd).replace(/\/\/[^\n]*/g, "");
}

const FINALISATION_KEYS = [
  "final_processing_decision",
  "final_processing_decision_notes",
  "assessment_reviewers_approvers",
  "approver_authority_confirmed",
  "approver_authority_basis",
] as const;

const FINALISATION_STATE = [
  "finalProcessingDecision",
  "finalProcessingDecisionNotes",
  "assessmentReviewersApprovers",
  "approverAuthorityConfirmed",
  "approverAuthorityBasis",
  "finalizationFollowUpResolved",
] as const;

describe("RA-A-09 — the stage-8 finalisation record reaches the generator", () => {
  const payload = intakePayload();

  it.each(FINALISATION_KEYS)("emits %s", (key) => {
    expect(payload, `${key} is declared in the contract and read by the engine, but the form never sends it`)
      .toContain(`${key}:`);
  });

  it("also carries the follow-up resolution the customer recorded", () => {
    expect(payload).toContain("finalization_follow_up_resolved:");
  });

  it("recomputes when any finalisation answer changes", () => {
    const deps = intakeDeps();
    for (const s of FINALISATION_STATE) {
      expect(deps, `${s} is missing from the intake dependency array, so a change to it would not reach the payload`)
        .toContain(s);
    }
  });
});

describe("RA-A-09 — the contract and the form agree on the finalisation keys", () => {
  it("every finalisation key checked here is genuinely declared in the contract", () => {
    const declared = new Set(cppaRiskContract.fields.map((f) => f.key));
    for (const key of FINALISATION_KEYS) {
      expect(declared, `${key} is not in cppaRiskContract`).toContain(key);
    }
  });

  it("the § 7152(a)(7) decision keeps its recorded option set", () => {
    const f = cppaRiskContract.fields.find((x) => x.key === "final_processing_decision");
    expect(f).toBeDefined();
    // "Do not initiate" is the answer both QA customers gave and the report
    // omitted; it must remain a selectable, recorded value.
    expect(f!.options).toContain("Do not initiate");
    expect(f!.options).toContain("Initiate");
  });
});
