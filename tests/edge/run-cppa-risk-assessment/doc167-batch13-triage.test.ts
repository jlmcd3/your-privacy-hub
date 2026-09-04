// DOC 167 (2026-09-04) — CPPA Risk batch 52f83146 ("A-Team Batch 13") triage.
//
// Every fixture below is the REAL intake of the batch's three runs
// (static_stress_jobs.fixture_data, read from the DB, saved verbatim under
// tests/edge/fixtures/batch13/), rendered through the live engine + assembler
// — so each assertion is against the same document the customer and the
// graders saw, after the fix. Findings verified against the rendered PDFs:
//
//   1. § 3.E "The Company's description also characterizes the system as
//      making a significant decision" rendered on two records whose
//      description expressly DISCLAIMED one (negation-blind regex).
//   2. NestGrid rendered no timing state at all (§ 5.B, Key Dates) and no
//      § 5.D retention conclusion: processing_status is optional and was
//      blank, and both derivations gated on it with `return null`.
//   3. No record ever drew the Follow-Up that § 5.B's "determination pending
//      — record when the covered processing began" instructs.
//   4. NestWave's executive digest read "(C) … and (G) … and (C) …": the
//      compact composer deduped whole "addresses" strings, not harm labels.
//   5. The same planned disclosure rendered as part of a Condition AND as a
//      Recommendation (NestGrid, Luminary); NestWave's is the deliberate
//      partial-overlap case that keeps its distinct Recommendation.
//   6. NestGrid's "share for advertising only" answer drew no scope /
//      recipient Follow-Up: a utility partner receiving "aggregated,
//      anonymized" telemetry counted as the advertising recipient, and the
//      word "sharing" in "sharing anonymized, aggregated usage statistics"
//      counted as the Purpose describing advertising sharing.
//   7. Payment facts (sources, retention) inside a telemetry Activity whose
//      Purpose describes no payment processing drew no scope question.
//   8. "no testing or effectiveness evidence" on a safeguard whose own text
//      reports semi-annual tabletop exercises.
//   9. Appendix E "trained using personal information — No" beside a
//      training source described as pseudonymized / aggregated, with no
//      reconciliation (the "No" is the Company's own answer and is kept).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  admtTrainingPiReconcileNeeded,
  disclosureCarriedBySafeguard,
  paymentScopeFor,
  runRiskFactorEngine,
  safeguardReportsTesting,
} from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import { assembleRiskSkeletonDocument } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { claimsSignificantDecisionUnnegated } from "../../../supabase/functions/_shared/ltp/admt-significant-decision.ts";
import {
  deriveAssessmentRetentionEnd,
  deriveInitialAssessmentDeadline,
  initialAssessmentDeadlinePending,
} from "../../../supabase/functions/_shared/ltp/risk-timing.ts";

type Bag = Record<string, unknown>;

function fixture(name: string): Bag {
  return JSON.parse(Deno.readTextFileSync(new URL(`../fixtures/batch13/${name}.json`, import.meta.url))) as Bag;
}
const NESTGRID = fixture("nestgrid");
const NESTWAVE = fixture("nestwave");
const LUMINARY = fixture("luminary");

const B1 = "Engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";
const B2 = "Engaged — 11 CCR § 7150(b)(2) (processing sensitive personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";
const DATE = "2026-09-04";

function docText(intake: Bag, scope: string[]): string {
  const res = assembleRiskSkeletonDocument({ scope_and_triggers: { narrative: scope } } as never, intake as never);
  return skeletonDocumentToText(res.document);
}
function engine(intake: Bag, scope: string[]) {
  return runRiskFactorEngine(intake as never, { scope_and_triggers: { narrative: scope } } as never, DATE) as unknown as Bag;
}

const BANNED = [
  "the record shows", "the record reflects", "the record indicates", "the record demonstrates",
  "the record establishes", "on this record",
];
function assertRegisterClean(text: string, label: string) {
  const lower = text.toLowerCase();
  for (const b of BANNED) assert(!lower.includes(b), `${label}: banned register phrase "${b}"`);
}

// ── 1. Significant-decision characterization is negation-aware ─────────────

Deno.test("doc167 — an express disclaimer is not a self-characterization (NestGrid, Luminary wording)", () => {
  assertEquals(claimsSignificantDecisionUnnegated(String(NESTGRID.q19_admt_description)), false);
  assertEquals(claimsSignificantDecisionUnnegated(String(LUMINARY.q19_admt_description)), false);
  assertEquals(claimsSignificantDecisionUnnegated("The engine does not make a significant decision about any consumer."), false);
  assertEquals(claimsSignificantDecisionUnnegated(""), false);
});

Deno.test("doc167 — an affirmative claim still counts, including beside an unrelated disclaimer", () => {
  assertEquals(claimsSignificantDecisionUnnegated("The system makes a significant decision on each credit application."), true);
  assertEquals(
    claimsSignificantDecisionUnnegated("No housing decisions are involved. The tool makes a significant decision about loan eligibility."),
    true,
  );
});

Deno.test("doc167 — NestGrid and Luminary § 3.E no longer attribute a significant-decision characterization to the Company", () => {
  for (const [label, intake, scope] of [["NestGrid", NESTGRID, [B1, B2]], ["Luminary", LUMINARY, [B1, B2]]] as const) {
    const text = docText(intake, [...scope]);
    assert(!text.includes("also characterizes the system as making a significant decision"), `${label}: inverted attribution still renders`);
    assertStringIncludes(text, "The Company identifies the system as:");
  }
});

// ── 2–3. Timing and retention fail soft on a blank processing status ────────

Deno.test("doc167 — a blank processing_status yields the pending deadline, never null (NestGrid)", () => {
  assertEquals(String(NESTGRID.processing_status ?? ""), "");
  const d = deriveInitialAssessmentDeadline(NESTGRID);
  assert(d !== null && d.includes("determination pending — record when the covered processing began"), String(d));
  assertEquals(initialAssessmentDeadlinePending(NESTGRID), true);
  assertEquals(initialAssessmentDeadlinePending({ processing_status: "Ongoing", processing_start_date: "2025-03-01" }), false);
  assertEquals(initialAssessmentDeadlinePending({ processing_status: "Planned — not yet started" }), false);
});

Deno.test("doc167 — retention end: blank status states the open question; Ongoing and Discontinued are unchanged", () => {
  const blank = deriveAssessmentRetentionEnd({});
  assert(blank !== null && blank.includes("Whether the processing is ongoing or discontinued is not recorded"), String(blank));
  assert(!blank!.includes("processing continues"), "a blank status must not assert that the processing continues");
  assertStringIncludes(String(deriveAssessmentRetentionEnd({ processing_status: "Ongoing" })), "Because the processing continues");
  assertStringIncludes(String(deriveAssessmentRetentionEnd({ processing_status: "Discontinued" })), "recorded as discontinued");
});

Deno.test("doc167 — NestGrid now renders § 5.B pending state, the § 5.D retention sentence, and the completing Follow-Up", () => {
  const text = docText(NESTGRID, [B1, B2]);
  assertStringIncludes(text, "determination pending — record when the covered processing began");
  assertStringIncludes(text, "Whether the processing is ongoing or discontinued is not recorded");
  assertStringIncludes(text, "Record when the covered processing began, or will begin; § 7155(a)(1)");
});

Deno.test("doc167 — the timing Follow-Up completes the pending state on the records that already rendered it (NestWave, Luminary)", () => {
  for (const [intake, scope] of [[NESTWAVE, [B2]], [LUMINARY, [B1, B2]]] as const) {
    const text = docText(intake, [...scope]);
    assertStringIncludes(text, "determination pending — record when the covered processing began");
    assertStringIncludes(text, "Record when the covered processing began, or will begin; § 7155(a)(1)");
  }
});

// ── 4. Executive digest dedupes harm labels, not whole strings ─────────────

Deno.test("doc167 — NestWave's compact Conditions digest lists each harm once", () => {
  const text = docText(NESTWAVE, [B2]);
  assert(!text.includes("and (G) Reputational harms and (C) Impairment"), "harm arrays must not be concatenated");
  assertStringIncludes(text, "(two conditions, addressing (C) Impairment of consumer control over personal information and (G) Reputational harms)");
});

// ── 5. One customer action, one class ──────────────────────────────────────

Deno.test("doc167 — disclosure/safeguard overlap: the two clear duplicates are carried; NestWave's vendor-naming disclosure is not", () => {
  const g = (i: Bag, n: number) => String((i.a6_safeguards as Bag[])[n].safeguard);
  const d = (i: Bag, n: number) => String((i.activity_disclosures as Bag[])[n].disclosure_content);
  assertEquals(disclosureCarriedBySafeguard(d(NESTGRID, 1), g(NESTGRID, 1)), true);
  assertEquals(disclosureCarriedBySafeguard(d(LUMINARY, 1), g(LUMINARY, 1)), true);
  assertEquals(disclosureCarriedBySafeguard(d(NESTWAVE, 1), g(NESTWAVE, 2)), false);
  assertEquals(disclosureCarriedBySafeguard("Publish an annual transparency report.", g(NESTGRID, 1)), false);
  assertEquals(disclosureCarriedBySafeguard("", g(NESTGRID, 1)), false);
});

Deno.test("doc167 — NestGrid and Luminary no longer render the carried disclosure as a Recommendation; § 3.C points at the Condition", () => {
  const ng = docText(NESTGRID, [B1, B2]);
  assert(!ng.includes("Complete the planned disclosure “An updated just-in-time notice"), "NestGrid duplicate Recommendation still renders");
  assertStringIncludes(ng, "carried within a planned safeguard whose completion is a Condition in § 4.D");
  const lu = docText(LUMINARY, [B1, B2]);
  assert(!lu.includes("Complete the planned disclosure “Retroactive in-app notice"), "Luminary duplicate Recommendation still renders");
  assertStringIncludes(lu, "carried within a planned safeguard whose completion is a Condition in § 4.D");
});

Deno.test("doc167 — NestWave keeps its distinct planned-disclosure Recommendation and the Recommendations pointer", () => {
  const text = docText(NESTWAVE, [B2]);
  assertStringIncludes(text, "Complete the planned disclosure “An updated privacy policy section will explicitly name Segment");
  assertStringIncludes(text, "completion appears among the Recommendations in § 4.D");
});

// ── 6. Advertising-sharing scope reconciliation (NestGrid) ──────────────────

Deno.test("doc167 — NestGrid draws the recipient-completion AND scope-confirmation Follow-Ups; the trigger stays engaged", () => {
  const text = docText(NESTGRID, [B1, B2]);
  assertStringIncludes(text, "§ 7150(b)(1) — selling or sharing personal information — is engaged");
  assertStringIncludes(text, "but no recipient of that sharing — a third party, or a recipient whose stated purpose is advertising — appears among the recipients recorded for the Activity, and the Company’s stated purpose does not describe it");
  assertStringIncludes(text, "Identify the recipient or recipient category, the personal information made available, and the purpose for the sharing the Company reports");
  assertStringIncludes(text, "Confirm that the sharing of personal information the Company reports (“Yes — share for advertising only”) forms part of this Activity, or scope it as a separate processing activity");
});

Deno.test("doc167 — Luminary's scope Follow-Up is unchanged (its DSP recipient is an advertising recipient)", () => {
  const text = docText(LUMINARY, [B1, B2]);
  assertStringIncludes(text, "Confirm that the sharing of personal information the Company reports (“Yes — share for advertising only”) forms part of this Activity");
  assert(!text.includes("but no recipient of that sharing"), "Luminary has an advertising recipient; the no-recipient branch must not fire");
});

// ── 7. Payment scope ──────────────────────────────────────────────────────

Deno.test("doc167 — payment cues are read from Activity facts, never from the vendor list alone", () => {
  const ng = paymentScopeFor(NESTGRID);
  assert(ng && ng.sourceCue, "NestGrid: payment processors in sources must be a cue");
  assertEquals(paymentScopeFor(NESTWAVE), null);
  assertEquals(paymentScopeFor(LUMINARY), null);
  assertEquals(paymentScopeFor({ ...NESTGRID, primary_activity_purpose: "Process subscription payments and billing for the smart home service." }), null);
});

Deno.test("doc167 — NestGrid renders the payment-scope Follow-Up and the § 2.E pointer", () => {
  const text = docText(NESTGRID, [B1, B2]);
  assertStringIncludes(text, "Confirm whether the payment or billing processing the information provided records");
  assertStringIncludes(text, "The stated purpose does not describe the payment processing those sources include");
});

// ── 8. Testing-state precision ────────────────────────────────────────────

Deno.test("doc167 — reported testing is acknowledged; the ask names the missing results", () => {
  const g = (NESTGRID.a6_safeguards as Bag[])[2];
  assertEquals(safeguardReportsTesting(g), true);
  assertEquals(safeguardReportsTesting({ ...g, safeguard_status: "Implemented and tested" }), false);
  assertEquals(safeguardReportsTesting({ safeguard_status: "Implemented, not tested", safeguard: "Access is restricted to the security team." }), false);
  const text = docText(NESTGRID, [B1, B2]);
  assertStringIncludes(text, "the Company reports that testing takes place, but the information provided includes no testing results or effectiveness evidence");
  assertStringIncludes(text, "Obtain and record the results or effectiveness evidence from the testing the Company reports for the safeguard credited against the risk: (G) Reputational harms");
  assert(!text.includes("Obtain implementation and testing evidence for the safeguard credited against the risk: (G)"), "old wording must not co-render");
  assertStringIncludes(text, "Do Not Proceed");
});

// ── 9. Appendix E training-data classification ─────────────────────────────

Deno.test("doc167 — pseudonymized / aggregated training data beside a 'No' draws the reconciliation; deidentified does not", () => {
  assertEquals(admtTrainingPiReconcileNeeded(NESTWAVE), true);
  assertEquals(admtTrainingPiReconcileNeeded(LUMINARY), true);
  assertEquals(admtTrainingPiReconcileNeeded(NESTGRID), false);
  assertEquals(
    admtTrainingPiReconcileNeeded({ admt_provider_trained_using_pi: "No", i5_admt_training_source: "Training data is deidentified to the § 1798.140(m) standard before use." }),
    false,
  );
  assertEquals(admtTrainingPiReconcileNeeded({ admt_provider_trained_using_pi: "Yes", i5_admt_training_source: "pseudonymized logs" }), false);
});

Deno.test("doc167 — NestWave and Luminary render the § 3.E sentence, the Follow-Up, and the Appendix E pointer; the Company's answer is kept", () => {
  for (const [intake, scope] of [[NESTWAVE, [B2]], [LUMINARY, [B1, B2]]] as const) {
    const text = docText(intake, [...scope]);
    assertStringIncludes(text, "while answering that the technology is not trained using personal information, and reconciling the two appears among the Follow-Ups in § 4.D");
    assertStringIncludes(text, "Reconcile the answer that the technology is not trained using personal information with the recorded training-data source");
    assertStringIncludes(text, "§ 1798.140(aa)");
    assertStringIncludes(text, "§ 1798.140(v)(3)");
    assertStringIncludes(text, "No — reconciliation pending (Follow-Ups, § 4.D)");
  }
});

// ── Whole-document hygiene on all three real fixtures ─────────────────────

Deno.test("doc167 — the three batch fixtures render register-clean with conditions and follow-ups populated", () => {
  for (const [label, intake, scope] of [["NestGrid", NESTGRID, [B1, B2]], ["NestWave", NESTWAVE, [B2]], ["Luminary", LUMINARY, [B1, B2]]] as const) {
    const text = docText(intake, [...scope]);
    assertRegisterClean(text, label);
    assertStringIncludes(text, "Follow-Ups.");
    const e = engine(intake, [...scope]);
    assert(e && typeof e === "object", `${label}: engine output`);
  }
});

// ── Grader instrument ──────────────────────────────────────────────────────

Deno.test("doc167 — the grader instrument carries the batch-13 calibration tag and block", async () => {
  const { GRADER_CONTEXT_VERSION, SHARED_GRADER_CONTEXT } = await import("../../../supabase/functions/_shared/grader/context.ts");
  assert(GRADER_CONTEXT_VERSION.includes("+batch13-cal-2026-09-04"), GRADER_CONTEXT_VERSION);
  assert(GRADER_CONTEXT_VERSION.startsWith("gc-2026-08-28-skeleton-cal-3-item204"), "skeleton-cal prefix must be kept");
  assertStringIncludes(SHARED_GRADER_CONTEXT, "DOC 167 (batch-52f83146");
  assertStringIncludes(SHARED_GRADER_CONTEXT, "IS SENSITIVE PERSONAL INFORMATION");
});
