/**
 * ITEM 278 — PASS-2R LLM ADAPTER (SPEC §2R.1 / §2R.6).
 *
 * Mirrors the Pass-1 adapter patterns exactly (ltp/pass1-llm.ts):
 *   * shared Anthropic client (`../anthropic-call.ts`), never a hand-rolled fetch
 *   * model claude-sonnet-4-6, caller attribution passed through for spend metering
 *   * per-attempt AbortController with a REAL abort at 90s
 *   * stage ceiling 180s — attempts stop when the stage budget is spent
 *   * at most 2 validator-directed retries; the reject reason is fed back VERBATIM
 *   * telemetry: attempts, per-attempt latency, per-validator outcomes,
 *     write_around, shipped_surface
 *
 * ORDER OF OPERATIONS (§2R.1(6)): the DETERMINISTIC Pass-2 document is
 * produced and persisted FIRST by the caller and is handed to
 * `runProsePassStage` as the shipping candidate. 2R runs after.
 *
 * FALLBACK LAW (§2R.1(5), absolute): any 2R failure — validator reject after
 * the retry budget, timeout, budget exhaustion, transport error, malformed
 * output, empty output — ships the deterministic document. Never blank,
 * never partial, never mixed, never section-spliced.
 *
 * ENFORCE is implemented but GATED: `enforce: true` is set by nothing in the
 * codebase as of this turn (§2R.3 observe-first lifecycle).
 */
import type { RenderPlan } from "../render-plan/schema.ts";
import { callAnthropicWithContinuation } from "../anthropic-call.ts";
import {
  PASS2R_PROSE_SYSTEM,
  PASS2R_PROSE_USER_TEMPLATE,
  PASS2R_PROSE_RETRY_TEMPLATE,
  PASS2R_PROSE_PROMPT_VERSION,
} from "./content/pass2r-prose-prompt.ts";
import {
  buildPass2rWhitelist,
  runPass2rValidators,
  PASS2R_PART_HOME,
  PASS2R_VALIDATORS_VERSION,
  type Pass2rProseDocument,
  type Pass2rPart,
  type Pass2rValidationResult,
  type Pass2rValidatorMode,
  type Pass2rWhitelist,
} from "./pass2r-validators.ts";

export const PASS2R_LLM_STAMP = "ltp-pass2r-llm-2026-07-30-item278";
export const PASS2R_MODEL = "claude-sonnet-4-6";
/** One call + at most two validator-directed retries (§2R.6). */
export const PASS2R_MAX_ATTEMPTS = 3;
// Item 281 (2026-07-30): raised from 90_000/180_000 on evidence from job
// 343e35d0 — both 2R attempts aborted at exactly 90002ms, terminal
// pass2r_stage_budget_exhausted. A max_tokens=6000 prose generation cannot
// complete in 90s at typical Sonnet throughput. 2×170s < 360s ceiling.
export const PASS2R_PER_ATTEMPT_TIMEOUT_MS = 170_000;
export const PASS2R_STAGE_CEILING_MS = 360_000;
export const PASS2R_MAX_TOKENS = 6_000;
export const PASS2R_TIMEOUT_ENFORCED = "abort-controller";

export const PASS2R_MANIFEST = {
  stamp: PASS2R_LLM_STAMP,
  model: PASS2R_MODEL,
  prompt_version: PASS2R_PROSE_PROMPT_VERSION,
  validators_version: PASS2R_VALIDATORS_VERSION,
  max_attempts: PASS2R_MAX_ATTEMPTS,
  per_attempt_timeout_ms: PASS2R_PER_ATTEMPT_TIMEOUT_MS,
  stage_ceiling_ms: PASS2R_STAGE_CEILING_MS,
  max_tokens: PASS2R_MAX_TOKENS,
} as const;

/** Module-scoped call counter — the zero-invocation guard covers 2R calls too. */
let _pass2rCallCount = 0;
export function _pass2rCallCount_get(): number {
  return _pass2rCallCount;
}
export function _pass2rCallCount_reset(): void {
  _pass2rCallCount = 0;
}

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

export type Pass2rShippedSurface = "2R" | "deterministic";

export interface Pass2rCallArgs {
  readonly system: string;
  readonly user: string;
  readonly timeoutMs: number;
  readonly signal: AbortSignal;
  readonly callerName: string;
}

/** Provider seam — injected in tests so no real API is ever called. */
export type Pass2rCallFn = (args: Pass2rCallArgs) => Promise<{ text: string }>;

export interface Pass2rAttemptDetail {
  readonly attempt: number;
  readonly elapsed_ms: number;
  readonly outcome: "ok" | "reject" | "abort" | "error";
  readonly error?: string;
  readonly rejected_validators?: readonly string[];
}

export interface Pass2rValidatorOutcomeCount {
  readonly validator: string;
  readonly passed: boolean;
  readonly rejection_codes: readonly string[];
}

export interface Pass2rTelemetry {
  readonly ran: boolean;
  readonly attempts: number;
  readonly ok: boolean;
  readonly latency_ms: number;
  readonly write_around: boolean;
  readonly shipped_surface: Pass2rShippedSurface;
  readonly mode: Pass2rValidatorMode;
  readonly error?: string;
  readonly stamp: string;
  readonly prompt_version: string;
  readonly validators_version: string;
  readonly timeout_enforced: string;
  readonly per_attempt_timeout_ms: number;
  readonly stage_ceiling_ms: number;
  readonly attempts_detail: readonly Pass2rAttemptDetail[];
  readonly validator_outcomes: readonly Pass2rValidatorOutcomeCount[];
  readonly reject_reason?: string;
}

export interface Pass2rContext {
  /** Upstream-computed verdict — INPUT to 2R (§2R.4). */
  readonly verdict: string;
  readonly close_outcome?: boolean;
  /** Registry keys carrying deterministic content; each must be covered once. */
  readonly registry_keys?: readonly string[];
  readonly deadline_literals?: readonly string[];
}

/**
 * ITEM 287 FIX 6 — per-attempt rejection record, persisted alongside the
 * rejected prose so observe-mode calibration questions (e.g. the
 * verdict_consistency ["Low","Moderate"] class) can be adjudicated with the
 * prose in hand.
 */
export interface Pass2rAttemptRejection {
  readonly attempt: number;
  readonly validators: readonly string[];
  readonly codes: readonly string[];
}

export interface Pass2rResult {
  readonly prose: Pass2rProseDocument | null;
  readonly validation: Pass2rValidationResult | null;
  readonly telemetry: Pass2rTelemetry;
  /**
   * ITEM 287 FIX 6 — the FINAL attempt's prose when every attempt was
   * validator-rejected. OBSERVE-MODE CALIBRATION ONLY: this never reaches a
   * shipped surface; it is keyed `prose_rejected` everywhere it is persisted.
   */
  readonly prose_rejected?: Pass2rProseDocument | null;
  readonly attempt_rejections?: readonly Pass2rAttemptRejection[];
}

// ---------------------------------------------------------------------
// Prompt fill — the plan travels AS DATA
// ---------------------------------------------------------------------

export function fillPass2rUser(
  plan: RenderPlan,
  wl: Pass2rWhitelist,
): string {
  return PASS2R_PROSE_USER_TEMPLATE
    .replace("{locked_plan_json}", JSON.stringify(plan))
    .replace("{verdict_json}", JSON.stringify({ verdict: wl.verdict, close_outcome: wl.close_outcome }))
    .replace("{citation_whitelist_json}", JSON.stringify(wl.citations))
    .replace("{numeric_whitelist_json}", JSON.stringify(wl.numerics))
    .replace("{entity_whitelist_json}", JSON.stringify(wl.entities))
    .replace("{registry_keys_json}", JSON.stringify(wl.registry_keys));
}

function deepFreezePlan(plan: RenderPlan): RenderPlan {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): void => {
    if (!v || typeof v !== "object") return;
    if (seen.has(v as object)) return;
    seen.add(v as object);
    Object.values(v as Record<string, unknown>).forEach(walk);
    try { Object.freeze(v); } catch { /* noop */ }
  };
  walk(plan);
  return plan;
}

export function parseProseDocument(raw: string): Pass2rProseDocument {
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : raw) as Record<string, unknown>;
  const partsRaw = Array.isArray(parsed.parts) ? parsed.parts : [];
  const parts: Pass2rPart[] = partsRaw.map((p) => {
    const r = (p ?? {}) as Record<string, unknown>;
    return {
      part: Number(r.part) as 1 | 2 | 3 | 4,
      heading: typeof r.heading === "string" ? r.heading : "",
      prose: typeof r.prose === "string" ? r.prose : "",
      covered_keys: Array.isArray(r.covered_keys)
        ? (r.covered_keys as unknown[]).map(String)
        : [],
    };
  });
  if (parts.length === 0) throw new Error("pass2r_empty_parts");
  return { parts };
}

const defaultCall: Pass2rCallFn = async (args) => {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("missing_ANTHROPIC_API_KEY");
  const res = await callAnthropicWithContinuation({
    model: PASS2R_MODEL,
    system: args.system,
    user: args.user,
    maxTokens: PASS2R_MAX_TOKENS,
    label: "ltp-pass2r-prose",
    callerName: args.callerName,
    product: "cppa-risk-assessment",
    timeoutMs: args.timeoutMs,
    abortSignal: args.signal,
  });
  return { text: res.text };
};

function isAbort(e: unknown): boolean {
  const n = (e as { name?: string } | null)?.name;
  return n === "AbortError" || n === "TimeoutError" ||
    /abort/i.test((e as Error)?.message ?? "");
}

function summarizeOutcomes(v: Pass2rValidationResult): Pass2rValidatorOutcomeCount[] {
  return v.outcomes.map((o) => ({
    validator: o.validator,
    passed: o.passed,
    rejection_codes: o.rejections.map((r) => r.code),
  }));
}

// ---------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------

export async function runPass2r(
  plan: RenderPlan,
  ctx: Pass2rContext,
  opts: {
    mode?: Pass2rValidatorMode;
    call?: Pass2rCallFn;
    callerName?: string;
    perAttemptTimeoutMs?: number;
    stageCeilingMs?: number;
    maxAttempts?: number;
    /** UPGRADE-2 (ITEM 2) — §§ 7150-7157 corpus law block appended to the prompt. */
    corpusLawBlock?: string;
  } = {},
): Promise<Pass2rResult> {
  const t0 = Date.now();
  const mode: Pass2rValidatorMode = opts.mode ?? "observe";
  const perAttemptTimeoutMs = Math.max(1_000, opts.perAttemptTimeoutMs ?? PASS2R_PER_ATTEMPT_TIMEOUT_MS);
  const stageCeilingMs = Math.max(perAttemptTimeoutMs, opts.stageCeilingMs ?? PASS2R_STAGE_CEILING_MS);
  const maxAttempts = Math.max(1, Math.min(opts.maxAttempts ?? PASS2R_MAX_ATTEMPTS, PASS2R_MAX_ATTEMPTS));
  const call = opts.call ?? defaultCall;
  const callerName = opts.callerName ?? "run-cppa-risk-assessment";

  // §2R.1(2) PLAN LOCK — 2R receives a deep-frozen plan; a write-back throws.
  const locked = deepFreezePlan(plan);
  const wl = buildPass2rWhitelist(locked, {
    verdict: ctx.verdict,
    close_outcome: ctx.close_outcome,
    registry_keys: ctx.registry_keys,
    deadline_literals: ctx.deadline_literals,
  });

  const filledUser = fillPass2rUser(locked, wl);
  const baseUser = opts.corpusLawBlock && opts.corpusLawBlock.trim().length > 0
    ? `${filledUser}\n\n${opts.corpusLawBlock}`
    : filledUser;
  const details: Pass2rAttemptDetail[] = [];
  let lastValidation: Pass2rValidationResult | null = null;
  let lastRejectedDoc: Pass2rProseDocument | null = null;
  const attemptRejections: Pass2rAttemptRejection[] = [];
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (Date.now() - t0 >= stageCeilingMs) {
      lastError = "pass2r_stage_budget_exhausted";
      break;
    }
    const attemptT0 = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      try { ctrl.abort(new DOMException(`pass2r_attempt_${attempt}_timeout`, "TimeoutError")); } catch { /* noop */ }
    }, perAttemptTimeoutMs);
    try {
      const user = lastValidation && lastValidation.reject_reason
        ? `${baseUser}\n\n${PASS2R_PROSE_RETRY_TEMPLATE.replace("{reject_reason}", lastValidation.reject_reason)}`
        : baseUser;
      _pass2rCallCount += 1;
      const { text } = await call({
        system: PASS2R_PROSE_SYSTEM,
        user,
        timeoutMs: perAttemptTimeoutMs,
        signal: ctrl.signal,
        callerName,
      });
      if (!text || !text.trim()) {
        lastError = "empty_content";
        details.push({ attempt, elapsed_ms: Date.now() - attemptT0, outcome: "error", error: lastError });
        continue;
      }
      const doc = parseProseDocument(text);
      const validation = runPass2rValidators(doc, wl, { mode });
      lastValidation = validation;
      if (!validation.ok) {
        // ITEM 287 FIX 6 — keep the rejected prose and this attempt's
        // rejection set for observe-mode calibration.
        lastRejectedDoc = doc;
        attemptRejections.push({
          attempt,
          validators: validation.outcomes.filter((o) => !o.passed).map((o) => o.validator),
          codes: validation.rejections.map((r) => r.code),
        });
        details.push({
          attempt,
          elapsed_ms: Date.now() - attemptT0,
          outcome: "reject",
          rejected_validators: validation.outcomes.filter((o) => !o.passed).map((o) => o.validator),
        });
        lastError = "validator_reject";
        continue;
      }
      details.push({ attempt, elapsed_ms: Date.now() - attemptT0, outcome: "ok" });
      return {
        prose: doc,
        validation,
        telemetry: {
          ran: true,
          attempts: attempt,
          ok: true,
          latency_ms: Date.now() - t0,
          write_around: false,
          // Observe mode never ships 2R, even on a clean pass (§2R.3).
          shipped_surface: mode === "enforce" ? "2R" : "deterministic",
          mode,
          stamp: PASS2R_LLM_STAMP,
          prompt_version: PASS2R_PROSE_PROMPT_VERSION,
          validators_version: PASS2R_VALIDATORS_VERSION,
          timeout_enforced: PASS2R_TIMEOUT_ENFORCED,
          per_attempt_timeout_ms: perAttemptTimeoutMs,
          stage_ceiling_ms: stageCeilingMs,
          attempts_detail: details,
          validator_outcomes: summarizeOutcomes(validation),
        },
      };
    } catch (e) {
      const aborted = isAbort(e) || ctrl.signal.aborted;
      const msg = (e as Error)?.message ?? "?";
      lastError = aborted ? "pass2r_abort_timeout" : `exception:${msg}`;
      details.push({
        attempt,
        elapsed_ms: Date.now() - attemptT0,
        outcome: aborted ? "abort" : "error",
        error: msg,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  // FALLBACK LAW — deterministic ships.
  return {
    prose: null,
    validation: lastValidation,
    // ITEM 287 FIX 6 — observe-mode calibration payload; never shipped.
    prose_rejected: lastRejectedDoc,
    attempt_rejections: attemptRejections,
    telemetry: {
      ran: true,
      attempts: details.length,
      ok: false,
      latency_ms: Date.now() - t0,
      write_around: true,
      shipped_surface: "deterministic",
      mode,
      error: lastError || "unknown",
      stamp: PASS2R_LLM_STAMP,
      prompt_version: PASS2R_PROSE_PROMPT_VERSION,
      validators_version: PASS2R_VALIDATORS_VERSION,
      timeout_enforced: PASS2R_TIMEOUT_ENFORCED,
      per_attempt_timeout_ms: perAttemptTimeoutMs,
      stage_ceiling_ms: stageCeilingMs,
      attempts_detail: details,
      validator_outcomes: lastValidation ? summarizeOutcomes(lastValidation) : [],
      reject_reason: lastValidation?.reject_reason,
    },
  };
}

// ---------------------------------------------------------------------
// STAGE INTEGRATION (§2R.1 order of operations)
// ---------------------------------------------------------------------

/**
 * The narrative surfaces 2R owns under enforce. Selection across ALL FOUR
 * is atomic — the prose document ships whole or not at all. Section-level
 * splicing (part-1 prose beside part-2 deterministic) is prohibited.
 */
export const PASS2R_PROSE_SURFACE_KEYS: Readonly<Record<1 | 2 | 3 | 4, string>> = {
  1: "executive_summary",
  2: "assessment_summary",
  3: "information_needed",
  4: "closing_statement",
};

export interface ProsePassStageOptions {
  /** Nothing runs unless this is explicitly true. */
  readonly enabled: boolean;
  /**
   * GATED. Nothing in the codebase sets this as of Item 278. When false the
   * validators run in observe mode and the deterministic document ships
   * regardless of the 2R outcome.
   */
  readonly enforce?: boolean;
  /** Remaining generator clock budget; 2R is skipped when under the stage ceiling. */
  readonly remainingBudgetMs?: number;
  readonly call?: Pass2rCallFn;
  readonly callerName?: string;
  /** UPGRADE-2 (ITEM 2) — §§ 7150-7157 corpus law block for prompt assembly. */
  readonly corpusLawBlock?: string;
}

export interface ProsePassStageResult {
  readonly shipped_report: Record<string, unknown>;
  readonly shipped_surface: Pass2rShippedSurface;
  readonly prose: Pass2rProseDocument | null;
  readonly telemetry: Pass2rTelemetry | null;
  readonly skipped_reason?: string;
  /** ITEM 287 FIX 6 — rejected prose, observe-mode calibration only. */
  readonly prose_rejected?: Pass2rProseDocument | null;
  readonly attempt_rejections?: readonly Pass2rAttemptRejection[];
}

function skipped(
  deterministicReport: Record<string, unknown>,
  reason: string,
): ProsePassStageResult {
  return {
    shipped_report: deterministicReport,
    shipped_surface: "deterministic",
    prose: null,
    telemetry: null,
    skipped_reason: reason,
  };
}

/** Reads the upstream verdict off the deterministic report; never computes one. */
export function readVerdict(report: Record<string, unknown>): string {
  const v = report["overall_risk_level"] ?? report["risk_level"];
  return typeof v === "string" && v.trim() ? v.trim() : "Insufficient basis";
}

/** Registry keys the deterministic document actually carries content for. */
export function contentBearingRegistryKeys(
  report: Record<string, unknown>,
): readonly string[] {
  return Object.keys(PASS2R_PART_HOME).filter((k) => {
    const v = report[k];
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v as object).length > 0;
    return false;
  });
}

export function buildProseShippedReport(
  deterministicReport: Record<string, unknown>,
  prose: Pass2rProseDocument,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...deterministicReport };
  for (const p of prose.parts) {
    const key = PASS2R_PROSE_SURFACE_KEYS[p.part];
    if (key) out[key] = p.prose;
  }
  return out;
}

/**
 * §2R.1(6): the caller has ALREADY produced and persisted the deterministic
 * document. This stage runs after it and can only ever return the
 * deterministic document unchanged unless enforce is on AND every validator
 * passes.
 */
export async function runProsePassStage(
  plan: RenderPlan,
  deterministicReport: Record<string, unknown>,
  opts: ProsePassStageOptions,
  ctx?: Partial<Pass2rContext>,
): Promise<ProsePassStageResult> {
  if (!opts.enabled) return skipped(deterministicReport, "prose_pass_disabled");

  // Spend guard, fail-closed and unchanged: 2R rides the same release switch.
  let enforceEnabled = false;
  try { enforceEnabled = Deno.env.get("LTP_ENFORCE_ENABLED") === "1"; } catch { /* env unavailable */ }
  if (!enforceEnabled) return skipped(deterministicReport, "ltp_enforce_disabled");

  if (
    typeof opts.remainingBudgetMs === "number" &&
    opts.remainingBudgetMs < PASS2R_STAGE_CEILING_MS
  ) {
    return skipped(deterministicReport, "clock_budget_below_2r_stage_ceiling");
  }

  const mode: Pass2rValidatorMode = opts.enforce === true ? "enforce" : "observe";
  let result: Pass2rResult;
  try {
    result = await runPass2r(plan, {
      verdict: ctx?.verdict ?? readVerdict(deterministicReport),
      close_outcome: ctx?.close_outcome,
      registry_keys: ctx?.registry_keys ?? contentBearingRegistryKeys(deterministicReport),
      deadline_literals: ctx?.deadline_literals,
    }, { mode, call: opts.call, callerName: opts.callerName, corpusLawBlock: opts.corpusLawBlock });
  } catch (e) {
    // FALLBACK LAW — an adapter throw is still a deterministic ship.
    return skipped(
      deterministicReport,
      `pass2r_stage_exception:${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const enforceShips = mode === "enforce" &&
    result.prose !== null &&
    result.validation?.ok === true &&
    result.validation?.effective === true;

  return {
    shipped_report: enforceShips
      ? buildProseShippedReport(deterministicReport, result.prose!)
      : deterministicReport,
    shipped_surface: enforceShips ? "2R" : "deterministic",
    prose: result.prose,
    // ITEM 287 FIX 6 — passthrough only; never merged into shipped_report.
    prose_rejected: result.prose_rejected ?? null,
    attempt_rejections: result.attempt_rejections ?? [],
    telemetry: {
      ...result.telemetry,
      shipped_surface: enforceShips ? "2R" : "deterministic",
    },
  };
}
