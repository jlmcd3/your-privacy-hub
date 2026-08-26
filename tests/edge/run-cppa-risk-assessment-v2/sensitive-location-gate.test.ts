// TURN 1c (2026-08-26, CEO-directed redesign) — § 7150(b)(5) sensitive-
// location gate, re-scoped from a location-TYPE picker to a direct Yes/No
// on the statute's actual element (inference FROM a consumer's presence at
// a sensitive location).
//
// DEFECT this replaces: the prior 9-option enum treated ANY non-empty,
// non-"not applicable" answer as engaging the trigger — including a bare
// location-TYPE label naming the business's own sector, with no
// requirement that the record describe an actual presence-based inference.
// Live evidence: quality batch a2db9e57 (2026-08-26) — Vantara Health
// Analytics, Inc., a third-party analytics vendor that ingests clinical
// records via hospital FHIR API feeds and computes a readmission-risk
// score, answered "Healthcare facility or medical office" (naming its
// data's origin sector) and got told the record "affirms conduct falling
// within § 7150(b)(5)" — a statement the record never supported. Vantara
// never observes anyone's physical presence anywhere; it ingests
// already-collected data the same way any healthcare analytics vendor
// does. GPT's independent review flagged this exact misapplication.
//
// This suite pins the gate's new, simplified behavior directly, and
// reproduces the Vantara shape end-to-end through evaluateCppaRiskGates.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { evaluateCppaRiskGates } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/gate-eval.ts";

const GATE_ID = "G.applicability.sensitive_location";

function outcomeFor(intake: Record<string, unknown>) {
  const outcomes = evaluateCppaRiskGates(intake as never);
  return outcomes.find((o) => o.gate_id === GATE_ID);
}

Deno.test("sensitive-location gate: 'Yes' passes", () => {
  const o = outcomeFor({ sensitive_location_basis: "Yes" });
  assertEquals(o?.outcome, "pass");
});

Deno.test("sensitive-location gate: 'No' blocks", () => {
  const o = outcomeFor({ sensitive_location_basis: "No" });
  assertEquals(o?.outcome, "block");
});

Deno.test("sensitive-location gate: absent field is not_applicable (no q5b either)", () => {
  const o = outcomeFor({});
  assertEquals(o?.outcome, "not_applicable");
});

// The exact live defect: naming a sensitive-location-type SECTOR is no
// longer sufficient. Every one of the retired enum's location-type labels
// must now be treated as a non-engaging, unrecognized string — the field
// is closed to "Yes"/"No" at the contract layer, but the GATE itself must
// also never mistake stray text for an affirmative answer.
Deno.test("sensitive-location gate: retired location-type labels no longer engage the trigger", () => {
  const retiredLabels = [
    "Healthcare facility or medical office",
    "Domestic-violence shelter or family-justice services",
    "Place of worship",
    "School or educational facility",
    "Reproductive- or sexual-health services",
    "Substance-use or mental-health treatment facility",
    "Immigration- or refugee-services facility",
    "Other sensitive location (describe in the intake)",
  ];
  for (const label of retiredLabels) {
    const o = outcomeFor({ sensitive_location_basis: label });
    assertEquals(o?.outcome, "block", `"${label}" must not engage the trigger`);
  }
});

// The live batch scenario, reproduced: a healthcare-sector data processor
// with no presence-inference activity, correctly answering "No" to both
// the (b)(4)/(b)(5) profiling question and the (b)(5) direct question.
Deno.test("sensitive-location gate: Vantara-shape record (health-sector data, no presence inference) does not engage", () => {
  const vantaraIntake = {
    q3_sector: "Healthcare/Life Sciences",
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Health or medical information",
      "Financial information",
      "Employment information",
      "General location (city, region, ZIP, IP-derived)",
      "Device identifiers (IP, cookies, device IDs)",
    ],
    q5b_profiling_observation: "No",
    sensitive_location_basis: "No",
    i1_processing_purpose:
      "Vantara ingests de-identified and re-identified clinical records from hospital EHR systems via HL7 FHIR R4 API feeds to compute readmission risk scores for credentialed care coordination staff.",
  };
  const o = outcomeFor(vantaraIntake);
  assertEquals(o?.outcome, "block", "no presence-based inference is described on this record");
});

// Negative control: the field's own gate must still fire for a record that
// genuinely describes presence-based inference — the fix must not
// over-narrow into never firing at all.
Deno.test("sensitive-location gate: a genuine presence-inference record still engages", () => {
  const geofencingIntake = {
    i1_processing_purpose:
      "The app detects when a device's location matches a reproductive-health clinic and infers a likely health condition to tailor wellness content shown to that user.",
    sensitive_location_basis: "Yes",
  };
  const o = outcomeFor(geofencingIntake);
  assertEquals(o?.outcome, "pass");
});

// The parallel q5b path (a separate, already-correct signal for the SAME
// trigger) must be unaffected by this fix.
Deno.test("sensitive-location gate: the parallel q5b 'sensitive-location presence' signal still engages independently", () => {
  const o = outcomeFor({
    q5b_profiling_observation: "Yes — based on sensitive-location presence",
    sensitive_location_basis: "No",
  });
  assertEquals(o?.outcome, "pass");
});

Deno.test("sensitive-location gate: 'Both' on q5b still engages independently of sensitive_location_basis", () => {
  const o = outcomeFor({
    q5b_profiling_observation: "Both",
    sensitive_location_basis: "No",
  });
  assertEquals(o?.outcome, "pass");
});
