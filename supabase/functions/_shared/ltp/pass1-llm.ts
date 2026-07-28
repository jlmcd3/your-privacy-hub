/**
 * LTP Pass-1 LLM Adapter — T-M9 (Item 230) ABORT-ENFORCED variant.
 *
 * Wave-B enforcement mode wired to the CEO-ruled deterministic pipeline:
 * Anthropic Messages API called directly (bypassing the Lovable AI gateway
 * which does not serve Anthropic models, per CEO Q3 same-model ruling).
 *
 * T-M9 CHANGES (2026-07-28, per Item 229/230 CEO caveat):
 *   1. Per-attempt AbortController wired into every fetch leg (including
 *      continuation and degenerate-retry). Timeout raised to 120s and made
 *      into a REAL abort — the declared cap now truly cancels the request,
 *      no matter what the upstream network stack is doing. This is the root
 *      fix for the T-M8 silent isolate death: the previous 75s value was a
 *      budget the caller never observed, so a stuck first fetch or an
 *      unbounded continuation loop could ride the isolate past the platform
 *      ceiling and die silently.
 *   2. N=2 attempts. On abort → retry. On second abort → conservative
 *      write-around with error="pass1_abort_timeout" and telemetry.error
 *      surfaced so composition-hook-audit can authorize origin
 *      "pass1_abort_timeout".
 *   3. Per-attempt telemetry (attempts_detail): elapsed_ms, continuation
 *      count, outcome (ok|abort|error). This is the empirical basis for
 *      tuning the 120s number later — no more blind budgets.
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
import {
  callAnthropicWithContinuation,
  AnthropicTimeoutError,
} from "../anthropic-call.ts";

export const PASS1_LLM_STAMP = "ltp-pass1-llm-item234-valid-plan-ships@2026-07-28";
export const PASS1_MODEL = "claude-sonnet-4-6";
export const PASS1_MAX_ATTEMPTS = 2;
export const PASS1_TIMEOUT_ENFORCED = "abort-controller"; // T-M9 ping surface

export const PASS1_ABORT_TIMEOUT_ERROR = "pass1_abort_timeout";

export interface Pass1AttemptDetail {
  readonly attempt: number;
  readonly elapsed_ms: number;
  readonly outcome: "ok" | "abort" | "error";
  readonly error?: string;
  readonly continuation_count?: number;
}

export interface Pass1Telemetry {
  readonly ran: boolean;
  readonly attempts: number;
  readonly ok: boolean;
  readonly latency_ms: number;
  readonly write_around: boolean;
  readonly validator_issues: number;
  readonly error?: string;
  readonly timeout_enforced: string;
  readonly per_attempt_timeout_ms: number;
  readonly attempts_detail: readonly Pass1AttemptDetail[];
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

async function callPass1Model(
  system: string,
  user: string,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<{ text: string; continuationCount: number }> {
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
    timeoutMs,
    abortSignal: signal,
  });
  return { text: res.text, continuationCount: res.continued ? 1 : 0 };
}

function writeAroundPlan(input: DeriveInput, reason: string): RenderPlan {
  const shadow = derivePlan(input);
  return {
    ...shadow,
    conservative_write_around: { triggered: true, reason, disclosure: "silent+telemetry" },
  };
}

function isAbort(e: unknown): boolean {
  if (e instanceof AnthropicTimeoutError) return true;
  if (e instanceof DOMException && (e.name === "AbortError" || e.name === "TimeoutError")) return true;
  const msg = (e as Error)?.message ?? "";
  return /abort|timeout|generation_timeout/i.test(msg);
}

/**
 * Run Pass-1 with N=2 abort-enforced attempts. On terminal abort/exhaustion,
 * returns the shadow-mode derive plan with conservative_write_around
 * triggered and telemetry.error set so composition-hook-audit can authorize
 * the write-around origin. Never throws to caller.
 */
export async function runPass1Llm(
  input: DeriveInput,
  opts: { maxAttempts?: number; timeoutMs?: number } = {},
): Promise<Pass1Result> {
  const t0 = Date.now();
  const perAttemptTimeoutMs = Math.max(1_000, opts.timeoutMs ?? 120_000);
  const enforceEnabled = Deno.env.get("LTP_ENFORCE_ENABLED") === "1";
  if (!enforceEnabled) {
    return {
      plan: derivePlan(input),
      telemetry: {
        ran: false, attempts: 0, ok: false, latency_ms: 0, write_around: false,
        validator_issues: 0, timeout_enforced: PASS1_TIMEOUT_ENFORCED,
        per_attempt_timeout_ms: perAttemptTimeoutMs, attempts_detail: [],
      },
    };
  }

  // TEST-ONLY forced-degradation hook (CORRECTIONS-BUNDLE 2026-07-27, ledger
  // item 173 sub-item (c)). Production requests NEVER set this env var.
  if (Deno.env.get("LTP_TEST_FORCE_WRITE_AROUND") === "unit-test-only-2026-07-27") {
    return {
      plan: writeAroundPlan(input, "test_only_forced_degradation"),
      telemetry: {
        ran: true, attempts: 0, ok: false, latency_ms: Date.now() - t0,
        write_around: true, validator_issues: 0, error: "test_only_forced_degradation",
        timeout_enforced: PASS1_TIMEOUT_ENFORCED,
        per_attempt_timeout_ms: perAttemptTimeoutMs, attempts_detail: [],
      },
    };
  }

  const details: Pass1AttemptDetail[] = [];
  let lastErr = "";
  let allAborted = true; // remains true only if every attempt aborted
  const maxAttempts = Math.max(1, Math.min(opts.maxAttempts ?? PASS1_MAX_ATTEMPTS, PASS1_MAX_ATTEMPTS));
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptT0 = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      try { ctrl.abort(new DOMException(`pass1_attempt_${attempt}_timeout`, "TimeoutError")); } catch { /* noop */ }
    }, perAttemptTimeoutMs);
    let continuationCount = 0;
    try {
      const sys = typeof PASS1_DERIVE_SYSTEM === "string" ? PASS1_DERIVE_SYSTEM : JSON.stringify(PASS1_DERIVE_SYSTEM);
      const call = await callPass1Model(sys, fillUserTemplate(input), perAttemptTimeoutMs, ctrl.signal);
      continuationCount = call.continuationCount;
      const raw = call.text;
      if (!raw) {
        lastErr = "empty_content";
        allAborted = false;
        details.push({ attempt, elapsed_ms: Date.now() - attemptT0, outcome: "error", error: lastErr, continuation_count: continuationCount });
        continue;
      }
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : raw;
      const parsed = JSON.parse(jsonText);
      // T-M9.4 (Item 234) — VALID PLAN INVARIANT.
      // A validator-clean Pass-1 output is authoritative. The model's own
      // `conservative_write_around` flag is IGNORED on the ok path — Type-J
      // write-around fires ONLY on terminal LLM failure (abort×N, validator
      // hard-reject, or exception). Preserving a model-emitted triggered=true
      // here caused run #168's clean plan to be discarded by the cutover
      // classifier and routed to Type-J with a stale clock_cap origin.
      const candidate: RenderPlan = {
        ...parsed,
        plan_version: "v1",
        product: "cppa-risk-assessment",
        build_stamp: input.buildStamp,
        conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
      };
      const issues = validateRenderPlan(candidate, WEIGHING_TESTS);
      if (issues.length > 0) {
        lastErr = `validator_issues:${issues.length}`;
        allAborted = false;
        details.push({ attempt, elapsed_ms: Date.now() - attemptT0, outcome: "error", error: lastErr, continuation_count: continuationCount });
        continue;
      }
      details.push({ attempt, elapsed_ms: Date.now() - attemptT0, outcome: "ok", continuation_count: continuationCount });
      return {
        plan: candidate,
        telemetry: {
          ran: true, attempts: attempt, ok: true, latency_ms: Date.now() - t0,
          write_around: false, validator_issues: 0,
          timeout_enforced: PASS1_TIMEOUT_ENFORCED,
          per_attempt_timeout_ms: perAttemptTimeoutMs,
          attempts_detail: details,
        },
      };
    } catch (e) {
      const aborted = isAbort(e) || ctrl.signal.aborted;
      const msg = (e as Error)?.message ?? "?";
      if (aborted) {
        lastErr = PASS1_ABORT_TIMEOUT_ERROR;
        details.push({ attempt, elapsed_ms: Date.now() - attemptT0, outcome: "abort", error: msg, continuation_count: continuationCount });
      } else {
        allAborted = false;
        lastErr = `exception:${msg}`;
        details.push({ attempt, elapsed_ms: Date.now() - attemptT0, outcome: "error", error: msg, continuation_count: continuationCount });
      }
    } finally {
      clearTimeout(timer);
    }
  }

  const terminalError = allAborted ? PASS1_ABORT_TIMEOUT_ERROR : (lastErr || "unknown");
  return {
    plan: writeAroundPlan(input, terminalError),
    telemetry: {
      ran: true, attempts: maxAttempts, ok: false, latency_ms: Date.now() - t0,
      write_around: true, validator_issues: 0, error: terminalError,
      timeout_enforced: PASS1_TIMEOUT_ENFORCED,
      per_attempt_timeout_ms: perAttemptTimeoutMs,
      attempts_detail: details,
    },
  };
}

export const PASS1_MANIFEST = {
  stamp: PASS1_LLM_STAMP,
  prompt_version: PASS1_DERIVE_PROMPT_VERSION,
  model: PASS1_MODEL,
  max_attempts: PASS1_MAX_ATTEMPTS,
  timeout_enforced: PASS1_TIMEOUT_ENFORCED,
};
