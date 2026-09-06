// QA round two (2026-09-06) — paid-fulfilment defects.
//
// IR-A-01 / IR-B / IR-C (Critical): a paid Incident Response purchase landed on
// "No assessment content available". The Incident Response Playbook is
// purchase-first, so create-tool-checkout wrote the row from an empty form,
// payments-webhook dispatched the generator against it, the generator's 400
// made dispatchGenerator stamp the PAID row status='error', and the result page
// had no failed branch — so an empty report was rendered over a spent purchase.
//
// These assertions pin the predicate that now decides whether a playbook row is
// waiting for its incident facts (recoverable) rather than broken.
import { describe, expect, it } from "vitest";
import {
  IR_TERMINAL_STATUSES,
  hasIncidentIntake,
  needsIncidentIntake,
} from "@/lib/irFulfilment";

describe("IR-A-01 — a paid playbook with no incident facts routes back to the intake", () => {
  it("treats the exact row create-tool-checkout writes for a purchase-first buy as needing intake", () => {
    // The landing page holds an untouched form, so intake_data is {}.
    expect(needsIncidentIntake({ status: "awaiting_intake", intake_data: {} })).toBe(true);
  });

  it("recovers purchases already stranded as `error` by the pre-fix webhook dispatch", () => {
    // dispatchGenerator stamped status='error' when the generator answered 400.
    expect(needsIncidentIntake({ status: "error", intake_data: {} })).toBe(true);
    expect(needsIncidentIntake({ status: "failed", intake_data: null })).toBe(true);
  });

  it("does NOT claim a genuine generation failure is a missing intake", () => {
    // Real answers were supplied; this one failed for some other reason and
    // must show the failure card, not the "enter incident details" card.
    const withAnswers = {
      status: "error",
      intake_data: { organizationName: "QA Fictional Retail LLC", jurisdictions: ["Ireland"] },
    };
    expect(hasIncidentIntake(withAnswers)).toBe(true);
    expect(needsIncidentIntake(withAnswers)).toBe(false);
  });

  it("never hijacks a completed playbook", () => {
    expect(needsIncidentIntake({ status: "complete", intake_data: {} })).toBe(false);
    expect(
      needsIncidentIntake({ status: "complete", intake_data: { jurisdictions: ["California"] } }),
    ).toBe(false);
  });

  it("leaves a run that is still going alone (polling must continue)", () => {
    expect(needsIncidentIntake({ status: "pending", intake_data: {} })).toBe(false);
    expect(needsIncidentIntake({ status: "processing", intake_data: {} })).toBe(false);
    expect(needsIncidentIntake(null)).toBe(false);
    expect(needsIncidentIntake(undefined)).toBe(false);
  });
});

describe("IR-A-01 — hasIncidentIntake mirrors the generator's own gate", () => {
  it("jurisdictions is the fact generate-ir-playbook actually requires", () => {
    expect(hasIncidentIntake({ intake_data: { jurisdictions: ["Ireland", "Germany"] } })).toBe(true);
    expect(hasIncidentIntake({ intake_data: { jurisdictions: [] } })).toBe(false);
    expect(hasIncidentIntake({ intake_data: { organizationName: "Named but no jurisdiction" } })).toBe(false);
    expect(hasIncidentIntake({ intake_data: {} })).toBe(false);
    expect(hasIncidentIntake(null)).toBe(false);
  });
});

describe("IR-A-01 — awaiting_intake stops the result page polling", () => {
  it("is terminal, so useGenerationStatus does not spin forever on a parked purchase", () => {
    expect(IR_TERMINAL_STATUSES.has("awaiting_intake")).toBe(true);
  });

  it("keeps the pre-existing terminal statuses", () => {
    for (const s of ["complete", "error", "failed", "refunded", "failed_resolved"]) {
      expect(IR_TERMINAL_STATUSES.has(s)).toBe(true);
    }
    expect(IR_TERMINAL_STATUSES.has("pending")).toBe(false);
    expect(IR_TERMINAL_STATUSES.has("processing")).toBe(false);
  });
});
