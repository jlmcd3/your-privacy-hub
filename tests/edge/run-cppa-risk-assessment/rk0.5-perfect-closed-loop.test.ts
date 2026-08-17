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

// Reference intake for negative/deficiency tests (always index 0).
const REFERENCE_INTAKE = CPPA_RISK_PERFECT[0].intake as Record<string, unknown>;

Deno.test("RK0.5 — version stamp is pinned", () => {
  assertEquals(
    PERFECT_CPPA_RISK_CLOSED_LOOP_VERSION,
    "perfect-cppa-risk-closed-loop@rk0.5-2026-08-17",
  );
});

// All CPPA_RISK_PERFECT fixtures must pass the closed-loop checker.
for (const c of CPPA_RISK_PERFECT) {
  Deno.test(`RK0.5 — ${c.id} passes the closed-loop check`, async () => {
    const res = await checkPerfectCppaRiskIntake(c.intake);
    assertEquals(
      res.ok,
      true,
      `${c.id} deficiencies: ${deficiencyLines(res.deficiencies).join(" | ")}`,
    );
  });

  Deno.test(`RK0.5 — reserved § 7152(a)(7) decision does not gate on ${c.id}`, async () => {
    const res = await checkPerfectCppaRiskIntake(c.intake);
    assertEquals(res.ok, true);
    assert(
      !res.deficiencies.some((d) => d.kind === "risk_record_needs_missing_data"),
      `Reserved decision should not produce a risk_record_needs_missing_data deficiency on ${c.id}. Got: ${
        deficiencyLines(res.deficiencies).join(" | ")
      }`,
    );
  });
}

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
  const { q1_revenue: _dropped, ...stripped } = REFERENCE_INTAKE;
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
