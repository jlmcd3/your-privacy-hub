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
  // run-cppa-cybersecurity — A-TEAM S4 RULING S1.5 (doc 119, 2026-08-31):
  // the deterministic pipeline no longer writes the legacy fields below;
  // handing the grader four empty values as "the document body" produced a
  // false "analytically hollow" critical while the real 100KB+
  // skeleton_document sat in the untitled rest-section (row 32c9a611,
  // DB-verified). Same fix ADMT already received in this file: a
  // skeleton-shaped record leads with skeleton_document; a legacy-shaped
  // record still leads with its own fields (hasOwnProperty gating).
  "cppa-cyber": [
    "skeleton_document", "authority_exhibit",
    "executive_summary", "overall_status", "scope_analysis",
    "controls", "gaps", "priority_actions", "cybersecurity_audit",
  ],
  // run-admt-checker (v1) — v2 (run-admt-checker-v2) shares this same
  // "cppa-admt" grader family and adds skeleton_document/authority_exhibit
  // (2026-08-21). Both lists coexist here: hasOwnProperty gating below
  // means only the fields a given record actually has get pulled, so a
  // v1-shaped record still leads with its own fields and a v2-shaped
  // record correctly leads with skeleton_document instead.
  "cppa-admt": [
    "executive_summary", "overall_status", "scope_analysis",
    "notice_gaps", "opt_out_gaps", "access_gaps",
    "priority_actions", "admt_analysis",
    "skeleton_document", "authority_exhibit",
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

// ─────────────────────────────────────────────────────────────────────────
// DOC 129 §1.2 (Batch 3 A-Team ruling, 2026-09-01) — CUSTOMER-DOCUMENT-FIRST
// PAYLOAD. Batch 3 proved the old body-first field lists let the graders
// score hidden/legacy structured fields as customer copy (Registration ICO
// fee + France basis, Governance "record_insufficient" enum values) while
// the real shipping document sat in the untitled rest-section. When a
// report carries the final customer document (skeleton_document, or the
// product's final document text), the payload now leads with THAT — the
// SAME flattened text the conformance tests read — and everything else is
// handed over as explicitly-labeled supporting evidence the grader may use
// for support/omission/consistency checks but must never grade as customer
// language. Legacy-shaped records (no final document present) keep the
// existing BODY_FIELDS behavior unchanged.
// ─────────────────────────────────────────────────────────────────────────

/** Minimal structural view of a skeleton document (mirrors skeleton-render). */
interface SkeletonDocLike {
  title?: string;
  subtitle?: string;
  sections?: Array<{
    title?: string;
    paragraphs?: Array<{
      kind?: string;
      text?: string;
      table?: { title?: string; columns?: string[]; rows?: string[][]; note?: string };
    }>;
  }>;
}

function isSkeletonDoc(v: unknown): v is SkeletonDocLike {
  const d = v as SkeletonDocLike | null;
  return !!d && typeof d === "object" && Array.isArray(d.sections) && d.sections.length > 0;
}

/** Flatten a skeleton document to the customer-read text (title, sections,
 * paragraphs, table cells) — the same content skeletonDocumentToText
 * produces, duplicated structurally here so the grader module stays free of
 * the prose-render import graph. */
export function flattenSkeletonForGrader(doc: SkeletonDocLike): string {
  const parts: string[] = [String(doc.title ?? ""), String(doc.subtitle ?? ""), ""];
  for (const s of doc.sections ?? []) {
    parts.push(String(s.title ?? ""), "");
    for (const p of s.paragraphs ?? []) {
      if (p?.table) {
        const t = p.table;
        const lines: string[] = [];
        if (t.title) lines.push(String(t.title));
        if (Array.isArray(t.columns) && t.columns.length) lines.push(t.columns.join(" | "));
        for (const row of t.rows ?? []) lines.push((row ?? []).join(" | "));
        if (t.note) lines.push(String(t.note));
        parts.push(lines.join("\n"), "");
      } else if (typeof p?.text === "string" && p.text.trim()) {
        parts.push(p.text, "");
      }
    }
  }
  return parts.join("\n").trimEnd();
}

/** The final-customer-document text for a report, or null when the record
 * is legacy-shaped. Field name returned for observability/labeling. */
export function extractCustomerDocument(
  rd: Record<string, unknown>,
): { field: string; text: string } | null {
  if (isSkeletonDoc(rd.skeleton_document)) {
    const text = flattenSkeletonForGrader(rd.skeleton_document as SkeletonDocLike);
    if (text.trim()) return { field: "skeleton_document", text };
  }
  for (const field of ["document_text", "playbook_text", "assessment_text"]) {
    const v = rd[field];
    if (typeof v === "string" && v.trim().length > 200) return { field, text: v };
  }
  return null;
}

// DOC 129 §1.5 — per-family grader calibration notes, carried in the payload.
const FAMILY_CALIBRATION: Partial<Record<GraderReportFamily, string>> = {
  "dpa":
    "CALIBRATION (DPA): standard Article 28 operative clauses are legally conventional and EXPECTED to be standardized — never flag them as generic boilerplate. Judge tailoring only of the party facts, services and processing descriptions, transfers, retention, TOMs, subprocessors, and the [TO BE COMPLETED] placeholders.",
  "cppa-risk":
    "CALIBRATION (CPPA Risk): impact_intake.benefitsOutweigh is the customer's own perspective answer and is DELIBERATELY excluded from the deterministic § 7154 balance (pinned by test) — a determination differing from it is not an error. Safeguard crediting requires per-risk a6_safeguards rows with an implementation status; a general safeguards description not attributed to a specific risk is deliberately not credited, and the report says so. DOC 188 (batch e38460): the intake carries NESTED objects (impact_intake, exceptions_intake, admt_detail) — read them before reporting a value as \"not in the intake\"; impact_intake.benefitsOutweigh IS an intake answer.",
  // DOC 188 (2026-09-05, batch e38460) — two grader misreads on IR us-ds5: a
  // CRITICAL "omits statutory notification deadlines" against a playbook whose
  // Notification Clocks table and Deadline Board state the California 30-day /
  // 15-day AG, Colorado 30-day and Illinois clocks; and "processor involved but
  // not named" graded as a hallucination on a record with processorInvolved
  // true and no processorName.
  "ir-playbook":
    "CALIBRATION (IR Playbook): the statutory notification clocks (each state's day count or 'most expedient time' standard, regulator sample-copy deadlines, the GDPR 72-hour clock) are stated in the Notification Clocks table and the Deadline Board — read both tables before reporting an omitted or unstated deadline. `processorInvolved: true` with no `processorName` is a record the customer left unnamed; the playbook saying the processor is not named is record-correct, not a hallucination.",
};

const CUSTOMER_DOC_HEADER =
  "--- CUSTOMER DOCUMENT (the exact final customer-facing report; grade THIS text for customer language, contradictions, citations, and text structure) ---";
const EVIDENCE_HEADER =
  "--- STRUCTURED EVIDENCE (supporting data and internal state; NOT customer-visible copy — never grade its wording, tokens, enum values, or field names as customer language; use it ONLY to verify support, omissions, and consistency with the CUSTOMER DOCUMENT) ---";

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
  // DOC 129 §1.2 — `null` is now accepted (registration/session-shaped
  // callers): the customer-document-first path is family-agnostic.
  family: GraderReportFamily | null,
  report: unknown,
  budget: number = GRADER_PAYLOAD_BUDGET,
  // DOC 129 §1.2 — `customerDocFirst` is OPT-IN: grade-single-assessment
  // (the /admin/all-products-test grading path Batch 3 exposed) passes it;
  // run-quality-batch's LEGACY grader mode keeps its pinned contract of
  // ignoring skeleton_document (its skeleton mode has its own builder).
  opts: { fixtureSet?: string | null; customerDocFirst?: boolean } = {},
): BuiltGraderPayload {
  const rd = (report && typeof report === "object")
    ? (report as Record<string, unknown>)
    : {};

  const parts: string[] = [];
  // R-TURN-1 item 6: fixture-class gating header — the grader reads
  // GOLDEN_FIXTURE_SET to calibrate sibling-template findings on
  // adversarial fixtures per the SHARED_GRADER_CONTEXT rule.
  if (opts.fixtureSet && typeof opts.fixtureSet === "string") {
    parts.push(`GOLDEN_FIXTURE_SET: ${opts.fixtureSet}`);
  }
  const calibration = family ? FAMILY_CALIBRATION[family] : undefined;
  if (calibration && opts.customerDocFirst) parts.push(calibration);

  // DOC 129 §1.2 — customer-document-first path: the exact final customer
  // document leads; everything else is labeled supporting evidence.
  const customerDoc = opts.customerDocFirst ? extractCustomerDocument(rd) : null;
  if (customerDoc) {
    const restObj: Record<string, unknown> = {};
    for (const k of Object.keys(rd)) {
      if (k === customerDoc.field) continue;
      if (k === "skeleton_document" && customerDoc.field === "skeleton_document") continue;
      if (METADATA_KEYS.includes(k)) continue;
      restObj[k] = rd[k];
    }
    const head = parts.length ? parts.join("\n\n") + "\n\n" : "";
    const docBlock = `${CUSTOMER_DOC_HEADER}\n${customerDoc.text}`;
    const evidenceJson = Object.keys(restObj).length ? safeStringify(restObj) : "";
    const evidenceBlock = evidenceJson ? `\n\n${EVIDENCE_HEADER}\n${evidenceJson}` : "";
    const original_length = head.length + docBlock.length + evidenceBlock.length;
    if (original_length <= budget) {
      return { text: head + docBlock + evidenceBlock, truncated: false, original_length };
    }
    // The customer document gets the budget FIRST; evidence takes what is
    // left. DOC 169 (2026-09-04, batch 50b8bcd4): the document itself is
    // NEVER sliced on this path — the 30,000-character default budget had
    // been handing the graders roughly the first third of a 100K-character
    // report, and two graders duly reported the report "truncated at § 4.B".
    // When the document alone exceeds the budget, the evidence is omitted
    // and the payload says so; the document stays whole.
    const docBudget = budget - head.length;
    if (docBlock.length >= docBudget) {
      return {
        text: head + docBlock +
          "\n[...structured evidence omitted for grader budget; the customer document above is complete, nothing omitted...]",
        truncated: false,
        original_length,
      };
    }
    const remaining = docBudget - docBlock.length;
    return {
      text: head + docBlock + evidenceBlock.slice(0, Math.max(0, remaining)) +
        "\n[...structured evidence truncated for grader budget...]",
      truncated: true,
      original_length,
    };
  }

  // Legacy-shaped records (no final customer document on the row): the
  // pre-doc-129 body-first behavior, unchanged.
  const bodyList = family ? (BODY_FIELDS[family] ?? []) : [];
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
