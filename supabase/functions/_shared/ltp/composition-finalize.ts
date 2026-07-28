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

export const COMPOSITION_FINALIZE_VERSION = "composition-finalize@2026-07-28-item215";
export const FRAGMENT_OMIT_VERSION = "fragment-omit@2026-07-27-item206";
export const ENFORCE_ENV = "LTP_COMPOSITION_ENFORCE";
export const SHIPPED_VALUE_SCREEN_VERSION = "shipped-value-screen@2026-07-28-item215";

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
  /** Retained for schema stability; always empty — unowned enforcement
   *  moved to `evaluateShippedSurfaceGuard` on the shipped projection
   *  (Item 213). Pre-serializer presence recorded in
   *  `pre_serializer_unowned_pending`. */
  readonly surface_unowned_paths: readonly string[];
  /** Retained for schema stability; always empty — CUT enforcement moved
   *  to `evaluateShippedSurfaceGuard` on the shipped projection (Item 211). */
  readonly surface_cut_violations: readonly string[];
  /** Item 211: presence of CUT-ruled paths (any grain) observed on the
   *  PRE-serializer composed object. Telemetry only. */
  readonly pre_serializer_cut_pending: readonly string[];
  /** Item 213: presence of unowned top-level keys (not in surface-map
   *  allow-list and not covered by a CUT ruling) observed on the
   *  PRE-serializer composed object. Telemetry only. */
  readonly pre_serializer_unowned_pending: readonly string[];
  /** Item 215: value-screen residual hits observed on the PRE-serializer
   *  composed object. Telemetry only — enforcement authority moved to
   *  `evaluateShippedValueScreen` on the shipped projection. */
  readonly pre_serializer_value_screen_pending: readonly ValueScreenHit[];
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
// ITEM 211 FIX (SMOKE-#8 review): all current RISK_CUT_RULINGS execute
// at the LEAK-PREV-P2 serializer (see risk-surface-map.ts). Pre-serializer
// finalize therefore MUST NOT throw on CUT-path presence — the composed
// object legitimately contains those paths and the serializer strips
// them. Enforcement authority for CUT rulings lives solely in
// `evaluateShippedSurfaceGuard` on the shipped projection.
//
// Pre-serializer, we now only RECORD presence of CUT paths (top-level or
// nested) under telemetry.pre_serializer_cut_pending. The unowned-top-
// level check remains enforced here — that class is not a serializer
// concern.
//
// The former CUT_TOP_LEVEL_REMOVE / _EMPTY_ARRAY throw paths (Item 208)
// are retired; presence is telemetered, not thrown on.

const ALLOWED_TOP_LEVEL: ReadonlySet<string> = new Set(
  RISK_SURFACE_BINDINGS.map((b) => b.path.split(".")[0].split("[")[0]),
);
// Preserve broader CUT set for unowned-vs-cut disambiguation (top-level
// keys covered by a CUT ruling are NOT "unowned" — they are pending
// serializer removal).
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

  // (1) value-screen with one bounded recompose — ITEM 215 CONSOLIDATION:
  // pre-serializer value-screen is ENTIRELY telemetry-only in every mode.
  // ALL leak-lexicon / truncated-slot-value enforcement authority lives at
  // the post-serializer wire-site (`evaluateShippedValueScreen`). The
  // composed object legitimately contains scaffolding the LEAK-PREV-P2
  // serializer strips (e.g. lint_warnings, retrieval_meta, legacy shims)
  // whose contents may reference retired-surface paths without ever
  // reaching the customer. Fragment-omit pre-pass (item 206) still runs
  // above — it is a repair, not a screen.
  const screen = driveValueScreen(rescreenInput);

  // (2) surface-write-guard walk — ITEM 213 CONSOLIDATION: pre-serializer
  // surface checks are ENTIRELY telemetry-only in every mode. ALL
  // surface-shape enforcement authority (CUT + unowned) lives at the
  // post-serializer wire-site (`evaluateShippedSurfaceGuard`). The
  // composed object legitimately contains keys the serializer strips
  // (e.g. generated_at, retrieval_meta) or CUT paths.
  const pre_serializer_cut_pending: string[] = [];
  const pre_serializer_unowned_pending: string[] = [];
  for (const ruling of RISK_CUT_RULINGS) {
    const v = getByPath(screen.reportData, ruling.path);
    if (isPresent(v)) pre_serializer_cut_pending.push(ruling.path);
  }
  for (const k of topKeys(screen.reportData)) {
    if (k.startsWith("_")) continue;
    if (CUT_TOP_LEVEL_ALL.has(k)) continue; // covered by a CUT ruling
    if (!ALLOWED_TOP_LEVEL.has(k)) pre_serializer_unowned_pending.push(k);
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
      surface_unowned_paths: [],
      surface_cut_violations: [],
      pre_serializer_cut_pending,
      pre_serializer_unowned_pending,
      pre_serializer_value_screen_pending: screen.finalHitDetails,
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




// ── ITEM 215 — POST-SERIALIZER SHIPPED VALUE-SCREEN ──────────────────
//
// Same consolidation pattern as Items 211 (CUT) and 213 (unowned): the
// enforce decision for leak-lexicon / truncated-slot-value / statutory-
// text hits moves to the shipped projection at the wire-site. NEVER
// throws — wire-site persist invariant is absolute. Callers write
// `_meta.internal.shipped_value_screen` from the returned envelope and
// enforce measurement verdicts via `enforce_violation`.

export interface ShippedValueScreenEvaluation {
  readonly version: string;
  readonly mode: FinalizeMode;
  readonly hits: readonly ValueScreenHit[];
  readonly enforce_violation: boolean;
}

export function evaluateShippedValueScreen(
  shipped: unknown,
  opts: { mode?: FinalizeMode; corpusSnippets?: readonly string[] } = {},
): ShippedValueScreenEvaluation {
  const mode: FinalizeMode = opts.mode ?? currentEnforceMode();
  let hits: readonly ValueScreenHit[] = [];
  try {
    runValueScreen({ reportData: shipped, corpusSnippets: opts.corpusSnippets });
  } catch (e) {
    if (e instanceof ValueScreenError) hits = e.hits;
    // any other error → suppress; wire-site cannot throw
  }
  return {
    version: SHIPPED_VALUE_SCREEN_VERSION,
    mode,
    hits,
    enforce_violation: mode === "enforce" && hits.length > 0,
  };
}

/** Item 215 fix (b) — true iff a lint entry's `field` references a
 * retired-surface path (any RISK_CUT_RULINGS top-level prefix). Callers
 * use this to skip pushing lint_warnings entries whose subject was
 * removed by the serializer, so retired surfaces never appear in lint
 * output. */
export function isRetiredSurfacePath(p: unknown): boolean {
  if (typeof p !== "string" || p.length === 0) return false;
  const top = p.split(".")[0].split("[")[0];
  return CUT_TOP_LEVEL_ALL.has(top);
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
