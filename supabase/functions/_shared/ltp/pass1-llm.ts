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

export const PASS1_LLM_STAMP = "ltp-pass1-llm-2026-07-26";
export const PASS1_MODEL = "google/gemini-3.6-flash";
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

async function callGateway(body: unknown): Promise<Response> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("missing_LOVABLE_API_KEY");
  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });
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
  // ENGINE B ALWAYS ON (CEO ruling 2026-07-27; ledger item 170).
  // LTP_ENFORCE_ENABLED and every mode branch removed. The Legal Test
  // Pipeline is the ONLY composition path. Safety = conservative
  // write-around per §16/§28 (LEGAL-TEST-PIPELINE.md).


  let lastErr = "";
  for (let attempt = 1; attempt <= PASS1_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await callGateway({
        model: PASS1_MODEL,
        messages: [
          { role: "system", content: PASS1_DERIVE_SYSTEM },
          { role: "user", content: fillUserTemplate(input) },
        ],
        response_format: { type: "json_object" },
      });
      if (!res.ok) {
        lastErr = `gateway_${res.status}`;
        await res.text().catch(() => "");
        continue;
      }
      const payload = await res.json();
      const raw = payload?.choices?.[0]?.message?.content;
      if (!raw) { lastErr = "empty_content"; continue; }
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
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
