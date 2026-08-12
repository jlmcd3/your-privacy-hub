// PROMPT 8J (CEO-ruled 2026-08-12) — batch de4e4623 / run c3762c61 fixes.
//  1. alternatives_considered is never dropped by operation routing.
//  2. dpoRecommendsConsultation requires a positive, un-negated stance.
//  3. the balancing/proportionality impact reader also reads
//     data_subjects_views, residual_risks and potential-harm content.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildLegalBasis,
  buildNecessityFindings,
  buildProportionality,
  dpoRecommendsConsultation,
} from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";

const BASE = {
  processing_activity_name: "Return-to-work review scheduling",
  purpose: "To schedule occupational-health return-to-work reviews for staff returning from long-term sick leave.",
  data_subjects: "Employees returning from long-term sick leave",
  jurisdictions: ["EU (GDPR)"],
  data_categories: ["Contact details"],
  existing_safeguards: ["Access controls", "Staff training"],
  necessity_proportionality:
    "The scheduling has an impact on the data subjects because it affects the employees concerned and touches their reasonable expectations at work.",
  legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
};

// ── item 1 — alternatives are never dropped ─────────────────────────────
const FREE_TEXT_ALTS = [
  {
    processing_operation: "Scheduling occupational health appointments",
    alternative: "Manual scheduling from paper certificates",
    rejection_reason: "Cannot deliver the review within the statutory window at the recorded volume.",
  },
];

Deno.test("8J/1: free-text operation names land on primary and the necessity test runs against them", () => {
  const intake = { ...BASE, alternatives_considered: FREE_TEXT_ALTS };
  const [n] = buildNecessityFindings(intake);
  assertEquals(n.operation_id, "op_primary");
  assert(
    n.why.includes("Manual scheduling from paper certificates"),
    "the customer's alternative must appear in the necessity analysis",
  );
  assert(!n.why.includes("no alternative means are recorded as considered"), n.why);

  const [f] = buildLegalBasis(intake);
  assertEquals(f.legitimate_interests_test?.necessity_test_met, true);
});

Deno.test("8J/1: exact operation_label still routes", () => {
  const intake = {
    ...BASE,
    alternatives_considered: [
      { ...FREE_TEXT_ALTS[0], processing_operation: BASE.processing_activity_name },
    ],
  };
  const [n] = buildNecessityFindings(intake);
  assert(n.why.includes("Manual scheduling from paper certificates"));
});

Deno.test("8J/1: a 'primary'-containing value still routes primary", () => {
  const intake = {
    ...BASE,
    secondary_uses: "Aggregated absence-trend reporting for the HR leadership team.",
    alternatives_considered: [{ ...FREE_TEXT_ALTS[0], processing_operation: "primary operation" }],
  };
  const [prim, sec] = buildNecessityFindings(intake);
  assertEquals(prim.operation_id, "op_primary");
  assert(prim.why.includes("Manual scheduling from paper certificates"));
  assert(!sec.why.includes("Manual scheduling from paper certificates"));
});

Deno.test("8J/1: a value overlapping the secondary label routes secondary", () => {
  const intake = {
    ...BASE,
    secondary_uses: "Aggregated absence-trend reporting for the HR leadership team.",
    alternatives_considered: [
      {
        processing_operation: "Return-to-work review scheduling — secondary use",
        alternative: "Reporting from anonymised aggregates only",
        rejection_reason: "Cannot support the case-level follow-up the statutory window requires.",
      },
    ],
  };
  const [prim, sec] = buildNecessityFindings(intake);
  assertEquals(sec.operation_id, "op_secondary");
  assert(sec.why.includes("Reporting from anonymised aggregates only"));
  assert(!prim.why.includes("Reporting from anonymised aggregates only"));
});

// ── item 2 — DPO consultation negation guard ────────────────────────────
const FAIRWEATHER =
  "The data protection officer reviewed the assessment and concluded that the residual risks " +
  "do not meet the threshold for prior consultation with the ICO under Article 36.";

Deno.test("8J/2: doc-4 Fairweather advice (threshold not met) → false", () => {
  assertEquals(dpoRecommendsConsultation(FAIRWEATHER), false);
});

Deno.test("8J/2: a positive recommendation → true", () => {
  assert(
    dpoRecommendsConsultation(
      "The DPO recommended prior consultation with the Autoriteit Persoonsgegevens before go-live.",
    ),
  );
});

Deno.test("8J/2: 'advised against consulting the ICO' → false", () => {
  assertEquals(
    dpoRecommendsConsultation("The DPO advised against consulting the ICO on this processing."),
    false,
  );
});

Deno.test("8J/2: reverse order with a modal stance → true", () => {
  assert(dpoRecommendsConsultation("The CNIL should be consulted before go-live."));
});

Deno.test("8J/2: internal consultation only → false", () => {
  assertEquals(dpoRecommendsConsultation("The project team consulted the DPO in April."), false);
});

// ── item 3 — impact reader scope ────────────────────────────────────────
const DOC3 = {
  ...BASE,
  necessity_proportionality:
    "The scheduling enables the occupational-health review to take place inside the statutory window.",
  data_minimisation_justification: "Only the fields needed to book the appointment are collected.",
  data_subjects_views:
    "Staff representatives said the scheduling affects the employees concerned and cuts across their reasonable expectations of privacy at work.",
  residual_risks:
    "A remaining risk to the data subjects is that an appointment record discloses an absence reason to a line manager.",
  alternatives_considered: FREE_TEXT_ALTS,
};

Deno.test("8J/3: impact described in residual_risks / data_subjects_views counts as described", () => {
  const [f] = buildLegalBasis(DOC3);
  assertEquals(f.legitimate_interests_test?.balancing_test_met, true);
  assert(!f.legitimate_interests_test?.balancing_test_why.includes("does not describe the impact"));

  const [p] = buildProportionality(DOC3);
  assertEquals(p.argued_both_directions, true);
  assert(!p.why.includes("the impact on the data subjects is not described on this record"));
});

Deno.test("8J/3: impact nowhere on the record → unchanged behaviour", () => {
  const intake = {
    ...DOC3,
    data_subjects_views: "Staff representatives were briefed on the timetable.",
    residual_risks: "",
  };
  const [f] = buildLegalBasis(intake);
  assertEquals(f.legitimate_interests_test?.balancing_test_met, false);
  assert(f.legitimate_interests_test?.balancing_test_why.includes("does not describe the impact"));

  const [p] = buildProportionality(intake);
  assertEquals(p.argued_both_directions, false);
});
