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
  operator: "equals" | "contains" | "not_equals";
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
  whyWeAsk: string;
  type: QuestionInputType;
  options?: QuestionOption[];
  isRequired: boolean;
  showIf?: ShowIfCondition;
  flagIf?: FlagCondition[];
  jurisdictionOnly?: string[];
  staticInfoCard?: { title: string; body: string };
}
