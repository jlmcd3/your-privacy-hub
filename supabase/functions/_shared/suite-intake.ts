// QA round two (SUITE-A-02 / SUITE-B03, High, 2026-09-06) — the CPPA Suite
// charged for two reports and generated the Cybersecurity one from the Risk
// questionnaire.
//
// The Suite has two entry points (/cppa-risk-assessment?suite=true and
// /cppa-cybersecurity?suite=true). Each collects ONE module's intake and then
// buys the bundle, and create-tool-checkout wrote that single payload to BOTH
// rows. The Cyber module therefore ran against Risk answers and produced
// "Insufficient basis to assess, 0/100, all 18 controls not assessable,
// PREPARED FOR THE COMPANY" — a paid document whose score reflects that no
// answers were ever collected, not that the customer has no controls.
//
// The bundle now carries an explicit per-module envelope and is refused unless
// both modules are actually answered. These predicates are the single
// definition of "answered" and are shared by the checkout guard and its tests.

export interface SuiteModuleIntakes {
  risk_assessment?: Record<string, unknown> | null;
  cybersecurity?: Record<string, unknown> | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const nonEmptyString = (v: unknown): boolean => typeof v === "string" && v.trim() !== "";

/**
 * A CPPA Cybersecurity intake, as CPPACybersecurity.tsx builds it:
 * `{ profile, controls: [{ key, label, maturity, notes, evidence, na_reason }] }`.
 * The load-bearing evidence is the per-control maturity rating — without at
 * least one, the 18-component assessment has nothing to assess.
 */
export function hasCyberIntake(intake: unknown): boolean {
  if (!isRecord(intake)) return false;
  const controls = intake["controls"];
  if (!Array.isArray(controls) || controls.length === 0) return false;
  return controls.some((c) => isRecord(c) && nonEmptyString(c["maturity"]));
}

/**
 * A CPPA Risk intake, as CPPARiskAssessment.tsx builds it. `entityName` and
 * the § 7150(b) threshold answers are present from the first stage, so either
 * is enough to tell a real Risk payload from an empty or foreign one.
 */
export function hasRiskIntake(intake: unknown): boolean {
  if (!isRecord(intake)) return false;
  if (nonEmptyString(intake["entityName"])) return true;
  if (nonEmptyString(intake["primaryActivityName"])) return true;
  if (nonEmptyString(intake["q1"]) || nonEmptyString(intake["q2"])) return true;
  return false;
}

/**
 * Names the modules a Suite purchase is still missing. An empty list means the
 * bundle may be charged for; anything else must block checkout, because every
 * row created would otherwise be paid for and ungeneratable.
 */
export function missingSuiteModules(modules: SuiteModuleIntakes | null | undefined): string[] {
  const missing: string[] = [];
  if (!hasRiskIntake(modules?.risk_assessment)) missing.push("risk_assessment");
  if (!hasCyberIntake(modules?.cybersecurity)) missing.push("cybersecurity");
  return missing;
}

/**
 * Reads the per-module envelope out of a checkout's intake_data.
 *
 * Legacy payloads carried ONE module's answers at the top level with no
 * envelope; that is the defect itself, so they resolve to a single module and
 * are then refused by missingSuiteModules rather than silently duplicated
 * across both rows.
 */
export function readSuiteModules(intakeData: unknown): SuiteModuleIntakes {
  if (!isRecord(intakeData)) return {};
  const envelope = intakeData["suite_modules"];
  if (isRecord(envelope)) {
    return {
      risk_assessment: isRecord(envelope["risk_assessment"]) ? envelope["risk_assessment"] : null,
      cybersecurity: isRecord(envelope["cybersecurity"]) ? envelope["cybersecurity"] : null,
    };
  }
  return {
    risk_assessment: hasRiskIntake(intakeData) ? intakeData : null,
    cybersecurity: hasCyberIntake(intakeData) ? intakeData : null,
  };
}
