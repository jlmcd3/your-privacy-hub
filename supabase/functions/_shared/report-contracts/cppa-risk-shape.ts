/**
 * SHARED SHAPE CONTRACT — cppa-risk report_data (Item 240 / CP3).
 * -----------------------------------------------------------------
 * Single source of truth for the CPPA-risk `report_data` shape that
 * BOTH the pass-2 assembler (producer) AND the PDF exporters
 * (`generate-report-pdf`, `generate-cppa-suite-pdf`) consume. Types
 * and coercion helpers only — no runtime side effects.
 *
 * CEO ruling (CP3, 2026-07-28): the assembler's 38-key registry shape
 * is the contract of record; exporters conform. This module makes the
 * contract shared so neither side can drift silently.
 *
 * NARRATIVE-SCALAR keys — always plain strings on the wire:
 *   opening_summary, submission_summary, executive_summary
 *
 * NARRATIVE-BAG keys — object with a `.narrative` string plus
 * schema-object allow-listed literal fields:
 *   assessment_summary  ({ narrative: string, ...literals })
 *
 * NARRATIVE-LIST keys — arrays of strings (paragraphs) when the
 * assembler owns the shard via templates; arrays of objects when
 * owned deterministically:
 *   risk_assessment_by_activity, scope_confirmation, scope_and_triggers,
 *   priority_actions, next_steps, strengthen_items, exception_analysis,
 *   record_sufficiency, information_needed, inconsistency_flags,
 *   annotations, requires_attorney_review, debug_review_notes,
 *   fsor_commentary, citation_ledger, enforcement_precedents,
 *   top_risks, risk_register
 *
 * Legacy V4 exporter previously assumed rich object rows on
 * `assessment_summary` and `risk_assessment_by_activity`. Those object
 * fields remain schema-allow-listed for backward compatibility but
 * are OPTIONAL — the LTP-shape wire carries strings.
 */

export const CPPA_RISK_SHAPE_VERSION = "cppa-risk-shape@2026-07-28-cp5-coherence-prose";

export type NarrativeScalarKey =
  | "opening_summary"
  | "submission_summary"
  | "executive_summary";

export const NARRATIVE_SCALAR_KEYS: readonly NarrativeScalarKey[] = [
  "opening_summary",
  "submission_summary",
  "executive_summary",
];

export type NarrativeBagKey = "assessment_summary";

/** Assembler-shape assessment_summary. Legacy literals remain optional. */
export interface AssessmentSummaryShape {
  readonly narrative?: string;
  readonly company_name?: string;
  readonly sector?: string;
  readonly assessment_date?: string;
  readonly triggered_activities?: readonly string[];
  readonly exceptions_claimed?: unknown;
  readonly exceptions_status?: string;
  readonly overall_risk_level?: string;
  readonly cybersecurity_audit_required?: boolean | string;
  readonly admt_disclosure_required?: boolean | string;
  readonly corpus_enforcement_note?: string;
}

/** Coerce a template render (string | string[]) to a single string. */
export function coerceNarrativeScalar(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v.trim() ? v : undefined;
  if (Array.isArray(v)) {
    const parts = v
      .map((x) => (typeof x === "string" ? x : ""))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return parts.length ? parts.join("\n\n") : undefined;
  }
  return undefined;
}

/** Coerce a template render into an assessment_summary bag. */
export function coerceAssessmentSummary(
  v: unknown,
  extra?: Partial<AssessmentSummaryShape>,
): AssessmentSummaryShape | undefined {
  const narrative = coerceNarrativeScalar(v);
  if (!narrative && (!extra || Object.keys(extra).length === 0)) return undefined;
  return { ...(extra ?? {}), ...(narrative ? { narrative } : {}) };
}

/** Coerce a narrative-list value into a string[] (paragraphs). */
export function coerceNarrativeList(v: unknown): readonly string[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) {
    const strs = v
      .map((x) => (typeof x === "string" ? x : ""))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return strs.length ? strs : undefined;
  }
  if (typeof v === "string" && v.trim()) return [v];
  return undefined;
}

/** Coherence invariant for executive summaries:
 * an exec-summary string may NEVER simultaneously claim
 *  - zero activities ("no activities identified")
 *  - and reference "the activities identified on the record".
 * Returns null when OK, or a short diagnostic string when violated.
 */
export function assertExecSummaryCoherent(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const s = text.toLowerCase();
  const claimsZero = /\bno activit(?:y|ies)\s+identified/.test(s);
  const claimsSome = /\bthe activit(?:y|ies)\s+identified/.test(s);
  if (claimsZero && claimsSome) {
    return "exec_summary_activity_count_contradiction";
  }
  return null;
}
