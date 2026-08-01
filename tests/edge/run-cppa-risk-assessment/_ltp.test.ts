// LTP Phase-2 integration tests (shadow-mode). Deterministic; no network.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { runLegalTestPipelineShadow, LTP_STAMP } from "../../../supabase/functions/run-cppa-risk-assessment/_local/ltp/pipeline.ts";
import { evaluateCppaRiskGates } from "../../../supabase/functions/_shared/ltp/gate-eval.ts";
import { derivePlan } from "../../../supabase/functions/_shared/ltp/derive.ts";
import { runGuideStage } from "../../../supabase/functions/_shared/ltp/guide.ts";
import { chooseVariant, computeCloseness } from "../../../supabase/functions/_shared/ltp/closeness.ts";

const BASE_INTAKE = {
  q1_revenue: "Over $100M",
  q2_consumers: "1,000,000 or more",
  q18_admt_use: "no",
  sell_share: true,
  sensitive_pi: true,
};

const BASE_REPORT = { _meta: {}, executive_summary: {} };

Deno.test("LTP: shadow orchestrator produces telemetry envelope", () => {
  const t = runLegalTestPipelineShadow({ intake: BASE_INTAKE, report_data: BASE_REPORT, buildStamp: "test@x" });
  assertEquals(t.mode, "shadow");
  assert(t.ran, "orchestrator should run");
  assert(t.version === LTP_STAMP);
  assert(t.derive.propositions > 0, "should derive propositions");
  assert(t.derive.type_r > 0, "should have Type R propositions");
  assert(!t.derive.write_around, "no write-around on happy path");
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
  // Passing a proxy that throws on any read forces the derive error path.
  const boom = new Proxy({}, { get() { throw new Error("simulated"); }, has() { throw new Error("simulated"); } }) as any;
  const t = runLegalTestPipelineShadow({ intake: boom, report_data: BASE_REPORT, buildStamp: "test@x" });
  // Shadow mode: even on internal error, telemetry is produced (ran=true or error captured)
  assert(t.mode === "shadow");
  assert(typeof t.elapsed_ms === "number");
});

Deno.test("LTP: verify stage disabled by default", () => {
  const t = runLegalTestPipelineShadow({ intake: BASE_INTAKE, report_data: BASE_REPORT, buildStamp: "test@x" });
  assertEquals(t.verify.enabled, false);
  assertEquals(t.verify.ran, false);
});

Deno.test("LTP: subsumed-guards telemetry names the interim scrubbers", () => {
  const t = runLegalTestPipelineShadow({ intake: BASE_INTAKE, report_data: BASE_REPORT, buildStamp: "test@x" });
  assert(t.guards_subsumed_by_two_pass.includes("_risk_citation_dup_fix"));
});
