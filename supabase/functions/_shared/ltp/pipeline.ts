/**
 * LTP — LEGAL TEST PIPELINE ORCHESTRATOR (Phase-2 shadow-mode).
 *
 * Sequences Derive → Guide → (deterministic render hooks) → Verify and
 * returns a compact telemetry envelope for `_meta.internal.legal_test_pipeline`
 * per LEGAL-TEST-PIPELINE.md §8. In shadow mode the customer-visible
 * report_data is NOT modified; the envelope is stashed under `_meta.internal`
 * only, which is stripped by the existing serializer whitelist.
 *
 * CEO Q2 (retry budget): Derive's shadow implementation is deterministic and
 * cannot fail beyond conservative_write_around, so N=2 is trivially satisfied;
 * the retry loop wires to the model-driven Pass-1 in a downstream turn.
 * CEO Q3 (routing): shadow mode makes no model call; enforce-mode uses the
 * same model as the existing generation call.
 *
 * Never throws; failures are captured on the envelope and never bubble up.
 */
import { derivePlan } from "./derive.ts";
import { runGuideStage } from "./guide.ts";
import { chooseVariant, computeCloseness } from "./closeness.ts";
import { runVerifyStage } from "./verify.ts";
import { validateRenderPlan } from "../render-plan/validators.ts";
import { WEIGHING_TESTS } from "../factors/cppa-risk-factors.ts";

export const LTP_STAMP = "ltp-risk-p2";

export interface LtpTelemetry {
  readonly version: string;
  readonly mode: "shadow" | "enforce";
  readonly ran: boolean;
  readonly elapsed_ms: number;
  readonly derive: {
    readonly propositions: number;
    readonly type_r: number;
    readonly type_w: number;
    readonly type_j: number;
    readonly gates_total: number;
    readonly gates_blocking: number;
    readonly write_around: boolean;
  };
  readonly guide: {
    readonly frame_entries: number;
    readonly binding: number;
    readonly persuasive: number;
    readonly empty_by_finding: readonly string[];
  };
  readonly closeness: {
    readonly score: number;
    readonly variant: "firm" | "hedged";
  };
  readonly validators: {
    readonly total_issues: number;
    readonly by_code: Readonly<Record<string, number>>;
  };
  readonly verify: {
    readonly enabled: boolean;
    readonly ran: boolean;
    readonly sections_examined: number;
    readonly yield_findings: number;
  };
  readonly guards_subsumed_by_two_pass: readonly string[];
  readonly error?: string;
}

export interface RunLtpInput {
  readonly intake: Record<string, unknown>;
  readonly report_data: Record<string, unknown>;
  readonly buildStamp: string;
}

const SUBSUMED_GUARDS = ["_risk_citation_dup_fix", "_w18_risk_vocab", "_w15_risk_va"];

export function runLegalTestPipelineShadow(input: RunLtpInput): LtpTelemetry {
  const t0 = Date.now();
  try {
    const plan = derivePlan(input);
    const guide = runGuideStage(plan);
    const planWithFrame = { ...plan, weighing_frame: guide.frame };
    const closeness = computeCloseness(planWithFrame, guide.frame);
    const variant = chooseVariant(closeness);
    const issues = validateRenderPlan(planWithFrame, WEIGHING_TESTS);
    const byCode: Record<string, number> = {};
    for (const i of issues) byCode[i.code] = (byCode[i.code] ?? 0) + 1;
    const verify = runVerifyStage(planWithFrame, guide.frame, closeness);
    const gatesBlocking = plan.gate_outcomes.filter((g) => g.outcome === "block").length;

    return {
      version: LTP_STAMP,
      mode: "shadow",
      ran: true,
      elapsed_ms: Date.now() - t0,
      derive: {
        propositions: plan.propositions.length,
        type_r: plan.propositions.filter((p) => p.epistemic_type === "R").length,
        type_w: plan.propositions.filter((p) => p.epistemic_type === "W").length,
        type_j: plan.propositions.filter((p) => p.epistemic_type === "J").length,
        gates_total: plan.gate_outcomes.length,
        gates_blocking: gatesBlocking,
        write_around: plan.conservative_write_around.triggered,
      },
      guide: {
        frame_entries: guide.frame.length,
        binding: guide.binding_count,
        persuasive: guide.persuasive_count,
        empty_by_finding: guide.empty_by_finding,
      },
      closeness: { score: closeness, variant },
      validators: { total_issues: issues.length, by_code: byCode },
      verify: {
        enabled: verify.enabled,
        ran: verify.ran,
        sections_examined: verify.sections_examined,
        yield_findings: verify.yield_findings,
      },
      guards_subsumed_by_two_pass: SUBSUMED_GUARDS,
    };
  } catch (e) {
    return {
      version: LTP_STAMP,
      mode: "shadow",
      ran: false,
      elapsed_ms: Date.now() - t0,
      derive: { propositions: 0, type_r: 0, type_w: 0, type_j: 0, gates_total: 0, gates_blocking: 0, write_around: true },
      guide: { frame_entries: 0, binding: 0, persuasive: 0, empty_by_finding: [] },
      closeness: { score: 0.5, variant: "hedged" },
      validators: { total_issues: 0, by_code: {} },
      verify: { enabled: false, ran: false, sections_examined: 0, yield_findings: 0 },
      guards_subsumed_by_two_pass: SUBSUMED_GUARDS,
      error: (e as Error)?.message ?? "unknown_error",
    };
  }
}
