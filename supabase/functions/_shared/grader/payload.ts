// QLB-F3 — Shared LLM grader payload builder.
//
// Assembles the string handed to LLM graders (Claude + GPT) from a report
// so the DOCUMENT BODY appears first (never lost to metadata-first
// JSON.stringify serialization) and generator-metadata fields are stripped
// before slicing. Both graders use the SAME char budget so cross-model
// deltas are not skewed by unequal truncation.
//
// Called from run-quality-batch/index.ts (evaluateDocumentClaude /
// evaluateDocumentGPT) AND grade-single-assessment/index.ts (gradeOne),
// so the two graders stay behaviorally identical.

// Report families as understood by both callers. Batch tool slugs
// ("dpa-generator", "biometric-checker", "ir-playbook", ...) and
// grade-single-assessment tool slugs ("dpa", "biometric", ...) both
// normalize into these families via `familyForBatchTool` /
// `familyForSingleTool`.
export type GraderReportFamily =
  | "governance"
  | "cppa-risk"
  | "cppa-cyber"
  | "cppa-admt"
  | "dpia"
  | "lia"
  | "ir-playbook"
  | "biometric"
  | "dpa";

// Per-family body-first field list. Fields listed here are pulled out of
// report_data (in the order given) and JSON-serialized at the TOP of the
// grader payload so long documents never lose their substantive body to
// alphabetical/insertion-order truncation.
// Verified against each generator's report_data assembly (2026-07-15).
const BODY_FIELDS: Record<GraderReportFamily, string[]> = {
  // run-governance-assessment/index.ts:1143-1184
  "governance": [
    "executive_summary", "overall_readiness_rating", "readiness_rationale",
    "top_three_risks", "immediate_actions", "interaction_effects",
    "domain_findings",
  ],
  // run-cppa-risk-assessment structured report_data
  "cppa-risk": [
    "executive_summary", "overall_status", "scope_analysis",
    "test_states", "risk_findings", "strengthen_items",
    "record_sufficiency", "priority_actions", "inconsistency_flags",
  ],
  // run-cppa-cybersecurity
  "cppa-cyber": [
    "executive_summary", "overall_status", "scope_analysis",
    "controls", "gaps", "priority_actions", "cybersecurity_audit",
  ],
  // run-admt-checker
  "cppa-admt": [
    "executive_summary", "overall_status", "scope_analysis",
    "notice_gaps", "opt_out_gaps", "access_gaps",
    "priority_actions", "admt_analysis",
  ],
  // run-dpia-framework — seven-section framework
  "dpia": [
    "dpia_metadata", "section_0_overview", "section_1_description",
    "section_2_necessity", "section_3_risks", "section_4_measures",
    "section_5_stakeholders", "section_6_conclusion", "section_7_annex",
  ],
  // run-li-assessment — actual report_data keys (verified against
  // supabase/functions/run-li-assessment/index.ts assembly ~L1510).
  // three_part_test hosts the balancing_test.factors objects added under
  // W3-T2, so it MUST lead the grader payload.
  "lia": [
    "three_part_test", "annotations", "information_needed",
    "documentation_recommendations", "enforcement_precedents",
    "enforcement_precedents_note", "data_currency_note",
  ],
  // generate-ir-playbook — playbook_text is a SEPARATE column merged by
  // the poll shim; it shows up here so the payload leads with the body.
  "ir-playbook": [
    "playbook_text",
  ],
  // check-biometric-compliance — assessment_text merged from analysis_text
  // column by the poll shim; annotations are substantive commentary blocks.
  "biometric": [
    "assessment_text", "overall_status", "priority_actions",
    "requirements", "annotations",
  ],
  // generate-dpa — document_text is a SEPARATE column merged by the poll
  // shim (mirror of biometric's analysis_text handling).
  "dpa": [
    "document_text",
  ],
};

// Fields treated as generator metadata and stripped before slicing.
// Applied uniformly across every family.
const METADATA_KEYS: readonly string[] = [
  "_meta",
  "_staging",
  // QB-P25 Item 3 (DPA) — private drafting record. The DPA generator emits
  // a ===DRAFTING_RECORD=== block explaining the reasoning behind clause
  // choices; it is stored on report_data as `_drafting_record` and MUST NOT
  // reach the grader (grader-invisible by contract).
  "_drafting_record",
  // W3-T5 (a) — ADMT normalizer output stored on report_data as
  // `_normalized_intake`. Grader-invisible: strips machine-readable intake
  // echoes so grader never scores generator-emitted normalization metadata.
  "_normalized_intake",
  "prompt_version",
  "build_stamp",
  "lint_warnings",
  "enforcement_meta",
  "gdpr_meta",
  "retrieval_meta",
  "generated_at",
  "assessment_id",
  "disclaimer",
];

// Char budget. Same for Claude and GPT (previously 18k Claude / 15k GPT,
// which skewed cross-model deltas per the QLB-F3 courier).
export const GRADER_PAYLOAD_BUDGET = 30_000;

export interface BuiltGraderPayload {
  /** The string the grader user-turn embeds after "REPORT:". */
  text: string;
  /** True if the assembled payload was sliced to fit the budget. */
  truncated: boolean;
  /** Total bytes assembled before slicing (for observability). */
  original_length: number;
}

/**
 * Build the grader payload string for a report.
 *
 * Body fields (per family, in order) are serialized first. Every other
 * key that is NOT in METADATA_KEYS is appended after. If the assembled
 * text still exceeds the budget, it is sliced and `truncated: true` is
 * returned so callers can surface the flag in qc/log output.
 */
export function buildGraderPayload(
  family: GraderReportFamily,
  report: unknown,
  budget: number = GRADER_PAYLOAD_BUDGET,
): BuiltGraderPayload {
  const rd = (report && typeof report === "object")
    ? (report as Record<string, unknown>)
    : {};

  const bodyList = BODY_FIELDS[family] ?? [];
  const bodyObj: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (const k of bodyList) {
    if (Object.prototype.hasOwnProperty.call(rd, k)) {
      bodyObj[k] = rd[k];
      seen.add(k);
    }
  }
  const restObj: Record<string, unknown> = {};
  for (const k of Object.keys(rd)) {
    if (seen.has(k)) continue;
    if (METADATA_KEYS.includes(k)) continue;
    restObj[k] = rd[k];
  }

  const parts: string[] = [];
  if (Object.keys(bodyObj).length > 0) {
    parts.push(`--- DOCUMENT BODY ---\n${safeStringify(bodyObj)}`);
  }
  if (Object.keys(restObj).length > 0) {
    parts.push(`--- SUBSTANTIVE SECTIONS ---\n${safeStringify(restObj)}`);
  }
  const assembled = parts.join("\n\n");
  const original_length = assembled.length;
  if (original_length <= budget) {
    return { text: assembled, truncated: false, original_length };
  }
  return {
    text: assembled.slice(0, budget) + "\n[...truncated for grader budget...]",
    truncated: true,
    original_length,
  };
}

function safeStringify(o: unknown): string {
  try { return JSON.stringify(o); } catch { return String(o); }
}

/** Map a run-quality-batch tool slug to a grader payload family. */
export function familyForBatchTool(tool: string): GraderReportFamily | null {
  switch (tool) {
    case "governance": return "governance";
    case "cppa-risk": return "cppa-risk";
    case "cppa-cyber": return "cppa-cyber";
    case "cppa-admt": return "cppa-admt";
    case "dpia": return "dpia";
    case "lia": return "lia";
    case "ir-playbook":
    case "ir": return "ir-playbook";
    case "biometric":
    case "biometric-checker": return "biometric";
    case "dpa":
    case "dpa-generator": return "dpa";
    default: return null;
  }
}

/** Map a grade-single-assessment tool slug to a grader payload family. */
export function familyForSingleTool(tool: string): GraderReportFamily | null {
  switch (tool) {
    case "governance": return "governance";
    case "cppa-risk": return "cppa-risk";
    case "cppa-cyber": return "cppa-cyber";
    case "cppa-admt": return "cppa-admt";
    case "dpia": return "dpia";
    case "lia": return "lia";
    case "ir-playbook": return "ir-playbook";
    case "biometric": return "biometric";
    case "dpa": return "dpa";
    default: return null;
  }
}
