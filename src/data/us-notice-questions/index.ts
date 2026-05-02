import type { Question } from "./types";
import { UNIVERSAL_US_NOTICE_QUESTIONS } from "./universal-questions";
import { CCPA_SPECIFIC_QUESTIONS } from "./ccpa-questions";
import { VIRGINIA_MODEL_QUESTIONS, VIRGINIA_MODEL_STATE_ADDONS } from "./virginia-model-questions";
import { MARYLAND_QUESTIONS } from "./maryland-questions";
import { FLORIDA_QUESTIONS } from "./florida-questions";
import { STATE_SPECIFIC_QUESTIONS } from "./state-specific-questions";

export type { Question, QuestionOption, ShowIfCondition, FlagCondition } from "./types";

export {
  UNIVERSAL_US_NOTICE_QUESTIONS,
  CCPA_SPECIFIC_QUESTIONS,
  VIRGINIA_MODEL_QUESTIONS,
  VIRGINIA_MODEL_STATE_ADDONS,
  MARYLAND_QUESTIONS,
  FLORIDA_QUESTIONS,
  STATE_SPECIFIC_QUESTIONS,
};

/** Maps US state codes -> jurisdiction codes used on Question.jurisdictionOnly. */
export const STATE_TO_JURISDICTION: Record<string, string> = {
  CA: "US_CCPA",
  VA: "US_VA",
  CO: "US_CO",
  CT: "US_CT",
  UT: "US_UT",
  IA: "US_IA",
  IN: "US_IN",
  TN: "US_TN",
  TX: "US_TX",
  MT: "US_MT",
  OR: "US_OR",
  DE: "US_DE",
  NJ: "US_NJ",
  NH: "US_NH",
  KY: "US_KY",
  RI: "US_RI",
  MN: "US_MN",
  MD: "US_MD",
  FL: "US_FL",
};

/** Set of state codes that follow the Virginia model. */
export const VIRGINIA_MODEL_STATES = new Set([
  "VA", "CO", "CT", "UT", "IA", "IN", "TN", "TX", "MT",
  "OR", "DE", "NJ", "NH", "KY", "RI", "MN",
]);

/**
 * Build the ordered question set for a given selection of US states.
 * - Always begins with universal questions.
 * - Appends Virginia-model questions once if any VA-model state is selected.
 * - Appends CCPA / Maryland / Florida question packs when those states are picked.
 * - Appends narrow state-specific add-ons for the selected states only.
 *
 * Each returned Question keeps its `jurisdictionOnly` filter so the runner
 * can skip questions that no longer apply if the user changes selection.
 */
export function buildQuestionSet(selectedStateCodes: string[]): Question[] {
  const states = new Set(selectedStateCodes.map((s) => s.toUpperCase()));
  const jurisdictions = new Set(
    [...states].map((s) => STATE_TO_JURISDICTION[s]).filter(Boolean),
  );

  const out: Question[] = [...UNIVERSAL_US_NOTICE_QUESTIONS];

  if (states.has("CA")) out.push(...CCPA_SPECIFIC_QUESTIONS);

  const hasVirginiaModel = [...states].some((s) => VIRGINIA_MODEL_STATES.has(s));
  if (hasVirginiaModel) out.push(...VIRGINIA_MODEL_QUESTIONS);

  // Per-state Virginia-model addons (activated states with unique requirements).
  for (const stateCode of states) {
    const addons = VIRGINIA_MODEL_STATE_ADDONS[stateCode];
    if (addons && addons.length > 0) out.push(...addons);
  }

  if (states.has("MD")) out.push(...MARYLAND_QUESTIONS);
  if (states.has("FL")) out.push(...FLORIDA_QUESTIONS);

  // State-specific add-ons: only include if the question's jurisdiction is selected.
  for (const q of STATE_SPECIFIC_QUESTIONS) {
    const onlyFor = q.jurisdictionOnly ?? [];
    if (onlyFor.some((j) => jurisdictions.has(j))) {
      out.push(q);
    }
  }

  return out;
}

/**
 * Filter a question against current jurisdiction selection — used by the runner
 * to drop questions that no longer apply if the user changes states mid-flow.
 */
export function isQuestionInScope(
  question: Question,
  selectedStateCodes: string[],
): boolean {
  if (!question.jurisdictionOnly || question.jurisdictionOnly.length === 0) return true;
  const jurisdictions = new Set(
    selectedStateCodes
      .map((s) => STATE_TO_JURISDICTION[s.toUpperCase()])
      .filter(Boolean),
  );
  return question.jurisdictionOnly.some((j) => jurisdictions.has(j));
}
