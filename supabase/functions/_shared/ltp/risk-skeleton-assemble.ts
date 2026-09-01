// CPPA RISK: ASSEMBLY THROUGH THE SPINE v5.2 SKELETON (the Memorandum
// Redesign, CEO-ratified 2026-08-26).
//
// This module is DETERMINISTIC: it invents no prose. Every {slot} is filled
// from the live intake (Intake Contract v2.0 keys), every [CONDITIONAL]
// block is composed from the RISK52_FIXED constants the spine exports plus
// the facts its trigger names, and every generated block is composed by the
// factor engine (risk-factor-engine.ts — deterministic at runtime) through
// the ratified v5.2 Annex frames.
//
// The result is written to `report_data.skeleton_document`, and that
// document is what ships: `generate-report-pdf` renders the customer PDF
// from it, and the in-app document body renders from it.
//
// ATTRIBUTION RULE (v5.2): "on the information provided"; the banned
// register families are swept from every composed block by the renderer;
// fixed spine prose is byte-pinned law and is checked, not repaired.

import {
  RISK52_FIXED,
  RISK_SKELETON_SUBTITLE,
  RISK_SKELETON_TITLE,
  RISK_SKELETON_VERSION,
  RISK_V3_BANNED_REGISTER,
  SKELETON_SECTIONS,
} from "../prose/plans/cppa-risk.spine.ts";
import {
  renderSkeletonDocument,
  skeletonDocumentToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type RenderedSkeletonDocument,
  type RenderedTable,
  type SkeletonTables,
  type SlotValues,
} from "../prose/skeleton-render.ts";
import {
  runRiskFactorEngine,
  buildNecessityMatrixTable,
  buildRiskAndSafeguardRegisterTable,
  type RiskFactorEngineResult,
} from "./risk-factor-engine.ts";
import { firstSubstantiveSentence } from "./clause-bound.ts";
// A-TEAM S3 RULING I.23 (doc 115) — customer-facing date rows in long form.
import { formatReportDateLong } from "../report-dates.ts";
// Corpus program phase 2 (carried): Appendix B renders by pure attachment
// over the Risk CAM (the determinism law's generation-plane mechanism).
import { attachCorpusRows } from "../corpus/cam-attach.ts";
import { RISK_CORPUS_MAP } from "../corpus/maps/risk-corpus-map.ts";

export const RISK_SKELETON_ASSEMBLER_STAMP =
  "risk-skeleton-assembler@spine-v5.2-2026-08-26";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => s(x)).filter(Boolean) : s(v) ? [s(v)] : [];
const rows = (v: unknown): Bag[] =>
  Array.isArray(v) ? v.filter((x) => x && typeof x === "object") as Bag[] : [];

/** "a, b and c" */
function asProse(items: readonly string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** Trimmed, with any trailing full stop removed so skeleton sentences do not double-stop. */
function clause(v: unknown): string {
  return s(v).replace(/\.\s*$/, "");
}

/** Booleans and Yes/No strings to a printable Yes/No; "" when unanswered. */
function yn(v: unknown): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return s(v);
}

function isYes(v: unknown): boolean {
  return v === true || /^yes\b/i.test(s(v));
}

/**
 * Deterministic register repair — attribution voice is law.
 * Canonical implementation lives in `./register-repair.ts`; re-exported here
 * so every existing import (the other product assemblers) is stable.
 */
export { repairRegister } from "./register-repair.ts";

// ── Canonical California PI / SPI taxonomy (single custody) ──────────────────

import { CA_PI_TAXONOMY } from "./ca-pi-taxonomy.ts";

// ── DERIVED builders (deterministic, no model) ───────────────────────────────

/** {{DERIVED.applicable_7150_triggers}} — from the live trigger classification. */
export function deriveApplicable7150Triggers(report: Bag): string | null {
  const scope = arr((report.scope_and_triggers as Bag)?.narrative ?? report.scope_and_triggers);
  const engaged = scope
    .filter((x) => x.startsWith("Engaged — "))
    .map((x) => x.replace(/^Engaged — /, "").replace(/:.*$/, "").trim())
    .filter(Boolean);
  return engaged.length ? asProse(engaged) : null;
}

/** {{DERIVED.activity_pi_inventory}} — q4 categories mapped to the canonical California taxonomy. */
export function deriveActivityPiInventory(intake: Bag): string | null {
  const cats = arr(intake.q4_pi_categories);
  if (cats.length === 0) return null;
  return cats
    .map((c) => {
      const row = CA_PI_TAXONOMY[c];
      return row ? `${c} (canonical California category: ${row.canonical})` : c;
    })
    .join("; ");
}

/** {{DERIVED.activity_spi_inventory}} — SPI-mapped q4 categories; fallback when q15 answers Yes with no mapped category. */
export function deriveActivitySpiInventory(intake: Bag): string | null {
  const spi = arr(intake.q4_pi_categories).filter((c) => CA_PI_TAXONOMY[c]?.spi);
  if (spi.length > 0) return asProse(spi);
  if (isYes(intake.q15_sensitive_pi)) {
    // PANEL RISK-P2 (2026-08-30): the old fallback ("the sensitive personal
    // information the Company has identified in its submission") was a
    // circular placeholder posing as data in three table cells. Where the
    // record confirms sensitive PI but names no mapped category, the cell
    // states that limitation honestly instead of describing itself.
    return "Identified as processed in the Company’s submission; the specific categories are not named in the activity record.";
  }
  return null;
}

/** {{DERIVED.initial_assessment_deadline}} — § 7155 timing rules over the status/start facts. */
export function deriveInitialAssessmentDeadline(intake: Bag): string | null {
  const status = s(intake.processing_status);
  if (!status) return null;
  const start = s(intake.processing_start_date);
  const planned = s(intake.planned_start_date);
  if (/^planned/i.test(status)) {
    return `Initial-assessment deadline: before the processing is initiated${planned ? ` (planned start: ${planned})` : ""}.`;
  }
  if (start && start < "2026-01-01") {
    return "Initial-assessment deadline: December 31, 2027 (transition deadline for covered processing initiated before January 1, 2026 and continuing afterward).";
  }
  return `Initial-assessment deadline: before initiation of the processing${start ? ` (processing initiated ${start})` : ""}.`;
}

/** {{DERIVED.next_review_date}} — assessment date + the three-year review rule. */
export function deriveNextReviewDate(assessmentDateIso: string): string {
  const d = new Date(`${assessmentDateIso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 3);
  return d.toISOString().slice(0, 10);
}

/** {{DERIVED.assessment_retention_end_date_or_rule}} — § 7155 later-of rule over the status facts. */
export function deriveAssessmentRetentionEnd(intake: Bag): string | null {
  const status = s(intake.processing_status);
  if (!status) return null;
  if (/^discontinued/i.test(status)) {
    return "Because the processing is recorded as discontinued, the assessment record must be retained for five years after completion of this assessment, or until the end of the processing if that is later";
  }
  return "Because the processing continues on the information provided, the retention end date is not yet determinable; the later-of rule above governs";
}

// BATCH 20b (Wave C4, doc 113 S6.3) — the § 5 Key Dates and Deadlines
// digest: the derived timing values this module already computes, plus the
// statutory windows the pinned § 5 prose itself states, as digest
// constants. A row whose value cannot be derived from the record skips.
// The § 5 prose is untouched.
export function deriveKeyDatesTable(intake: Bag, assessmentDateIso: string): RenderedTable | null {
  const rows: string[][] = [];
  const initial = deriveInitialAssessmentDeadline(intake);
  if (initial) {
    const value = initial.replace(/^Initial-assessment deadline:\s*/i, "").replace(/\.\s*$/, "");
    rows.push([
      "Initial risk assessment",
      "11 CCR § 7155(a)(1)–(b)",
      value.charAt(0).toUpperCase() + value.slice(1),
    ]);
  }
  rows.push(["Three-year review", "11 CCR § 7155(a)(2)", deriveNextReviewDate(assessmentDateIso)]);
  rows.push([
    "Update after a material change",
    "11 CCR § 7155(a)(3)",
    "As soon as feasible, and no later than 45 calendar days after the material change",
  ]);
  rows.push([
    "First § 7157 submission (2026–2027 assessments)",
    "11 CCR § 7157",
    "April 1, 2028",
  ]);
  rows.push([
    "Full report on Agency or Attorney General request",
    "11 CCR § 7157",
    "Within 30 calendar days of the request",
  ]);
  rows.push([
    "Retention of the assessment record",
    "11 CCR § 7155(c)",
    "As long as the processing continues, or five years after completion of the assessment, whichever is later",
  ]);
  return {
    key: "",
    surface: "key_dates",
    title: "Key dates and deadlines",
    columns: ["Obligation", "Authority", "Date / deadline"],
    rows,
  };
}

/**
 * {{DERIVED.cover_summary}} — the Assessment Profile panel (v5.2 cover): the
 * three identity facts, with the defined-term tags. The internal
 * spine-version string lives in Appendix H, not the cover.
 */
export function deriveCoverTable(values: SlotValues): RenderedTable {
  const v = (k: string): string => {
    const val = values[k];
    return typeof val === "string" && val.trim() ? val : "Not reported.";
  };
  // A-TEAM DELTA (ChatGPT Dropbox Batch 1 review, 2026-08-31, Risk P0) —
  // when no activity name is on the record, this row used to read
  // "Not reported. (the "Activity")" — tagging an admittedly-absent value
  // with the defined term the rest of the report then uses as though it
  // were known. Absent the name, the row states the gap plainly and drops
  // the defined-term tag; the report's use of "the Activity" elsewhere is
  // unaffected by this cover row alone.
  const activityName = values["activityName"];
  const activityCell = typeof activityName === "string" && activityName.trim()
    ? `${activityName.trim()} (the “Activity”)`
    : "Additional Information Required — no processing activity name is on the record.";
  return {
    key: "",
    surface: "cover_summary",
    title: "",
    columns: ["Field", "Value"],
    hideHeader: true,
    rows: [
      ["Prepared for", `${v("entityName")} (the “Company”)`],
      ["Processing activity", activityCell],
      ["Assessment date", formatReportDateLong(v("assessmentDate"))],
    ],
  };
}

/**
 * The cover's Assessment Result panel — a PROJECTION of the factor engine's
 * own typed determinations (trigger engagement, the two levels, the
 * balancing consequence) — never a new determination.
 */
export function deriveExecStatusPanel(
  panel: RiskFactorEngineResult["exec_panel"],
): RenderedTable | null {
  if (
    !panel.assessment_required && !panel.inherent && !panel.residual &&
    !panel.has_unassessed
  ) return null;
  // DOC 127 PART I — a record whose only named risks are unassessed states
  // that, rather than implying no risk was recorded at all.
  const tier = (t: string | null): string =>
    t ?? (panel.has_unassessed
      ? "Not assessed — risk information incomplete."
      : "Not assessed — no risks recorded.");
  // DOC 127 PART I + the §21 casing ruling (2026-08-31): the badge surface
  // renders the engine's controlled title-case label (running prose stays
  // sentence case) — supersedes the PANEL RISK-P3 sentence-caser HERE ONLY.
  // The caser remains as the fallback for legacy panel shapes without a
  // label (older persisted engine output re-derived in tests).
  const disposition = panel.disposition_label ??
    panel.disposition.charAt(0).toUpperCase() + panel.disposition.slice(1);
  const rows: string[][] = [
    ["Assessment required", panel.assessment_required ? "Yes" : "No"],
    ["Inherent privacy risk", tier(panel.inherent)],
    ["Residual privacy risk", tier(panel.residual)],
    ["Assessment disposition", disposition],
  ];
  // DOC 127 PART I — the path/reason line beneath an adverse or
  // information-gated disposition: no "Do Not Proceed" is ever a dead end.
  if (panel.path_forward) rows.push(["Path forward", panel.path_forward]);
  return {
    key: "",
    surface: "exec_status_panel",
    title: "Assessment Result",
    columns: ["Determination", "Result"],
    hideHeader: true,
    rows,
  };
}

/**
 * {{DERIVED.review_approval_signatures}} — the blank-signature-line table.
 * Name/Title are drawn from the record when present; Signature and Date are
 * NEVER pre-filled.
 */
export function deriveReviewApprovalTable(intake: Bag): RenderedTable {
  const BLANK = "________________________";
  const named: Array<{ role: string; name: string; title: string }> = [];
  for (const r of rows(intake.assessment_reviewers_approvers)) {
    const name = s(r.name);
    const title = s(r.position);
    if (!name && !title) continue;
    const role = s(r.role);
    const label = role === "Reviewed" ? "Reviewed by"
      : role === "Approved" ? "Approved by"
      : "Reviewed and approved by";
    named.push({ role: label, name, title });
  }
  if (named.length === 0 && s(intake.a9_approver_name)) {
    named.push({
      role: "Approved by",
      name: s(intake.a9_approver_name),
      title: s(intake.a9_approver_position),
    });
  }
  if (named.length === 0) {
    named.push({ role: "Reviewed and approved by", name: "", title: "" });
  }
  return {
    key: "",
    surface: "review_approval_signatures",
    title: "",
    columns: ["Role", "Name", "Title", "Signature", "Date"],
    rows: named.map((r) => [r.role, r.name || BLANK, r.title || BLANK, BLANK, BLANK]),
  };
}

/**
 * {{DERIVED.agency_submission_checklist}} — the § 7157(b) one-page extract.
 * States facts already in the record only; performs no submission.
 */
export function deriveAgencySubmissionChecklistTable(
  intake: Bag,
  values: SlotValues,
): RenderedTable {
  const v = (k: string): string => {
    const val = values[k];
    return typeof val === "string" && val.trim() ? val : "Not reported.";
  };
  const contactName = s(intake.i8_certifying_exec_name);
  const contactTitle = clause(intake.i8_certifying_exec_title);
  // A-TEAM DELTA (ChatGPT batch review, 2026-08-31, P0-7) — this is a
  // genuinely separate intake question from the review/approval roster
  // (deriveReviewApprovalTable, above: assessment_reviewers_approvers /
  // a9_approver_name), asked for a different purpose (who certifies the
  // § 7157(b) submission vs. who reviewed/approved the assessment record).
  // When the SAME person's name was recorded on both, the two questions can
  // carry different titles for real reasons (a role held alongside another)
  // or from inconsistent data entry -- either way, showing only one here
  // silently drops a title the record equally supports. Where the names
  // match, both titles are shown together rather than one being picked.
  const approverEntries: Array<{ name: string; title: string }> = [
    ...rows(intake.assessment_reviewers_approvers).map((r) => ({ name: s(r.name), title: s(r.position) })),
    ...(s(intake.a9_approver_name) ? [{ name: s(intake.a9_approver_name), title: s(intake.a9_approver_position) }] : []),
  ];
  const matchingApproverTitle = contactName
    ? approverEntries.find((a) =>
      a.name.trim().toLowerCase() === contactName.trim().toLowerCase() && a.title && a.title !== contactTitle
    )?.title
    : undefined;
  const combinedTitle = matchingApproverTitle
    ? [contactTitle, matchingApproverTitle].filter(Boolean).join(" / ")
    : contactTitle;
  const contact = contactName
    ? `${contactName}${combinedTitle ? `, ${combinedTitle}` : ""}`
    : "Not reported.";
  return {
    key: "",
    surface: "agency_submission_checklist",
    title: "",
    columns: ["Field", "Value"],
    hideHeader: true,
    rows: [
      ["Business legal name", v("entityName")],
      ["Point of contact — § 7157(b)(1)", contact],
      ["Phone", v("certContactPhone")],
      ["Email", v("certContactEmail")],
      ["Processing activity covered by this submission", v("activityName")],
      ["Categories of personal information involved", v("piCategories")],
      ["Categories of sensitive personal information involved", deriveActivitySpiInventory(intake) || "Not reported."],
    ],
  };
}

function methodLines(intake: Bag): Array<[string, string]> {
  const m = (intake.processing_methods ?? {}) as Bag;
  const pairs: Array<[string, string]> = [
    ["Collection", s(m.collection_method)],
    ["Use", s(m.use_method)],
    ["Disclosure", s(m.disclosure_method)],
    ["Retention", s(m.retention_method)],
    ["Other processing", s(m.other_processing_method)],
  ];
  return pairs.filter(([, v]) => v).map(([k, v]) => [`Processing method — ${k}`, v]);
}

/** {{DERIVED.processing_lifecycle_narrative}} — operational sequence for Appendix C. */
function lifecycleNarrative(intake: Bag): string | null {
  const m = (intake.processing_methods ?? {}) as Bag;
  const stages = [
    s(intake.processing_entry_point),
    s(m.collection_method),
    s(m.use_method),
    s(m.disclosure_method),
    s(m.retention_method),
    s(m.other_processing_method),
    s(intake.processing_result),
  ].filter(Boolean);
  return stages.length >= 2 ? stages.join(" ") : null;
}

/** Appendix C — {{DERIVED.processing_and_data_inventory}}. */
export function deriveProcessingAndDataInventory(intake: Bag): RenderedTable | null {
  const rowsOut: string[][] = [];
  const push = (item: string, detail: string) => { if (detail) rowsOut.push([item, detail]); };

  const cats = arr(intake.q4_pi_categories);
  if (cats.length) push("Personal-information categories (this activity)", cats.join("; "));
  const pi = deriveActivityPiInventory(intake);
  if (pi) push("Canonical California mapping", pi);
  const spi = deriveActivitySpiInventory(intake);
  push("Sensitive personal information", spi ?? "none identified in the activity record");
  push("Sources", s(intake.i4b_sources));
  push("Processing entry point", s(intake.processing_entry_point));
  for (const [label, v] of methodLines(intake)) push(label, v);
  const lifecycle = lifecycleNarrative(intake);
  if (lifecycle) push("Processing lifecycle (operational sequence)", lifecycle);
  push("Processing result", s(intake.processing_result));
  const im = s(intake.consumer_interaction_method);
  const ip = s(intake.consumer_interaction_purpose);
  if (im || ip) push("Consumer interaction", [im, ip].filter(Boolean).join(" — "));
  push("Approximate California consumers", s(intake.approximate_ca_consumers));
  for (const d of rows(intake.activity_disclosures)) {
    const bits = [
      `method: ${clause(d.disclosure_method)}`,
      s(d.status) ? `status: ${s(d.status)}` : "",
      s(d.timing_or_location) ? `timing: ${clause(d.timing_or_location)}` : "",
    ].filter(Boolean);
    push("Disclosure", `${clause(d.disclosure_content)} (${bits.join("; ")})`);
  }
  for (const r of rows(intake.recipients)) {
    push(
      "Recipient",
      `${s(r.recipient_name_or_category)} (${s(r.recipient_type)}): ${
        arr(r.pi_categories_made_available).join(", ")
      } — ${clause(r.disclosure_purpose)}`,
    );
  }
  for (const r of rows(intake.retention_by_pi_category)) {
    const rule = s(r.retention_period) || s(r.retention_criteria);
    if (s(r.pi_category) && rule) push("Retention", `${s(r.pi_category)}: ${rule}`);
  }
  const overall = [s(intake.i2_retention_period), s(intake.i2_retention_criteria)].filter(Boolean);
  if (overall.length) push("Overall retention", overall.join(" — "));
  push("Retention detail", s(intake.i2_retention_detail));

  if (rowsOut.length === 0) return null;
  return { key: "", surface: "processing_and_data_inventory", title: "", columns: ["Item", "Detail"], rows: rowsOut };
}

/** Appendix G — {{DERIVED.submission_support_record_for_this_assessment}}. */
export function deriveSubmissionSupportRecord(
  intake: Bag,
  report: Bag,
  assessmentDateIso: string,
): RenderedTable {
  const rowsOut: string[][] = [];
  const push = (item: string, detail: string) => { if (detail) rowsOut.push([item, detail]); };

  push("Processing activity", s(intake.primary_activity_name));
  const triggers = deriveApplicable7150Triggers(report);
  // BATCH 17 (Wave C2): no machine plurals in customer prose (doc 66 R15).
  push("Applicable § 7150(b) triggers", triggers ?? "none engaged on the information provided");
  const cats = arr(intake.q4_pi_categories);
  if (cats.length) push("Personal-information categories processed (this activity)", cats.join("; "));
  const spi = deriveActivitySpiInventory(intake);
  push("Sensitive personal information", spi ?? "none identified in the activity record");
  push("Approximate California consumers affected", s(intake.approximate_ca_consumers));
  if (s(intake.processing_status)) {
    const dates = [
      s(intake.processing_start_date) ? `start ${s(intake.processing_start_date)}` : "",
      s(intake.planned_start_date) ? `planned start ${s(intake.planned_start_date)}` : "",
    ].filter(Boolean).join("; ");
    push("Processing status", `${s(intake.processing_status)}${dates ? ` (${dates})` : ""}`);
  }
  if (s(intake.i8_certifying_exec_name)) {
    push(
      "Certifying executive identified",
      `${s(intake.i8_certifying_exec_name)}${
        s(intake.i8_certifying_exec_title) ? `, ${s(intake.i8_certifying_exec_title)}` : ""
      }`,
    );
  }
  push("Assessment date", formatReportDateLong(assessmentDateIso));

  return { key: "", surface: "submission_support_record", title: "", columns: ["Item", "Detail"], rows: rowsOut };
}

/** Appendix G — fixed § 7157 aggregate checklist. */
export function deriveBusinessLevelOutstanding(): RenderedTable {
  return {
    key: "",
    surface: "business_level_submission_outstanding",
    title: "Business-level § 7157 submission items requiring reporting-period aggregation (these aggregate across all assessments in the reporting period and cannot be determined from this assessment alone)",
    columns: ["Reporting-period item"],
    rows: [
      ["Number of risk assessments conducted or updated during the reporting period."],
      ["Aggregate personal-information and sensitive-personal-information categories across all assessed activities."],
      ["The certifying executive's attestation at the time of submission."],
      ["Confirmation of the submission point of contact and submission method."],
    ],
  };
}

/** Appendix H — {{DERIVED.materials_considered_index}} + the engine-version
 * line (moved off the cover per the v5.2 cover note). */
export function deriveMaterialsConsideredIndex(intake: Bag): RenderedTable {
  const rowsOut: string[][] = [
    // A-TEAM S3 RULING VI.19 (doc 115, 2026-08-31) — "intake record" exposed
    // the form workflow; the material considered is the submitted record.
    ["The Company’s submitted CPPA risk-assessment record, including its structured processing, disclosure, recipient, retention, necessity, benefit, risk and safeguard records."],
  ];
  if (s(intake.public_privacy_policy_url)) {
    rowsOut.push([`The Company’s public privacy policy: ${s(intake.public_privacy_policy_url)}`]);
  }
  if (isYes(intake.i9_has_existing_dpia) && s(intake.i9_existing_dpia_summary)) {
    rowsOut.push(["The Company’s existing data protection impact assessment, as summarised in the submitted record."]);
  }
  // PANEL LEAK-1 (2026-08-30): generation metadata stays for reperformance.
  // A-TEAM S3 RULINGS I.3/VI.18 (doc 115): the raw engine identifier
  // ("assessment engine cppa-risk-v5.2.1-…") is internal vocabulary; the
  // provenance row now carries a neutral template-version form derived from
  // the same stamp, so traceability is preserved without the leak.
  rowsOut.push([`Report record — ${neutralTemplateVersion(RISK_SKELETON_VERSION)}.`]);
  return { key: "", surface: "materials_considered_index", title: "", columns: ["Material considered"], rows: rowsOut };
}

/** "cppa-risk-v5.2.1-2026-08-30" → "assessment framework version 2026.08".
 * A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, Risk
 * P1-2) — the bare build number ("5.2.1") still read as an internal
 * version tag; a year.month framework label (the same shape as the cyber
 * assembler's fix) replaces it. Falls back to "report template <stamp>"
 * for a stamp that doesn't parse — never drops provenance. */
function neutralTemplateVersion(stamp: string): string {
  const m = /(\d{4})-(\d{2})-\d{2}/.exec(stamp);
  if (m) return `assessment framework version ${m[1]}.${m[2]}`;
  return `report template ${stamp}`;
}

/** Appendix F — {{DERIVED.admt_technical_facts}} (the verbatim technical
 * record that leaves § 3.E under v5.2). */
export function deriveAdmtTechnicalFacts(intake: Bag): RenderedTable | null {
  if (!isYes(intake.q18_admt_use)) return null;
  const pairs: Array<[string, string]> = [
    ["System description", s(intake.q19_admt_description)],
    ["Operational role", s(intake.admt_operational_role)],
    ["Logic", s(intake.i5_admt_logic)],
    ["Assumptions and limitations", s(intake.admt_assumptions_limitations)],
    ["Output", s(intake.admt_output)],
    ["Use of the output", s(intake.admt_output_use)],
    ["Consumer effect", s(intake.admt_consumer_effect)],
    ["Human review", s(intake.i5_admt_human_review)],
    ["Fairness testing", s(intake.i5_admt_fairness_testing)],
    ["Training-data source", s(intake.i5_admt_training_source)],
    ["§ 7153 — made available to another business", yn(intake.admt_made_available_to_other_business)],
    ["§ 7153 — trained using personal information", yn(intake.admt_provider_trained_using_pi)],
    ["§ 7153 — recipient uses it for a significant decision", yn(intake.recipient_business_uses_admt_for_significant_decision)],
  ];
  const rowsOut = pairs.filter(([, v]) => v).map(([k, v]) => [k, v]);
  if (rowsOut.length === 0) return null;
  return { key: "", surface: "admt_technical_facts", title: "", columns: ["Field", "Detail"], hideHeader: true, rows: rowsOut };
}

// ── Slot values ─────────────────────────────────────────────────────────────

export function buildRiskSlotValues(intake: Bag, report: Bag = {}): SlotValues {
  const assessmentDate = new Date().toISOString().slice(0, 10);

  const submissionContact = [
    s(intake.cppa_submission_contact_name),
    s(intake.cppa_submission_contact_phone),
    s(intake.cppa_submission_contact_email),
  ].filter(Boolean).join(" | ");

  return {
    // SYSTEM
    entityName: s(intake.entity_name) || "the company",
    assessmentDate,
    versionNumber: RISK_SKELETON_VERSION,

    // Executive summary
    activityName: clause(intake.primary_activity_name) || null,
    subjectAnchor: clause(intake.subject_anchor) || null,
    activityPurpose: clause(intake.primary_activity_purpose) || null,
    derivedTriggers: deriveApplicable7150Triggers(report),
    piCategories: asProse(arr(intake.q4_pi_categories)) || null,

    // Section 5 (governance)
    processingStatus: s(intake.processing_status) || null,
    processingStartDate: s(intake.processing_start_date) || null,
    plannedStartDate: s(intake.planned_start_date) || null,
    materialChange: s(intake.material_change_since_prior) || null,
    nextReviewDate: deriveNextReviewDate(assessmentDate),
    retentionEndRule: deriveAssessmentRetentionEnd(intake),
    certExecName: s(intake.i8_certifying_exec_name) || null,
    certExecTitle: clause(intake.i8_certifying_exec_title) || null,
    certContactPhone: s(intake.i8_contact_phone) || null,
    certContactEmail: s(intake.i8_contact_email) || null,
    certifierIsExec: yn(intake.certifier_is_executive_management) || null,
    certifierResponsible: yn(intake.certifier_directly_responsible_for_ra_compliance) || null,
    certifierKnowledge: yn(intake.certifier_has_sufficient_knowledge) || null,
    certifierAuthorized: yn(intake.certifier_authorized_to_submit) || null,
    submissionContact: submissionContact || null,
  };
}

// ── Conditional composers (carried Section 5 compositions) ──────────────────

function composeVApproval(intake: Bag, assessmentDateIso?: string): string {
  const reviewerRows = rows(intake.assessment_reviewers_approvers)
    .map((r) => [s(r.name), s(r.position), s(r.role)].filter(Boolean).join(", "))
    .filter(Boolean)
    .join("; ");
  const migrated = s(intake.a9_approver_name)
    ? `${s(intake.a9_approver_name)}${s(intake.a9_approver_position) ? `, ${s(intake.a9_approver_position)}` : ""} (Approved)`
    : "";
  const reviewers = reviewerRows || migrated;
  const approvalDate = s(intake.a9_approval_date);
  const authority = yn(intake.approver_authority_confirmed);
  const basis = clause(intake.approver_authority_basis);
  if (!reviewers && !approvalDate && !authority) return "";

  const bits: string[] = [RISK52_FIXED.x_approval_head];
  if (reviewers) bits.push(`${RISK52_FIXED.x_approval_reviewers} ${reviewers}.`);
  if (approvalDate) {
    bits.push(`${RISK52_FIXED.x_approval_date_label} ${approvalDate}.`);
    const apv = /^\d{4}-\d{2}-\d{2}/.exec(approvalDate)?.[0];
    const asm = assessmentDateIso ? /^\d{4}-\d{2}-\d{2}/.exec(assessmentDateIso)?.[0] : undefined;
    if (apv && asm && apv < asm) {
      bits.push(
        "The approval date precedes this report's date because it records the Company's internal review of the assessment record, which occurred before this report was generated.",
      );
    }
  }
  if (authority) bits.push(`${RISK52_FIXED.x_approval_authority} ${authority}.`);
  if (basis) bits.push(`${RISK52_FIXED.x_approval_authority_basis} ${basis}.`);
  return bits.join(" ");
}

function composeVTiming(intake: Bag): string {
  const deadline = deriveInitialAssessmentDeadline(intake);
  if (!deadline) return "";
  const start = s(intake.processing_start_date);
  const rule = start && start < "2026-01-01"
    ? RISK52_FIXED.x_timing_pre2026
    : RISK52_FIXED.x_timing_post2026;
  return `${rule} ${deadline}`;
}

function composeMaterialChangeDetails(intake: Bag): string {
  if (!isYes(intake.material_change_since_prior)) return "";
  const bits: string[] = [];
  if (s(intake.material_change_date)) {
    bits.push(`${RISK52_FIXED.x_material_change_date_label} ${s(intake.material_change_date)}.`);
  }
  if (s(intake.material_change_description)) {
    bits.push(`${RISK52_FIXED.x_material_change_desc_label} ${clause(intake.material_change_description)}.`);
  }
  if (s(intake.prior_risk_assessment_date)) {
    bits.push(`${RISK52_FIXED.x_material_change_prior_label} ${s(intake.prior_risk_assessment_date)}.`);
  }
  return bits.join(" ");
}

// ── Appendix A — factor / determination / authority matrix ──────────────────
//
// v5.2: rows cite v5.2 section numbers; each Report Determination cell is the
// ONE determination sentence for the factor, read from the factor engine's
// own composed factors bag (the same values already printed in the body), so
// no row can say something the report itself does not. A row is suppressed
// (never printed as N/A) when the underlying factor did not compose
// (NO-PADDING LAW).

interface FactorMatrixRowSpec {
  readonly label: string;
  readonly authority: string;
  /** engine.factors id whose composed text supplies the Report Determination. */
  readonly factorId?: string;
  /** Overrides factorId for rows not sourced from the factors bag. */
  readonly reportDetermination?: (report: Bag, intake: Bag, engine: RiskFactorEngineResult) => string | null;
}

const FACTOR_MATRIX_ROWS: readonly FactorMatrixRowSpec[] = [
  { label: "Regulatory trigger and applicability", authority: "11 CCR § 7150(a)–(b)", factorId: "trigger_application" },
  { label: "Stakeholder involvement and information providers", authority: "11 CCR § 7151; § 7152(a)(8)", factorId: "record_providers" },
  { label: "Processing purpose specificity", authority: "11 CCR § 7152(a)(1)", factorId: "purpose_specificity_analysis" },
  { label: "Scope and out-of-scope processing", authority: "11 CCR § 7156(a)", factorId: "out_of_scope" },
  { label: "Prior DPIA or other assessment", authority: "11 CCR § 7156(b)", factorId: "prior_assessments" },
  { label: "Personal-information profile", authority: "11 CCR § 7152(a)(2)", factorId: "information_profile" },
  { label: "Necessity and minimization", authority: "11 CCR § 7152(a)(2)", factorId: "necessity_conclusion" },
  { label: "Processing methods and coherence", authority: "11 CCR § 7152(a)(3)(A)", factorId: "operational_sequence" },
  { label: "Sources of information", authority: "11 CCR § 7152(a)(3)(A)", factorId: "sources_analysis" },
  { label: "Retention", authority: "11 CCR § 7152(a)(3)(B)", factorId: "retention_basis" },
  { label: "Consumer interaction and scale", authority: "11 CCR § 7152(a)(3)(C)–(D)", factorId: "consumer_context" },
  { label: "Transparency and disclosures", authority: "11 CCR § 7152(a)(3)(E); § 7152(a)(5)(C)", factorId: "notice_application" },
  { label: "Recipients and disclosures", authority: "11 CCR § 7152(a)(3)(F)", factorId: "recipient_consequences" },
  { label: "ADMT role and decision effect", authority: "11 CCR § 7152(a)(3)(G)", factorId: "admt_role" },
  { label: "ADMT logic and limitations", authority: "11 CCR § 7152(a)(3)(G)(i)", factorId: "admt_logic_note" },
  { label: "Human review of ADMT", authority: "11 CCR § 7001(e); § 7150(b)(3)", factorId: "admt_human_review" },
  { label: "ADMT fairness and bias testing", authority: "11 CCR § 7152(a)(5)(B); § 7152(a)(6)(A)(iv)", factorId: "admt_testing_analysis" },
  { label: "ADMT training data", authority: "11 CCR § 7150(b)(6); § 7153", factorId: "admt_training_note" },
  { label: "ADMT made available to another business", authority: "11 CCR § 7153(a)–(b)", factorId: "admt_made_available" },
  { label: "Consumer benefit", authority: "11 CCR § 7152(a)(4)", factorId: "consumer_benefit_paragraph" },
  { label: "Business benefit", authority: "11 CCR § 7152(a)(4)", factorId: "business_benefit_paragraph" },
  { label: "Other-stakeholder benefit", authority: "11 CCR § 7152(a)(4)", factorId: "other_stakeholder_benefit_paragraph" },
  { label: "Public benefit", authority: "11 CCR § 7152(a)(4)", factorId: "public_benefit_paragraph" },
  { label: "Material privacy risks", authority: "11 CCR § 7152(a)(5)(A)–(H)", factorId: "risk_rollup" },
  { label: "Consumer expectations", authority: "11 CCR § 7152(a)(5)(C)", factorId: "expectation_application" },
  { label: "Practical consumer control", authority: "11 CCR § 7152(a)(5)(C)", factorId: "controls_application" },
  { label: "Coercion and choice architecture", authority: "11 CCR § 7152(a)(5)(D)", factorId: "choice_architecture" },
  { label: "Safeguards", authority: "11 CCR § 7152(a)(6)", factorId: "safeguard_posture_summary" },
  { label: "Residual risk", authority: "11 CCR § 7152(a)(5)–(6); § 7154", factorId: "remaining_risk_summary" },
  { label: "Benefits-risks balancing", authority: "11 CCR § 7152(a); § 7154", factorId: "determination_text" },
  { label: "Recommended processing outcome", authority: "11 CCR § 7152(a)(7); § 7154", factorId: "recommended_outcome" },
  {
    label: "Approval and authority",
    authority: "11 CCR § 7152(a)(9)",
    reportDetermination: (_report, _intake, engine) =>
      engine.factors["approval_sufficiency_conclusion"] ?? engine.factors["approval_follow_up"] ?? null,
  },
  { label: "Assessment timing and material changes", authority: "11 CCR § 7155(a)–(b)", factorId: "review_cadence" },
  {
    label: "Assessment retention",
    authority: "11 CCR § 7155(c)",
    reportDetermination: (_report, intake) => deriveAssessmentRetentionEnd(intake),
  },
  { label: "CPPA submission and certifying executive", authority: "11 CCR § 7157(a)–(e)", factorId: "certifying_executive_eligibility" },
];

/** Appendix A — {{DERIVED.factor_input_determination_authority_matrix}}.
 * Suppresses uncomposed factors (NO-PADDING LAW); never prints N/A.
 * `persuasiveTrail` (carried): the Factor-Bearing Law's S3 anchor — the
 * trigger row's authority cell carries the compact interpretive citation
 * trail exactly when Appendix B renders. WAVE C1 trail_impact tags carried
 * unchanged. */
export function buildFactorAuthorityMatrixTable(
  report: Bag,
  intake: Bag,
  engine: RiskFactorEngineResult,
  persuasiveTrail?: string | null,
): RenderedTable | null {
  const rowsOut: string[][] = [];
  for (const spec of FACTOR_MATRIX_ROWS) {
    const determination = spec.reportDetermination
      ? spec.reportDetermination(report, intake, engine)
      : (spec.factorId ? engine.factors[spec.factorId] ?? null : null);
    if (!determination) continue;
    let authority = spec.authority;
    const tagged = RISK_CORPUS_MAP.rows.find((r) => r.factor_id === spec.label && r.trail_impact);
    if (tagged?.trail_impact) authority = `${authority}; ${tagged.trail_impact}`;
    if (persuasiveTrail && spec.label === "Regulatory trigger and applicability") {
      authority = `${authority}; persuasive (Appendix B): analogous enforcement — ${persuasiveTrail}`;
    }
    rowsOut.push([spec.label, firstSubstantiveSentence(determination), authority]);
  }
  if (rowsOut.length === 0) return null;
  return {
    key: "",
    surface: "factor_authority_matrix",
    title: "",
    columns: ["Factor", "Report Determination", "Primary Authority"],
    rows: rowsOut,
  };
}

// ── Appendix B — Persuasive Authority (the S5 surface, carried) ─────────────

/** Appendix B lead — ratified fixed prose. Composed iff ≥1 precedent row attaches. */
export const RISK_APPENDIX_I_LEAD =
  "This appendix collects enforcement decisions issued under analogous data-protection law that bear on factors assessed in this report. These decisions were issued under the EU General Data Protection Regulation, not the CCPA or its regulations; they are persuasive context only, are not binding on the California Privacy Protection Agency or on any court applying California law, and are cited because the processing or the failure they address is analogous to a factor this assessment addresses. Each entry names the factor it bears on. The operative determination for every factor remains the analysis in the body of this report.";

/** The report's fired-state tokens for CAM attachment. Exported for tests. */
export function deriveRiskFiredStates(report: Bag): Set<string> {
  const states = new Set<string>();
  const scope = arr((report.scope_and_triggers as Bag)?.narrative ?? report.scope_and_triggers);
  for (const line of scope) {
    const m = /^Engaged — .*?7150\(b\)\((\d)\)/.exec(line);
    if (m) {
      states.add(`7150(b)(${m[1]})`);
      states.add("trigger_engaged");
    }
  }
  const rc = report.record_complete as { value?: unknown } | null | undefined;
  if (rc?.value !== true) states.add("record_incomplete");
  return states;
}

export interface RiskPersuasiveAuthority {
  readonly table: RenderedTable | null;
  /** Compact S3 citation trail (Factor-Bearing Law), null when no row attached. */
  readonly trail: string | null;
  /** AOW ratified wording, null unless its bound adverse state fired AND the appendix renders. */
  readonly warning: string | null;
}

/** {{DERIVED.persuasive_authority_matrix}} — pure attachment over the Risk
 * CAM. NO-PADDING LAW: no attached row → null table → Appendix B drops. */
export function buildPersuasiveAuthority(report: Bag): RiskPersuasiveAuthority {
  const fired = deriveRiskFiredStates(report);
  const ap = attachCorpusRows(RISK_CORPUS_MAP, "S5", fired).filter((r) => r.role === "AP");
  if (ap.length === 0) return { table: null, trail: null, warning: null };

  const rows = ap.map((r) => [
    r.display!.matter,
    r.display!.what_happened,
    r.display!.bearing,
    r.display!.authority_label,
  ]);
  const table: RenderedTable = {
    key: "",
    surface: "persuasive_authority_matrix",
    title: "",
    columns: ["Matter", "What happened", "Bearing on this assessment", "Authority"],
    rows,
  };
  const trail = ap.map((r) => r.display!.trail_cite).join("; ");
  const aow = attachCorpusRows(RISK_CORPUS_MAP, "S5", fired).find((r) => r.role === "AOW");
  return { table, trail, warning: aow?.warning_text ?? null };
}

// ── Assembly ────────────────────────────────────────────────────────────────

export interface RiskSkeletonResult {
  readonly document: RenderedSkeletonDocument;
  readonly conformance: ReturnType<typeof verifySkeletonConformance>;
  readonly register_findings: string[];
  /** The factor engine's output (provenance persisted for the Appendix A feed). */
  readonly factor_engine: RiskFactorEngineResult;
}

export function assembleRiskSkeletonDocument(report: Bag, intake: Bag): RiskSkeletonResult {
  const values = buildRiskSlotValues(intake, report);
  const assessmentDate = String(values.assessmentDate);

  // The v5.2 factor engine composes every generated body block and owns the
  // in-body tables (exec ledger, recipients, retention, controls, risk
  // ledger, balance summary).
  const engine = runRiskFactorEngine(intake, report, assessmentDate);

  const composed: ComposedBlocks = {
    ...engine.blocks,

    // Section 5 — carried compositions.
    "v_governance:0": composeVApproval(intake, assessmentDate),
    "v_governance:3": composeVTiming(intake),
    "v_governance:5": composeMaterialChangeDetails(intake),
  };

  // Appendix F — intro / not-applicable record + analytical note.
  if (isYes(intake.q18_admt_use)) {
    composed["appendix_d:0"] =
      "This appendix preserves the technical and analytical detail supporting § 3.E, including the technology’s role, logic, assumptions and limitations, output, human review, testing, training-data provenance, and facts relevant to § 7153. The verbatim system, logic, assumptions, and training-data descriptions live in this appendix rather than in the body.";
    const techPresent = [
      clause(intake.q19_admt_description),
      clause(intake.i5_admt_logic),
      clause(intake.admt_output),
      clause(intake.i5_admt_human_review),
      clause(intake.i5_admt_fairness_testing),
      clause(intake.i5_admt_training_source),
    ].filter(Boolean).length;
    if (techPresent > 0) {
      composed["appendix_d:2"] =
        `Analytical note. The record above preserves the Company’s own technical description across ${techPresent} of the six record areas the appendix tracks (system description, logic, output and use, human review, testing, and training data). The body of the report evaluates those facts in § 3.E; this appendix preserves them so a reviewer can trace each conclusion to the description it rests on.`;
    }
  } else {
    // A-TEAM S3 RULING V.13 (doc 115, 2026-08-31) — the trailing "appendix
    // letter is retained…" sentence explained the template to the customer;
    // removed (the Not-applicable sentence already states the substance).
    composed["appendix_d:0"] =
      "Not applicable. The Activity does not involve automated decisionmaking technology, so no ADMT technical and decision record is required.";
  }

  // Appendix B (Persuasive Authority): pure CAM attachment over the report's
  // fired trigger states. Computed BEFORE Appendix A so the trigger row's
  // authority cell can carry the S3 citation trail exactly when the appendix
  // renders (Factor-Bearing Law; no dangling pointer).
  const persuasive = buildPersuasiveAuthority(report);
  composed["appendix_i:0"] = persuasive.table ? RISK_APPENDIX_I_LEAD : null;
  composed["appendix_i:2"] = persuasive.table ? persuasive.warning : null;

  const matrixTable = buildFactorAuthorityMatrixTable(report, intake, engine, persuasive.trail);

  const tables: SkeletonTables = {
    // Engine-owned in-body tables (exec ledger, recipients, retention,
    // controls, risk ledger, balance summary).
    ...engine.tables,

    "cover:0": deriveCoverTable(values),
    "cover:2": deriveExecStatusPanel(engine.exec_panel),
    "review_and_approval:1": deriveReviewApprovalTable(intake),
    // BATCH 20b (doc 113 S6.3).
    "v_governance:10": deriveKeyDatesTable(intake, assessmentDate),
    "agency_submission_checklist:1": deriveAgencySubmissionChecklistTable(intake, values),
    "table_of_authorities:1": matrixTable,
    "appendix_a:1": deriveProcessingAndDataInventory(intake),
    "appendix_b:1": buildNecessityMatrixTable(intake),
    "appendix_c:1": buildRiskAndSafeguardRegisterTable(intake),
    "appendix_d:1": deriveAdmtTechnicalFacts(intake),
    "appendix_e:1": deriveSubmissionSupportRecord(intake, report, assessmentDate),
    "appendix_e:2": deriveBusinessLevelOutstanding(),
    "appendix_f:1": deriveMaterialsConsideredIndex(intake),
    "appendix_i:1": persuasive.table,
  };

  const document = renderSkeletonDocument({
    sections: SKELETON_SECTIONS,
    title: RISK_SKELETON_TITLE,
    subtitle: RISK_SKELETON_SUBTITLE,
    spineVersion: RISK_SKELETON_VERSION,
    values,
    composed,
    tables,
  });

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = RISK_V3_BANNED_REGISTER.filter((b) => body.includes(b));

  return {
    document,
    conformance: verifySkeletonConformance(document, SKELETON_SECTIONS, values),
    register_findings,
    factor_engine: engine,
  };
}
