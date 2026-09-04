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
//   6. NestGrid's "share for advertising only" answer drew no recipient
//      Follow-Up: a utility partner receiving "aggregated, anonymized"
//      telemetry counted as the advertising recipient. CEO RULING (doc 167
//      §C.2.7): the Purpose text's silence about the sharing is NOT a scope
//      question once q5 identifies the sharing — the doc-153 purpose test and
//      its "confirm that the sharing forms part of this Activity" Follow-Up
//      are retired; the § 7152(a)(3)(F) recipient record is the only
//      completing object.
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
  // Ratification criterion: § 7155(c) is one later-of rule; a blank status
  // leaves the END DATE undeterminable, never "which rule governs".
  assertStringIncludes(blank!, "the later-of rule above governs in either case");
  assert(!blank!.includes("which retention rule governs"), "must not frame the later-of rule as a choice between rules");
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

Deno.test("doc167 — NestGrid draws the § 7152(a)(3)(F) recipient-completion Follow-Up; the trigger stays engaged; no Purpose-based scope question (CEO ruling)", () => {
  const text = docText(NESTGRID, [B1, B2]);
  assertStringIncludes(text, "§ 7150(b)(1) — selling or sharing personal information — is engaged");
  assertStringIncludes(text, "but no recipient of that sharing — a third party receiving personal information rather than information the Company describes as aggregated, anonymized, or de-identified, or a recipient whose stated purpose is advertising — appears among the recipients recorded for the Activity; completing the recipient record appears among the Follow-Ups in § 4.D.");
  assertStringIncludes(text, "Identify the recipient or recipient category, the personal information made available, and the purpose for the sharing the Company reports");
  // The retired SHARING sentences specifically — the payment-scope Follow-Up
  // legitimately keeps its own "the stated purpose does not describe it".
  assert(!text.includes("appears among the recipients recorded for the Activity, and the Company’s stated purpose does not describe it"), "the retired purpose-silent clause must not render");
  assert(!text.includes("stated purpose does not itself describe the sharing"), "the retired purpose-silent branch must not render");
  assert(!text.includes("Confirm that the sharing of personal information the Company reports"), "the retired scope-confirmation Follow-Up must not render");
});

Deno.test("doc167 — Luminary records an advertising recipient, so no sharing gap sentence and no scope Follow-Up render (CEO ruling)", () => {
  const text = docText(LUMINARY, [B1, B2]);
  assertStringIncludes(text, "§ 7150(b)(1) — selling or sharing personal information — is engaged");
  assert(!text.includes("but no recipient of that sharing"), "Luminary has an advertising recipient; the no-recipient branch must not fire");
  assert(!text.includes("stated purpose does not itself describe the sharing"), "the retired purpose-silent branch must not render");
  assert(!text.includes("Confirm that the sharing of personal information the Company reports"), "the retired scope-confirmation Follow-Up must not render");
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
  assertStringIncludes(text, "Confirm whether the payment or billing processing recorded in the information provided");
  assertStringIncludes(text, "the assessment treats the payment facts it records as part of the Activity on the information provided");
  assert(!text.includes("only if it does"), "the Follow-Up must not promise a conditional removal the generator does not perform");
  assertStringIncludes(text, "The stated purpose does not describe the payment processing those sources include");
});

// ── 8. Testing-state precision ────────────────────────────────────────────

Deno.test("doc167 — reported testing is acknowledged; the ask names the missing results", () => {
  const g = (NESTGRID.a6_safeguards as Bag[])[2];
  assertEquals(safeguardReportsTesting(g), true);
  assertEquals(safeguardReportsTesting({ ...g, safeguard_status: "Implemented and tested" }), false);
  assertEquals(safeguardReportsTesting({ safeguard_status: "Implemented, not tested", safeguard: "Access is restricted to the security team." }), false);
  // Ratification criteria (doc 167 §C.2): negation-aware, and no bare
  // "exercise" / "audit" cue — privacy text uses both for other things.
  assertEquals(safeguardReportsTesting({ safeguard_status: "Implemented, not tested", safeguard: "The incident response plan has not been tested." }), false);
  assertEquals(safeguardReportsTesting({ safeguard_status: "Implemented, not tested", safeguard: "Consumers may exercise their opt-out at any time; audit logs are retained." }), false);
  assertEquals(safeguardReportsTesting({ safeguard_status: "Implemented, not tested", safeguard: "Annual penetration testing is performed by an external firm." }), true);
  const text = docText(NESTGRID, [B1, B2]);
  assertStringIncludes(text, "the Company describes testing, but the information provided includes no testing results or effectiveness evidence");
  assertStringIncludes(text, "Obtain and record the results or effectiveness evidence of the testing the Company describes for the safeguard credited against the risk: (G) Reputational harms");
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
    // The § 3.E sentence quotes the Company's own cue word(s), never a fixed pair.
    assertStringIncludes(text, "the Company describes that source as “");
    assert(!text.includes("as pseudonymized or aggregated while"), "fixed cue pair must not render");
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
