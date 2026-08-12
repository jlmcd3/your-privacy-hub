// PROMPT 9C items 3 + 4 — repair-mode retry and perfect-variant fail-fast.
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  emptyIntakeGenProgress,
  generateValidatedIntakesChunked,
  screenIntake,
} from "../../../supabase/functions/run-quality-batch/index.ts";

// A contract-valid dpia intake, so the lint path (not contract validation) is
// what the repair assertions exercise.
function validIntake(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    organization_name: "Britannia Mutual",
    processing_activity_name: "Workforce sentiment analytics",
    purpose: "To understand how staff experience organisational change.",
    description: "Weekly sentiment scoring of internal survey free-text.",
    data_categories: ["Contact details", "Employment data"],
    data_subjects: "Employees",
    volume_frequency: "About 3,000 employees, weekly.",
    jurisdictions: ["UK (UK GDPR)"],
    legal_basis_proposed: "Legitimate interests (Art. 6(1)(f))",
    necessity_proportionality: "Only free-text survey responses are scored.",
    retention_period: "12 months from collection",
    data_minimisation_justification: "Only the survey text is processed.",
    data_quality_measures: "Survey exports are reconciled weekly.",
    data_subject_rights_mechanisms: "Requests arrive through the HR portal.",
    dp_by_design_measures: "Pseudonymisation at ingest.",
    existing_safeguards: ["Encryption at rest", "Access controls"],
    third_party_processors: ["Acme Cloud"],
    processor_obligations: "Processing only on documented instructions.",
    transfer_flows: [],
    secondary_uses: "None",
    ...over,
  };
}

Deno.test("9C item 3: the repair prompt carries the rejected intake verbatim", async () => {
  const rejected = validIntake();
  const prompts: string[] = [];
  await screenIntake(
    "dpia",
    rejected,
    (x: any) => (x.dpia_prepared_by ? null : { reason: "sign-off block incomplete", deficiencies: [] }),
    undefined,
    async (_t, _n, guidance) => {
      prompts.push(guidance ?? "");
      return [validIntake({ dpia_prepared_by: "R. Shah" })];
    },
  );
  assertEquals(prompts.length, 1);
  assertStringIncludes(prompts[0], "REPAIR MODE");
  assertStringIncludes(prompts[0], "change nothing else");
  assertStringIncludes(prompts[0], JSON.stringify(rejected));
});

Deno.test("9C item 3: a repairable rejection preserves every non-deficient field byte-identical", async () => {
  const rejected = validIntake();
  const repaired = await screenIntake(
    "dpia",
    rejected,
    (x: any) => (x.dpia_prepared_by ? null : { reason: "sign-off block incomplete", deficiencies: [] }),
    undefined,
    // Simulates a compliant model: echoes the object back, adds only the deficiency.
    async (_t, _n, guidance) => {
      const json = (guidance ?? "").split("REJECTED INTAKE JSON:\n")[1];
      return [{ ...JSON.parse(json), dpia_prepared_by: "R. Shah" }];
    },
  );
  if (!repaired.ok) throw new Error(`expected repair to succeed: ${repaired.reason}`);
  for (const k of Object.keys(rejected)) {
    assertEquals(JSON.stringify(repaired.intake[k]), JSON.stringify(rejected[k]), `field drifted: ${k}`);
  }
  assertEquals(repaired.intake.dpia_prepared_by, "R. Shah");
});

Deno.test("9C item 4: perfect variant aborts after the first rejected scenario", async () => {
  let generated = 0;
  const reasons: (string | undefined)[] = [];
  const { progress, status } = await generateValidatedIntakesChunked("dpia", 5, emptyIntakeGenProgress(), {
    deadlineAt: Number.MAX_SAFE_INTEGER,
    variant: "perfect",
    _now: () => 0,
    _generate: async () => { generated++; return [{ organization_name: `Co${generated}` }]; },
    _screen: async () => ({ ok: false as const, reason: "closed-loop perfect: alternatives_considered missing" }),
    onScenario: async (_d, _t, _s, ok, reason) => { if (!ok) reasons.push(reason); },
  });
  assertEquals(status, "complete");
  assertEquals(generated, 1);
  assertEquals(progress.totalAttempted, 1);
  assertEquals(progress.rejected.length, 1);
  assertStringIncludes(reasons[0] ?? "", "alternatives_considered missing");
});

Deno.test("9C item 4: non-perfect variants keep the full-count behaviour", async () => {
  let generated = 0;
  const { progress, status } = await generateValidatedIntakesChunked("dpia", 3, emptyIntakeGenProgress(), {
    deadlineAt: Number.MAX_SAFE_INTEGER,
    variant: null,
    _now: () => 0,
    _generate: async () => { generated++; return [{ organization_name: `Co${generated}` }]; },
    _screen: async () => ({ ok: false as const, reason: "contract violation" }),
  });
  assertEquals(status, "complete");
  assertEquals(generated, 3);
  assertEquals(progress.rejected.length, 3);
});
