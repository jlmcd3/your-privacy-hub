// LIA CONVERSION L1-B/L2/L3 BATTERY (2026-08-26). Pins the typed
// three-part test's verdict table, the ePrivacy hard-gate outcome
// override, the typed classification and documentation builders, and the
// v2 skeleton assembly (Persuasive Authority section, precedent sentence,
// AOW gating, ToA trail) — plus the model path's byte-freeze: with
// deterministic:false nothing new renders.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildClassificationTyped,
  buildDocumentationTyped,
  buildThreePartTestTyped,
  LIA_EPRIVACY_RULE_SENTENCE,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { attachLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import {
  assembleLiaSkeletonDocument,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/_shared/golden/lia-perfect-pinned.ts";

type Bag = Record<string, unknown>;

/** The deterministic path's attach order, reproduced for the harness. */
function typedReportFor(intake: Bag): Bag {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  if (typed.determination_override) report.lia_determination = typed.determination_override;
  report.information_needed = typed.information_needed;
  report.documentation_recommendations = buildDocumentationTyped(report, "Test disclaimer.");
  return report;
}

function verdicts(report: Bag) {
  const tpt = report.three_part_test as Bag;
  return {
    purpose: (tpt.purpose_test as Bag).verdict,
    necessity: (tpt.necessity_test as Bag).verdict,
    balancing: (tpt.balancing_test as Bag).verdict,
    outcome: (report.lia_determination as Bag).outcome,
  };
}

// ── The verdict table over the pinned perfect fixtures ──────────────────────

Deno.test("L1-B — the clean perfect fixture: all three tests resolve and cohere with the determination", () => {
  const clean = LIA_PERFECT_PINNED[0].intake as Bag;
  const r = typedReportFor(clean);
  const v = verdicts(r);
  assertEquals(v.purpose, "passes");
  assertEquals(v.necessity, "passes");
  // Coherence law: the balancing verdict and the outcome move together.
  if (v.outcome === "legitimate_interests_available") assertEquals(v.balancing, "likely_passes");
  if (v.outcome === "available_only_with_mitigations") assertEquals(v.balancing, "likely_fails");
  // Every test carries a non-empty analysis for the UI cards.
  const tpt = r.three_part_test as Bag;
  for (const k of ["purpose_test", "necessity_test", "balancing_test"] as const) {
    assert(String((tpt[k] as Bag).analysis).length > 0, `${k}.analysis empty`);
  }
  // The overall assessment carries the registered contract fields.
  const oa = (tpt.overall_assessment as Bag);
  assert(["strong", "moderate", "weak", "insufficient", "uncertain"].includes(String(oa.argument_strength)));
  assert(String(oa.argument_strength_note).length > 0);
  assert(String(oa.closest_accepted_precedent).length > 0);
  assert(String(oa.closest_rejected_precedent).length > 0);
});

Deno.test("L1-B — both perfect fixtures are deterministic: two builds byte-identical", () => {
  for (const c of LIA_PERFECT_PINNED) {
    const a = JSON.stringify(typedReportFor(c.intake as Bag).three_part_test);
    const b = JSON.stringify(typedReportFor(c.intake as Bag).three_part_test);
    assertEquals(a, b, c.id);
  }
});

Deno.test("L1-B — necessity degrades to uncertain (never fails) when the comparison is absent", () => {
  const clean = structuredClone(LIA_PERFECT_PINNED[0].intake) as Bag;
  // DOC 142 — the verdict now reads the typed per-alternative comparison
  // (buildAlternativesConsidered), which also parses alternatives_rationale
  // and why_consent_not_used; for the comparison to be absent, every field
  // that feeds it must be blank, not just the two alternatives lists.
  (clean.necessity_details as Bag).alternatives = "";
  (clean.necessity_details as Bag).alternatives_rationale = "";
  (clean.necessity_details as Bag).why_consent_not_used = "";
  clean.alternatives_considered = "";
  const v = verdicts(typedReportFor(clean));
  assertEquals(v.necessity, "uncertain");
  assertEquals(v.outcome, "undetermined_on_the_record");
});

Deno.test("L1-B — the ePrivacy hard gate: cold-email processing forecloses the outcome, whatever the balance", () => {
  const intake = structuredClone(LIA_PERFECT_PINNED[0].intake) as Bag;
  intake.processing_description =
    "We send unsolicited marketing emails to prospects scraped from public directories to promote our services.";
  const r = typedReportFor(intake);
  const v = verdicts(r);
  assertEquals(v.outcome, "legitimate_interests_not_available");
  const why = String((r.lia_determination as Bag).why);
  assertStringIncludes(why, LIA_EPRIVACY_RULE_SENTENCE);
  // Once, not doubled (the gate's application already carries the rule).
  assertEquals(why.split(LIA_EPRIVACY_RULE_SENTENCE).length - 1, 1);
});

Deno.test("L1-A — typed classification: shape and enum-membership reads", () => {
  const clean = LIA_PERFECT_PINNED[0].intake as Bag;
  const c = buildClassificationTyped(clean);
  assert(typeof c.use_case_category === "string" && c.use_case_category.length > 0);
  assertEquals(c.jurisdictions_scope, clean.jurisdictions);
  assertEquals(c.primary_data_categories, clean.data_categories);
  assertEquals(typeof c.special_category_data, "boolean");
  assertEquals(typeof c.relationship_exists, "boolean");
});

Deno.test("L1-B — typed documentation: the two mandatory documents always present", () => {
  const r = typedReportFor(LIA_PERFECT_PINNED[0].intake as Bag);
  const docs = r.documentation_recommendations as Bag;
  const names = (docs.recommended_documentation as Bag[]).map((d) => String(d.document));
  assert(names.length >= 2 && names.length <= 4, `expected 2-4 documents, got ${names.length}`);
  assertStringIncludes(names.join(" | "), "Balancing Record");
  assertStringIncludes(names.join(" | "), "Notice");
  assert(Array.isArray(docs.review_triggers) && (docs.review_triggers as unknown[]).length > 0);
});

// ── L2 — the v2 skeleton assembly ───────────────────────────────────────────

// L4 re-point (2026-08-26): the fixture gap is CLOSED — both perfect
// fixtures now carry necessity_details.alternatives_rationale — so the
// deterministic assembly pins STRICT ZERO conformance findings.
Deno.test("L2/L4 — deterministic assembly: conformance strictly clean; register clean; leads coherent", () => {
  for (const c of LIA_PERFECT_PINNED) {
    const report = typedReportFor(c.intake as Bag);
    const sk = assembleLiaSkeletonDocument(report, c.intake as Bag, { deterministic: true });
    assertEquals(sk.conformance.length, 0, `${c.id}: ${JSON.stringify(sk.conformance)}`);
    assertEquals(sk.register_findings, [], c.id);
    assertEquals(sk.lead_coherence, [], c.id);
  }
});

// ── L4 — the NO-MODEL import-graph pin ─────────────────────────────────────
// The deterministic path's modules must be pure: no model client, no fetch
// to a model endpoint, no dynamic escape hatch. Source-level, so a future
// import cannot slip in silently.
Deno.test("L4 — NO-MODEL pin: the deterministic modules import no model client", async () => {
  const MODULES = [
    "supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts",
    "supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts",
    "supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts",
    "supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts",
    "supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/eprivacy-gate.ts",
    "supabase/functions/run-li-assessment/_local/ltp/lia-persuasive-authority.ts",
    "supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts",
  ];
  for (const path of MODULES) {
    const src = await Deno.readTextFile(path);
    for (const banned of ["callAnthropic", "anthropic", "api.openai", "currentGenerationModel", "fetch("]) {
      assert(!src.includes(banned), `${path} references "${banned}" — the deterministic path must be model-free`);
    }
  }
});

// The flag's default is FALSE until the CEO's deploy-time cutover.
Deno.test("L4 — LIA_DETERMINISTIC_DEFAULT is false (cutover is the CEO's deploy-time act)", async () => {
  const { LIA_DETERMINISTIC_DEFAULT } = await import(
    "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deterministic-flag.ts"
  );
  assertEquals(LIA_DETERMINISTIC_DEFAULT, false);
});

Deno.test("L2 — the Persuasive Authority section renders the four ratified decisions with a ToA trail", () => {
  const report = typedReportFor(LIA_PERFECT_PINNED[0].intake as Bag);
  const sk = assembleLiaSkeletonDocument(report, LIA_PERFECT_PINNED[0].intake as Bag, { deterministic: true });
  const text = skeletonDocumentToText(sk.document);
  assertStringIncludes(text, "Persuasive Authority");
  assertStringIncludes(text, "DPC (Ireland), LinkedIn, decision of 22 October 2024 — persuasive authority");
  assertStringIncludes(text, "CNIL (France), Cegedim, decision of 5 September 2024, ref. SAN-2024-013 — persuasive authority");
  assertStringIncludes(text, "AEPD (Spain), GSMA Limited, decision of 31 May 2024, ref. EXP202201608 — persuasive authority");
  assertStringIncludes(text, "decision of 27 December 2022, ref. EXP202301678 — persuasive authority");
  // The ToA lists them under the persuasive group (iff-cited by the body).
  const toaStart = text.lastIndexOf("Authorities Cited");
  const toa = text.slice(toaStart);
  assertStringIncludes(toa, "Guidance and Persuasive Authority (persuasive)");
  assertStringIncludes(toa, "DPC (Ireland), LinkedIn, decision of 22 October 2024 — persuasive authority");
});

Deno.test("L2 — the AOW caution renders iff the typed balancing verdict is likely_fails", () => {
  const clean = LIA_PERFECT_PINNED[0].intake as Bag;
  const cleanReport = typedReportFor(clean);
  const cleanVerdict = ((cleanReport.three_part_test as Bag).balancing_test as Bag).verdict;
  const cleanText = skeletonDocumentToText(
    assembleLiaSkeletonDocument(cleanReport, clean, { deterministic: true }).document,
  );
  if (cleanVerdict === "likely_fails") {
    assertStringIncludes(cleanText, "Caution. Regulators have rejected legitimate-interests reliance");
  } else {
    assert(!cleanText.includes("Caution. Regulators have rejected"), "AOW rendered without balancing_fails");
  }

  // Force the failing state: expectations answered adverse + material harm,
  // no safeguards.
  const failing = structuredClone(clean) as Bag;
  const b = failing.balancing_details as Bag;
  b.reasonable_expectation = "No — they would not expect this";
  b.potential_harm = "Severe harm (physical safety, severe financial or legal detriment)";
  b.safeguards = [];
  const failingReport = typedReportFor(failing);
  const fv = ((failingReport.three_part_test as Bag).balancing_test as Bag).verdict;
  const failingText = skeletonDocumentToText(
    assembleLiaSkeletonDocument(failingReport, failing, { deterministic: true }).document,
  );
  if (fv === "likely_fails") {
    assertStringIncludes(failingText, "Caution. Regulators have rejected legitimate-interests reliance");
  }
});

Deno.test("L2/L3 — the model path is frozen: deterministic:false renders no new surface", () => {
  const report = typedReportFor(LIA_PERFECT_PINNED[0].intake as Bag);
  const sk = assembleLiaSkeletonDocument(report, LIA_PERFECT_PINNED[0].intake as Bag);
  const text = skeletonDocumentToText(sk.document);
  assert(!text.includes("Persuasive Authority"), "appendix leaked onto the model path");
  assert(!text.includes("— persuasive authority"), "authority labels leaked onto the model path");
  assert(
    !text.includes("Regulators applying the equivalent EU/UK legitimate-interests test"),
    "precedent sentence leaked onto the model path",
  );
});

Deno.test("L2 — deterministic assembly is byte-deterministic", () => {
  const c = LIA_PERFECT_PINNED[1] ?? LIA_PERFECT_PINNED[0];
  const r1 = typedReportFor(c.intake as Bag);
  const r2 = typedReportFor(c.intake as Bag);
  const a = skeletonDocumentToText(assembleLiaSkeletonDocument(r1, c.intake as Bag, { deterministic: true }).document);
  const b = skeletonDocumentToText(assembleLiaSkeletonDocument(r2, c.intake as Bag, { deterministic: true }).document);
  assertEquals(a, b);
});
