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
import {
  derivePlan,
  pickLedger,
  pickCitationBindings,
  pickFactorTable,
  type DeriveInput,
} from "./derive.ts";
import type { RenderPlan, Proposition, FactorTableEntry } from "../render-plan/schema.ts";
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
import { evaluateCppaRiskGates } from "./gate-eval.ts";
import { runGuideStage } from "./guide.ts";
import {
  callAnthropicWithContinuation,
  AnthropicTimeoutError,
} from "../anthropic-call.ts";
import {
  applyCoherenceScreen,
  type CoherenceRewrite,
} from "./pass1-present-note-coherence.ts";

export const PASS1_LLM_STAMP = "ltp-pass1-llm-item240-cp4-labels@2026-07-28";
export const PASS1_MODEL = "claude-sonnet-4-6";
export const PASS1_MAX_ATTEMPTS = 2;
export const PASS1_TIMEOUT_ENFORCED = "abort-controller"; // T-M9 ping surface


export const PASS1_ABORT_TIMEOUT_ERROR = "pass1_abort_timeout";

/** ITEM 240 (C) — bounded validator-issue evidence surfaced in per-attempt telemetry. */
export const PASS1_MAX_ISSUE_EVIDENCE = 5;

export interface Pass1AttemptIssueEvidence {
  readonly code: string;
  readonly path?: string;
  readonly message?: string;
}

export interface Pass1AttemptDetail {
  readonly attempt: number;
  readonly elapsed_ms: number;
  readonly outcome: "ok" | "abort" | "error";
  readonly error?: string;
  readonly continuation_count?: number;
  /** ITEM 240 (C) — first N validator issues from this attempt when outcome=error and error starts with "validator_issues:". */
  readonly validator_issues_detail?: readonly Pass1AttemptIssueEvidence[];
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
  /** ITEM 242 CP-C — present/note coherence rewrites (dedicated key, NOT wa_origin). */
  readonly pass1_coherence_rewrites?: readonly CoherenceRewrite[];
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

/**
 * ITEM 240 CP2 — SINGLE-WRITER CORE.
 *
 * After the model returns, the adapter overwrites every deterministically-
 * owned field on the RenderPlan with the same functions used by the shadow
 * derive path (single source of truth). Then runs the Guide stage to
 * populate `weighing_frame` and binds `weighing_frame_ref` on every engaged
 * Type-W proposition. Type-W propositions whose weighing test has no Guide
 * candidates are converted to epistemic_type "J" per the §0 empty-by-
 * finding contract so V7 does not reject the plan for something Guide
 * cannot produce.
 *
 * Model-emitted values for owned fields are TELEMETERED as drift and
 * discarded; they are never shipped.
 */
function applySingleWriterInjection(
  parsed: Record<string, unknown>,
  input: DeriveInput,
): { plan: RenderPlan; empty_by_finding: readonly string[] } {
  const ledger = pickLedger(input.intake ?? {});
  const bindings = pickCitationBindings();
  const gate_outcomes = evaluateCppaRiskGates(input.intake ?? {});
  const factorScaffold = pickFactorTable();

  // Preserve model-authored judgment overlays on factor_table
  // (weight_note + present_in_intake) keyed by factor_id.
  const modelFactorsRaw = Array.isArray(parsed.factor_table) ? parsed.factor_table as unknown[] : [];
  const modelByFactor = new Map<string, Record<string, unknown>>();
  for (const f of modelFactorsRaw) {
    if (f && typeof f === "object" && typeof (f as any).factor_id === "string") {
      modelByFactor.set((f as any).factor_id, f as Record<string, unknown>);
    }
  }
  const factor_table: FactorTableEntry[] = factorScaffold.map((row) => {
    const m = modelByFactor.get(row.factor_id);
    if (!m) return row;
    const weight_note = typeof m.weight_note === "string" ? String(m.weight_note).slice(0, 240) : undefined;
    const present_in_intake = typeof m.present_in_intake === "boolean" ? m.present_in_intake : row.present_in_intake;
    return { ...row, present_in_intake, ...(weight_note ? { weight_note } : {}) } as FactorTableEntry;
  });

  // Propositions: adapter-authored id/anchor/refs skeleton keyed by
  // conclusion, with model-authored polarity preserved for Type R when
  // provided; ledger/citation refs are adapter-derived.
  const bindingIdByConclusion = new Map(bindings.map((b) => [b.pinpoint_ref.replace(/^cb\./, ""), b.pinpoint_ref]));
  const ledgerIds = ledger.map((l) => l.ledger_id);
  const modelPropsRaw = Array.isArray(parsed.propositions) ? parsed.propositions as unknown[] : [];
  const modelPropByConclusion = new Map<string, Record<string, unknown>>();
  for (const p of modelPropsRaw) {
    if (p && typeof p === "object" && typeof (p as any).conclusion_id === "string") {
      modelPropByConclusion.set((p as any).conclusion_id, p as Record<string, unknown>);
    }
  }
  const propositions: Proposition[] = CPPA_RISK_CONCLUSIONS.map((c) => {
    const m = modelPropByConclusion.get(c.id);
    const modelPolarity = m && typeof m.polarity === "string" ? m.polarity : undefined;
    const polarity =
      c.epistemic_type === "R"
        ? (modelPolarity === "positive" || modelPolarity === "negative" || modelPolarity === "not_applicable"
            ? modelPolarity
            : "not_applicable")
        : undefined;
    return {
      id: `p.${c.id}`,
      conclusion_id: c.id,
      epistemic_type: c.epistemic_type,
      jurisdiction_tag: c.jurisdiction_tag,
      anchor: c.anchor,
      display_label: c.display_label,
      intake_ledger_refs: c.epistemic_type === "R" ? ledgerIds.slice(0, 2) : [],
      citation_binding_refs: [bindingIdByConclusion.get(c.id) ?? `cb.${c.id}`],
      ...(polarity ? { polarity } : {}),
    } as Proposition;
  });

  const seed: RenderPlan = {
    plan_version: "v1",
    product: "cppa-risk-assessment",
    build_stamp: input.buildStamp,
    jurisdiction_tag: "cppa-ca",
    intake_ledger: ledger,
    citation_bindings: bindings,
    propositions,
    factor_table,
    weighing_frame: [],
    gate_outcomes,
    conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
  };

  // Guide precedes validation by construction.
  const guide = runGuideStage(seed);
  const frameIdsByTest = new Map<string, string>();
  for (const f of guide.frame) {
    if (!frameIdsByTest.has(f.test_id)) frameIdsByTest.set(f.test_id, f.frame_id);
  }

  // Bind weighing_frame_ref on Type-W props; convert unframed to Type-J
  // per §0 empty-by-finding contract.
  const boundProps: Proposition[] = seed.propositions.map((p) => {
    if (p.epistemic_type !== "W") return p;
    const conc = CPPA_RISK_CONCLUSIONS.find((c) => c.id === p.conclusion_id);
    const testId = conc?.weighing_test_id;
    const frameId = testId ? frameIdsByTest.get(testId) : undefined;
    if (frameId) return { ...p, weighing_frame_ref: frameId };
    // Empty-by-finding: reserve judgment.
    return { ...p, epistemic_type: "J" as const };
  });

  const plan: RenderPlan = {
    ...seed,
    propositions: boundProps,
    weighing_frame: guide.frame,
  };
  return { plan, empty_by_finding: guide.empty_by_finding };
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
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      // ITEM 240 CP2 — SINGLE-WRITER CORE.
      // Parse → adapter INJECTS deterministic fields → Guide populates
      // weighing_frame + binds refs → THEN validate. This is the sequencing
      // fix for run #173's V7_W_PROP_NO_FRAME (Guide previously ran after
      // validation, so V7 demanded frames the model was never asked for).
      // T-M9.4 VALID PLAN INVARIANT retained: model's own
      // conservative_write_around is IGNORED on the ok path.
      const { plan: injected } = applySingleWriterInjection(parsed, input);
      // ITEM 242 CP-C — present/note coherence screen sits BETWEEN
      // injection and validation. Rewrites are recorded in a dedicated
      // telemetry key `pass1_coherence_rewrites`; do NOT overload
      // wa_origin (controller CP-C §ii).
      const screened = applyCoherenceScreen(injected);
      const candidate = screened.plan;
      const coherenceRewrites = screened.rewrites;
      const issues = validateRenderPlan(candidate, WEIGHING_TESTS);

      if (issues.length > 0) {
        lastErr = `validator_issues:${issues.length}`;
        allAborted = false;
        const evidence: Pass1AttemptIssueEvidence[] = issues.slice(0, PASS1_MAX_ISSUE_EVIDENCE).map((i) => ({
          code: i.code,
          path: i.path,
          message: i.message,
        }));
        details.push({
          attempt,
          elapsed_ms: Date.now() - attemptT0,
          outcome: "error",
          error: lastErr,
          continuation_count: continuationCount,
          validator_issues_detail: evidence,
        });
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
          pass1_coherence_rewrites: coherenceRewrites,
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
