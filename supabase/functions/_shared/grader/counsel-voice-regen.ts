// CV1-R2 T4c — auto-regen trigger predicate for counsel-voice format checks.
//
// A single regeneration round is authorized ONLY when the run's deterministic
// checks fail EXCLUSIVELY on the two counsel-voice format checks:
//   - e6_counsel_referral   (body-text counsel referral)
//   - e5_bare_advisory_close (advisory close without a named fact)
// AND every other deterministic check passed. If ANY other deterministic
// check failed the run stands as-is — regen is scoped to counsel-voice
// residuals and never used to chase a score.
//
// Pure function — no I/O. Exported so run-quality-batch tests can exercise
// it without booting an edge runtime.

export type DetCheck = {
  check_id: string;
  passed: boolean;
  check_type?: string;
  dimension?: string;
  severity?: string;
  evidence?: string | null;
};

export const CV_REGEN_TRIGGER_CHECKS: ReadonlySet<string> = new Set([
  "e6_counsel_referral",
  "e5_bare_advisory_close",
]);

/**
 * Predicate: is this doc eligible for a single counsel-voice regen round?
 *
 * Eligible iff:
 *  - at least one failing check is in CV_REGEN_TRIGGER_CHECKS, AND
 *  - every failing check is in CV_REGEN_TRIGGER_CHECKS (no other detects).
 *
 * Returns false for empty / undefined inputs.
 */
export function isCounselVoiceRegenEligible(checks: DetCheck[] | undefined | null): boolean {
  if (!Array.isArray(checks) || checks.length === 0) return false;
  const failing = checks.filter((c) => c && c.passed === false);
  if (failing.length === 0) return false;
  const anyTrigger = failing.some((c) => CV_REGEN_TRIGGER_CHECKS.has(c.check_id));
  if (!anyTrigger) return false;
  return failing.every((c) => CV_REGEN_TRIGGER_CHECKS.has(c.check_id));
}
