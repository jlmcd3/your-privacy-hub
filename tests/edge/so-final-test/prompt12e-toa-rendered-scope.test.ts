// PROMPT 12E (CEO-ruled 2026-08-17) — ToA SCANS THE RENDERED DOCUMENT.
//
// The iff-cited gate tests against what the CUSTOMER SEES: the assembled
// skeleton body PLUS the ENUMERATED legacy conclusion surfaces that
// generate-report-pdf renders from the persisted row. The review-schedule
// sentence cites GDPR Art. 35(11), so the ToA lists it — and a record whose
// rendered surfaces do not carry the citing text still does not list it.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachDpiaDeliverables,
  buildDpiaDeliverables,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import {
  DPIA_RENDERED_CONCLUSION_SURFACES,
  dpiaRenderedConclusionText,
} from "../../../supabase/functions/_shared/ltp/dpia-rendered-surfaces.ts";
import { DPIA_PERFECT_SET } from "../../../supabase/functions/_shared/golden/registry.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

function assembled(intake: Any, mutate?: (report: Any) => void) {
  const report: Any = buildDpiaDeliverables(intake);
  attachDpiaDeliverables(report, intake, { unitsMinimal: true });
  mutate?.(report);
  const { document } = assembleDpiaSkeletonDocument(report, intake) as Any;
  const sec = (id: string) => document.sections.find((s: Any) => s.id === id);
  const text = (id: string) =>
    (sec(id)?.paragraphs ?? []).map((p: Any) => String(p.text ?? "")).join("\n");
  return { report, document, sec, text };
}

Deno.test("12E/1 — the enumerated surface list is closed and matches the PDF renderer", () => {
  assertEquals([...DPIA_RENDERED_CONCLUSION_SURFACES], [
    "decision",
    "conditions",
    "supervisory_authority_consultation_required",
    "validation_approval.text",
    "validation_approval.approved_by_name",
    "validation_approval.approved_by_title",
    "validation_approval.approval_date",
    "validation_approval.basis_for_sign_off",
    "validation_approval.information_needed",
    "validation_approval.template_ref",
    "review_schedule",
    "justification",
  ]);
  // Not an open-ended scan: an unenumerated field contributes nothing.
  const t = dpiaRenderedConclusionText({
    section_6_conclusion: { review_schedule: "cites Art. 35(11)", not_rendered: "Art. 99" },
  });
  assert(t.includes("Art. 35(11)"));
  assert(!t.includes("Art. 99"));
});

for (const c of DPIA_PERFECT_SET as Any[]) {
  Deno.test(`12E/2 — ${c.id}: ToA lists Art. 35(11) alongside 35(7)(a) and 35(9)`, () => {
    const { text } = assembled(c.intake);
    const toa = text("table_of_authorities");
    // Existing vertical grouped form: pinpoints of Art. 35 consolidate onto one
    // line, regime-prefixed. 35(11) joins the existing 35(7)(a) / 35(9) group.
    assert(/Art\. 35\(11\), \(7\)\(a\), \(9\)/.test(toa), toa);
    assert(toa.trim().startsWith("Regulations"), toa);
  });

  Deno.test(`12E/3 — ${c.id}: nothing outside the ToA block moves`, () => {
    const base = assembled(c.intake);
    const withoutReview = assembled(c.intake, (r) => {
      delete r.section_6_conclusion.review_schedule;
    });
    for (const s of base.document.sections as Any[]) {
      if (s.id === "table_of_authorities") continue;
      assertEquals(
        JSON.stringify(s),
        JSON.stringify(withoutReview.document.sections.find((x: Any) => x.id === s.id)),
        `section moved: ${s.id}`,
      );
    }
    // Verdicts, ledgers and registers are untouched by the ToA scope change.
    for (const key of ["decision", "gap_ledger", "risk_register", "_meta"]) {
      assertEquals(
        JSON.stringify(base.report[key] ?? null),
        JSON.stringify(withoutReview.report[key] ?? null),
        `report surface moved: ${key}`,
      );
    }
    // And the gate still excludes what the customer never reads.
    assert(!/Art\. 35\(11\)/.test(withoutReview.text("table_of_authorities")));
  });
}
