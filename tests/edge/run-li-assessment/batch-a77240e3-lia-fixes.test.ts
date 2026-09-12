// BATCH a77240e3 (2026-09-12) — ChatGPT's "Report Prose Review v5" plus
// Claude's independent code check agreed on three real LIA defects
// (LIA5-01, LIA5-02, LIA5-03), confirmed against both the rendered PDF and
// the source. This file pins the three fixes.
//
// LIA5-01 — the headline said "Not Available" (ePrivacy gate foreclosed the
// basis) while the three-part-test table's own "Article 6(1)(f)
// availability" row said "Available", and the body prose said "Legitimate
// interests carries this processing" two sentences after the foreclosure
// sentence — a direct, customer-visible contradiction.
// LIA5-02 — the ePrivacy blocker never became a numbered Condition; only
// stale-attestation-date items did.
// LIA5-03 — the "engaged" branch of the ePrivacy/PECR engagement-map
// rationale was the one of four branches missing the Art. 5(3)/PECR reg. 6
// pinpoint the "exemption_claimed" branch already carries (doc 250 B1).
//
// LIA5-01 and LIA5-02's fixes must respect this module's own single-render-
// door law (pinned by eprivacy-gate.test.ts / doc189's own "single render
// door" test: lia-skeleton-assemble.ts must never read
// report["eprivacy" + "_short_circuit"] directly — only the typed engine's
// render-door telemetry (report._meta.internal.lia_typed_test) and the
// engagement map (report.engagement_map) may carry the gate's effect into
// rendering). This file therefore tests through the same realistic
// end-to-end pipeline doc189's own tests use (typedReportFor), not by
// handing hand-built gate objects straight to the skeleton functions.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildThreePartTestTyped } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { attachLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import { assembleLiaSkeletonDocument, deriveThreeTestStrip, collectLiaConditions } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { buildLiaEngagementMap } from "../../../supabase/functions/_shared/engagement-map.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect-pinned.ts";

type Bag = Record<string, unknown>;

// Mirrors doc189-device-access-question.test.ts's own `typedReportFor` —
// the realistic wiring the real pipeline (index.ts) performs.
function typedReportFor(intake: Bag): { report: Bag; intake: Bag; foreclosed: boolean } {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  if (typed.determination_override) report.lia_determination = typed.determination_override;
  report.information_needed = typed.information_needed;
  const gate = report.eprivacy_short_circuit as Bag;
  report.engagement_map = buildLiaEngagementMap(intake, {}, ["EU_GDPR"], gate.determination as string);
  report._meta = { internal: { lia_typed_test: { eprivacy_foreclosed: typed.eprivacy_foreclosed } } };
  return { report, intake, foreclosed: typed.eprivacy_foreclosed };
}

function foreclosedFixture(): Bag {
  const base = LIA_PERFECT_PINNED[0].intake as Bag;
  const pd = base.purpose_details as Bag;
  return { ...base, purpose_details: { ...pd, device_access: "Yes", device_access_strictly_necessary: "No — some or all of it goes further" } };
}

// ── LIA5-01: the "why" text no longer restates the pre-gate verdict as fact ──

Deno.test("LIA5-01 — a foreclosed record's determination override frames the pre-gate verdict as conditional, not as fact", () => {
  const { report } = typedReportFor(foreclosedFixture());
  assertEquals((report.lia_determination as Bag).outcome, "legitimate_interests_not_available");
  const why = String((report.lia_determination as Bag).why);
  assertStringIncludes(why, "not an available basis");
  assertStringIncludes(why, "Independently of that gate");
  assertStringIncludes(why, "would resolve as follows");
});

Deno.test("LIA5-01 — a non-foreclosed record's determination is untouched (no regression on the ordinary path)", () => {
  const base = LIA_PERFECT_PINNED[0].intake as Bag;
  const { report, foreclosed } = typedReportFor(base);
  assertEquals(foreclosed, false);
  assert(!String((report.lia_determination as Bag).why).includes("Independently of that gate"));
});

// ── LIA5-01: the three-part-test strip's availability row can't say
//    "Available" when the ePrivacy gate has foreclosed the basis ──────────

Deno.test("LIA5-01 — the Article 6(1)(f) availability row reads 'Not available' when the ePrivacy gate forecloses, even though the public-authority gate alone would say 'Available'", () => {
  const { report } = typedReportFor(foreclosedFixture());
  const strip = deriveThreeTestStrip(report);
  assert(strip, "expected a rendered three-test strip");
  const row = strip!.rows.find((r) => r[0] === "Article 6(1)(f) availability");
  assert(row, "expected the availability row to render");
  assertEquals(row![1], "Not available");
});

Deno.test("LIA5-01 — the availability row still reads 'Available' on an ordinary, non-foreclosed record (no regression)", () => {
  const base = LIA_PERFECT_PINNED[0].intake as Bag;
  const { report } = typedReportFor(base);
  const strip = deriveThreeTestStrip(report);
  const row = strip!.rows.find((r) => r[0] === "Article 6(1)(f) availability");
  assert(row, "expected the availability row to render");
  assertEquals(row![1], "Available");
});

// ── LIA5-02: the ePrivacy blocker becomes Condition 1 ──────────────────────

Deno.test("LIA5-02 — a foreclosed record's ePrivacy blocker is unshifted to Condition 1", () => {
  const { report } = typedReportFor(foreclosedFixture());
  const conditions = collectLiaConditions(report, []);
  assertEquals(conditions.length, 0, "collectLiaConditions itself is unchanged — the blocker is added by the caller");
  const sk = assembleLiaSkeletonDocument(report, foreclosedFixture(), { deterministic: true });
  const text = skeletonDocumentToText(sk.document);
  assertStringIncludes(text, "1. ");
  assertStringIncludes(text, "not an available basis");
});

Deno.test("LIA5-02 — a non-foreclosed record carries no ePrivacy condition (no regression)", () => {
  const base = LIA_PERFECT_PINNED[0].intake as Bag;
  const { report } = typedReportFor(base);
  const sk = assembleLiaSkeletonDocument(report, base, { deterministic: true });
  const text = skeletonDocumentToText(sk.document);
  assert(!text.includes("not an available basis"));
});

// ── LIA5-03: the "engaged" rationale carries the Art. 5(3)/reg. 6 pinpoint ──

Deno.test("LIA5-03 — the engagement-map's 'engaged' rationale now pinpoints Art. 5(3) / PECR reg. 6, matching the exemption_claimed branch", () => {
  const map = buildLiaEngagementMap({} as never, undefined, undefined, "consent_requirement_engaged") as unknown as {
    entries: Array<Record<string, unknown>>;
  };
  const entry = map.entries.find((e) => e.rule_id === "R_EPRIVACY_PECR")!;
  assertEquals(entry.status, "engaged");
  assertStringIncludes(String(entry.rationale), "Article 5(3) of the ePrivacy Directive");
  assertStringIncludes(String(entry.rationale), "regulation 6 of the Privacy and Electronic Communications");
});
