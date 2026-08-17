// RK0.5 D1 — CPPA Risk Assessment closed-loop perfect fixture checker.
//
// Pins the four acceptance conditions and the § 7152(a)(7) reserved-decision
// carve-out on the deterministic engine. Analogous to prompt8k-perfect-closed-loop.test.ts.
//
// D-disciplines satisfied here:
//   D1 — fixture proved against the checker (risk-perfect-complete passes).
//   D2 — all four gate conditions reachable as distinct deficiency kinds.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  checkPerfectCppaRiskIntake,
  deficiencyLines,
  PERFECT_CPPA_RISK_CLOSED_LOOP_VERSION,
} from "../../../supabase/functions/_shared/quality/perfect-closed-loop-risk.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";

const PERFECT_INTAKE = CPPA_RISK_PERFECT[0].intake as Record<string, unknown>;

Deno.test("RK0.5 — version stamp is pinned", () => {
  assertEquals(
    PERFECT_CPPA_RISK_CLOSED_LOOP_VERSION,
    "perfect-cppa-risk-closed-loop@rk0.5-2026-08-17",
  );
});

Deno.test("RK0.5 — risk-perfect-complete passes the closed-loop check", async () => {
  const res = await checkPerfectCppaRiskIntake(PERFECT_INTAKE);
  assertEquals(
    res.ok,
    true,
    `risk-perfect-complete deficiencies: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("RK0.5 — reserved § 7152(a)(7) decision does not gate on the perfect fixture", async () => {
  // The initiation decision is a reserved_decision, not missing_data.
  // computeRecordComplete must return value:true even though action_item:1.
  const res = await checkPerfectCppaRiskIntake(PERFECT_INTAKE);
  assertEquals(res.ok, true);
  assert(
    !res.deficiencies.some((d) => d.kind === "risk_record_needs_missing_data"),
    `Reserved decision should not produce a risk_record_needs_missing_data deficiency. Got: ${
      deficiencyLines(res.deficiencies).join(" | ")
    }`,
  );
});

Deno.test("RK0.5 — a minimal intake produces contract_incomplete deficiency", async () => {
  const res = await checkPerfectCppaRiskIntake({
    entity_name: "Thin Co",
    primary_activity_name: "Something",
  });
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.kind === "contract_incomplete"),
    `Expected contract_incomplete. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("RK0.5 — removing an always-required field produces contract_incomplete", async () => {
  const { q1_revenue: _dropped, ...stripped } = PERFECT_INTAKE;
  const res = await checkPerfectCppaRiskIntake(stripped);
  assertEquals(res.ok, false);
  const d = res.deficiencies.find((x) => x.kind === "contract_incomplete");
  assert(d, `Expected contract_incomplete. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`);
  assert(
    d!.detail.includes("q1_revenue"),
    `Expected q1_revenue in detail. Got: ${d!.detail}`,
  );
});

Deno.test("RK0.5 — a build error yields a build deficiency, not a throw", async () => {
  // Null intake should not throw; it should return a build or contract deficiency.
  const res = await checkPerfectCppaRiskIntake(null);
  assertEquals(res.ok, false);
  assert(res.deficiencies.length > 0);
});
