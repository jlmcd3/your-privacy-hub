// PROMPT 9L.1 (CEO-ratified 2026-08-16) — per-operation Step-2 sourcing, the
// colon extraction boundary, the CEO v3 sentence redlines, the §4 per-risk
// template and the design-risks relocation. Assembled-document sentinels over
// all four pins; readers, verdicts, asks and gap logic are unchanged.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleDpiaSkeletonDocument,
  dpiaS3BalanceSentence,
  stepTwoClause,
} from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { extractionClause, splitClauses } from "../../../supabase/functions/_shared/ltp/clause-bound.ts";
import { buildDpiaDeliverables, IMPACT_LEXICON, impactSpan } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { DPIA_SKELETON_SECTIONS, DPIA_SKELETON_VERSION } from "../../../supabase/functions/_shared/prose/plans/dpia.spine.ts";
import { DPIA_PERFECT_PINNED } from "../../../supabase/functions/_shared/golden/dpia-perfect-pinned.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/_shared/golden/dpia.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

const intakeOf = (f: Any) => f.intake ?? f.intake_data ?? f;
const PINS: Any[] = [...(DPIA_PERFECT as Any[]), ...(DPIA_PERFECT_PINNED as Any[])];
const FIXTURES = PINS.map(intakeOf);
const HARROWGATE = FIXTURES.find((f) => JSON.stringify(f).includes("Quarterly portfolio pricing calibration"))!;

function paras(intake: Any, sectionId: string): string[] {
  const { document } = assembleDpiaSkeletonDocument(buildDpiaDeliverables(intake) as Any, intake);
  const sec = document.sections.find((x: Any) => x.id === sectionId)!;
  return (sec.paragraphs as Any[]).map((p) => String(p.text ?? ""));
}

Deno.test("9L.1 item 2 — the colon is an EXTRACTION boundary only", () => {
  const s = "Quarterly portfolio pricing calibration: underwriting decisions are analysed each quarter to recalibrate the model.";
  assertEquals(extractionClause(s), "underwriting decisions are analysed each quarter to recalibrate the model");
  // Rendering bound is untouched: without the option there is no colon split.
  assert(splitClauses(s)[0].text.startsWith("Quarterly portfolio pricing calibration"), splitClauses(s)[0].text);
});

Deno.test("9L.1 item 1 — Step 2 resolves per operation and never reuses the primary clause", () => {
  const primary = stepTwoClause(HARROWGATE, false);
  const secondary = stepTwoClause(HARROWGATE, true);
  assert(primary, "primary step-2 clause missing");
  assert(secondary, "secondary step-2 clause missing");
  assert(primary !== secondary, "secondary reuses the primary necessity clause");
  assert(String(HARROWGATE.secondary_uses).includes(secondary), secondary);
  // Nothing quotable → the step is omitted, never invented.
  assertEquals(stepTwoClause({ secondary_uses: "None" }, true), "");
  assertEquals(stepTwoClause({}, true), "");
});

Deno.test("9L.1 item 2 — impact spans skip the template lead-in before the colon", () => {
  const span = impactSpan(String(HARROWGATE.necessity_proportionality));
  assert(!span.startsWith("The impact of the processing on the data subjects is stated"), span);
  assert(IMPACT_LEXICON.some((r: RegExp) => r.test(span)), span);
});

Deno.test("9L.1 item 3 — CEO v3 sentences render verbatim across all four pins", () => {
  assert(dpiaS3BalanceSentence("x").includes("(including x)"), dpiaS3BalanceSentence("x"));
  for (const intake of FIXTURES) {
    const s3 = paras(intake, "section_3_necessity_proportionality").join("\n");
    assert(!s3.includes("the impact is answered and"), "retired balance phrase present");
    assert(!s3.includes("For the secondary use, the purpose indicated by the company"), "retired secondary lead present");
  }
  const s2 = paras(HARROWGATE, "section_2_analysis").join("\n");
  assert(s2.includes("Each subsequent table states what"), s2.slice(0, 200));
});

Deno.test("9L.1 item 4 — the §4 per-risk template renders typographic quotes and em dashes", () => {
  const s4 = paras(HARROWGATE, "section_4_risk_management").join("\n");
  assert(/is assessed at \u201C[^\u201D]+\u201D likelihood and \u201C[^\u201D]+\u201D severity/.test(s4), s4.slice(0, 400));
  assert(s4.includes("with an aggregate initial risk level of"), "aggregate phrasing missing");
  assert(!/, an initial risk level of/.test(s4), "retired initial-risk phrasing present");
  if (s4.includes("mitigate the risk")) {
    assert(/The company's recorded protections \u2014 .+ \u2014 mitigate the risk/.test(s4), "protections clause not em-dashed");
  }
});

// 9L.2 (CEO-ratified 2026-08-16) re-anchors this to the ratified §4 order: the
// statutory frame opens the section, then the design intro, then its table.
Deno.test("9L.1 item 5 — design risks follow the §4 statutory frame, not the end of Section 3", () => {
  const s3blocks = DPIA_SKELETON_SECTIONS.find((s) => s.id === "section_3_necessity_proportionality")!.blocks;
  const s4blocks = DPIA_SKELETON_SECTIONS.find((s) => s.id === "section_4_risk_management")!.blocks;
  assert(!s3blocks.some((b) => b.text.includes("risk_register.design")), "design table still in §3");
  assert(s4blocks[0].text.startsWith("Article 35(7)(c)"), s4blocks[0].text);
  assert(s4blocks[1].text.endsWith("as the starting point of the risk assessment."), s4blocks[1].text);
  assertEquals(s4blocks[2].text, "risk_register.design");
  assertEquals(DPIA_SKELETON_VERSION, "prose-plans-2026-08-16-prompt9l2-v4-5-1");
});
