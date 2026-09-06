// QA round two (SUITE-A-02 / SUITE-B03, High, 2026-09-06) — the CPPA Suite
// charged for two assessments and produced the Cybersecurity one from the Risk
// questionnaire: "PREPARED FOR THE COMPANY ... Insufficient basis to assess,
// 0/100, all 18 controls not assessable". That 0 reflected a questionnaire
// that was never presented, not the customer's controls — and customer B had a
// complete standalone Cyber record that was neither imported nor offered.
//
// The Suite has two entry points and each collected ONE module's intake;
// create-tool-checkout then wrote that single payload to BOTH rows. These
// predicates are the guard, shared by the checkout function and the two intake
// pages so client and server agree on what "answered" means.
import { describe, expect, it } from "vitest";
import {
  hasCyberIntake,
  hasRiskIntake,
  missingSuiteModules,
  nextSuiteStep,
  suiteCheckoutIntake,
} from "@/lib/suiteIntakeHandoff";
import { readSuiteModules } from "../../supabase/functions/_shared/suite-intake";

/** Shaped as CPPACybersecurity.tsx builds it. */
const CYBER_INTAKE = {
  profile: { entity_name: "QA Fictional Retail LLC", industry: "Retail" },
  controls: [
    { key: "auth", label: "Authentication", maturity: "implemented", notes: "MFA everywhere", evidence: ["policy"] },
    { key: "enc", label: "Encryption", maturity: "partial", notes: "", evidence: [] },
  ],
};

/** Shaped as CPPARiskAssessment.tsx builds it. */
const RISK_INTAKE = {
  entityName: "QA Fictional Retail LLC",
  q1: "$25M–$100M",
  primaryActivityName: "Opt-in delivery location",
};

describe("SUITE-A-02 — a Risk intake is not a Cyber intake", () => {
  it("rejects the exact payload the Risk entry point used to send for both rows", () => {
    expect(hasCyberIntake(RISK_INTAKE)).toBe(false);
    expect(missingSuiteModules(readSuiteModules(RISK_INTAKE))).toEqual(["cybersecurity"]);
  });

  it("rejects the symmetric SUITE-B03 case from the Cyber entry point", () => {
    expect(hasRiskIntake(CYBER_INTAKE)).toBe(false);
    expect(missingSuiteModules(readSuiteModules(CYBER_INTAKE))).toEqual(["risk_assessment"]);
  });

  it("rejects an empty purchase outright", () => {
    expect(missingSuiteModules(readSuiteModules({}))).toEqual(["risk_assessment", "cybersecurity"]);
    expect(missingSuiteModules(null)).toEqual(["risk_assessment", "cybersecurity"]);
  });

  it("accepts a bundle once both modules are genuinely answered", () => {
    const envelope = suiteCheckoutIntake({ risk_assessment: RISK_INTAKE, cybersecurity: CYBER_INTAKE });
    const modules = readSuiteModules(envelope);
    expect(missingSuiteModules(modules)).toEqual([]);
    // Each row must receive its OWN module's answers, not one payload twice.
    expect(modules.risk_assessment).toEqual(RISK_INTAKE);
    expect(modules.cybersecurity).toEqual(CYBER_INTAKE);
  });
});

describe("SUITE-A-02 — 'answered' means per-control maturity, not a present shape", () => {
  it("an 18-control skeleton with no ratings is not an answered questionnaire", () => {
    expect(hasCyberIntake({ profile: {}, controls: [{ key: "auth", label: "Authentication", maturity: "" }] })).toBe(false);
    expect(hasCyberIntake({ profile: {}, controls: [] })).toBe(false);
    expect(hasCyberIntake({ profile: { entity_name: "Named but unrated" } })).toBe(false);
  });

  it("one rated control is enough — a partial questionnaire is a real one", () => {
    expect(hasCyberIntake({ controls: [{ key: "auth", maturity: "partial" }] })).toBe(true);
  });

  it("a Risk intake is recognised from any of its first-stage answers", () => {
    expect(hasRiskIntake({ entityName: "Named" })).toBe(true);
    expect(hasRiskIntake({ q2: "100,000 or more" })).toBe(true);
    expect(hasRiskIntake({ entityName: "   " })).toBe(false);
    expect(hasRiskIntake({})).toBe(false);
  });
});

describe("SUITE-A-02 — the customer is sent to the module that is missing", () => {
  it("routes to Module 2 from the Risk entry point", () => {
    const step = nextSuiteStep({ risk_assessment: RISK_INTAKE });
    expect(step?.module).toBe("cybersecurity");
    expect(step?.path).toBe("/cppa-cybersecurity?suite=true");
  });

  it("routes to Module 1 from the Cyber entry point", () => {
    const step = nextSuiteStep({ cybersecurity: CYBER_INTAKE });
    expect(step?.module).toBe("risk_assessment");
    expect(step?.path).toBe("/cppa-risk-assessment?suite=true");
  });

  it("has no next step once both are complete, so checkout opens", () => {
    expect(nextSuiteStep({ risk_assessment: RISK_INTAKE, cybersecurity: CYBER_INTAKE })).toBeNull();
  });
});
