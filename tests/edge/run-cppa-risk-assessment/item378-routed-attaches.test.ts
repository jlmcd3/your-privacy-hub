// ITEM 378 (CORRECTION) — the three item378 attaches must land on the ROUTED
// LTP path. This test builds a document through the shared LTP generator
// (the finalize point every completed cppa-risk document passes through) with
// stubbed models, and asserts the stamp, refinement telemetry, and CSC
// telemetry are all present on the persisted payload.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  generateCppaRiskReport,
  runCppaRiskPass2R,
  RISK_PIPELINE_STAMP,
} from "../../../supabase/functions/_shared/ltp/generate-cppa-risk.ts";

const INTAKE = {
  organization_name: "Sierra Outfitters",
  q1_revenue: "Over $100M",
  q2_consumers: "1,000,000 or more",
  q18_admt_use: "no",
  sell_share: true,
  sensitive_pi: true,
};

// Stubbed models: critic returns no findings, verifier is never reached.
const STUB_DEPS = {
  critic: () => Promise.resolve(JSON.stringify({ findings: [], structural_findings: [] })),
  verifier: () => Promise.resolve(JSON.stringify({ verdicts: [] })),
};

function internalOf(report: Record<string, unknown>): Record<string, unknown> {
  const meta = (report._meta ?? {}) as Record<string, unknown>;
  return (meta.internal ?? {}) as Record<string, unknown>;
}

function bucketSum(telemetry: Record<string, unknown>): number {
  const protectedRejected = telemetry.protected_rejected as { count?: number } | undefined;
  return Number(telemetry.spliced ?? 0) +
    Number(telemetry.verifier_rejected ?? 0) +
    Number(protectedRejected?.count ?? 0) +
    Number(telemetry.quote_drift ?? 0) +
    Number(telemetry.cap_overflow ?? 0);
}

Deno.test("routed LTP finalize carries stamp + refinement + csc (deterministic pass1)", async () => {
  const options = {
    buildStamp: "test@item378-correction",
    runId: "test-run",
    mode: "enforce" as const,
    pass1: "deterministic" as const,
    callerName: "test",
    pass2rEnabled: false,
    refinementDeps: STUB_DEPS,
  };
  const gen = await generateCppaRiskReport(INTAKE, options);
  const internal = internalOf(gen.report);

  assertEquals(internal.engine_path, "ltp");
  assertEquals(internal.risk_pipeline_stamp, RISK_PIPELINE_STAMP);
  assert(internal.risk_refinement, "risk_refinement telemetry must be present");
  assert(internal.risk_csc, "risk_csc telemetry must be present");
});

Deno.test("routed LTP Pass-2R payload also carries all three attaches", async () => {
  const options = {
    buildStamp: "test@item378-correction",
    runId: "test-run-2",
    mode: "enforce" as const,
    pass1: "deterministic" as const,
    callerName: "test",
    // Pass-2R runs but the stubbed call yields no prose -> deterministic ship.
    pass2rCall: () => Promise.resolve(""),
    refinementDeps: STUB_DEPS,
  };
  const gen = await generateCppaRiskReport(INTAKE, options);
  const p2 = await runCppaRiskPass2R(gen, options);
  const report = p2.report ?? gen.report;
  const internal = internalOf(report);

  assertEquals(internal.risk_pipeline_stamp, RISK_PIPELINE_STAMP);
  assert(internal.risk_refinement, "risk_refinement telemetry must be present");
  assert(internal.risk_csc, "risk_csc telemetry must be present");
});

Deno.test("routed LTP persist-first carries balanced fail-open telemetry when critic throws", async () => {
  const options = {
    buildStamp: "test@item378-correction-2",
    runId: "test-run-critic-error",
    mode: "enforce" as const,
    pass1: "deterministic" as const,
    callerName: "test",
    refinementDeps: {
      critic: () => Promise.reject(new Error("critic unavailable")),
      verifier: () => Promise.resolve(JSON.stringify({ verdicts: [] })),
    },
  };
  const gen = await generateCppaRiskReport(INTAKE, options);
  const telemetry = internalOf(gen.report).risk_refinement as Record<string, unknown>;

  assert(telemetry, "risk_refinement telemetry must be unconditional");
  assertEquals(telemetry.enabled, true);
  assert(String(telemetry.crashed).startsWith("critic_error:"));
  assertEquals(bucketSum(telemetry), Number(telemetry.critic_findings));
});
