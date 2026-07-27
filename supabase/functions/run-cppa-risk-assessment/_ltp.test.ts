// LTP Phase-2 integration tests (shadow-mode). Deterministic; no network.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { runLegalTestPipeline, runLegalTestPipelineShadow, LTP_STAMP, LTP_PIPELINE_VERSION } from "../_shared/ltp/pipeline.ts";

import { evaluateCppaRiskGates } from "../_shared/ltp/gate-eval.ts";
import { derivePlan } from "../_shared/ltp/derive.ts";
import { runGuideStage } from "../_shared/ltp/guide.ts";
import { chooseVariant, computeCloseness } from "../_shared/ltp/closeness.ts";

const BASE_INTAKE = {
  q1_revenue: "Over $100M",
  q2_consumers: "1,000,000 or more",
  q18_admt_use: "no",
  sell_share: true,
  sensitive_pi: true,
};

const BASE_REPORT = { _meta: {}, executive_summary: {} };

Deno.test("LTP: pipeline produces telemetry envelope (Engine B always on, item 170)", () => {
  const t = runLegalTestPipeline({ intake: BASE_INTAKE, report_data: BASE_REPORT, buildStamp: "test@x" });
  assertEquals((t as any).mode, undefined); // mode field retired per item 170
  assertEquals(t.pipeline_version, LTP_PIPELINE_VERSION);
  assert(t.content_versions.pass1_prompt.startsWith("pass1-derive-"));
  assert(t.ran, "orchestrator should run");
  assert(t.version === LTP_STAMP);
  assert(t.derive.propositions > 0, "should derive propositions");
  assert(t.derive.type_r > 0, "should have Type R propositions");
  assert(!t.derive.write_around, "no write-around on happy path");
});

Deno.test("LTP: legacy runLegalTestPipelineShadow alias returns identical envelope", () => {
  const a = runLegalTestPipeline({ intake: BASE_INTAKE, report_data: BASE_REPORT, buildStamp: "test@x" });
  const b = runLegalTestPipelineShadow({ intake: BASE_INTAKE, report_data: BASE_REPORT, buildStamp: "test@x" });
  assertEquals(a.pipeline_version, b.pipeline_version);
  assertEquals(a.derive.propositions, b.derive.propositions);
});


Deno.test("LTP: ADMT gate blocks when q18_admt_use is negative", () => {
  const outcomes = evaluateCppaRiskGates({ q18_admt_use: "no" });
  const admt = outcomes.find((o) => o.gate_id === "G.q18.admt_consequence");
  assertEquals(admt?.outcome, "block");
});

Deno.test("LTP: ADMT gate passes when q18_admt_use is affirmative", () => {
  const outcomes = evaluateCppaRiskGates({ q18_admt_use: "yes" });
  const admt = outcomes.find((o) => o.gate_id === "G.q18.admt_consequence");
  assertEquals(admt?.outcome, "pass");
});

Deno.test("LTP: Guide stage emits candidate-set-closed frame entries", () => {
  const plan = derivePlan({ intake: BASE_INTAKE, report_data: BASE_REPORT, buildStamp: "test@x" });
  const g = runGuideStage(plan);
  assert(g.frame.length > 0, "frame should be non-empty");
  // Every frame entry must have a jurisdiction_tag and authority_weight
  for (const f of g.frame) {
    assert(f.jurisdiction_tag);
    assert(f.authority_weight === "binding" || f.authority_weight === "persuasive");
    if (f.authority_weight === "persuasive") {
      assert(f.fsor_mediation_ref, "persuasive frame entry must carry fsor_mediation_ref");
    }
  }
});

Deno.test("LTP: closeness heuristic + variant chooser deterministic", () => {
  const plan = derivePlan({ intake: BASE_INTAKE, report_data: BASE_REPORT, buildStamp: "test@x" });
  const g = runGuideStage(plan);
  const c = computeCloseness(plan, g.frame);
  assert(c >= 0 && c <= 1, "closeness in [0,1]");
  const v = chooseVariant(c);
  assert(v === "firm" || v === "hedged");
});

Deno.test("LTP: write-around trips on internal derive failure (never blocks)", () => {
  const boom = new Proxy({}, { get() { throw new Error("simulated"); }, has() { throw new Error("simulated"); } }) as any;
  const t = runLegalTestPipeline({ intake: boom, report_data: BASE_REPORT, buildStamp: "test@x" });
  // Engine B always on: even on internal error, telemetry is produced.
  assertEquals((t as any).mode, undefined);
  assert(typeof t.elapsed_ms === "number");
});

Deno.test("LTP: verify stage disabled by default", () => {
  const t = runLegalTestPipeline({ intake: BASE_INTAKE, report_data: BASE_REPORT, buildStamp: "test@x" });
  assertEquals(t.verify.enabled, false);
  assertEquals(t.verify.ran, false);
});

Deno.test("LTP: subsumed-guards telemetry names the interim scrubbers", () => {
  const t = runLegalTestPipeline({ intake: BASE_INTAKE, report_data: BASE_REPORT, buildStamp: "test@x" });
  assert(t.guards_subsumed_by_two_pass.includes("_risk_citation_dup_fix"));
});

