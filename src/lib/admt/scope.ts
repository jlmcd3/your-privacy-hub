// src/lib/admt/scope.ts
//
// Client-side mirror of `supabase/functions/_shared/admt-scope-contract.ts`.
// Frontend cannot import Deno modules; keep the pure reader duplicated but
// TRIVIAL, and cover both by the same test cases at the server side.
//
// Purpose: give React renderers ONE call to obtain canonical scope values,
// so historical reports with top-level scope fields still render correctly.
// See _shared/admt-scope-contract.ts for the authoritative contract.

export type Tribool = boolean | "cannot_determine" | null;

export interface AdmtScopeAnalysisView {
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

const SCOPE_FIELDS = [
  "is_admt",
  "triggers_significant_decision",
  "human_review_qualifies",
  "triggers_risk_assessment",
  "triggers_profiling",
  "exception_qualifies",
] as const;

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

export function readAdmtScope(report: unknown): AdmtScopeAnalysisView {
  const r = (report ?? {}) as Record<string, unknown>;
  const nested = (r.scope_analysis ?? {}) as Record<string, unknown>;
  const pick = <T>(key: string, cast: (v: unknown) => T | null): T | null => {
    const n = cast(nested[key]);
    if (n !== null) return n;
    return cast(r[key]);
  };
  return {
    is_admt: pick("is_admt", asBool),
    is_admt_reasoning: asString(nested.is_admt_reasoning) ?? asString(r.is_admt_reasoning),
    triggers_significant_decision: pick("triggers_significant_decision", asBool),
    determination_basis: nested.determination_basis === "conservative_assumption"
      ? "conservative_assumption"
      : nested.determination_basis === "established" ? "established" : undefined,
    significant_decision_reasoning: asString(nested.significant_decision_reasoning),
    human_review_qualifies: pick("human_review_qualifies", asBool),
    human_review_reasoning: asString(nested.human_review_reasoning),
    triggers_risk_assessment: pick("triggers_risk_assessment", asBool),
    risk_assessment_reasoning: asString(nested.risk_assessment_reasoning),
    triggers_profiling: pick("triggers_profiling", asBool),
    exception_claimed: asString(nested.exception_claimed) ?? asString(r.exception_claimed),
    exception_qualifies: pick("exception_qualifies", asTribool) as Tribool,
    exception_reasoning: asString(nested.exception_reasoning),
    third_party_responsibility_note: asString(nested.third_party_responsibility_note),
    summary: asString(nested.summary),
  };
}

export { SCOPE_FIELDS };
