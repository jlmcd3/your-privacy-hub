/**
 * ITEM 340 (PROSE PROGRAM 4 of 4) — ENTAILMENT-GATED POLISH RUNNER.
 *
 * An OPTIONAL final fluency pass over ANALYTIC prose sections. It is built on
 * the Pass-2R pattern (ltp/pass2r-llm.ts) and inherits its laws:
 *
 *   PERSIST-FIRST     the deterministic text is produced and PERSISTED by the
 *                     caller before this runner is invoked. This runner never
 *                     writes; it returns what should ship.
 *   FALLBACK LAW      any failure — validator rejection after the attempt
 *                     budget, timeout, transport error, empty or malformed
 *                     output — ships the deterministic text. Never blank,
 *                     never partial, never spliced.
 *   FAIL-CLOSED       the entailment gate runs on EVERY attempt and rejects on
 *                     uncertainty (prose/entailment.ts).
 *   NEVER BLOCKING    polish never delays or fails report delivery.
 *
 * SECTION SCOPE. Only sections the product marks `analytic` are eligible.
 * Determinations, verdict lines, citations blocks, statutory quotes, tables
 * and the counsel-voice close are not polished — they are not prose problems.
 *
 * Attempts: 1 initial + at most 1 validator-directed retry (dispatch: max 2).
 */

import {
  ENTAILMENT_VALIDATOR_VERSION,
  type EntailmentFinding,
  type EntailmentResult,
  validateEntailment,
} from "./entailment.ts";
import { polishEnabledFor, polishShipsFor, POLISH_FLAGS_VERSION } from "./polish-flags.ts";

export const POLISH_RUNNER_VERSION = "prose-polish-2026-08-01-item340";

/** Dispatch cap: "max 2 attempts". */
export const POLISH_MAX_ATTEMPTS = 2;
export const POLISH_PER_ATTEMPT_TIMEOUT_MS = 45_000;
export const POLISH_STAGE_CEILING_MS = 100_000;

export type PolishShippedSurface = "polished" | "deterministic";

export interface PolishSection {
  readonly section_id: string;
  /** The deterministic text already persisted for this section. */
  readonly deterministic: string;
  /** Only analytic sections are eligible; anything else is skipped untouched. */
  readonly analytic: boolean;
  readonly protected_spans?: readonly string[];
  readonly carried_entities?: readonly string[];
}

export interface PolishCallArgs {
  readonly section_id: string;
  readonly deterministic: string;
  readonly rejectReason?: string;
  readonly timeoutMs: number;
  readonly signal: AbortSignal;
}

/** Provider seam — injected in tests and calibration so no real API is called. */
export type PolishCallFn = (args: PolishCallArgs) => Promise<{ text: string }>;

export interface PolishAttemptRecord {
  readonly attempt: number;
  readonly elapsed_ms: number;
  readonly outcome: "accepted" | "rejected" | "abort" | "error";
  readonly reject_codes?: readonly string[];
  readonly reject_reason?: string;
  readonly error?: string;
}

export interface PolishSectionResult {
  readonly section_id: string;
  /** What the caller must ship for this section. */
  readonly text: string;
  readonly shipped_surface: PolishShippedSurface;
  readonly ran: boolean;
  readonly attempts: readonly PolishAttemptRecord[];
  readonly accepted: boolean;
  readonly skipped_reason?: "flag_off" | "not_analytic" | "empty_input" | "budget";
  readonly findings: readonly EntailmentFinding[];
  readonly latency_ms: number;
}

export interface PolishTelemetry {
  readonly version: string;
  readonly validator_version: string;
  readonly flags_version: string;
  readonly product: string;
  readonly enabled: boolean;
  readonly ships: boolean;
  readonly sections_total: number;
  readonly sections_attempted: number;
  readonly sections_accepted: number;
  readonly sections_rejected: number;
  readonly shipped_surface: PolishShippedSurface;
  readonly rejections: readonly {
    readonly section_id: string;
    readonly attempt: number;
    readonly rule: string;
    readonly code: string;
    readonly detail: string;
  }[];
  readonly latency_ms: number;
}

export interface PolishRunResult {
  readonly sections: readonly PolishSectionResult[];
  readonly telemetry: PolishTelemetry;
}

function isAbort(e: unknown): boolean {
  const name = (e as { name?: string })?.name;
  return name === "AbortError" || name === "TimeoutError";
}

function skip(
  section: PolishSection,
  reason: NonNullable<PolishSectionResult["skipped_reason"]>,
): PolishSectionResult {
  return {
    section_id: section.section_id,
    text: section.deterministic,
    shipped_surface: "deterministic",
    ran: false,
    attempts: [],
    accepted: false,
    skipped_reason: reason,
    findings: [],
    latency_ms: 0,
  };
}

/**
 * Polish ONE section. Exported for calibration, where the "call" is a corpus
 * lookup rather than a model.
 */
export async function polishSection(
  section: PolishSection,
  call: PolishCallFn,
  opts: {
    maxAttempts?: number;
    perAttemptTimeoutMs?: number;
    deadlineAt?: number;
  } = {},
): Promise<PolishSectionResult> {
  const t0 = Date.now();
  if (!section.analytic) return skip(section, "not_analytic");
  if (!section.deterministic?.trim()) return skip(section, "empty_input");

  const maxAttempts = Math.max(1, Math.min(opts.maxAttempts ?? POLISH_MAX_ATTEMPTS, POLISH_MAX_ATTEMPTS));
  const perAttemptTimeoutMs = Math.max(1_000, opts.perAttemptTimeoutMs ?? POLISH_PER_ATTEMPT_TIMEOUT_MS);

  const attempts: PolishAttemptRecord[] = [];
  let lastResult: EntailmentResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (opts.deadlineAt !== undefined && Date.now() >= opts.deadlineAt) {
      return {
        section_id: section.section_id,
        text: section.deterministic,
        shipped_surface: "deterministic",
        ran: attempts.length > 0,
        attempts,
        accepted: false,
        skipped_reason: "budget",
        findings: lastResult?.findings ?? [],
        latency_ms: Date.now() - t0,
      };
    }

    const attemptT0 = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      try {
        ctrl.abort(new DOMException(`polish_attempt_${attempt}_timeout`, "TimeoutError"));
      } catch { /* noop */ }
    }, perAttemptTimeoutMs);

    try {
      const { text } = await call({
        section_id: section.section_id,
        deterministic: section.deterministic,
        rejectReason: lastResult?.reject_reason,
        timeoutMs: perAttemptTimeoutMs,
        signal: ctrl.signal,
      });

      const result = validateEntailment({
        deterministic: section.deterministic,
        polished: text ?? "",
        protected_spans: section.protected_spans,
        carried_entities: section.carried_entities,
      });
      lastResult = result;

      if (result.ok) {
        attempts.push({ attempt, elapsed_ms: Date.now() - attemptT0, outcome: "accepted" });
        return {
          section_id: section.section_id,
          text: text.trim(),
          shipped_surface: "polished",
          ran: true,
          attempts,
          accepted: true,
          findings: [],
          latency_ms: Date.now() - t0,
        };
      }

      attempts.push({
        attempt,
        elapsed_ms: Date.now() - attemptT0,
        outcome: "rejected",
        reject_codes: result.findings.map((f) => f.code),
        reject_reason: result.reject_reason,
      });
    } catch (e) {
      const aborted = isAbort(e) || ctrl.signal.aborted;
      attempts.push({
        attempt,
        elapsed_ms: Date.now() - attemptT0,
        outcome: aborted ? "abort" : "error",
        error: (e as Error)?.message ?? "unknown",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  // FALLBACK LAW.
  return {
    section_id: section.section_id,
    text: section.deterministic,
    shipped_surface: "deterministic",
    ran: true,
    attempts,
    accepted: false,
    findings: lastResult?.findings ?? [],
    latency_ms: Date.now() - t0,
  };
}

/**
 * Polish a document's analytic sections. Returns the text to ship for every
 * section — including the ones that were skipped or rejected, so the caller
 * can assemble without branching.
 */
export async function runPolishStage(
  product: string,
  sections: readonly PolishSection[],
  call: PolishCallFn,
  opts: {
    maxAttempts?: number;
    perAttemptTimeoutMs?: number;
    stageCeilingMs?: number;
    /** Test/calibration override for the rollout flag. */
    forceEnabled?: boolean;
    forceShips?: boolean;
  } = {},
): Promise<PolishRunResult> {
  const t0 = Date.now();
  const enabled = opts.forceEnabled ?? polishEnabledFor(product);
  const ships = opts.forceShips ?? polishShipsFor(product);
  const deadlineAt = t0 + Math.max(1_000, opts.stageCeilingMs ?? POLISH_STAGE_CEILING_MS);

  const results: PolishSectionResult[] = [];
  for (const section of sections) {
    if (!enabled) {
      results.push(skip(section, "flag_off"));
      continue;
    }
    const r = await polishSection(section, call, {
      maxAttempts: opts.maxAttempts,
      perAttemptTimeoutMs: opts.perAttemptTimeoutMs,
      deadlineAt,
    });
    // SHADOW MODE: telemetry is full, the shipped text is deterministic.
    results.push(
      r.accepted && !ships ? { ...r, text: section.deterministic, shipped_surface: "deterministic" } : r,
    );
  }

  const attempted = results.filter((r) => r.ran);
  const accepted = results.filter((r) => r.accepted);
  const rejections = results.flatMap((r) =>
    r.attempts
      .filter((a) => a.outcome === "rejected")
      .flatMap((a) =>
        r.findings.map((f) => ({
          section_id: r.section_id,
          attempt: a.attempt,
          rule: f.rule,
          code: f.code,
          detail: f.detail,
        }))
      )
  );

  return {
    sections: results,
    telemetry: {
      version: POLISH_RUNNER_VERSION,
      validator_version: ENTAILMENT_VALIDATOR_VERSION,
      flags_version: POLISH_FLAGS_VERSION,
      product,
      enabled,
      ships,
      sections_total: sections.length,
      sections_attempted: attempted.length,
      sections_accepted: accepted.length,
      sections_rejected: attempted.length - accepted.length,
      shipped_surface: results.some((r) => r.shipped_surface === "polished")
        ? "polished"
        : "deterministic",
      rejections,
      latency_ms: Date.now() - t0,
    },
  };
}
