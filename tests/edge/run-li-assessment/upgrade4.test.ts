// UPGRADE-4 (ITEM 6) — acceptance tests for the LIA upgrade.
//
// Covers:
//   • ITEM 4 — the ≤2-occurrence boilerplate cap, against a generated-shape
//     fixture that carries the two literals many times over.
//   • ITEM 1 — schema coverage for the new deliverable keys.
//   • ITEM 2 — intake contract carries the new optional fields.
//   • ITEM 3 — corpus + exhibit are wired into the generator.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyLiaBoilerplateCap,
  countLiaBoilerplate,
  INFO_NEEDED_LITERAL,
  LIA_BOILERPLATE_CAP,
  NEUTRAL_DOWNGRADE_LITERAL,
} from "../../../supabase/functions/run-li-assessment/_lia_boilerplate_cap.ts";
import { LIA_REPORT_SCHEMA } from "../../../supabase/functions/_shared/report-schemas/lia.ts";
import { liAssessmentStageBContract } from "../../../supabase/functions/_shared/intake-contracts/li-assessment.ts";

/** Generated-shape fixture: 25 degraded leaves + 5 neutral downgrades. */
function generatedShapeFixture(): Record<string, unknown> {
  const findings: Record<string, unknown> = {};
  for (let i = 0; i < 25; i++) {
    findings[`finding_${String(i).padStart(2, "0")}`] = {
      verdict: "record_insufficient",
      application: INFO_NEEDED_LITERAL,
    };
  }
  const downgrades: Record<string, unknown> = {};
  for (let i = 0; i < 5; i++) {
    downgrades[`para_${i}`] = { analysis: NEUTRAL_DOWNGRADE_LITERAL };
  }
  return {
    assessment_id: "fixture",
    three_part_test: findings,
    documentation_recommendations: downgrades,
  };
}

Deno.test("ITEM 4: neither controlled phrase appears more than twice after the cap", () => {
  const doc = generatedShapeFixture();
  const before = countLiaBoilerplate(doc);
  assertEquals(before.info_needed, 25);
  assertEquals(before.neutral_downgrade, 5);

  applyLiaBoilerplateCap(doc);

  const after = countLiaBoilerplate(doc);
  assert(
    after.info_needed <= LIA_BOILERPLATE_CAP,
    `info-needed literal appeared ${after.info_needed} times (cap ${LIA_BOILERPLATE_CAP})`,
  );
  assert(
    after.neutral_downgrade <= LIA_BOILERPLATE_CAP,
    `neutral-downgrade literal appeared ${after.neutral_downgrade} times (cap ${LIA_BOILERPLATE_CAP})`,
  );
});

Deno.test("ITEM 4: nothing is dropped — every flagged leaf still carries prose", () => {
  const doc = generatedShapeFixture();
  applyLiaBoilerplateCap(doc);
  const findings = doc.three_part_test as Record<string, any>;
  for (const [k, v] of Object.entries(findings)) {
    assert(
      typeof v.application === "string" && v.application.trim().length > 20,
      `${k} lost its flagging sentence`,
    );
  }
});

Deno.test("ITEM 4: the cap is deterministic", () => {
  const a = generatedShapeFixture();
  const b = generatedShapeFixture();
  applyLiaBoilerplateCap(a);
  applyLiaBoilerplateCap(b);
  assertEquals(JSON.stringify(a), JSON.stringify(b));
});

Deno.test("ITEM 1: report schema declares the upgrade-4 deliverable keys", () => {
  const keys = new Set(LIA_REPORT_SCHEMA.topLevel);
  for (const k of ["three_part_test", "lia_determination", "reasonable_expectations"]) {
    assert(keys.has(k), `missing top-level key ${k}`);
  }
  assert(/^rs-lia-/.test(LIA_REPORT_SCHEMA.version), "schema version must stay in the rs-lia lineage");
});

Deno.test("ITEM 2: intake contract carries the upgrade-4 fields, all optional", () => {
  const byKey = new Map(liAssessmentStageBContract.fields.map((f) => [f.key, f]));
  const expected = [
    "purpose_details.specific_benefit",
    "purpose_details.beneficiary",
    "necessity_details.alternatives_rationale",
    "balancing_details.relationship_category",
    "balancing_details.scale_approx",
    "balancing_details.frequency",
    "balancing_details.duration",
    "balancing_details.potential_harms",
    "balancing_details.opt_out_available",
    "attestation",
    "attestation.dpo_reviewed",
    "attestation.dpo_reviewer",
    "attestation.dpo_review_date",
    "attestation.approver_name",
    "attestation.approver_position",
    "attestation.approval_date",
    "attestation.review_triggers",
  ];
  for (const key of expected) {
    const f = byKey.get(key);
    assert(f, `contract is missing ${key}`);
    assertEquals(f!.required, "optional", `${key} must stay optional so legacy rows validate`);
  }
});

Deno.test("ITEM 3: corpus + authority exhibit are wired into the generator", () => {
  const src = Deno.readTextFileSync(
    new URL("../../../supabase/functions/run-li-assessment/index.ts", import.meta.url),
  );
  assert(src.includes("fetchLiaCorpus"), "LIA corpus fetch not wired");
  assert(/authority_exhibit|AuthorityExhibit|buildAuthorityExhibit/.test(src), "authority exhibit not wired");
});
