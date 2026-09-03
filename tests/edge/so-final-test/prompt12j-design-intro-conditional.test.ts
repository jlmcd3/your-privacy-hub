// PROMPT 12J (CEO-ruled 2026-08-17) — the Section 4 design-risks INTRO renders
// if and only if the design-risks table renders. Conditional lives assembler-
// side (dpia-skeleton-assemble.ts); the spine and its bytes are untouched.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { buildDpiaDeliverables } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { DPIA_PERFECT_SET } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/registry.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

// Re-pinned 2026-08-25 to the CURRENT ratified section-4 intro (the
// combined two-register "Risk Assessments." block); the old design-only
// sentence this file pinned left the spine before v4.6.
const INTRO =
  "Risk Assessments. The first register captures design risk: harm that may arise from the processing even when the system operates as intended. The incident register separately captures risks arising from error, misuse, unauthorised access, technical failure, or other adverse events. The combined register then supports the residual-risk determination after the company's measures are considered.";

const intakeOf = (c: Any) => c.intake ?? c.intake_data ?? c;

function section4(intake: Any): Any {
  const { document } = assembleDpiaSkeletonDocument(buildDpiaDeliverables(intake) as Any, intake);
  return document.sections.find((s: Any) => s.id === "section_4_risk_management")!;
}

Deno.test("12J — the intro sentence never appears without its table (all six pins)", () => {
  assertEquals(DPIA_PERFECT_SET.length, 6);
  for (const c of DPIA_PERFECT_SET as Any[]) {
    const ps = section4(intakeOf(c)).paragraphs as Any[];
    const hasIntro = ps.some((p) => String(p.text ?? "") === INTRO);
    const hasTable = ps.some((p) => p.table?.surface === "risk_register.design");
    assertEquals(hasIntro, hasTable, `${c.id}: intro/table divergence`);
  }
});

Deno.test("12J — design-risk-free pins open on the statutory frame then the deviation table", () => {
  for (const id of ["dpia-perfect-eu-nordfracht-telematics", "dpia-perfect-uk-caledonia-claims"]) {
    const c = (DPIA_PERFECT_SET as Any[]).find((x) => x.id === id)!;
    const ps = section4(intakeOf(c)).paragraphs as Any[];
    assert(
      String(ps[0].text).startsWith("Article 35(7)(c) requires an assessment of the risks"),
      String(ps[0].text).slice(0, 120),
    );
    assertEquals(ps[1].table?.surface, "risk_register.incident");
    assert(!ps.some((p) => String(p.text ?? "") === INTRO), `${id} still renders the design intro`);
  }
});

Deno.test("12J — design-risk-carrying pins still render intro then design table", () => {
  const withDesign = (DPIA_PERFECT_SET as Any[]).filter((c) => {
    const ps = section4(intakeOf(c)).paragraphs as Any[];
    return ps.some((p) => p.table?.surface === "risk_register.design");
  });
  assertEquals(withDesign.length, 4);
  for (const c of withDesign) {
    const ps = section4(intakeOf(c)).paragraphs as Any[];
    assertEquals(String(ps[1].text), INTRO);
    assertEquals(ps[2].table?.surface, "risk_register.design");
  }
});

Deno.test("12J — conformance is clean for all six pins", () => {
  for (const c of DPIA_PERFECT_SET as Any[]) {
    const intake = intakeOf(c);
    const res = assembleDpiaSkeletonDocument(buildDpiaDeliverables(intake) as Any, intake);
    const findings = (res.conformance as Any[]).filter((f) =>
      f.section_id === "section_4_risk_management"
    );
    assertEquals(findings, [], `${c.id}: ${JSON.stringify(findings)}`);
  }
});
