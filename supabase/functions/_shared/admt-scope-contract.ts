// _shared/admt-scope-contract.ts
//
// POST-C1-FIX-1C — ADMT SCHEMA NORMALIZATION (register item #2).
//
// Canonical, typed contract for the ADMT report's scope/trigger booleans.
// Every consumer (generator, gate logic, normalizer, renderer, PDF, grader,
// tests) reads scope via `readAdmtScope(report)` OR mutates via
// `normalizeAdmtScopeShape(report)`. There is exactly ONE canonical location
// for each scope boolean: nested under `report.scope_analysis.*`.
//
// Migration safety:
//   - Historically-stored reports that carry top-level scope fields (from
//     pre-normalization runs) are still readable: `readAdmtScope` falls back
//     to the top-level field ONLY when the nested value is undefined.
//   - When BOTH a nested value and a conflicting top-level value are present,
//     the nested value wins and a structured drift event is logged
//     (`evt: "admt_scope_drift_detected"`).
//   - `normalizeAdmtScopeShape` (used at generation time) moves any stray
//     top-level fields into `scope_analysis` before persistence, so newly
//     produced reports never carry the top-level shape.
//
// This kills the "silent gate bug" class (dual-path reads with different
// fallback rules) by making the dual path a single normalization step at the
// entry boundary.

// eslint-disable-next-line @typescript-eslint/no-explicit-any

export const SCOPE_FIELDS = [
  "is_admt",
  "triggers_significant_decision",
  "human_review_qualifies",
  "triggers_risk_assessment",
  "triggers_profiling",
  "exception_qualifies",
] as const;

export type ScopeField = typeof SCOPE_FIELDS[number];

export type Tribool = boolean | "cannot_determine" | null;

export interface AdmtScopeAnalysis {
  is_admt: boolean | null;
  is_admt_reasoning?: string;
  triggers_significant_decision: boolean | null;
  determination_basis?: "established" | "conservative_assumption";
  significant_decision_reasoning?: string;
  human_review_qualifies: boolean | null;
  human_review_reasoning?: string;
  triggers_risk_assessment: boolean | null;
  risk_assessment_reasoning?: string;
  triggers_profiling: boolean | null;
  exception_claimed?: string;
  exception_qualifies: Tribool;
  exception_reasoning?: string;
  third_party_responsibility_note?: string;
  summary?: string;
}

function asBool(v: unknown): boolean | null {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return null;
}
function asTribool(v: unknown): Tribool {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  if (v === "cannot_determine") return "cannot_determine";
  return null;
}
function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
function log(evt: Record<string, unknown>): void {
  try { console.log(JSON.stringify(evt)); } catch { /* noop */ }
}

/**
 * Canonical scope-analysis reader. Nested wins. Top-level is legacy-only.
 * Emits `admt_scope_drift_detected` when a conflicting top-level value is
 * present so we can watchdog stored-report drift over time.
 */
export function readAdmtScope(
  report: unknown,
  opts: { context?: string } = {},
): AdmtScopeAnalysis {
  const r = (report ?? {}) as Record<string, unknown>;
  const nested = (r.scope_analysis ?? {}) as Record<string, unknown>;
  const drift: string[] = [];

  const pick = (key: ScopeField, cast: (v: unknown) => boolean | null | Tribool) => {
    const n = cast(nested[key]);
    const t = cast(r[key]);
    if (n !== null && t !== null && n !== t) drift.push(key);
    return n !== null ? n : t;
  };

  const out: AdmtScopeAnalysis = {
    is_admt: pick("is_admt", asBool) as boolean | null,
    is_admt_reasoning: asString(nested.is_admt_reasoning) ?? asString(r.is_admt_reasoning),
    triggers_significant_decision: pick("triggers_significant_decision", asBool) as boolean | null,
    determination_basis: (nested.determination_basis === "conservative_assumption"
      ? "conservative_assumption"
      : nested.determination_basis === "established" ? "established" : undefined),
    significant_decision_reasoning: asString(nested.significant_decision_reasoning),
    human_review_qualifies: pick("human_review_qualifies", asBool) as boolean | null,
    human_review_reasoning: asString(nested.human_review_reasoning),
    triggers_risk_assessment: pick("triggers_risk_assessment", asBool) as boolean | null,
    risk_assessment_reasoning: asString(nested.risk_assessment_reasoning),
    triggers_profiling: pick("triggers_profiling", asBool) as boolean | null,
    exception_claimed: asString(nested.exception_claimed) ?? asString(r.exception_claimed),
    exception_qualifies: pick("exception_qualifies", asTribool) as Tribool,
    exception_reasoning: asString(nested.exception_reasoning),
    third_party_responsibility_note: asString(nested.third_party_responsibility_note),
    summary: asString(nested.summary),
  };

  if (drift.length > 0) {
    log({
      evt: "admt_scope_drift_detected",
      context: opts.context ?? "readAdmtScope",
      fields: drift,
    });
  }
  return out;
}

/**
 * Normalize a report to the canonical shape BEFORE persistence.
 * - Ensures `scope_analysis` exists.
 * - Moves any top-level scope fields into `scope_analysis` (nested wins on conflict).
 * - Returns a diagnostic bag; does not throw.
 */
export function normalizeAdmtScopeShape(
  report: Record<string, unknown> | null | undefined,
): { moved: ScopeField[]; conflicts: ScopeField[] } {
  if (!report || typeof report !== "object") return { moved: [], conflicts: [] };
  const r = report as Record<string, unknown>;
  if (!r.scope_analysis || typeof r.scope_analysis !== "object") r.scope_analysis = {};
  const sa = r.scope_analysis as Record<string, unknown>;
  const moved: ScopeField[] = [];
  const conflicts: ScopeField[] = [];
  for (const key of SCOPE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(r, key)) {
      const topVal = r[key];
      if (Object.prototype.hasOwnProperty.call(sa, key) && sa[key] !== topVal) {
        conflicts.push(key);
      } else {
        sa[key] = topVal;
        moved.push(key);
      }
      delete r[key];
    }
  }
  if (moved.length || conflicts.length) {
    log({
      evt: "admt_scope_shape_normalized",
      moved, conflicts,
    });
  }
  return { moved, conflicts };
}

/**
 * Test-only assertion helper: throws if a report carries any top-level scope
 * field (i.e. schema drift). Use in unit tests / goldens.
 */
export function assertAdmtScopeShape(report: unknown): void {
  const r = (report ?? {}) as Record<string, unknown>;
  const bad = SCOPE_FIELDS.filter((k) => Object.prototype.hasOwnProperty.call(r, k));
  if (bad.length > 0) {
    throw new Error(`ADMT schema violation: top-level scope fields present: ${bad.join(", ")}`);
  }
}
