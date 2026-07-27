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
export const FRAGMENT_OMIT_VERSION = "fragment-omit@2026-07-27-item206";
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
  readonly value_screen_hit_details: readonly ValueScreenHit[];
  readonly fragment_omit_version: string;
  readonly fragment_omit_count: number;
  readonly fragment_omit_paths: readonly string[];
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
//
// ITEM 208 FIX (SMOKE-#6 review): the surface-guard walk previously
// collapsed EVERY CutRuling to its top-level key. That wrongly
// condemned bound surfaces like `scope_and_triggers` whose sole cut
// ruling is a NESTED OBJECT_PRUNE (`scope_and_triggers.scope_notes`).
//
// The rulings in risk-surface-map.ts state that CUTs execute at the
// LEAK-PREV-P2 serializer layer. At finalize (pre-serializer) we only
// enforce the two rulings whose grain IS the top level:
//   REMOVE       → the top-level key must be absent
//   EMPTY_ARRAY  → the array may exist but must be empty
// OBJECT_PRUNE rulings are enforced by the post-serializer guard at
// the wire-site (see `evaluateShippedSurfaceGuard`).

const CUT_TOP_LEVEL_REMOVE: ReadonlySet<string> = new Set(
  RISK_CUT_RULINGS
    .filter((c) => c.mode === "REMOVE" && !c.path.includes("."))
    .map((c) => c.path.replace(/\[\]$/, "")),
);
const CUT_TOP_LEVEL_EMPTY_ARRAY: ReadonlySet<string> = new Set(
  RISK_CUT_RULINGS
    .filter((c) => c.mode === "EMPTY_ARRAY" && !c.path.includes("."))
    .map((c) => c.path.replace(/\[\]$/, "")),
);
const ALLOWED_TOP_LEVEL: ReadonlySet<string> = new Set(
  RISK_SURFACE_BINDINGS.map((b) => b.path.split(".")[0].split("[")[0]),
);
// Preserve broader CUT set for unowned-vs-cut disambiguation.
const CUT_TOP_LEVEL_ALL: ReadonlySet<string> = new Set(
  RISK_CUT_RULINGS.map((c) => c.path.split(".")[0].split("[")[0]),
);

function topKeys(obj: unknown): string[] {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  return Object.keys(obj as Record<string, unknown>);
}

/** Read a value by dotted path; returns undefined for any missing segment. */
function getByPath(root: unknown, path: string): unknown {
  const parts = path.replace(/\[\]/g, "").split(".").filter(Boolean);
  let cur: any = root;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

/** Presence test for OBJECT_PRUNE / REMOVE. */
function isPresent(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  if (typeof v === "string") return v.length > 0;
  return true;
}

/**
 * ITEM 208 — POST-SERIALIZER SURFACE GUARD.
 *
 * Evaluates every CutRuling at its DECLARED path + mode against the
 * shipped/graded projection (the artifact that leaves the wire). Also
 * flags top-level keys that are neither bound in the surface map nor
 * covered by any CUT ruling.
 *
 * Callers run this AFTER the LEAK-PREV-P2 serializer. Enforcement is
 * telemetry-only at the wire-site — the persist invariant forbids
 * blocking on finalize-class failures.
 */
export interface ShippedSurfaceEvaluation {
  readonly cut_violations: readonly { path: string; mode: string; detail: string }[];
  readonly unowned_paths: readonly string[];
}

export function evaluateShippedSurfaceGuard(shipped: unknown): ShippedSurfaceEvaluation {
  const cut_violations: { path: string; mode: string; detail: string }[] = [];
  for (const ruling of RISK_CUT_RULINGS) {
    const v = getByPath(shipped, ruling.path);
    if (ruling.mode === "REMOVE" || ruling.mode === "OBJECT_PRUNE") {
      if (isPresent(v)) {
        cut_violations.push({
          path: ruling.path,
          mode: ruling.mode,
          detail: `${ruling.mode} path present post-serializer`,
        });
      }
    } else if (ruling.mode === "EMPTY_ARRAY") {
      if (Array.isArray(v) && v.length > 0) {
        cut_violations.push({
          path: ruling.path,
          mode: ruling.mode,
          detail: `EMPTY_ARRAY path has ${v.length} entries`,
        });
      }
    }
  }
  const unowned_paths: string[] = [];
  for (const k of topKeys(shipped)) {
    if (k.startsWith("_")) continue; // _meta subtree is not surface-map bound
    if (ALLOWED_TOP_LEVEL.has(k)) continue;
    if (CUT_TOP_LEVEL_ALL.has(k)) continue; // covered by CUT rulings above
    unowned_paths.push(k);
  }
  return { cut_violations, unowned_paths };
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

// ── Fragment-omit pre-pass (Item 206) ─────────────────────────────────
// ROOT-ADJACENT FIX: any string slot whose entire trimmed value is a
// closed-set truncation token (see TRUNCATED_SLOT_VALUES) cannot be a
// legitimate value of a customer-facing slot. Rather than shipping the
// fragment, we OMIT the key entirely (object) or elide the entry (array).
// This satisfies the CEO ruling: "the slot must be filled with the full
// intended value or omitted entirely (never a fragment)." Anchor paths
// (id/citation/…) are exempt. Underscore subtrees (_meta) are not walked.
export interface FragmentOmitResult {
  readonly reportData: unknown;
  readonly omittedPaths: readonly string[];
}

export function omitFragmentSlots(node: unknown, path = ""): FragmentOmitResult {
  const omitted: string[] = [];
  function walk(n: unknown, p: string): unknown {
    if (typeof n === "string") return n;
    if (Array.isArray(n)) {
      const out: unknown[] = [];
      for (let i = 0; i < n.length; i++) {
        const childPath = `${p}[${i}]`;
        const v = n[i];
        if (typeof v === "string" && !isAnchorPath(childPath)
            && TRUNCATED_SLOT_VALUE_SET.has(v.trim())) {
          omitted.push(childPath);
          continue; // elide fragment array entry
        }
        out.push(walk(v, childPath));
      }
      return out;
    }
    if (n && typeof n === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(n as Record<string, unknown>)) {
        if (k.startsWith("_")) { out[k] = v; continue; } // preserve _meta untouched
        const childPath = p ? `${p}.${k}` : k;
        if (typeof v === "string" && !isAnchorPath(childPath)
            && TRUNCATED_SLOT_VALUE_SET.has(v.trim())) {
          omitted.push(childPath);
          continue; // omit fragment slot entirely
        }
        out[k] = walk(v, childPath);
      }
      return out;
    }
    return n;
  }
  const scrubbed = walk(node, path);
  return { reportData: scrubbed, omittedPaths: omitted };
}

// ── Public API ───────────────────────────────────────────────────────

export function finalizeComposition(input: FinalizeInput): FinalizeResult {
  const env = input.env ?? Deno.env;
  const mode: FinalizeMode =
    input.mode ?? (env.get(ENFORCE_ENV) === "1" ? "enforce" : "observe");

  // (0) Fragment-omit pre-pass — remove whole-value truncation slots at root.
  const omit = omitFragmentSlots(input.reportData);
  const rescreenInput: FinalizeInput = { ...input, reportData: omit.reportData };

  // (1) value-screen with one bounded recompose
  const screen = driveValueScreen(rescreenInput);
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
      value_screen_hit_details: screen.finalHitDetails,
      fragment_omit_version: FRAGMENT_OMIT_VERSION,
      fragment_omit_count: omit.omittedPaths.length,
      fragment_omit_paths: omit.omittedPaths,
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
export const SAFE_FINALIZE_VERSION = "safe-finalize@2026-07-27-item206-hits";
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
  /**
   * ITEM 206 — per-hit ValueScreenError details preserved on the catch
   * path so the wire-site can persist path/context under
   * `_meta.internal.composition_finalize.hits`. Never blind again.
   */
  readonly hits: readonly ValueScreenHit[];
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
        hits: res.telemetry.value_screen_hit_details,
        inner: res.telemetry,
      },
    };
  } catch (e) {
    const elapsed = Math.round(nowMs() - t0);
    const err = e as Error;
    const kind = err?.name ?? "Error";
    const message = err?.message ?? String(e);
    const hits: readonly ValueScreenHit[] =
      e instanceof ValueScreenError ? e.hits : [];
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
        hits,
      },
    };
  }
}
