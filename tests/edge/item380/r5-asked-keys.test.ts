// ITEM 380 r5 — FALSE AFFIRMATIVE ON THE DEGRADED GOLDEN.
//
// The r4 gate tested only `required: "always"` (plus triggered conditionals),
// so a record that answered the eleven always-required DPIA questions and
// skipped thirty-nine presented ones opened the truth gate. These tests
// exercise the r5 rule — EVERY question the intake ASKED must be answered —
// through the SAME call shape both pipeline call sites use.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { DPIA_GOLDEN, DPIA_PERFECT } from "../../../supabase/functions/_shared/golden/dpia.ts";
import { CPPA_RISK_GOLDEN, CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";
import { dpiaFrameworkContract } from "../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import {
  computeRecordComplete,
  emptyAskedKeys,
  emptyRequiredKeys,
  RECORD_COMPLETE_VERSION,
} from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { RISK_PIPELINE_STAMP } from "../../../supabase/functions/_shared/ltp/risk-stamp.ts";

// Live telemetry as the degraded demo run actually produced it: clean.
const CLEAN_COVERAGE = { crashed: false, counts: { orphans: 0 } } as never;
const CLEAN_CSC = { crashed: false, violations: [] as unknown[] } as never;

const byId = (list: readonly { id: string }[], id: string) => {
  const hit = list.find((c) => c.id === id);
  assert(hit, `fixture ${id} must exist`);
  return hit as { id: string; intake: Record<string, unknown> };
};

/** Exactly what run-dpia-framework/index.ts does at the gate call site. */
const gateDpia = (intake: Record<string, unknown>) =>
  computeRecordComplete({
    product: "dpia",
    contract: dpiaFrameworkContract,
    intake: intake ?? {},
    coverage: CLEAN_COVERAGE,
    csc: CLEAN_CSC,
  });

/** Exactly what _shared/ltp/generate-cppa-risk.ts does at the gate call site. */
const gateRisk = (intake: Record<string, unknown>) =>
  computeRecordComplete({
    product: "cppa-risk",
    contract: cppaRiskContract,
    intake: (intake && typeof intake === "object" ? intake : {}) as Record<string, unknown>,
    coverage: CLEAN_COVERAGE,
    csc: CLEAN_CSC,
    recordNeedsMissingData: 0,
  });

// ---------------------------------------------------------------------------
// LIVE PARITY — the degraded goldens must be FALSE with clean coverage/CSC
// ---------------------------------------------------------------------------

Deno.test("r5 LIVE PARITY: dpia-eu-health-tuning is NOT record-complete under clean coverage/CSC", () => {
  const fx = byId(DPIA_GOLDEN as never, "dpia-eu-health-tuning");
  // r4 behaviour, reproduced: the always-required check saw nothing wrong.
  assertEquals(emptyRequiredKeys(dpiaFrameworkContract, fx.intake), []);

  const t = gateDpia(fx.intake);
  assertEquals(t.value, false);
  assert(t.failed_conditions.includes("contract_incomplete"), JSON.stringify(t.failed_conditions));
  assert(t.counts.empty_required_keys >= 30, `expected many unanswered asks, got ${t.counts.empty_required_keys}`);
  for (
    const key of [
      "nature_scope_context",
      "data_subject_rights_mechanisms",
      "dp_by_design_measures",
      "alternatives_considered",
      "dpo_info",
    ]
  ) {
    assert(t.empty_required_keys.includes(key), `expected unanswered ask "${key}" to be named`);
  }
  assert(t.empty_required_keys.length <= 40, "telemetry list stays capped at 40");
});

Deno.test("r5 LIVE PARITY: risk-adtech-sell-tuning is NOT record-complete under clean telemetry", () => {
  const fx = byId(CPPA_RISK_GOLDEN as never, "risk-adtech-sell-tuning");
  assertEquals(emptyRequiredKeys(cppaRiskContract, fx.intake), []);

  const t = gateRisk(fx.intake);
  assertEquals(t.value, false);
  assert(t.failed_conditions.includes("contract_incomplete"), JSON.stringify(t.failed_conditions));
  assert(t.counts.empty_required_keys > 0);
  for (const key of ["i2_retention_detail", "i5_admt_fairness_testing", "i8_contact_email"]) {
    assert(t.empty_required_keys.includes(key), `expected unanswered ask "${key}" to be named`);
  }
});

// ---------------------------------------------------------------------------
// SKIP-LOGIC — untriggered conditionals were never asked
// ---------------------------------------------------------------------------

Deno.test("r5: untriggered conditionals are not counted as unanswered", () => {
  const conditionals = dpiaFrameworkContract.fields.filter((f) => f.required === "conditional");
  const empty = emptyAskedKeys(dpiaFrameworkContract, {});
  for (const f of conditionals) {
    if (!f.key.includes("[]")) {
      assert(!empty.includes(f.key), `skip-logic conditional ${f.key} must not be counted`);
    }
  }
});

Deno.test("r5: an answered optional field removes itself from the unanswered list", () => {
  const before = emptyAskedKeys(dpiaFrameworkContract, {});
  assert(before.includes("dpo_advice"));
  const after = emptyAskedKeys(dpiaFrameworkContract, { dpo_advice: "The DPO advised proceeding." });
  assert(!after.includes("dpo_advice"));
  assertEquals(after.length, before.length - 1);
});

// ---------------------------------------------------------------------------
// PERFECT FIXTURES — must still open the gate under the r5 rule
// ---------------------------------------------------------------------------

for (const id of ["dpia-perfect-eu-complete", "dpia-perfect-uk-complete"]) {
  Deno.test(`r5: ${id} still opens the truth gate`, () => {
    const fx = byId(DPIA_PERFECT as never, id);
    const t = gateDpia(fx.intake);
    if (!t.value) console.error(id, "unanswered asks:", t.empty_required_keys);
    assertEquals(t.failed_conditions, [], JSON.stringify(t.empty_required_keys));
    assertEquals(t.value, true);
  });
}

Deno.test("r5: risk-perfect-complete still opens the truth gate", () => {
  const fx = byId(CPPA_RISK_PERFECT as never, "risk-perfect-complete");
  const t = gateRisk(fx.intake);
  if (!t.value) console.error("risk-perfect-complete unanswered asks:", t.empty_required_keys);
  assertEquals(t.failed_conditions, [], JSON.stringify(t.empty_required_keys));
  assertEquals(t.value, true);
});

Deno.test("r5: stamps are bumped", () => {
  assertEquals(RECORD_COMPLETE_VERSION, "record-complete-2026-08-05-item380r5");
  assertEquals(RISK_PIPELINE_STAMP, "risk-pipeline@item380r5-2026-08-05");
});
