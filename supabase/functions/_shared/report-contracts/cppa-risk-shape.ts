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

export const CPPA_RISK_SHAPE_VERSION = "cppa-risk-shape@2026-07-28-item244-wired-headers-l1";

/**
 * ITEM 244 (E3) — CUSTOMER-FIRST SECTION HEADERS. Shared header map;
 * single source of truth consumed by (a) the LTP composer prose that
 * references section names in body copy and (b) the PDF exporter's
 * <h2> tags. Adding a new section requires adding a header here so
 * the PDF renderer stays in lock-step with the assembler shard set.
 * Statutory pinpoints move to the first sentence of each body
 * paragraph, never the header.
 */
export const CPPA_RISK_HEADER_MAP: Readonly<Record<string, string>> = {
  opening_summary: "About this assessment",
  executive_summary: "What this assessment concludes",
  assessment_summary: "Why we reached this conclusion",
  scope_and_triggers: "What this assessment covers and what triggered it",
  scope_confirmation: "What this assessment covers and what triggered it",
  // ITEM 244 (L1) — Processing Narrative section, placed after
  // Scope & Triggers and before Risk Assessment by Activity.
  processing_narrative: "How the business processes personal information",
  risk_assessment_by_activity: "How the balancing frame reads for each covered activity",
  priority_actions: "What to do next, in order of priority",
  next_steps: "What to confirm on the record",
  strengthen_items: "Where the record is strong and how to keep it strong",
  exception_analysis: "Where the record admits a reserved exception",
  record_sufficiency: "How complete the record is against § 7152(a)",
  information_needed: "Items for your review",
  submission_summary: "How to submit and retain this assessment",
};

export function headerForSection(key: string, fallback?: string): string {
  return CPPA_RISK_HEADER_MAP[key] ?? fallback ?? key.replace(/_/g, " ");
}

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

// ─────────────────────────────────────────────────────────────────────────
// CP5-COHERENCE-PROSE — EXEC/BALANCE COHERENCE, RUNTIME-ENFORCED AT EXIT.
// The CP4 assert compared composer inputs; it did NOT re-inspect the
// shipped strings after coercion. The class of "insufficient exec over a
// firm balance" survived because the assert never fired at the wire.
// This helper fingerprints the SHIPPED strings and returns a diagnostic
// when the two modes disagree. The assembler wires it into the exit
// checks and rejects the ship in enforce mode.
// ─────────────────────────────────────────────────────────────────────────

export type ShippedMode = "firm" | "hedged" | "negative" | "insufficient" | "unknown";

/** Fingerprint a shipped narrative string against its composer's mode. */
export function detectShippedMode(text: unknown): ShippedMode {
  if (typeof text !== "string" || !text.trim()) return "unknown";
  const s = text.toLowerCase();
  // Order matters: insufficient wins over hedged/firm phrases that may
  // co-occur in a mixed sentence; negative wins over firm.
  if (/not sufficient to complete|items needed to complete this assessment/.test(s)) return "insufficient";
  if (/does not support the conclusion that the benefits outweigh/.test(s)) return "negative";
  if (/close balance|balance (?:between|of).*is close|reasonable assessments could differ/.test(s)) return "hedged";
  if (/benefits (?:identified )?outweigh (?:the )?negative impacts|outweigh the identified negative impacts/.test(s)) return "firm";
  return "unknown";
}

export interface ShippedCoherenceViolation {
  readonly kind: "exec_balance_mode_mismatch";
  readonly executive_summary_mode: ShippedMode;
  readonly assessment_summary_mode: ShippedMode;
  readonly evidence: string;
}

/** Enforce exec/balance coherence on the SHIPPED report. Returns [] when OK. */
export function assertShippedCoherence(
  report: Record<string, unknown>,
): readonly ShippedCoherenceViolation[] {
  const execText = typeof report.executive_summary === "string" ? report.executive_summary : "";
  const asBag = report.assessment_summary as { narrative?: unknown } | undefined;
  const asText = typeof asBag?.narrative === "string" ? asBag.narrative : "";
  const execMode = detectShippedMode(execText);
  const asMode = detectShippedMode(asText);
  // Only enforce when both sides fingerprint to a known mode.
  if (execMode === "unknown" || asMode === "unknown") return [];
  if (execMode === asMode) return [];
  // "insufficient" on assessment_summary + non-insufficient exec is the
  // CP5-recurring class; the reverse is symmetrically invalid.
  return [{
    kind: "exec_balance_mode_mismatch",
    executive_summary_mode: execMode,
    assessment_summary_mode: asMode,
    evidence: `exec=${execMode}; balance=${asMode}`,
  }];
}
