/**
 * ADMT master review (2026-09-15, F06) — the opt-out path classifier.
 *
 * The page decided which questions to show with `!startsWith("Human appeal")
 * && !startsWith("Hiring") && !startsWith("Work allocation")`, so an
 * "Other — my situation differs" answer, or any unrecognised text, was
 * treated as the full opt-out path and validated (and reported) as such.
 * The engine never inferred an exception the business did not select:
 * computeOptOutPath in
 * supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts
 * resolves five states and sends anything unrecognised to OTHER_UNRESOLVED.
 *
 * FRONTEND MIRROR of that classifier, pinned by
 * tests/edge/run-admt-checker-v2/scope-mirror-parity.test.ts.
 */

export type AdmtOptOutPath =
  | "HUMAN_APPEAL_EXCEPTION"
  | "HIRING_ADMISSION_EXCEPTION"
  | "WORK_ALLOCATION_COMP_EXCEPTION"
  | "FULL_OPT_OUT"
  | "OTHER_UNRESOLVED";

export function resolveAdmtOptOutPath(optOutException: string): AdmtOptOutPath {
  const raw = (optOutException ?? "").trim();
  if (raw.startsWith("Human appeal exception")) return "HUMAN_APPEAL_EXCEPTION";
  if (raw.startsWith("Hiring/admission exception")) return "HIRING_ADMISSION_EXCEPTION";
  if (raw.startsWith("Work allocation/compensation exception")) return "WORK_ALLOCATION_COMP_EXCEPTION";
  if (raw.startsWith("No exception")) return "FULL_OPT_OUT";
  return "OTHER_UNRESOLVED";
}

/** The full opt-out questions are shown on the full path and, as optional facts, on an unresolved path. */
export function showsOptOutMechanics(path: AdmtOptOutPath): boolean {
  return path === "FULL_OPT_OUT" || path === "OTHER_UNRESOLVED";
}

/** The § 7221(b)(2)/(b)(3) sole-use and non-discrimination questions. */
export function isEmploymentException(path: AdmtOptOutPath): boolean {
  return path === "HIRING_ADMISSION_EXCEPTION" || path === "WORK_ALLOCATION_COMP_EXCEPTION";
}
