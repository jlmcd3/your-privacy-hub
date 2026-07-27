/**
 * LTP — LEGAL TEST PIPELINE ORCHESTRATOR.
 *
 * ENGINE B ALWAYS ON (CEO ruling 2026-07-27; ledger item 170; verbatim:
 * "Engine B has to ALWAYS be on. Where we apply it and how are the tricky
 * parts, but the Legal Test is what frames the initial trajectory of the
 * report, and without that, we lose the trajectory.").
 *
 * The mode toggle (LTP_ENFORCE_ENABLED, `ltpMode()`, "shadow" vs "enforce"
 * telemetry label) is REMOVED. The pipeline is the sole composition path;
 * degradation is per-section conservative write-around, never a fallback
 * to a non-Legal-Test composition state. See LEGAL-TEST-PIPELINE.md §16
 * (simplified: version-mismatch, not mode-mismatch) and §28 (switch
 * removal is the mandatory terminus of every product's shadow phase).
 *
 * Never throws; failures are captured on the envelope and never bubble up.
 */
import { derivePlan } from "./derive.ts";
import { runGuideStage } from "./guide.ts";
import { chooseVariant, computeCloseness } from "./closeness.ts";
import { runVerifyStage } from "./verify.ts";
import { validateRenderPlan } from "../render-plan/validators.ts";
import { WEIGHING_TESTS } from "../factors/cppa-risk-factors.ts";
import { PASS1_DERIVE_PROMPT_VERSION } from "./content/pass1-derive-prompt.ts";
import { PASS2_TEMPLATES_VERSION } from "./content/pass2-templates.ts";
import { RENDERPLAN_WIRE_SCHEMA_VERSION } from "./content/renderplan-wire-schema.ts";

export const LTP_STAMP = "ltp-risk-p2";

/**
 * Content-set versions carried on every generation for §16 version-match
 * assertion (replaces mode-match). Batches assert presence + equality of
 * these fields against the harness-declared expectation.
 */
export const LTP_PIPELINE_VERSION = LTP_STAMP;
export const LTP_CONTENT_VERSIONS = {
  pipeline: LTP_PIPELINE_VERSION,
  pass1_prompt: PASS1_DERIVE_PROMPT_VERSION,
  pass2_templates: PASS2_TEMPLATES_VERSION,
  renderplan_wire_schema: RENDERPLAN_WIRE_SCHEMA_VERSION,
} as const;

export interface LtpTelemetry {
  readonly version: string;
  readonly pipeline_version: string;
  readonly content_versions: typeof LTP_CONTENT_VERSIONS;
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

/**
 * Run the derive/guide/closeness/verify orchestrator and return a compact
 * telemetry envelope. Engine B always on; no mode branching.
 */
export function runLegalTestPipeline(input: RunLtpInput): LtpTelemetry {
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
      pipeline_version: LTP_PIPELINE_VERSION,
      content_versions: LTP_CONTENT_VERSIONS,
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
      pipeline_version: LTP_PIPELINE_VERSION,
      content_versions: LTP_CONTENT_VERSIONS,
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

/**
 * @deprecated Retained as a thin alias for callers not yet migrated to
 * `runLegalTestPipeline`. Both produce identical output — there is no
 * shadow arm anymore. Remove call sites, then remove this alias.
 */
export const runLegalTestPipelineShadow = runLegalTestPipeline;
