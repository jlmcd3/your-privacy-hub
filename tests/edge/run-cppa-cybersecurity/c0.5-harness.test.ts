// Cyber conversion C0.5 — local harness over the deterministic deliverables
// surface (`buildCyberDeliverables`), the C1 conversion's foundation.
//
// Analog of rk0.5-harness.test.ts, narrower by necessity: cyber has no
// deterministic engine mode yet (that's C1), so there is no full-report
// invariant set to snapshot the way risk's harness snapshots the engine
// output. What CAN be pinned today is the shape and completeness of the one
// surface that already IS fully deterministic and intake-only — the ITEM 315
// deliverables builder — over every CYBER_PERFECT fixture. This is exactly
// the surface C1 will build the retired-model-stages' replacement around, so
// pinning its invariants now gives C1 a stable foundation to diff against.
//
// One top-level Deno.test per CYBER_PERFECT fixture; builder called once;
// t.step subtests per fixture.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CYBER_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-cyber.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { CYBER_7122_CONDITIONS, CYBER_7123_COMPONENTS, CYBER_PROGRAM_OBLIGATIONS } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/components.ts";

for (const c of CYBER_PERFECT) {
  Deno.test(`C0.5 harness — ${c.id}`, async (t) => {
    const built = buildCyberDeliverables(c.intake);

    await t.step("component_coverage has exactly one row per § 7123(c) component, in enumeration order", () => {
      assertEquals(built.component_coverage.length, CYBER_7123_COMPONENTS.length);
      built.component_coverage.forEach((row, i) => {
        assertEquals(row.component_number, CYBER_7123_COMPONENTS[i].number, `row ${i}`);
        assertEquals(row.slug, CYBER_7123_COMPONENTS[i].slug, `row ${i}`);
      });
    });

    await t.step("component_coverage: no row is record_insufficient on this fixture", () => {
      const insufficient = built.component_coverage.filter((r) => r.status === "record_insufficient");
      assertEquals(insufficient.length, 0, insufficient.map((r) => r.slug).join(", "));
    });

    await t.step("component_coverage: every standard string is verbatim from components.ts (no paraphrase)", () => {
      for (const row of built.component_coverage) {
        const comp = CYBER_7123_COMPONENTS.find((x) => x.slug === row.slug);
        assert(comp, `no component registry entry for ${row.slug}`);
        assertEquals(row.standard, comp!.verbatim, row.slug);
        assertEquals(row.citation, comp!.citation, row.slug);
      }
    });

    await t.step("evidence_sufficiency has exactly one row per component, aligned by slug", () => {
      assertEquals(built.evidence_sufficiency.length, CYBER_7123_COMPONENTS.length);
      const slugs = new Set(built.evidence_sufficiency.map((r) => r.slug));
      assertEquals(slugs.size, CYBER_7123_COMPONENTS.length, "duplicate or missing slug in evidence_sufficiency");
    });

    await t.step("program_obligation_findings has exactly one row per §7123(b)(1)/(b)(3) obligation", () => {
      assertEquals(built.program_obligation_findings.length, CYBER_PROGRAM_OBLIGATIONS.length);
    });

    await t.step("independence_determination assesses every applicable §7122 condition", () => {
      const applicable = built.independence_determination.findings.filter((f) => f.applies);
      assert(applicable.length > 0, "expected at least one applicable independence condition");
      assert(
        applicable.length <= CYBER_7122_CONDITIONS.length,
        "more applicable findings than registered §7122 conditions",
      );
      assertEquals(built.independence_determination.status, "analysed");
    });

    await t.step("readiness_determination: conclusion is never restated as a numeric mean in prose", () => {
      const blob = `${built.readiness_determination.headline} ${built.readiness_determination.reasoning}`;
      assert(!/\bmean\b/i.test(blob), `readiness prose restates "mean": ${blob}`);
    });

    await t.step("readiness_determination carries at least one citation", () => {
      assert(built.readiness_determination.citations.length > 0);
    });

    await t.step("mean_score_readability_aid is absent when no aggregates are supplied (DEMOTION LAW)", () => {
      assertEquals(built.mean_score_readability_aid, undefined);
    });

    await t.step("re-running the builder on the same intake is byte-identical (purity)", () => {
      const rebuilt = buildCyberDeliverables(c.intake);
      assertEquals(JSON.stringify(rebuilt), JSON.stringify(built));
    });
  });
}
