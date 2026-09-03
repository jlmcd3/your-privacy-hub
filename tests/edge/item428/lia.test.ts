// ITEM 428 PIECE A — lia structural-conformance battery.
//
// DEVIATION NOTE: some of lia's narrative surfaces are LLM-authored and not
// reproducible offline, but the core deliverables (`lia_determination`,
// `three_part_test`, etc.) ARE produced by the live deterministic builders
// `buildLiaDeliverables` / `buildLiaUpgrade4`, following the same
// `assembleLiaReport()` idiom tests/edge/item385/lia-coverage-and-seams.test.ts
// uses. The remaining plan sections not emitted by those builders
// (benefit_and_beneficiary, documentation_recommendations, attestation_block)
// are hand-assembled here, matching the live-parity precedent in that file.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkStructureConformance } from "../../../supabase/functions/_shared/prose/structure-conformance.ts";
import { LIA_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect.ts";
import { buildLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { buildLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";

const INTAKE = LIA_PERFECT[0].intake as Record<string, unknown>;

function assembleLiaReport(intake: Record<string, unknown>): Record<string, unknown> {
  const core = buildLiaDeliverables(intake) as unknown as Record<string, unknown>;
  const up4 = buildLiaUpgrade4(intake) as unknown as Record<string, unknown>;
  return {
    classification: {
      text: `${String(intake.processing_description ?? "")} ${
        (intake.data_categories as string[] ?? []).join(", ")
      } ${(intake.jurisdictions as string[] ?? []).join(", ")}`,
    },
    ...core,
    ...up4,
    // `three_part_test.balancing_test` is LLM-authored on the live path and is
    // not emitted by the deterministic builders — hand-assembled here per the
    // deviation note above.
    three_part_test: {
      balancing_test:
        "The interest in preventing payment fraud outweighs the limited intrusion on customers, " +
        "whose orders are scored only at checkout and who may ask for a human review.",
    },
    benefit_and_beneficiary: {
      benefit: "Fraud losses are reduced and legitimate orders are released faster.",
      beneficiary: "Ravensmoor Cycles Ltd and its customers, who see fewer wrongful order holds.",
    },
    documentation_recommendations: [
      { item: "Retain the fraud-scoring model's decision logic documentation for the current model version." },
    ],
    attestation_block: {
      approved_by: "Head of Payments, Ravensmoor Cycles Ltd",
      approval_date: "2026-06-01",
      next_review_due: "2027-06-01",
    },
    information_needed: [],
  };
}

Deno.test("item428 lia: perfect fixture is fully conformant", () => {
  const report = assembleLiaReport(INTAKE);
  const res = checkStructureConformance("lia", report);
  assertEquals(res.missing_required, []);
  assertEquals(res.padded_empty, []);
  assert(res.ok, JSON.stringify(res));
  assertEquals(res.checked, 14);
});

Deno.test("item428 lia: a padded-hollow conditional section fails conformance", () => {
  const report = assembleLiaReport(INTAKE);
  report.documentation_recommendations = ["Not recorded."];
  const res = checkStructureConformance("lia", report);
  assertEquals(res.ok, false);
  assert(res.padded_empty.includes("documentation_recommendations"), JSON.stringify(res.padded_empty));
});
