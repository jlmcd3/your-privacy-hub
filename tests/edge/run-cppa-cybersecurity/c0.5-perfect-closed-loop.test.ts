// Cyber conversion C0.5 D1 — CPPA Cybersecurity closed-loop perfect fixture
// checker.
//
// Pins the deliverables-builder-based acceptance conditions and the
// "determination is not a rejection reason" carve-out. Analogous to
// rk0.5-perfect-closed-loop.test.ts, but exercises `buildCyberDeliverables`
// directly rather than a deterministic engine mode (which doesn't exist yet
// for cyber — see perfect-closed-loop-cyber.ts's header).
//
// D-disciplines satisfied here:
//   D1 — fixture proved against the checker (CYBER_PERFECT passes).
//   D2 — every reachable deficiency kind is exercised at least once.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  checkPerfectCppaCyberIntake,
  deficiencyLines,
  PERFECT_CPPA_CYBER_CLOSED_LOOP_VERSION,
} from "../../../supabase/functions/_tests/quality/perfect-closed-loop-cyber.ts";
import { CYBER_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-cyber.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";

// Reference intake for negative/deficiency tests (always index 0).
const REFERENCE_INTAKE = CYBER_PERFECT[0].intake as Record<string, unknown>;

Deno.test("C0.5 — version stamp is pinned", () => {
  assertEquals(
    PERFECT_CPPA_CYBER_CLOSED_LOOP_VERSION,
    "perfect-cppa-cyber-closed-loop@c0.5-2026-08-23",
  );
});

// Every CYBER_PERFECT fixture must pass the closed-loop checker.
for (const c of CYBER_PERFECT) {
  Deno.test(`C0.5 — ${c.id} passes the closed-loop check`, () => {
    const res = checkPerfectCppaCyberIntake(c.intake);
    assertEquals(
      res.ok,
      true,
      `${c.id} deficiencies: ${deficiencyLines(res.deficiencies).join(" | ")}`,
    );
  });

  Deno.test(`C0.5 — ${c.id} reaches conclusion "ready" (perfect data does not hedge)`, () => {
    const built = buildCyberDeliverables(c.intake);
    // Every component here is at max maturity with testable evidence — the
    // strongest conclusion, not a hedge. This is the DPIA-analog "perfect
    // data reaches a clean determination" proof, not the same thing as the
    // checker's ok:true (which only proves the record isn't INSUFFICIENT —
    // "not_ready"/"ready_subject_to_named_remediation" would also be ok:true
    // on a complete record, per the header's carve-out note).
    assertEquals(
      built.readiness_determination.conclusion,
      "ready",
      `reasoning: ${built.readiness_determination.reasoning}`,
    );
    assertEquals(built.readiness_determination.blocking_components.length, 0);
    assertEquals(built.readiness_determination.unassessable_components.length, 0);
  });
}

Deno.test("C0.5 — an intake with zero controls produces one insufficient deficiency per § 7123(c) component (18)", () => {
  const res = checkPerfectCppaCyberIntake({
    profile: { entity_name: "Thin Co" },
    controls: [],
  });
  assertEquals(res.ok, false);
  const componentDeficiencies = res.deficiencies.filter(
    (d) => d.kind === "insufficient" && d.detail.startsWith("component_coverage:"),
  );
  assertEquals(
    componentDeficiencies.length,
    18,
    `Expected 18 component_coverage insufficiencies. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("C0.5 — a control with an unrecognized maturity value produces a component_coverage insufficiency", () => {
  const stripped = {
    ...REFERENCE_INTAKE,
    controls: (REFERENCE_INTAKE.controls as Array<Record<string, unknown>>).map((c) =>
      c.key === "c1_auth" ? { ...c, maturity: "" } : c
    ),
  };
  const res = checkPerfectCppaCyberIntake(stripped);
  assertEquals(res.ok, false);
  const d = res.deficiencies.find((x) => x.detail.includes("c1_auth"));
  assert(d, `Expected a c1_auth deficiency. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`);
});

Deno.test("C0.5 — a build error yields a build deficiency, not a throw", () => {
  // Null intake should not throw; it should return a build or insufficient deficiency.
  const res = checkPerfectCppaCyberIntake(null);
  assertEquals(res.ok, false);
  assert(res.deficiencies.length > 0);
});

Deno.test("C0.5 — an empty-object intake does not throw and is not ok", () => {
  const res = checkPerfectCppaCyberIntake({});
  assertEquals(res.ok, false);
  assert(res.deficiencies.length > 0);
});
