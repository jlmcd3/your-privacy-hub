// DOC 142 (2026-09-02) — HEADLINE-VS-ALTERNATIVES CONSISTENCY (external
// review, both live LIA PDFs of the 2026-09-02 batch):
//
//   The three-test strip and the executive summary said "Necessity test:
//   Met" / "the necessity test is met" while Section III's own analysis
//   said "Of the 2 alternatives the record lists, 1 carries a reason for
//   inadequacy and 1 does not … the alternative left unexplained —
//   Aggregate reporting and shorter retention — remains open on the
//   information provided."
//
//   Root cause: necessityVerdict read the RAW intake fields (mere presence
//   of any alternatives text -> "passes") while the analysis reads the
//   typed per-alternative comparison buildAlternativesConsidered computes.
//   The verdict now consumes that same typed comparison: "passes" only when
//   at least one alternative is listed and EVERY one carries a recorded
//   inadequacy reason; anything less degrades to "uncertain" (never
//   "fails" — the degradation law holds).
//
// These tests pin the invariant on both the typed surface and the rendered
// document, and pin that a complete comparison still passes.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildThreePartTestTyped,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { attachLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import {
  assembleLiaSkeletonDocument,
  deriveAlternativesTable,
  deriveThreeTestStrip,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect-pinned.ts";

type Bag = Record<string, unknown>;

/** The deterministic path's attach order (as in l1-l3-deterministic.test.ts). */
function typedReportFor(intake: Bag): Bag {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  if (typed.determination_override) report.lia_determination = typed.determination_override;
  report.information_needed = typed.information_needed;
  return report;
}

/** The live batch's two-field split: a bare alternative in
 * necessity_details.alternatives, a reasoned one in alternatives_considered. */
function splitFieldIntake(): Bag {
  const intake = structuredClone(LIA_PERFECT_PINNED[0].intake) as Bag;
  (intake.necessity_details as Bag).alternatives = "Aggregate reporting and shorter retention";
  (intake.necessity_details as Bag).alternatives_rationale = "";
  (intake.necessity_details as Bag).why_consent_not_used = "";
  intake.alternatives_considered =
    "Consent and aggregate-only analytics were considered but would not support security monitoring";
  return intake;
}

Deno.test("doc142 — an alternative without a recorded inadequacy reason degrades the necessity verdict to uncertain", () => {
  const report = typedReportFor(splitFieldIntake());
  const alts = ((report.alternatives_considered as Bag).alternatives as Bag[]);
  // The premise of the fix: the typed comparison really is partial here.
  assert(alts.some((a) => a.rationale_recorded !== true), "fixture must carry an unexplained alternative");
  const nec = (report.three_part_test as Bag).necessity_test as Bag;
  assertEquals(nec.verdict, "uncertain");
  // The open question states the concrete fact needed — it names the
  // unexplained alternative, not a generic ask.
  const open = (nec.open_questions as string[]).join(" ");
  assertStringIncludes(open, "Aggregate reporting and shorter retention");

  // The determination reads the same state: necessity is an OPEN element
  // (never an adverse one), the outcome degrades to undetermined, and the
  // ask names the concrete missing fact (the unexplained alternative).
  const det = report.lia_determination as Bag;
  assertEquals(det.outcome, "undetermined_on_the_record");
  assert((det.driving_factors as string[]).includes("necessity"));
  assertStringIncludes(String(det.information_needed), "Aggregate reporting and shorter retention");
  const necMitigation = (det.mitigations as Bag[]).find((m) => m.factor === "necessity");
  assert(necMitigation, "necessity mitigation missing");
  assertStringIncludes(String(necMitigation!.measure), "Aggregate reporting and shorter retention");
});

Deno.test("doc142 — invariant: whenever the necessity analysis reports an open alternative, the headline is never Met", () => {
  for (const c of LIA_PERFECT_PINNED) {
    for (const mutate of [false, true]) {
      const intake = mutate ? splitFieldIntake() : structuredClone(c.intake) as Bag;
      const report = typedReportFor(intake);
      const nec = (report.three_part_test as Bag).necessity_test as Bag;
      const analysis = String(nec.analysis);
      const table = deriveAlternativesTable(report);
      const hasOpenRow = !!table && table.rows.some((r) => r[1] === "Not recorded");
      const reportsGap = /remains? open on the information provided/.test(analysis) || hasOpenRow;
      if (reportsGap) {
        assert(nec.verdict !== "passes", `${c.id}: analysis reports an open alternative but verdict passes`);
        const strip = deriveThreeTestStrip(report);
        const row = strip?.rows.find((r) => r[0] === "Necessity test");
        assertEquals(row?.[1], "Determination Pending");
      }
    }
  }
});

Deno.test("doc142 — a complete comparison (every alternative reasoned) still passes, and renders Met", () => {
  for (const c of LIA_PERFECT_PINNED) {
    const report = typedReportFor(structuredClone(c.intake) as Bag);
    const alts = ((report.alternatives_considered as Bag).alternatives as Bag[]);
    assert(alts.length > 0 && alts.every((a) => a.rationale_recorded === true), `${c.id}: pinned fixture must carry a complete comparison`);
    const nec = (report.three_part_test as Bag).necessity_test as Bag;
    assertEquals(nec.verdict, "passes", c.id);
    const strip = deriveThreeTestStrip(report);
    const row = strip?.rows.find((r) => r[0] === "Necessity test");
    assertEquals(row?.[1], "Met", c.id);
  }
});

Deno.test("doc142 — the rendered document: headline, exec summary, and Section III lead all carry the pending state together", () => {
  const intake = splitFieldIntake();
  const report = typedReportFor(intake);
  const sk = assembleLiaSkeletonDocument(report, intake, { deterministic: true }) as unknown as {
    document: {
      sections: Array<{ paragraphs: Array<{ kind: string; text: string; table?: { rows: string[][] } }> }>;
    };
  };
  const text = sk.document.sections.flatMap((s) => s.paragraphs.map((p) => p.text)).join("\n");
  assertStringIncludes(text, "the necessity test is not resolved");
  assert(!text.includes("the necessity test is met"), "exec summary still asserts the necessity test is met");
  assertStringIncludes(text, "Whether the processing is necessary cannot be resolved on the facts recorded.");
  assert(
    !text.includes("The processing is necessary to the identified interest"),
    "Section III still opens with the affirmative necessity lead",
  );
  const stripRows = sk.document.sections
    .flatMap((s) => s.paragraphs)
    .filter((p) => p.kind === "table" && p.table)
    .flatMap((p) => p.table!.rows)
    .filter((r) => r[0] === "Necessity test");
  assert(stripRows.length > 0, "three-test strip missing its Necessity row");
  for (const r of stripRows) assertEquals(r[1], "Determination Pending");
});
