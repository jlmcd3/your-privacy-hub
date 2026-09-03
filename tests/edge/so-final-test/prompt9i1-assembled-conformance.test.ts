// PROMPT 9I.1 (CEO-ratified 2026-08-16) — RATIFIED-BYTES CONFORMANCE.
// RE-POINTED BY PROMPT 9L (CEO-ratified 2026-08-16): the must-appear set is
// now the 9L four-step composition, and every sentence 9L retires moved to the
// must-NOT-appear set. The assertion count does not decrease.
//
// These sentinels test the ASSEMBLED DOCUMENT, not the constants: the 9I
// constant-level sentinels passed while the document deviated, because the
// composed blocks were pinned to stale spine block indices.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildDpiaDeliverables, DPIA_NECESSITY_TEST_SENTENCE } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import {
  assembleDpiaSkeletonDocument,
  boundedPassage,
  dpiaS3BalanceSentence,
  DPIA_S3_DETERMINATION_ESTABLISHED,
  DPIA_S3_LEAD_RETIRED,
  DPIA_S3_RETIRED_BENEFIT_LEAD,
  DPIA_S3_RETIRED_IMPACT_LEAD,
  DPIA_S3_STEP3_CONCLUSION,
  DPIA_S3_STEP4_IMPACT_LEAD,
} from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { DPIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/dpia-perfect-pinned.ts";
import { checkPerfectDpiaIntake } from "../../../supabase/functions/_shared/quality/perfect-closed-loop.ts";

/** The passage bound every Section 3 customer quote must respect.
 *
 * DELIBERATE RE-PIN 2026-08-25 (batch be0f9e02, CEO-ordered fragment fix):
 * Section 3 customer quotes moved from `boundedClause` (single clause,
 * ≤400 chars) to `boundedPassage` (whole abbreviation- and paren-aware
 * sentences accumulated to a 520-char budget, always ≥1 sentence) —
 * the single-clause bound was discarding the substance of rich intake
 * fields and the remnants graded as boilerplate fragments. The invariant
 * is now IDEMPOTENCE: a rendered quote re-bounded by `boundedPassage`
 * must be unchanged (it is already whole sentences within budget). A
 * quote may exceed 520 only when its own FIRST sentence does (the
 * ≥1-sentence guarantee), which the assertion below permits. */
const S3_QUOTE_BOUND = 520;

// deno-lint-ignore no-explicit-any
type Any = any;

function pinned(marker: string): Any {
  const c = DPIA_PERFECT_PINNED.find((x) => JSON.stringify(x).includes(marker)) as Any;
  assert(c, `pinned fixture not found: ${marker}`);
  return c.intake ?? c.intake_data ?? c;
}

function assemble(intake: Any) {
  const report = buildDpiaDeliverables(intake) as Any;
  const { document } = assembleDpiaSkeletonDocument(report, intake);
  const section = (id: string) => document.sections.find((s: Any) => s.id === id)!;
  const paras = (id: string) => section(id).paragraphs.map((p: Any) => String(p.text ?? ""));
  return { document, section, paras, text: document.sections
    .flatMap((s: Any) => s.paragraphs.map((p: Any) => String(p.text ?? ""))).join("\n") };
}

const HARROWGATE = pinned("Quarterly portfolio pricing calibration");

Deno.test("9L (i) — the assembled Harrowgate document carries every ratified sentence verbatim", () => {
  const { paras, text } = assemble(HARROWGATE);
  const s3 = paras("section_3_necessity_proportionality");
  assert(
    s3[1].startsWith("The primary purpose indicated by the company is the following:"),
    s3[1].slice(0, 120),
  );
  assert(text.includes("The company describes how the processing achieves that goal:"), "step 2 sentence missing");
  assert(text.includes("The company states, for each, why it would not achieve the necessary purpose of the processing, as follows:")
    || text.includes("The company states why it would not achieve the necessary purpose of the processing, as follows:"),
    "step 3 bridge missing");
  assert(text.includes(DPIA_S3_STEP3_CONCLUSION), "step 3 conclusion missing");
  assert(text.includes(DPIA_S3_STEP4_IMPACT_LEAD), "step 4 impact sentence missing");
  assert(/Balancing that impact against the goal stated above, and in light of the safeguards the company has recorded \(including /.test(text),
    "step 4 balance sentence missing");
  // PROMPT 9L.1 item 3(c) — re-anchored to the ratified balance tail.
  assert(text.includes("the processing is proportionate to the stated goal."), "step 4 balance tail missing");
  assert(!text.includes("the impact is answered and"), "retired 9L balance phrase still present");
  assert(text.includes(DPIA_S3_DETERMINATION_ESTABLISHED), "determination sentence missing");
  assert(dpiaS3BalanceSentence("x").includes("(including x)"), "safeguards slot not spliced");
});

Deno.test("9L (ii) — the retired bytes appear nowhere in the assembled document", () => {
  const { text, paras } = assemble(HARROWGATE);
  assert(!/On the record as it stands/i.test(text), "retired 'on the record' register survives");
  assert(!text.includes("On the benefit of the processing, the company states that"), "retired benefit sentence survives");
  assert(!text.includes(DPIA_S3_LEAD_RETIRED), "retired §3 neutral lead survives");
  assert(!text.includes(DPIA_S3_RETIRED_BENEFIT_LEAD), "retired benefit-side lead survives");
  assert(!text.includes(DPIA_S3_RETIRED_IMPACT_LEAD), "retired impact-side lead survives");
  assert(!text.includes(DPIA_NECESSITY_TEST_SENTENCE), "retired 'Applying the stated test' sentence survives");
  assert(!text.includes("described by the company as"), "retired bridge tail survives");
  assert(!text.includes("The company has recorded both sides of the balance"), "retired proportionality why survives");
  const lead = paras("section_3_necessity_proportionality")[1];
  assert(
    !lead.includes("Necessity and proportionality are established based on the information the company provided"),
    "established-verdict lead still occupies the lead position",
  );
});

Deno.test("9L (iii) — Section 3 renders goals → how → alternatives → impact → determination last", () => {
  const { paras } = assemble(HARROWGATE);
  const s3 = paras("section_3_necessity_proportionality");
  const iGoal = s3.findIndex((p) => p.startsWith("The primary purpose indicated by the company is the following:"));
  const iHow = s3.findIndex((p) => p.startsWith("The company describes how the processing achieves that goal:"));
  const iAlt = s3.findIndex((p) => p.startsWith("The company has recorded"));
  const iImpact = s3.findIndex((p) => p.startsWith(DPIA_S3_STEP4_IMPACT_LEAD));
  const iSecondary = s3.findIndex((p) => p.startsWith("For the secondary use, the purpose indicated by the company is the following:"));
  const iDet = s3.findIndex((p) => p === DPIA_S3_DETERMINATION_ESTABLISHED);
  assertEquals(iGoal, 1);
  assert(iGoal < iHow && iHow < iAlt && iAlt < iImpact, `${iGoal}/${iHow}/${iAlt}/${iImpact}`);
  if (iSecondary >= 0) assert(iImpact < iSecondary, "secondary operation must follow the primary");
  assert(iDet > iImpact, `determination not last: ${iDet}`);
  // determination is the LAST composed paragraph — only the §3.1 design-risk
  // skeleton block and its table follow it.
  const after = s3.slice(iDet + 1);
  assert(after.every((p) => !p.startsWith(DPIA_S3_STEP4_IMPACT_LEAD)), "analysis after determination");
});

Deno.test("9L (iv) — every Section 3 customer quote is passage-bounded", () => {
  const { paras } = assemble(HARROWGATE);
  const s3 = paras("section_3_necessity_proportionality").join("\n");
  const long: string[] = [];
  for (const m of s3.matchAll(/"([^"]+)"/g)) {
    // Idempotence: the rendered quote IS a bounded passage already.
    if (boundedPassage(m[1]) !== m[1]) long.push(`unbounded: ${m[1].slice(0, 80)}`);
    // Budget: over-length only via the ≥1-sentence guarantee (a single
    // first sentence longer than the budget).
    else if (m[1].length > S3_QUOTE_BOUND && boundedPassage(m[1], 1) !== m[1]) {
      long.push(`${m[1].length}: ${m[1].slice(0, 80)}`);
    }
  }
  assertEquals(long, []);
});

Deno.test("9L (v) — no '(s)' pluralisation reaches Section 3", () => {
  const { paras } = assemble(HARROWGATE);
  const s3 = paras("section_3_necessity_proportionality").join("\n");
  assert(!/\(s\)/.test(s3), "'(s)' pluralisation in Section 3");
});

Deno.test("9I.1 (v) — Section 4 renders the most-significant-remaining-risk summary as its closing paragraph", () => {
  const { paras } = assemble(HARROWGATE);
  const s4 = paras("section_4_risk_management").filter((p) => p.trim().length > 0);
  const last = s4[s4.length - 1];
  assert(
    last.startsWith("After the mitigating measures the company has identified, the most significant remaining risk is:"),
    last.slice(0, 160),
  );
  // v4.6.2 — the closer states the residual level as final ("assessed at
  // a residual risk level of …"); "preliminary" is retired.
  assert(/assessed at a residual risk level of /.test(last), last.slice(0, 160));
});

Deno.test("9I.1 — pin guard: every pinned perfect fixture still passes the closed-loop check", () => {
  assert(DPIA_PERFECT_PINNED.length >= 2);
  for (const f of DPIA_PERFECT_PINNED as Any[]) {
    const res = checkPerfectDpiaIntake(f.intake ?? f.intake_data ?? f);
    assert(res.ok, JSON.stringify(res));
  }
});
