/**
 * ADMT master review (2026-09-15, F01) — ONE scope resolver for the intake.
 *
 * The page used to carry its own preliminary read of scope that ignored the
 * housing exclusion and the solely-advertising answer, treated three
 * affirmative self-test answers as qualifying even when the review happened
 * after the decision, and could not say "not yet answered" or "contradictory"
 * — it chose silently. The report's engine already resolves scope with those
 * distinctions (computeScope in
 * supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts).
 *
 * This module is a FRONTEND MIRROR of that engine's scope state machine,
 * pinned by tests/edge/run-admt-checker-v2/scope-mirror-parity.test.ts, which
 * runs both over the same matrix of records and fails on any divergence. The
 * page uses it for the preliminary banner, for which steps are optional, and
 * for the review screen, so all four surfaces agree with the report.
 *
 * Four states, as the review asked: NOT_YET_ANSWERED (the engine's
 * UNABLE_TO_ASSESS), INCONSISTENT_RECORD, OUT_OF_SCOPE, IN_SCOPE. A missing
 * answer never becomes a legal negative. Relative imports only (Deno tests).
 */

export const ADMT_NONE_DOMAIN = "None of these categories — the decision is outside every § 7001(ddd) category";
export const ADMT_HOUSING_DOMAIN = "Housing (rental or purchase eligibility)";

export type AdmtScopeState = "NOT_YET_ANSWERED" | "INCONSISTENT_RECORD" | "OUT_OF_SCOPE" | "IN_SCOPE";

/** The engine's ScopeState name for each mirror state (parity test uses it). */
export const ENGINE_STATE_FOR: Record<AdmtScopeState, "UNABLE_TO_ASSESS" | "INCONSISTENT_RECORD" | "OUT_OF_SCOPE" | "IN_SCOPE"> = {
  NOT_YET_ANSWERED: "UNABLE_TO_ASSESS",
  INCONSISTENT_RECORD: "INCONSISTENT_RECORD",
  OUT_OF_SCOPE: "OUT_OF_SCOPE",
  IN_SCOPE: "IN_SCOPE",
};

export interface AdmtScopeInput {
  readonly decisionDomains: readonly string[];
  readonly humanReview: string;
  /** admt_detail.* answers the resolver reads. */
  readonly detail: {
    readonly housing_decision_basis?: string;
    readonly solely_advertising?: string;
    readonly hi_reviewer_present?: string;
    readonly hi_stage?: string;
    readonly hi_trained?: string;
    readonly hi_reviews_other_info?: string;
    readonly hi_authority_override?: string;
  };
}

export interface AdmtScopeResult {
  readonly state: AdmtScopeState;
  /** Facts the state rests on, in plain words (one per line on the banner). */
  readonly facts: readonly string[];
  /** Answers still needed before a finding can be reached (NOT_YET_ANSWERED). */
  readonly missing: readonly string[];
  /** Contradictions the user is asked to resolve (INCONSISTENT_RECORD). */
  readonly contradictions: readonly string[];
  /** Conditions the engine states beside an OUT_OF_SCOPE finding (never a state change). */
  readonly conditions: readonly string[];
  readonly categoricalNone: boolean;
  readonly housingExcluded: boolean;
  readonly clearAdvertisingExclusion: boolean;
  /** True when Article 11 duties are determined not to attach on the record (steps 2–4 optional). */
  readonly dutiesMayNotAttach: boolean;
}

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function resolveAdmtScope(input: AdmtScopeInput): AdmtScopeResult {
  const rawDomains = (input.decisionDomains ?? []).map(s).filter(Boolean);
  const d = input.detail ?? {};
  const noneSelected = rawDomains.includes(ADMT_NONE_DOMAIN);
  const regulatedDomains = rawDomains.filter((x) => x !== ADMT_NONE_DOMAIN);
  const housingBasis = s(d.housing_decision_basis);
  const housingExcluded = regulatedDomains.includes(ADMT_HOUSING_DOMAIN) && housingBasis.startsWith("Yes");
  const domains = regulatedDomains.filter((x) => !(x === ADMT_HOUSING_DOMAIN && housingExcluded));
  const noneConflict = noneSelected && regulatedDomains.length > 0;
  const categoricalNone = !noneConflict &&
    ((noneSelected && regulatedDomains.length === 0) ||
      (housingExcluded && domains.length === 0 && regulatedDomains.length === 1));
  const humanReview = s(input.humanReview);
  const solelyAdvertising = s(d.solely_advertising);
  const clearAdvertisingExclusion = domains.length === 0 && solelyAdvertising.startsWith("Yes");
  const humanReviewUnresolved = !humanReview || /^not applicable/i.test(humanReview);

  const hiPresent = s(d.hi_reviewer_present);
  const hiStage = s(d.hi_stage);
  const hiDenials: string[] = [];
  if (s(d.hi_trained) === "No") hiDenials.push("the reviewer is not trained to interpret the output (§ 7001(e)(1)(A))");
  if (s(d.hi_reviews_other_info) === "No") hiDenials.push("the reviewer considers nothing beyond the output (§ 7001(e)(1)(B))");
  if (s(d.hi_authority_override) === "No") hiDenials.push("the reviewer cannot change the decision (§ 7001(e)(1)(C))");
  if (/^No/.test(hiPresent)) hiDenials.push("no human reviewer is involved");
  if (/^After the decision/.test(hiStage)) hiDenials.push("the review occurs after the decision issues");
  else if (hiStage === "Appeal only") hiDenials.push("the review occurs on appeal only");
  const hiContradiction = humanReview.startsWith("Yes") && hiDenials.length > 0 && domains.length > 0;
  const advertisingConflict = solelyAdvertising.startsWith("Yes") && domains.length > 0;

  const facts: string[] = [];
  const missing: string[] = [];
  const contradictions: string[] = [];
  const conditions: string[] = [];

  if (domains.length > 0) facts.push(`Significant-decision ${domains.length === 1 ? "domain" : "domains"} recorded: ${domains.join("; ")}.`);
  if (housingExcluded) facts.push("The housing decision is based solely on availability, vacancy or receipt of payment, so it is not a significant decision (§ 7001(ddd)(2)).");
  if (noneSelected && !noneConflict) facts.push("The decision is recorded as outside every § 7001(ddd) category.");
  if (solelyAdvertising.startsWith("Yes")) facts.push("The system is recorded as used solely for advertising (§ 7001(ddd)(6)).");
  if (humanReview.startsWith("Yes")) facts.push("Qualifying human review is recorded (interprets the output, reviews other information, can change the decision).");
  else if (humanReview.startsWith("Partial")) facts.push("Human review is recorded as partial: the reviewer sees the output but cannot override it.");
  else if (humanReview.startsWith("No")) facts.push("No human review is recorded.");

  let state: AdmtScopeState;
  if (advertisingConflict) {
    state = "INCONSISTENT_RECORD";
    contradictions.push(`A significant-decision domain (${domains.join("; ")}) is selected while the system is recorded as used solely for advertising. One of these answers needs to change.`);
  } else if (noneConflict) {
    state = "INCONSISTENT_RECORD";
    contradictions.push(`"None of these categories" is selected together with ${regulatedDomains.join("; ")}. Select the domain(s) or the negative, not both.`);
  } else if (hiContradiction) {
    state = "INCONSISTENT_RECORD";
    contradictions.push(`Qualifying human review is recorded, but the self-test says ${hiDenials.join("; ")}. Reconcile the two: human involvement needs all three elements, before the decision issues.`);
  } else if (clearAdvertisingExclusion || categoricalNone) {
    state = "OUT_OF_SCOPE";
  } else if (domains.length === 0) {
    state = "NOT_YET_ANSWERED";
    missing.push("the significant decision(s) this system makes, or \"None of these categories\"");
    if (humanReviewUnresolved) missing.push("how human review of the output works");
  } else if (humanReview.startsWith("Yes")) {
    state = "OUT_OF_SCOPE";
    // Engine parity: the engine keeps OUT_OF_SCOPE and states a priority-1
    // condition where review covers only a subset (partial coverage, F01/F03).
    if (/^Sometimes/.test(hiPresent)) conditions.push("Review covers only a subset of decisions; the decisions reviewed by no one are ADMT and the Article 11 duties apply to them.");
  } else if (humanReviewUnresolved) {
    state = "NOT_YET_ANSWERED";
    missing.push("how human review of the output works (the current answer is blank or \"Not applicable / unsure\")");
  } else {
    state = "IN_SCOPE";
  }

  return {
    state, facts, missing, contradictions, conditions,
    categoricalNone, housingExcluded, clearAdvertisingExclusion,
    dutiesMayNotAttach: state === "OUT_OF_SCOPE",
  };
}
