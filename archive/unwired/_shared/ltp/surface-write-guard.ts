/**
 * surface-write-guard — Stage-B AUTHOR-CHECKPOINT (2026-07-27).
 *
 * Item 180.2 addendum. Enforces the risk-surface-map at composition
 * time. Any emitter or renderer writing to a report_data path it does
 * not own = hard reject with a diagnostic.
 *
 * Mechanically enforces §28 Engine-B primacy. Would have auto-caught
 * the cohort-to-CUT-surface bug (§ 7121(a) tier→deadline written to
 * cross_tool_recommendations instead of submission_summary) already
 * traced in DUAL-SMOKE-POSTFIX-2026-07-27.md.
 *
 * Also enforces the RISK_CUT_RULINGS: writes to CUT paths are rejected.
 */

import {
  RISK_SURFACE_BINDINGS,
  RISK_CUT_RULINGS,
  RISK_SURFACE_MAP_VERSION,
} from "../../../../supabase/functions/_shared/ltp/content/risk-surface-map.ts";

export const SURFACE_WRITE_GUARD_VERSION = `surface-write-guard@2026-07-27+${RISK_SURFACE_MAP_VERSION}`;

export class SurfaceWriteGuardError extends Error {
  readonly path: string;
  readonly reason: "cut" | "unowned" | "template-not-allowed";
  constructor(reason: "cut" | "unowned" | "template-not-allowed", path: string, detail: string) {
    super(`[surface-write-guard] ${reason} @ ${path}: ${detail}`);
    this.reason = reason;
    this.path = path;
    this.name = "SurfaceWriteGuardError";
  }
}

/** Normalize an actual dotted path (e.g. "foo[3].bar") to the pattern shape used by RISK_SURFACE_BINDINGS ("foo[].bar"). */
function normalizeToPattern(path: string): string {
  return path.replace(/\[\d+\]/g, "[]");
}

export interface WriteAttempt {
  /** Full dotted path where the write is landing (with numeric indices). */
  readonly path: string;
  /** Template id doing the writing, or the sentinel used in the map. */
  readonly template: string;
}

/**
 * Assert that a proposed write is authorized by the surface map.
 * Throws SurfaceWriteGuardError on any of:
 *   - The path is on the CUT list (rejected outright).
 *   - The path has no binding (unowned).
 *   - The binding exists but does not allow this template.
 */
export function assertSurfaceWriteAllowed(attempt: WriteAttempt): void {
  const pattern = normalizeToPattern(attempt.path);
  const cut = RISK_CUT_RULINGS.find((c) => c.path === pattern || attempt.path.startsWith(c.path));
  if (cut) {
    throw new SurfaceWriteGuardError("cut", attempt.path, `CUT ruling: ${cut.rationale}`);
  }
  const binding = RISK_SURFACE_BINDINGS.find((b) => b.path === pattern);
  if (!binding) {
    throw new SurfaceWriteGuardError(
      "unowned",
      attempt.path,
      `no surface binding — refusing write from template "${attempt.template}".`,
    );
  }
  if (!binding.templates.includes(attempt.template as never)) {
    throw new SurfaceWriteGuardError(
      "template-not-allowed",
      attempt.path,
      `template "${attempt.template}" not in allowed set [${binding.templates.join(", ")}].`,
    );
  }
}

/** Bulk-check a plan of writes; throws on the first violation. */
export function assertAllWritesAllowed(attempts: readonly WriteAttempt[]): void {
  for (const a of attempts) assertSurfaceWriteAllowed(a);
}
