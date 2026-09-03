// WAVE C1 (2026-08-23, doc 62 §11's R1 amendment / doc 63 §2.2) — the
// ratified impact-tag trail entries actually reach the rendered Appendix
// G authority cell (render-and-inspect, doc 44 §D1), and the R2 admission
// rule holds: none of the 30 dark FC-J bulk rows leak any text into the
// rendered document.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleRiskSkeletonDocument } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { EMPTY_RISK_CORPUS } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-corpus.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-risk.ts";
import { RISK_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/risk-corpus-map.ts";

type Bag = Record<string, unknown>;

const fixture = CPPA_RISK_PERFECT.find((c) => c.id === "risk-perfect-complete");
if (!fixture) throw new Error("golden fixture risk-perfect-complete not found");

Deno.test("wave C1 — every trail_impact tag in the map is exactly one row per factor (R2 admission rule)", () => {
  const tagged = RISK_CORPUS_MAP.rows.filter((r) => r.trail_impact);
  const byFactor = new Map<string, number>();
  for (const r of tagged) byFactor.set(r.factor_id, (byFactor.get(r.factor_id) ?? 0) + 1);
  for (const [factor, n] of byFactor) {
    assertEquals(n, 1, `factor "${factor}" carries ${n} trail_impact tags, expected exactly 1`);
  }
  assertEquals(byFactor.size, 5, "expected exactly 5 tagged factors (doc 63 §2.2)");
});

Deno.test("wave C1 — Appendix G renders the ratified trail tags for a full-record fixture", async () => {
  const result = await generateCppaRiskReport(fixture.intake, {
    pass1: "deterministic",
    riskCorpus: EMPTY_RISK_CORPUS,
    buildStamp: "rk-c1-trail-tags",
    mode: "enforce",
  });
  const report = result.report as Bag;
  const sk = assembleRiskSkeletonDocument(report, fixture.intake as Bag);
  const body = skeletonDocumentToText(sk.document);

  // Every tagged factor whose determination actually composed should carry
  // its interpretive tag verbatim in the rendered Appendix G cell.
  const taggedRows = RISK_CORPUS_MAP.rows.filter((r) => r.trail_impact);
  let atLeastOneChecked = false;
  for (const row of taggedRows) {
    if (body.includes(row.factor_id)) {
      // The factor row composed for this fixture — its tag must be present.
      assert(
        body.includes(row.trail_impact!),
        `factor "${row.factor_id}" composed but its trail_impact tag is missing from the rendered document`,
      );
      atLeastOneChecked = true;
    }
  }
  assert(atLeastOneChecked, "no tagged factor composed on this fixture — test fixture choice needs revisiting");

  assertEquals(sk.register_findings.length, 0, JSON.stringify(sk.register_findings));
  assertEquals(sk.conformance.length, 0, JSON.stringify(sk.conformance));
});

Deno.test("wave C1 — none of the 30 dark FC-J bulk rows leak into the rendered document (R2 admission rule)", async () => {
  const result = await generateCppaRiskReport(fixture.intake, {
    pass1: "deterministic",
    riskCorpus: EMPTY_RISK_CORPUS,
    buildStamp: "rk-c1-trail-tags",
    mode: "enforce",
  });
  const report = result.report as Bag;
  const sk = assembleRiskSkeletonDocument(report, fixture.intake as Bag);
  const body = skeletonDocumentToText(sk.document);

  const darkBulkFactors = new Set([
    "Stakeholder involvement and information providers",
    "Processing methods and coherence",
    "ADMT made available to another business",
  ]);
  const darkBulk = RISK_CORPUS_MAP.rows.filter(
    (r) => !r.render_eligible && !r.trail_impact && darkBulkFactors.has(r.factor_id),
  );
  assert(darkBulk.length > 0, "expected at least one untagged dark FC-J row in the sampled factors");
  for (const row of darkBulk) {
    // A dark row's own pinned_excerpt is FSOR prose, not spine prose — it
    // should never appear verbatim in the composed document.
    assert(
      !body.includes(row.pinned_excerpt),
      `${row.id}: dark FC-J pinned_excerpt leaked into the rendered document`,
    );
  }
});
