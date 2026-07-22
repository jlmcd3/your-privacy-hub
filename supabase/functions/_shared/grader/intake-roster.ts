// QB-P15 followup — universal intake-roster extraction for e6_counsel_referral.
// Prior implementation threaded only dpia.dpia_team; QB-P14-style runs across
// cppa-risk/cyber/admt/biometric/governance surfaced 10+ e6 false positives on
// intake-named staff (e.g. "Legal Counsel Miguel Rosario"). The e6 check pass
// gate is `intakeRosterNorm.includes(sNorm) && sNorm.length >= 20`, so
// widening the roster to the full stringified intake is SAFE (only sentences
// that appear verbatim in the intake can match; model-added directives cannot).
export function extractIntakeRoster(intake: unknown): string {
  if (!intake) return "";
  try {
    return typeof intake === "string" ? intake : JSON.stringify(intake);
  } catch {
    return "";
  }
}
