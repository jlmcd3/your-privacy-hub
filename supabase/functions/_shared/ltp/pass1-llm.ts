/**
 * LTP Pass-1 LLM Adapter (Wave-B enforcement mode).
 *
 * Invokes Lovable AI gateway with the change-controlled Pass-1 prompt
 * (pass1-derive-prompt.ts) requesting structured output conforming to
 * the wire schema (renderplan-wire-schema.ts). Validates via
 * validateRenderPlan; N=2 retry per CEO Q2; on final failure returns
 * conservative_write_around=true and NEVER throws to caller.
 *
 * NOTE — SHADOW-PREVIEW GATING (Wave-B item 143c partial):
 * The customer report_data path continues to consume derivePlan() output.
 * Pass-1 LLM output is exposed via enforce.ts only under
 * _meta.internal.legal_test_pipeline.enforce_preview for wave-comparison
 * telemetry until the assessment_summary composition rule lands.
 */
import { derivePlan, type DeriveInput } from "./derive.ts";
import type { RenderPlan } from "../render-plan/schema.ts";
import { validateRenderPlan } from "../render-plan/validators.ts";
import { WEIGHING_TESTS } from "../factors/cppa-risk-factors.ts";
import { CPPA_RISK_CONCLUSIONS } from "../legal-test/cppa-risk-conclusions.ts";
import { CPPA_RISK_FACTORS } from "../factors/cppa-risk-factors.ts";
import { CPPA_RISK_GATES } from "../gates/cppa-risk-gates.ts";
import { RENDERPLAN_WIRE_SCHEMA } from "./content/renderplan-wire-schema.ts";
import {
  PASS1_DERIVE_SYSTEM,
  PASS1_DERIVE_USER_TEMPLATE,
  PASS1_DERIVE_PROMPT_VERSION,
} from "./content/pass1-derive-prompt.ts";
import { callAnthropicWithContinuation } from "../anthropic-call.ts";

export const PASS1_LLM_STAMP = "ltp-pass1-llm-2026-07-27-anthropic-direct";
// CEO Q3 same-model ruling (PRE-WAVED-EMITTER-FIXES-2026-07-27): Pass-1
// runs on the same generator model as run-cppa-risk-assessment
// (claude-sonnet-4-6, called via the shared Anthropic client, bypassing
// the Lovable AI gateway which does not serve Anthropic models).
export const PASS1_MODEL = "claude-sonnet-4-6";
export const PASS1_MAX_ATTEMPTS = 2;

export interface Pass1Telemetry {
  readonly ran: boolean;
  readonly attempts: number;
  readonly ok: boolean;
  readonly latency_ms: number;
  readonly write_around: boolean;
  readonly validator_issues: number;
  readonly error?: string;
}

export interface Pass1Result {
  readonly plan: RenderPlan;
  readonly telemetry: Pass1Telemetry;
}

function fillUserTemplate(input: DeriveInput): string {
  return PASS1_DERIVE_USER_TEMPLATE
    .replace("{intake_json}", JSON.stringify(input.intake ?? {}))
    .replace("{conclusion_inventory}", JSON.stringify(CPPA_RISK_CONCLUSIONS))
    .replace("{factor_registry}", JSON.stringify(CPPA_RISK_FACTORS))
    .replace("{gate_registry}", JSON.stringify(CPPA_RISK_GATES))
    .replace("{response_schema}", JSON.stringify(RENDERPLAN_WIRE_SCHEMA));
}

async function callPass1Model(system: string, user: string): Promise<string> {
  // PRE-WAVED-EMITTER-FIXES-2026-07-27 (CEO Q3): direct Anthropic client;
  // gateway path retired for Pass-1 because the Lovable AI gateway does
  // not serve Anthropic models and the CEO same-model ruling requires
  // Pass-1 to run on the generator's model.
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("missing_ANTHROPIC_API_KEY");
  const res = await callAnthropicWithContinuation({
    model: PASS1_MODEL,
    system,
    user,
    maxTokens: 8000,
    label: "ltp-pass1-derive",
    callerName: "run-cppa-risk-assessment",
    product: "cppa-risk-assessment",
  });
  return res.text;
}

function writeAroundPlan(input: DeriveInput, reason: string): RenderPlan {
  const shadow = derivePlan(input);
  return {
    ...shadow,
    conservative_write_around: { triggered: true, reason, disclosure: "silent+telemetry" },
  };
}

/**
 * Run Pass-1 with N=2 retries. On terminal failure, returns the shadow-mode
 * derive plan with conservative_write_around triggered — customer path is
 * preserved.
 */
export async function runPass1Llm(input: DeriveInput): Promise<Pass1Result> {
  const t0 = Date.now();
  const enforceEnabled = Deno.env.get("LTP_ENFORCE_ENABLED") === "1";
  if (!enforceEnabled) {
    return {
      plan: derivePlan(input),
      telemetry: { ran: false, attempts: 0, ok: false, latency_ms: 0, write_around: false, validator_issues: 0 },
    };
  }

  // TEST-ONLY forced-degradation hook (CORRECTIONS-BUNDLE 2026-07-27,
  // ledger item 173 sub-item (c)). Production requests NEVER set this env
  // var; the smoke path in _shared/ltp/pass1-llm.test.ts asserts the
  // property. Gated by a magic token so a stray "1" cannot trip it.
  if (Deno.env.get("LTP_TEST_FORCE_WRITE_AROUND") === "unit-test-only-2026-07-27") {
    return {
      plan: writeAroundPlan(input, "test_only_forced_degradation"),
      telemetry: {
        ran: true, attempts: 0, ok: false, latency_ms: Date.now() - t0,
        write_around: true, validator_issues: 0, error: "test_only_forced_degradation",
      },
    };
  }

  let lastErr = "";
  for (let attempt = 1; attempt <= PASS1_MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callPass1Model(
        typeof PASS1_DERIVE_SYSTEM === "string" ? PASS1_DERIVE_SYSTEM : JSON.stringify(PASS1_DERIVE_SYSTEM),
        fillUserTemplate(input),
      );
      if (!raw) { lastErr = "empty_content"; continue; }
      // Anthropic returns text; extract the first JSON object.
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : raw;
      const parsed = JSON.parse(jsonText);
      // Force product + build_stamp to the caller-known values.
      const candidate: RenderPlan = {
        ...parsed,
        plan_version: "v1",
        product: "cppa-risk-assessment",
        build_stamp: input.buildStamp,
        conservative_write_around: parsed?.conservative_write_around ?? { triggered: false, disclosure: "silent+telemetry" },
      };
      const issues = validateRenderPlan(candidate, WEIGHING_TESTS);
      if (issues.length > 0) {
        lastErr = `validator_issues:${issues.length}`;
        continue;
      }
      return {
        plan: candidate,
        telemetry: {
          ran: true,
          attempts: attempt,
          ok: true,
          latency_ms: Date.now() - t0,
          write_around: false,
          validator_issues: 0,
        },
      };
    } catch (e) {
      lastErr = `exception:${(e as Error)?.message ?? "?"}`;
    }
  }

  return {
    plan: writeAroundPlan(input, lastErr || "unknown"),
    telemetry: {
      ran: true,
      attempts: PASS1_MAX_ATTEMPTS,
      ok: false,
      latency_ms: Date.now() - t0,
      write_around: true,
      validator_issues: 0,
      error: lastErr,
    },
  };
}

export const PASS1_MANIFEST = {
  stamp: PASS1_LLM_STAMP,
  prompt_version: PASS1_DERIVE_PROMPT_VERSION,
  model: PASS1_MODEL,
  max_attempts: PASS1_MAX_ATTEMPTS,
};
