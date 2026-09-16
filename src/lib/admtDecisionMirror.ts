/**
 * Doc 261-review (2026-09-15, LEGAL 06 / EX 06) — FRONTEND MIRROR of the
 * categorical branch of the engine's § 7001(ddd) resolver:
 *   supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/admt-significant-decision.ts
 *   (resolveAdmtSignificantDecision, lines "categorical" path).
 *
 * Deno edge code cannot import from src/, and the repo's sanctioned pattern
 * for shared logic is a mirror pinned by a parity test
 * (tests/edge/run-cppa-risk-assessment/admt-decision-mirror.test.ts).
 *
 * Deliberately narrower than the engine: the free-text classifier fallback
 * (used by the engine only when no category is selected) is NOT mirrored.
 * With no recognised category this mirror answers "unresolved", so the
 * regulatory-exposure panel can never claim more than the engine would. When
 * q18 is "Yes" the category question is required, so a completed intake
 * always reaches the categorical branch on both sides.
 *
 * The literals are the same verbatim copies the page already uses
 * (CPPARiskAssessment.enums.ts); parity with the contract is pinned elsewhere.
 */
import {
  HOUSING_DECISION_BASIS_OPTS,
  SIGNIFICANT_DECISION_CATEGORY_OPTS,
} from "../pages/CPPARiskAssessment.enums.ts"; // relative + .ts so the Deno parity test can import this mirror

export type AdmtDecisionMirrorClass =
  | "significant"
  | "advertising_only"
  | "not_significant"
  | "housing_excluded"
  | "unresolved";

export interface AdmtDecisionMirrorInput {
  readonly q19a_decision_categories?: unknown;
  readonly q19b_housing_basis?: unknown;
}

const HOUSING = SIGNIFICANT_DECISION_CATEGORY_OPTS[1];
const ADVERTISING = SIGNIFICANT_DECISION_CATEGORY_OPTS[7];
const NONE = SIGNIFICANT_DECISION_CATEGORY_OPTS[8];
const HOUSING_EXCLUDED_BASIS = HOUSING_DECISION_BASIS_OPTS[0];
const RECOGNISED = new Set<string>(SIGNIFICANT_DECISION_CATEGORY_OPTS);

/**
 * Same precedence as the engine's categorical branch: a recognised
 * significant category governs; a housing-only selection with the
 * availability/vacancy/payment basis is excluded; advertising-only and
 * none-of-these are determined non-engagements; nothing selected is
 * unresolved.
 */
export function resolveAdmtDecisionMirror(input: AdmtDecisionMirrorInput | null | undefined): {
  readonly cls: AdmtDecisionMirrorClass;
  readonly categories: readonly string[];
} {
  const raw = Array.isArray(input?.q19a_decision_categories)
    ? (input!.q19a_decision_categories as unknown[]).filter((x): x is string => typeof x === "string" && RECOGNISED.has(x))
    : [];
  if (!raw.length) return { cls: "unresolved", categories: [] };
  const housingExcluded = raw.includes(HOUSING) && input?.q19b_housing_basis === HOUSING_EXCLUDED_BASIS;
  const selected = raw.filter((c) => c !== ADVERTISING && c !== NONE);
  const effective = housingExcluded ? selected.filter((c) => c !== HOUSING) : selected;
  if (effective.length) return { cls: "significant", categories: effective };
  if (selected.length && housingExcluded) return { cls: "housing_excluded", categories: [] };
  if (raw.includes(ADVERTISING)) return { cls: "advertising_only", categories: [] };
  return { cls: "not_significant", categories: [] };
}
