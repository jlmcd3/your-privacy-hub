// RC-REM-P1 (Phase 1 — Canonical Intake Contracts).
//
// A machine-readable description of what a tool's intake payload MUST look
// like, asserted against the form code by CI tests and consumed later by
// QL2 generation, QL3 fixtures, and ask-path validation.
//
// See supabase/functions/_shared/intake-contracts/validate.ts for the
// checker and supabase/functions/_shared/intake-contracts/<tool>.ts for
// per-tool contracts.

export type FieldKind =
  | "enum"
  | "multi-enum"
  | "text"
  | "narrative"
  | "boolean"
  | "date"
  | "string-array"
  | "structured";

export type Requiredness = "always" | "conditional" | "optional";

export interface IntakeField {
  /** Dotted path; use "[]" for array-of-records (e.g. "controls[].maturity"). */
  key: string;
  kind: FieldKind;
  /** VERBATIM form options — for enum/multi-enum only. */
  options?: readonly string[];
  required: Requiredness;
  /** Human-readable predicate mirroring the form's gating logic. */
  requiredWhen?: string;
  /** Value stored when gated off (e.g. "n/a" or ""). */
  hiddenValue?: string;
  /** Mirrors ASK_ELIGIBLE_CRITICAL_FIELDS / cyber walker eligibility. */
  askEligible?: boolean;
}

export interface IntakeContract {
  tool_type: string;
  /** Persisted table name (report_data table for the tool). */
  table: string;
  fields: IntakeField[];
}
