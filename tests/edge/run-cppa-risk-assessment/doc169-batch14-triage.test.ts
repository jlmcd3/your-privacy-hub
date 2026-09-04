// DOC 169 (2026-09-04) — CPPA Risk batch 50b8bcd4 (all-products run) triage.
//
// Fixtures are the REAL intakes of two of the batch's five runs
// (static_stress_jobs.fixture_data, read from the DB and saved verbatim under
// tests/edge/fixtures/batch14/ — MD5-verified against the rows), rendered
// through the live engine + assembler, so each assertion is against the same
// document the customer and the graders saw, after the fix.
//
//   PRODUCT
//   1. Velospan: the executive digest read "…for the safeguard credited
//      against the risk" — the condition names its harm after a colon, not in
//      an "(addresses: …)" suffix, and the compact head dropped it.
//   NOT A PRODUCT ITEM (CEO, 2026-09-04): Velostream's human_review_facts
//      carried BOTH "There is no human review" and a positive review fact. The
//      form makes that option exclusive (CPPARiskAssessment.tsx), so the state
//      can only be authored past the form — a fixture/intake artifact, not an
//      engine defect; the grader is calibrated to classify it as such (DOC 169
//      context item (5)) and the engine is left as it was.
//   HARNESS / INSTRUMENT
//   3. grade-single-assessment (the all-products grader) handed the models
//      the customer document sliced to the 30,000-character legacy budget —
//      roughly the first third of every report; two graders duly reported the
//      report "truncated at § 4.B". Skeleton payload parity + no-slice rule.
//   4. The DOC 165 (1)–(2) and DOC 167 (4), (6) prose calibrations were
//      re-raised in the same words by both graders: cal_skeleton_7/8/9 make
//      them deterministic (skeleton-cal-4 epoch).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRiskFactorEngine } from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import { assembleRiskSkeletonDocument } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import {
  applySkeletonCalibration,
  matchesRule7,
  matchesRule8,
  matchesRule9,
  SKELETON_CAL_RULE_IDS,
  SKELETON_CAL_VERSION,
} from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-calibration.shared.ts";
import {
  buildSkeletonGraderPayload,
  SKELETON_GRADER_BUDGET,
} from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts";
import { buildGraderPayload, GRADER_PAYLOAD_BUDGET } from "../../../supabase/functions/_shared/grader/payload.ts";
import { GRADER_CONTEXT_VERSION, SHARED_GRADER_CONTEXT } from "../../../supabase/functions/_shared/grader/context.ts";
import { blockingContractViolations } from "../../../supabase/functions/run-stress-job/_local/intake-gate.ts";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";

type Bag = Record<string, unknown>;

function fixture(name: string): Bag {
  return JSON.parse(Deno.readTextFileSync(new URL(`../fixtures/batch14/${name}.json`, import.meta.url))) as Bag;
}
const VELOSPAN = fixture("velospan");

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

// ── 1. The executive digest names the harm of a "credited against the risk" condition ─

Deno.test("doc169 — Velospan's executive digest carries (G) on the testing-evidence condition", () => {
  const text = docText(VELOSPAN, [B1, B2]);
  assertRegisterClean(text, "Velospan");
  assert(engine(VELOSPAN, [B1, B2]) && true, "engine output");
  assertStringIncludes(text, "Obtain implementation and testing evidence for the safeguard credited against (G) Reputational harms");
  assert(!text.includes("credited against the risk. The full conditions"), "the head must not drop the harm label");
  assert(!text.includes("against the risk addressing"), "the harm replaces 'the risk'; it is not appended");
  // § 4.D keeps its full form.
  assertStringIncludes(text, "Obtain implementation and testing evidence for the safeguard credited against the risk: (G) Reputational harms");
});

Deno.test("doc169 — planned-safeguard conditions keep the DOC 153/167 'addressing' form", () => {
  const text = docText(VELOSPAN, [B1, B2]);
  assertStringIncludes(text, "Complete implementation of the planned safeguard addressing (C) Impairment of consumer control over personal information and (G) Reputational harms");
});

// ── 1b. Self-contradictory intake is caught by the process that reviews intake ─
//
// CEO (2026-09-04): an intake-data problem is not an engine issue unless a
// process reviews the intake for some purpose — the stress-harness contract
// gate is that process. The form's exclusive options are now on the contract
// and the gate blocks a fixture that carries one beside other selections.

const FORM_EXCLUSIVES: Record<string, string[]> = {
  purpose_specificity_facts: ["None of the above"],
  expectation_check: ["None of the above apply"],
  choice_architecture_check: ["None of the above can be confirmed"],
  human_review_facts: ["None of the above can be confirmed", "There is no human review"],
  admt_testing_facts: ["No testing has been performed or confirmed"],
};

Deno.test("doc169 — the CPPA Risk contract marks exactly the form's exclusive options", () => {
  for (const [key, ex] of Object.entries(FORM_EXCLUSIVES)) {
    const f = cppaRiskContract.fields.find((x) => x.key === key);
    assert(f, `contract lacks ${key}`);
    assertEquals([...(f!.exclusive ?? [])], ex, key);
    for (const o of ex) assert(f!.options!.includes(o), `${key}: exclusive option ${o} is not an option`);
  }
});

Deno.test("doc169 — Velostream's human-review state (exclusive 'no review' beside a positive fact) is a blocking gate violation", () => {
  const out = blockingContractViolations("cppa-risk", {
    entity_name: "Velostream Digital Services, Inc.",
    human_review_facts: ["Reviewers know how to interpret and use the ADMT's output", "There is no human review"],
  });
  assertEquals(out.length, 1, out.join("; "));
  assertStringIncludes(out[0], "human_review_facts: multi-enum exclusive option \"There is no human review\" selected with other options");
});

Deno.test("doc169 — the exclusive option alone, or ordinary selections, pass the gate", () => {
  assertEquals(blockingContractViolations("cppa-risk", { human_review_facts: ["There is no human review"] }), []);
  assertEquals(blockingContractViolations("cppa-risk", { human_review_facts: ["Reviewers know how to interpret and use the ADMT's output", "Reviewers have authority to change or overrule the decision"] }), []);
  assertEquals(blockingContractViolations("cppa-risk", { admt_testing_facts: ["No testing has been performed or confirmed"] }), []);
  const bad = validateIntake(cppaRiskContract, { choice_architecture_check: ["Declining the processing does not degrade the core service the consumer seeks", "None of the above can be confirmed"] });
  assert(bad.violations.some((v) => v.key === "choice_architecture_check" && /exclusive option/.test(v.reason)));
});

Deno.test("doc169 — the grader classifies a self-contradictory intake as a fixture issue, not a product defect", () => {
  assertStringIncludes(SHARED_GRADER_CONTEXT, "A SELF-CONTRADICTORY INTAKE IS A FIXTURE ISSUE, NOT A PRODUCT DEFECT");
  assertStringIncludes(SHARED_GRADER_CONTEXT, "There is no human review");
});

// ── 2. The all-products grader path grades the WHOLE document ────────────────

function bigSkeletonReport(chars: number): Bag {
  const filler = "The Company records the fact stated here. ".repeat(Math.ceil(chars / 43)).slice(0, chars);
  return {
    skeleton_document: {
      title: "CPPA Privacy Risk Assessment",
      subtitle: "Test",
      spine_version: "test",
      sections: [
        { id: "s1", title: "Section 1", paragraphs: [{ kind: "generated", text: filler }] },
        { id: "s4", title: "Section 4", paragraphs: [{ kind: "generated", text: "§ 4.D Conditions to Proceed — TAIL-MARKER-DOC169." }] },
      ],
    },
    other_state: { note: "evidence" },
  };
}

Deno.test("doc169 — the skeleton payload budget is set from the re-measured documents (94,648–115,456 chars)", () => {
  assert(SKELETON_GRADER_BUDGET >= 230_000, `budget ${SKELETON_GRADER_BUDGET} is below 2x the largest measured skeleton document`);
});

Deno.test("doc169 — a 150K-character skeleton document renders whole, with the END OF DOCUMENT trailer", () => {
  const p = buildSkeletonGraderPayload(bigSkeletonReport(150_000), SKELETON_GRADER_BUDGET);
  assertEquals(p.truncated, false);
  assertStringIncludes(p.text, "TAIL-MARKER-DOC169");
  assertStringIncludes(p.text, "=== END OF DOCUMENT — 2 sections, 2 paragraphs; complete, nothing omitted ===");
});

Deno.test("doc169 — the legacy customer-document-first builder never slices the customer document", () => {
  const p = buildGraderPayload(null, bigSkeletonReport(100_000), GRADER_PAYLOAD_BUDGET, { customerDocFirst: true });
  assertEquals(GRADER_PAYLOAD_BUDGET, 30_000, "the legacy budget itself is unchanged");
  assertStringIncludes(p.text, "TAIL-MARKER-DOC169");
  assertEquals(p.truncated, false);
  assert(!p.text.includes("customer document truncated"), "the document is whole; only the evidence may be omitted");
});

// Line endings differ between the files on a Windows checkout (the mirror is
// CRLF, the source LF); parity is judged on content, so both are normalised.
const lf = (s: string) => s.replace(/\r\n/g, "\n");

Deno.test("doc169 — the payload mirror in grade-single-assessment is a verbatim copy of the source after its header", () => {
  const src = lf(Deno.readTextFileSync(new URL("../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts", import.meta.url)));
  const mirror = lf(Deno.readTextFileSync(new URL("../../../supabase/functions/grade-single-assessment/_local/grader/skeleton-payload-mirror.ts", import.meta.url)));
  const body = mirror.split("\n").slice(7).join("\n");
  assertEquals(body, src);
});

Deno.test("doc169 — the calibration mirror carries the same rules 7–9 and the same apply loop as the source", () => {
  const src = lf(Deno.readTextFileSync(new URL("../../../supabase/functions/run-quality-batch/_local/grader/skeleton-calibration.shared.ts", import.meta.url)));
  const copy = lf(Deno.readTextFileSync(new URL("../../../supabase/functions/run-quality-batch/_local/grader/skeleton-calibration.ts", import.meta.url)));
  const mirror = lf(Deno.readTextFileSync(new URL("../../../supabase/functions/grade-single-assessment/_local/grader/skeleton-calibration-mirror.ts", import.meta.url)));
  assertEquals(copy, src, "run-quality-batch's two copies must stay byte-identical");
  const slice = (s: string) => {
    const a = s.indexOf("// RULE 7 ");
    const b = s.indexOf("  return { kept, filtered, counts };");
    assert(a > 0 && b > a, "rule block not found");
    return s.slice(a, b);
  };
  assertEquals(slice(mirror), slice(src));
  assertStringIncludes(mirror, `SKELETON_CAL_VERSION = "${SKELETON_CAL_VERSION}"`);
});

// ── 3. cal_skeleton_7/8/9 — the batch's own evidence strings ─────────────────

const EV_3C_VELOSPAN =
  "The § 3.C transparency analysis contains the sentence: 'The Company confirms symmetric presentation of the permission choice and that declining does not degrade the core service; it does not confirm the absence of steering design elements. Each unconfirmed fact is treated as a live interference risk — and the assessment relies on the choice architecture only to the confirmed extent.' Per DOC 165 item (1), this is the designed confirmed/unconfirmed sentence, but it still reads as formulaic.";
const EV_S1_CLARITEX =
  "Section 1 of the document primarily consists of fixed framework language that is correctly repeated across reports. However, the analysis sections could delve deeper into the specific context of the company's operations and the unique privacy risks identified.";
const EV_S1_VELOSPAN = "The report included a fixed methodology section ('How This Assessment Decides') that repeats framework language across reports.";
const EV_3B_VELOSTREAM =
  "A sentence like 'The necessity analysis is qualified: one element is not shown to be necessary, and that conclusion weighs against the processing in Section 4.' is quite standard and lacks specific tailoring to the unique facts of this case.";
const EV_TRUNC_CLEARPATH =
  "The report is truncated at '§ 4.B. What Weighs For, and What' — the full § 4.B balancing analysis, § 4.C determination, and § 4.D Conditions to Proceed / Follow-Ups are not visible in the graded text.";
const EV_TRUNC_VELOSTREAM =
  "The document is truncated at 'The Balance and the De[...]' — Section 4 containing the full balance, conditions to proceed, follow-ups, and recommendations is cut off.";
const EV_B1_VELOSPAN =
  "The citation of '11 CCR § 7150(b)(1)' does not completely correspond to the justification provided, as it didn't explicitly mention cross-context behavioral advertising as mandated.";

Deno.test("doc169 — cal_skeleton_7 filters the five ratified-frame boilerplate findings of the batch", () => {
  for (const ev of [EV_3C_VELOSPAN, EV_S1_CLARITEX, EV_S1_VELOSPAN, EV_3B_VELOSTREAM]) {
    assert(matchesRule7("rubric_generic_boilerplate", ev), ev.slice(0, 60));
  }
  // Only the boilerplate check is in scope for rule 7.
  assert(!matchesRule7("rubric_actionability", EV_3C_VELOSPAN));
  // A genuine boilerplate complaint about un-ratified filler passes through.
  assert(!matchesRule7("rubric_generic_boilerplate", "Every benefit paragraph repeats 'this benefit is important to the business' with no specific fact."));
});

Deno.test("doc169 — cal_skeleton_8 filters truncation claims, and stands down when the caller knows the payload was cut", () => {
  assert(matchesRule8(EV_TRUNC_CLEARPATH, undefined));
  assert(matchesRule8(EV_TRUNC_VELOSTREAM, true));
  assert(!matchesRule8(EV_TRUNC_CLEARPATH, false), "a payload the caller KNOWS was sliced is not a grader inference");
  // An omission complaint that quotes the passage is not a truncation claim.
  assert(!matchesRule8("§ 4.D lists two Conditions but the Executive Summary says three: 'The determination depends on three Conditions to Proceed'.", undefined));
});

Deno.test("doc169 — cal_skeleton_9 filters the § 7150(b)(1) 'does not mention cross-context behavioral advertising' citation finding", () => {
  assert(matchesRule9("rubric_citation_misapplied", EV_B1_VELOSPAN));
  assert(!matchesRule9("rubric_generic_boilerplate", EV_B1_VELOSPAN));
  assert(!matchesRule9("rubric_citation_misapplied", "The report cites § 7150(b)(3) for a decision that is advertising-only under § 7001(ddd)(6)."));
});

Deno.test("doc169 — applySkeletonCalibration routes the batch's findings to rules 7, 8 and 9 and keeps a genuine finding", () => {
  const findings = [
    { check_id: "rubric_generic_boilerplate", dimension: "analysis", severity: "medium", passed: false, evidence: EV_3C_VELOSPAN },
    { check_id: "rubric_generic_boilerplate", dimension: "analysis", severity: "medium", passed: false, evidence: EV_S1_CLARITEX },
    { check_id: "rubric_actionability", dimension: "intelligence", severity: "medium", passed: false, evidence: EV_TRUNC_CLEARPATH },
    { check_id: "rubric_citation_misapplied", dimension: "citation", severity: "high", passed: false, evidence: EV_B1_VELOSPAN },
    { check_id: "rubric_unsupported_business_claim", dimension: "hallucination", severity: "medium", passed: false, evidence: "The report states the Company was fined in 2024; no such fact is in the intake." },
  ];
  const { kept, filtered, counts } = applySkeletonCalibration(findings, { report: {}, payloadComplete: true });
  assertEquals(counts.cal_skeleton_7, 2);
  assertEquals(counts.cal_skeleton_8, 1);
  assertEquals(counts.cal_skeleton_9, 1);
  assertEquals(filtered.length, 4);
  assertEquals(kept.length, 1);
  assertEquals(kept[0].check_id, "rubric_unsupported_business_claim");
  // With the payload known to be sliced, the truncation finding survives.
  const cut = applySkeletonCalibration(findings, { report: {}, payloadComplete: false });
  assertEquals(cut.counts.cal_skeleton_8, 0);
  assertEquals(cut.kept.length, 2);
});

Deno.test("doc169 — rules 7–9 are registered and stamped under the kept prefix (doc-149 INSTRUMENT RULE)", () => {
  for (const id of ["cal_skeleton_7", "cal_skeleton_8", "cal_skeleton_9"]) assert(SKELETON_CAL_RULE_IDS.includes(id as never));
  assertEquals(SKELETON_CAL_VERSION, "gc-2026-08-28-skeleton-cal-3-item204", "the epoch prefix is kept; rules are appended");
  assert(GRADER_CONTEXT_VERSION.startsWith(SKELETON_CAL_VERSION));
  for (const id of SKELETON_CAL_RULE_IDS) assert(GRADER_CONTEXT_VERSION.includes(id));
  assertStringIncludes(GRADER_CONTEXT_VERSION, "+skeleton-cal-4-doc169[cal_skeleton_7|cal_skeleton_8|cal_skeleton_9]");
  assertStringIncludes(GRADER_CONTEXT_VERSION, "+batch14-cal-2026-09-04");
  assert(GRADER_CONTEXT_VERSION.indexOf("+batch13-cal-2026-09-04") < GRADER_CONTEXT_VERSION.indexOf("+skeleton-cal-4-doc169"), "tags append in order");
});
