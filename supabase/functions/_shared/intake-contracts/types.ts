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

/**
 * ITEM 380 r5b — machine-evaluable skip-logic predicate.
 *
 * Mirrors the form's actual show/hide condition for a `required: "conditional"`
 * field so the record-complete gate can tell "never asked" from "asked and left
 * empty". Deterministic: the field is TRIGGERED when the value at `key` (read
 * with the same dotted-path walker the gate uses) is verbatim one of `equals`.
 * Values are compared as strings, exact match, no normalisation.
 */
export interface FieldTrigger {
  /** Dotted path to the controlling answer in the raw intake record. */
  key: string;
  /** VERBATIM stored values of the controlling answer that show this field. */
  equals: readonly string[];
}

export interface IntakeField {
  /** Dotted path; use "[]" for array-of-records (e.g. "controls[].maturity"). */
  key: string;
  kind: FieldKind;
  /** VERBATIM form options — for enum/multi-enum only. */
  options?: readonly string[];
  required: Requiredness;
  /** Human-readable predicate mirroring the form's gating logic. */
  requiredWhen?: string;
  /** Machine-evaluable form of `requiredWhen` (conditional fields only). */
  trigger?: FieldTrigger;
  /** Value stored when gated off (e.g. "n/a" or ""). */
  hiddenValue?: string;
  /** Mirrors ASK_ELIGIBLE_CRITICAL_FIELDS / cyber walker eligibility. */
  askEligible?: boolean;
  /**
   * ITEM 380 r5c — EMPTY IS A SUBSTANTIVE ANSWER.
   *
   * Set to `true` only when the form presents this control UNCONDITIONALLY
   * AND defines the empty state as a substantive answer (e.g. "leave blank if
   * none apply"). The record-complete gate then never counts the key as an
   * unanswered ask.
   *
   * The doc comment on the field MUST cite the form file/line and quote the
   * empty-state wording. The marker lives on the field — never as a floating
   * key-name set — so a same-named key in another product's contract does not
   * silently inherit the exclusion.
   */
  emptyIsAnswer?: true;
}


export interface IntakeContract {
  tool_type: string;
  /** Persisted table name (report_data table for the tool). */
  table: string;
  fields: IntakeField[];
}
