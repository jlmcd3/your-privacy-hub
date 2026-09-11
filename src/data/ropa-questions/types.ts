export type QuestionInputType =
  | "single_choice"
  | "multi_choice"
  | "platform_search"
  | "text_short"
  | "text_long"
  | "date_or_period"
  | "yes_no"
  | "yes_no_unsure"
  | "lawful_basis"
  // Cross-reference picker: lists the client's existing LIA / DPIA records
  // and renders "None on file" when the account has none.
  | "assessment_reference";


export interface QuestionOption {
  value: string;
  label: string;
  example?: string;
}

export interface ShowIfCondition {
  questionKey: string;
  // DOC 259A §5.1 — "in" tests a scalar (single_choice / yes_no_unsure)
  // answer against a set of acceptable values: v === one of value[].
  // Distinct from "contains", which tests whether an ARRAY-valued answer
  // includes any of value[] — a scalar answer never satisfies "contains".
  operator: "equals" | "contains" | "not_equals" | "in";
  value: string | string[];
}

export interface FlagCondition {
  operator: "equals" | "contains";
  value: string | string[];
  flagType:
    | "missing_required"
    | "retention_undefined"
    | "basis_unclear"
    | "transfer_undocumented"
    | "high_risk_activity"
    | "recommendation"
    | "cross_sell";
  severity: "warning" | "info" | "recommendation";
  message: string;
  consequence: string;
  actionLabel?: string;
  actionRoute?: string;
}

export interface Question {
  key: string;
  text: string;
  /**
   * Presentation-only follow-up prompt shown under the question text. The
   * answer is still persisted under the single `key` above, unchanged in shape
   * — this splits a two-part question into two readable prompts rather than
   * one long sentence.
   */
  followUpPrompt?: string;
  whyWeAsk: string;
  type: QuestionInputType;
  options?: QuestionOption[];
  isRequired: boolean;
  showIf?: ShowIfCondition;
  flagIf?: FlagCondition[];
  jurisdictionOnly?: string[];
  staticInfoCard?: { title: string; body: string };
}

