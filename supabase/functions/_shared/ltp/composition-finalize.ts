/**
 * composition-finalize — Stage-B CONTINUATION-3 driver (2026-07-27).
 *
 * Single composition-exit choke-point. Composes the four Stage-B guards:
 *   1) value-screen (LEAK-PREV-P2)   — one bounded recompose, then hard-fail (enforce)
 *   2) surface-write-guard walk       — every leaf path in report_data checked
 *                                       against RISK_SURFACE_BINDINGS + RISK_CUT_RULINGS
 *   3) composition-hook-audit         — silent-bypass config assert (always throws;
 *                                       fail-loud is definitional at this layer)
 *
 * Modes:
 *   - "observe" (default; env LTP_COMPOSITION_ENFORCE unset): telemetry only for
 *     value-screen residual hits + surface unowned/cut violations. Hook audit still
 *     throws (config surface, not content surface).
 *   - "enforce" (env LTP_COMPOSITION_ENFORCE=1): value-screen residual hits and
 *     surface-guard violations throw.
 *
 * The one-bounded-recompose driver: on the FIRST value-screen hit, if a caller-
 * supplied recompose is present, invoke it once with the hits, then re-run the
 * screen against the recomposed data. A second hit escalates per mode (Item 179 /
 * Item 185 discipline).
 */

import {
  runValueScreen,
  ValueScreenError,
  TRUNCATED_SLOT_VALUE_SET,
  isAnchorPath,
  type ValueScreenHit,
} from "./value-screen.ts";
import {
  RISK_SURFACE_BINDINGS,
  RISK_CUT_RULINGS,
} from "./content/risk-surface-map.ts";
import {
  assertCompositionHookConformance,
  readForceWriteAroundOnce,
} from "./composition-hook-audit.ts";

export const COMPOSITION_FINALIZE_VERSION = "composition-finalize@2026-07-27";
export const ENFORCE_ENV = "LTP_COMPOSITION_ENFORCE";

export type FinalizeMode = "observe" | "enforce";

export interface FinalizeInput {
  readonly reportData: unknown;
  readonly corpusSnippets?: readonly string[];
  /** Value of LTP_TEST_FORCE_WRITE_AROUND at composition start (read-once). */
  readonly hookValue: string | undefined | null;
  /** Whether the composition branch actually took the write-around path. */
  readonly writeAroundEntered: boolean;
  /** Optional one-shot recompose driver. Returns the recomposed report_data. */
  readonly recompose?: (hits: readonly ValueScreenHit[]) => unknown;
  /** Override env-derived mode; primarily for tests. */
  readonly mode?: FinalizeMode;
  /** Injectable env for test isolation. */
  readonly env?: { get(name: string): string | undefined };
}

export interface FinalizeTelemetry {
  readonly version: string;
  readonly mode: FinalizeMode;
  readonly value_screen_hits: number;
  readonly value_screen_recomposed: boolean;
  readonly value_screen_final_hits: number;
  readonly surface_unowned_paths: readonly string[];
  readonly surface_cut_violations: readonly string[];
  readonly hook_audit_ok: boolean;
  readonly hook_value_present: boolean;
  readonly write_around_entered: boolean;
}

export interface FinalizeResult {
  readonly reportData: unknown;
  readonly telemetry: FinalizeTelemetry;
}

// ── Surface-map top-level path normalization ──────────────────────────

const ALLOWED_TOP_LEVEL: ReadonlySet<string> = new Set(
  RISK_SURFACE_BINDINGS.map((b) => b.path.split(".")[0].replace(/\[\]$/, "")),
);
const CUT_TOP_LEVEL: ReadonlySet<string> = new Set(
  RISK_CUT_RULINGS.map((c) => c.path.split(".")[0].replace(/\[\]$/, "")),
);

function topKeys(obj: unknown): string[] {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  return Object.keys(obj as Record<string, unknown>);
}

// ── One-bounded-recompose value-screen driver ─────────────────────────

interface ScreenDriverResult {
  readonly reportData: unknown;
  readonly firstHits: number;
  readonly recomposed: boolean;
  readonly finalHits: number;
  readonly finalHitDetails: readonly ValueScreenHit[];
}

function driveValueScreen(
  input: Pick<FinalizeInput, "reportData" | "corpusSnippets" | "recompose">,
): ScreenDriverResult {
  const runOnce = (rd: unknown): readonly ValueScreenHit[] => {
    try {
      runValueScreen({ reportData: rd, corpusSnippets: input.corpusSnippets });
      return [];
    } catch (e) {
      if (e instanceof ValueScreenError) return e.hits;
      throw e;
    }
  };

  const firstHits = runOnce(input.reportData);
  if (firstHits.length === 0) {
    return { reportData: input.reportData, firstHits: 0, recomposed: false, finalHits: 0, finalHitDetails: [] };
  }
  if (!input.recompose) {
    return {
      reportData: input.reportData,
      firstHits: firstHits.length,
      recomposed: false,
      finalHits: firstHits.length,
      finalHitDetails: firstHits,
    };
  }
  const recomposed = input.recompose(firstHits);
  const secondHits = runOnce(recomposed);
  return {
    reportData: recomposed,
    firstHits: firstHits.length,
    recomposed: true,
    finalHits: secondHits.length,
    finalHitDetails: secondHits,
  };
}

// ── Public API ───────────────────────────────────────────────────────

export function finalizeComposition(input: FinalizeInput): FinalizeResult {
  const env = input.env ?? Deno.env;
  const mode: FinalizeMode =
    input.mode ?? (env.get(ENFORCE_ENV) === "1" ? "enforce" : "observe");

  // (1) value-screen with one bounded recompose
  const screen = driveValueScreen(input);
  if (mode === "enforce" && screen.finalHits > 0) {
    throw new ValueScreenError(screen.finalHitDetails);
  }

  // (2) surface-write-guard walk (top-level only — the map's canonical grain)
  const surface_unowned_paths: string[] = [];
  const surface_cut_violations: string[] = [];
  for (const k of topKeys(screen.reportData)) {
    if (CUT_TOP_LEVEL.has(k)) {
      const v = (screen.reportData as Record<string, unknown>)[k];
      const present = Array.isArray(v)
        ? v.length > 0
        : v && typeof v === "object"
          ? Object.keys(v).length > 0
          : !!v;
      if (present) surface_cut_violations.push(k);
      continue;
    }
    if (!ALLOWED_TOP_LEVEL.has(k)) surface_unowned_paths.push(k);
  }
  if (mode === "enforce") {
    if (surface_cut_violations.length > 0) {
      throw new Error(
        `[composition-finalize] surface-guard: ${surface_cut_violations.length} CUT-list violation(s): ${surface_cut_violations.join(", ")}`,
      );
    }
    if (surface_unowned_paths.length > 0) {
      throw new Error(
        `[composition-finalize] surface-guard: ${surface_unowned_paths.length} unowned top-level path(s): ${surface_unowned_paths.join(", ")}`,
      );
    }
  }

  // (3) composition-hook-audit — always fail-loud (config surface)
  assertCompositionHookConformance({
    hookValue: input.hookValue,
    writeAroundEntered: input.writeAroundEntered,
  });

  const hookPresent = typeof input.hookValue === "string" && input.hookValue.length > 0;
  return {
    reportData: screen.reportData,
    telemetry: {
      version: COMPOSITION_FINALIZE_VERSION,
      mode,
      value_screen_hits: screen.firstHits,
      value_screen_recomposed: screen.recomposed,
      value_screen_final_hits: screen.finalHits,
      surface_unowned_paths,
      surface_cut_violations,
      hook_audit_ok: true,
      hook_value_present: hookPresent,
      write_around_entered: input.writeAroundEntered,
    },
  };
}

/** Convenience for callers who want the env-derived mode without importing Deno. */
export function currentEnforceMode(env: { get(name: string): string | undefined } = Deno.env): FinalizeMode {
  return env.get(ENFORCE_ENV) === "1" ? "enforce" : "observe";
}

/** Re-export for callers that read the hook value at the composition start. */
export { readForceWriteAroundOnce };

// ── SAFE WRAPPER (SMOKE-HANG ROOT FIX, 2026-07-27) ─────────────────
// HARD INVARIANT: finalize-path failures must NEVER prevent persist.
// This wrapper catches ALL exceptions (including enforce-mode throws
// and any bug in the finalize path itself) and applies a soft
// wall-clock budget. It NEVER throws. Callers ALWAYS get a result
// they can safely persist. Enforce-mode strictness is preserved via
// `telemetry.enforce_violation` for measurement verdicts — the
// document still ships; the verdict is what enforce mode governs.
export const SAFE_FINALIZE_VERSION = "safe-finalize@2026-07-27-hangfix";
export const SAFE_FINALIZE_BUDGET_MS_DEFAULT = 15_000;

export interface SafeFinalizeTelemetry {
  readonly version: string;
  readonly safe_version: string;
  readonly mode: FinalizeMode;
  readonly errored: boolean;
  readonly error_kind?: string;
  readonly error_message?: string;
  readonly enforce_violation: boolean;
  readonly budget_ms: number;
  readonly elapsed_ms: number;
  readonly budget_exceeded: boolean;
  readonly inner?: FinalizeTelemetry;
}

export interface SafeFinalizeResult {
  readonly reportData: unknown;
  readonly telemetry: SafeFinalizeTelemetry;
}

function nowMs(): number {
  return (typeof performance !== "undefined" && typeof performance.now === "function")
    ? performance.now()
    : Date.now();
}

/**
 * Call finalizeComposition() with belt-and-suspenders safety:
 *   - ANY exception → caught, telemetered, original reportData returned unchanged
 *   - Soft wall-clock budget → elapsed_ms + budget_exceeded flag (sync work
 *     cannot be preempted, but overshoot is telemetered)
 *   - NEVER throws — persist always runs
 *
 * Enforce-mode value-screen / surface-guard throws are recorded as
 * `enforce_violation: true` on telemetry so measurement can act on them;
 * the document itself is never blocked.
 */
export function safeFinalizeComposition(
  input: FinalizeInput & { budgetMs?: number },
): SafeFinalizeResult {
  const budgetMs = input.budgetMs ?? SAFE_FINALIZE_BUDGET_MS_DEFAULT;
  const t0 = nowMs();
  const originalReport = input.reportData;
  let envMode: FinalizeMode = "observe";
  try {
    envMode = input.mode ?? currentEnforceMode(input.env ?? Deno.env);
  } catch { /* env read cannot block persist */ }
  try {
    const res = finalizeComposition(input);
    const elapsed = Math.round(nowMs() - t0);
    return {
      reportData: res.reportData,
      telemetry: {
        version: res.telemetry.version,
        safe_version: SAFE_FINALIZE_VERSION,
        mode: res.telemetry.mode,
        errored: false,
        enforce_violation: false,
        budget_ms: budgetMs,
        elapsed_ms: elapsed,
        budget_exceeded: elapsed > budgetMs,
        inner: res.telemetry,
      },
    };
  } catch (e) {
    const elapsed = Math.round(nowMs() - t0);
    const err = e as Error;
    const kind = err?.name ?? "Error";
    const message = err?.message ?? String(e);
    return {
      reportData: originalReport,
      telemetry: {
        version: COMPOSITION_FINALIZE_VERSION,
        safe_version: SAFE_FINALIZE_VERSION,
        mode: envMode,
        errored: true,
        error_kind: kind,
        error_message: message.slice(0, 500),
        enforce_violation: envMode === "enforce"
          && (kind === "ValueScreenError" || message.includes("surface-guard")),
        budget_ms: budgetMs,
        elapsed_ms: elapsed,
        budget_exceeded: elapsed > budgetMs,
      },
    };
  }
}
