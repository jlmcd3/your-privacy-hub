// RK3-B — CPPA RISK: ASSEMBLY THROUGH THE SPINE 4.3 SKELETON.
//
// Supersedes the SO-1 v3 wire-in. This module is DETERMINISTIC: it invents no
// prose. Every {slot} is filled from the live intake (Intake Contract v2.0
// keys), every [CONDITIONAL] block is composed from the RISK_FIXED constants
// the spine exports plus the facts its trigger names, and every {{DERIVED.*}}
// "rule" block is a mechanical projection of established facts. The
// {{FACTOR.*}} "generated" blocks are NOT composed here — Phase C wires them
// through the factor engine (Fable 5 per CEO directive 2026-08-18) — so per
// the NO-PADDING LAW they are omitted entirely from the Phase B document.
//
// The result is written to `report_data.skeleton_document`, and that document
// is what ships: `generate-report-pdf` renders the customer PDF from it, and
// `CPPARiskAssessmentResult.tsx` renders the in-app document body from it.
//
// ATTRIBUTION RULE: the company's facts are attributed to the company. The v3
// banned register is swept from every composed block by the renderer; fixed
// spine prose is byte-pinned law and is checked, not repaired.

import {
  RISK_FIXED,
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
// RK3-C — the factor engine (Classes A + B; deterministic at runtime, authored
// on Fable 5 per CEO directive 2026-08-18). Class C ids stay honestly absent
// until RK3-D.
import {
  runRiskFactorEngine,
  type RiskFactorEngineResult,
} from "./risk-factor-engine.ts";
// SO-3 DEFECT CLASS 2 fix (2026-08-21, quality-batch 2fc40a52) — see the
// identical note in risk-factor-engine.ts. This module carried the same
// naive, non-abbreviation-aware copy of firstSentence(); replaced with the
// shared implementation already proven out for DPIA.
import { firstSentence } from "./clause-bound.ts";

export const RISK_SKELETON_ASSEMBLER_STAMP =
  "risk-skeleton-assembler@rk3-d-class-c-conversion-2026-08-19";

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
 * Deterministic register repair — attribution voice is law (v3 bans).
 * Canonical implementation lives in `./register-repair.ts`; re-exported here
 * so every existing import (the other product assemblers) is stable.
 */
export { repairRegister } from "./register-repair.ts";

const SENTINEL = "\u0000";

/**
 * Fill a RISK_FIXED template's {tokens} and drop any sentence whose token has
 * no value — the same honest-absence rule the renderer applies to skeleton
 * slots. Used only for conditional blocks composed from spine constants.
 */
function fillDrop(template: string, map: Record<string, string | null>): string {
  let out = template.replace(/\{([^{}]+)\}/g, (_m, name: string) => {
    const v = map[name.trim()];
    return v === null || v === undefined || v === "" ? SENTINEL : v;
  });
  if (out.includes(SENTINEL)) {
    out = out
      .split(/(?<=\.)\s+/)
      .filter((x) => !x.includes(SENTINEL))
      .join(" ");
    out = out.split(SENTINEL).join("");
  }
  return out.replace(/\s{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim();
}

// ── Canonical California PI / SPI taxonomy ────────────────────────────────────
// RK3-D (doc 33 D-L9): single custody in ca-pi-taxonomy.ts; the factor engine
// imports the same module (the RK3-C inline mirror is retired).

import { CA_PI_TAXONOMY } from "./ca-pi-taxonomy.ts";

// ── DERIVED builders (field-map §4 — deterministic, no model) ────────────────

/** {{DERIVED.applicable_7150_triggers}} — from the live trigger classification. */
export function deriveApplicable7150Triggers(report: Bag): string | null {
  const scope = arr((report.scope_and_triggers as Bag)?.narrative ?? report.scope_and_triggers);
  const engaged = scope
    .filter((x) => x.startsWith("Engaged — "))
    .map((x) => x.replace(/^Engaged — /, "").replace(/:.*$/, "").trim())
    .filter(Boolean);
  return engaged.length ? asProse(engaged) : null;
}

/** {{DERIVED.processing_lifecycle_narrative}} — first-clause operational sequence, the company's own sentences in lifecycle order. */
export function deriveProcessingLifecycleNarrative(intake: Bag): string | null {
  const m = (intake.processing_methods ?? {}) as Bag;
  const stages = [
    s(intake.processing_entry_point),
    s(m.collection_method),
    s(m.use_method),
    s(m.disclosure_method),
    s(m.retention_method),
    s(m.other_processing_method),
    s(intake.processing_result),
  ].filter(Boolean).map(firstSentence);
  return stages.length >= 2 ? stages.join(" ") : null;
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

/** {{DERIVED.activity_spi_inventory}} — SPI-mapped q4 categories; [R3] fallback when q15 answers Yes with no mapped category. */
export function deriveActivitySpiInventory(intake: Bag): string | null {
  const spi = arr(intake.q4_pi_categories).filter((c) => CA_PI_TAXONOMY[c]?.spi);
  if (spi.length > 0) return asProse(spi);
  if (isYes(intake.q15_sensitive_pi)) {
    return "the sensitive personal information the Company has identified in its submission";
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
  return "Because the processing continues on the present record, the retention end date is not yet determinable; the later-of rule above governs";
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

/**
 * {{DERIVED.processing_and_data_inventory}} — Appendix A projection of the
 * structured v2.0 facts.
 *
 * Presentation-only fix (2026-08-21, Part B item 3, CEO-confirmed): this was
 * a joined string ("rule" block), so the renderer fell through to the plain-
 * paragraph branch and the inventory printed as a run-on block of text
 * instead of a table. Now returns a RenderedTable directly — same facts,
 * same computation, no operational fact added or removed.
 */
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
  const lifecycle = deriveProcessingLifecycleNarrative(intake);
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

/**
 * {{DERIVED.submission_support_record_for_this_assessment}} — Appendix E
 * assessment-level contribution. Presentation-only fix (2026-08-21, Part B
 * item 3): now returns a RenderedTable instead of a joined string; facts
 * unchanged.
 */
export function deriveSubmissionSupportRecord(
  intake: Bag,
  report: Bag,
  assessmentDateIso: string,
): RenderedTable {
  const rowsOut: string[][] = [];
  const push = (item: string, detail: string) => { if (detail) rowsOut.push([item, detail]); };

  push("Processing activity", s(intake.primary_activity_name));
  const triggers = deriveApplicable7150Triggers(report);
  push("Applicable § 7150(b) trigger(s)", triggers ?? "none engaged on the present record");
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
  push("Assessment date", `${assessmentDateIso}; skeleton version: ${RISK_SKELETON_VERSION}`);

  return { key: "", surface: "submission_support_record", title: "", columns: ["Item", "Detail"], rows: rowsOut };
}

/**
 * {{DERIVED.business_level_submission_fields_outstanding}} — fixed § 7157
 * aggregate checklist. [R3] Presentation-only fix (2026-08-21, Part B item
 * 3): a static checklist, so it now returns a single-column RenderedTable
 * with the framing sentence as the table's own title; wording unchanged.
 */
export function deriveBusinessLevelOutstanding(): RenderedTable {
  return {
    key: "",
    surface: "business_level_submission_outstanding",
    title: "Outstanding business-level § 7157 submission elements (these aggregate across all assessments in the reporting period and cannot be determined from this assessment alone)",
    columns: ["Outstanding element"],
    rows: [
      ["Number of risk assessments conducted or updated during the reporting period."],
      ["Aggregate personal-information and sensitive-personal-information categories across all assessed activities."],
      ["The certifying executive's attestation at the time of submission."],
      ["Confirmation of the submission point of contact and submission method."],
    ],
  };
}

/**
 * {{DERIVED.materials_considered_index}} — Appendix F index of the record
 * and the materials it names. Presentation-only fix (2026-08-21, Part B
 * item 3): now returns a single-column RenderedTable instead of a numbered
 * joined string (row order supplies the numbering); materials unchanged.
 */
export function deriveMaterialsConsideredIndex(intake: Bag): RenderedTable {
  const rowsOut: string[][] = [
    ["The Company’s CPPA risk-assessment intake record (Intake Contract v2.0), including its structured processing, disclosure, recipient, retention, necessity, benefit, harm-pathway and safeguard records."],
  ];
  if (s(intake.public_privacy_policy_url)) {
    rowsOut.push([`The Company’s public privacy policy: ${s(intake.public_privacy_policy_url)}`]);
  }
  if (isYes(intake.i9_has_existing_dpia) && s(intake.i9_existing_dpia_summary)) {
    rowsOut.push(["The Company’s existing data protection impact assessment, as summarised in the intake record."]);
  }
  return { key: "", surface: "materials_considered_index", title: "", columns: ["Material considered"], rows: rowsOut };
}

/**
 * {{DERIVED.admt_technical_facts}} — Appendix D labelled projection of the
 * Section V facts. Presentation-only fix (2026-08-21, Part B item 3): now
 * returns a RenderedTable instead of a joined string; facts unchanged.
 */
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
  return { key: "", surface: "admt_technical_facts", title: "", columns: ["Field", "Detail"], rows: rowsOut };
}

// ── Slot values ─────────────────────────────────────────────────────────────

export function buildRiskSlotValues(intake: Bag, report: Bag = {}): SlotValues {
  const assessmentDate = new Date().toISOString().slice(0, 10);

  const participants = rows(intake.section_7151_operational_participants)
    .map((p) =>
      `${s(p.name)}, ${s(p.role)} — ${clause(p.processing_responsibility)} (participation confirmed: ${
        p.participation_confirmed === true ? "Yes" : yn(p.participation_confirmed) || "No"
      })`
    )
    .join("; ");

  const recipientRows = rows(intake.recipients);
  const recipientsNames = asProse(recipientRows.map((r) => s(r.recipient_name_or_category)));
  const recipientsDetail = recipientRows
    .map((r) =>
      `${s(r.recipient_name_or_category)} (${s(r.recipient_type)}): ${
        arr(r.pi_categories_made_available).join(", ")
      } — ${clause(r.disclosure_purpose)}`
    )
    .join("; ");

  const disclosureRows = rows(intake.activity_disclosures)
    .map((d) => {
      const tail = [
        `method: ${clause(d.disclosure_method)}`,
        s(d.status) ? `status: ${s(d.status)}` : "",
        s(d.timing_or_location) ? `timing: ${clause(d.timing_or_location)}` : "",
      ].filter(Boolean).join("; ");
      return `${clause(d.disclosure_content)} (${tail})`;
    })
    .join("; ");

  const retentionByCategory = rows(intake.retention_by_pi_category)
    .map((r) => {
      const rule = s(r.retention_period) || s(r.retention_criteria);
      return s(r.pi_category) && rule ? `${s(r.pi_category)} — ${rule}` : "";
    })
    .filter(Boolean)
    .join("; ");

  const m = (intake.processing_methods ?? {}) as Bag;
  const methodsText = clause(
    [
      s(m.collection_method) ? `Collection: ${s(m.collection_method)}` : "",
      s(m.use_method) ? `Use: ${s(m.use_method)}` : "",
      s(m.disclosure_method) ? `Disclosure: ${s(m.disclosure_method)}` : "",
      s(m.retention_method) ? `Retention: ${s(m.retention_method)}` : "",
      s(m.other_processing_method) ? `Other processing: ${s(m.other_processing_method)}` : "",
    ].filter(Boolean).join(" "),
  );

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

    // Executive summary / Section I
    activityName: clause(intake.primary_activity_name) || null,
    subjectAnchor: clause(intake.subject_anchor) || null,
    activityPurpose: clause(intake.primary_activity_purpose) || null,
    derivedTriggers: deriveApplicable7150Triggers(report),
    informationProviders: clause(intake.a8_information_providers) || null,
    internalContributors: clause(intake.i7_internal_contributors) || null,
    operationalParticipants: participants || null,

    // Section II
    processingEntryPoint: clause(intake.processing_entry_point) || null,
    processingMethods: methodsText || null,
    // {{DERIVED.processing_lifecycle_narrative}} is implemented
    // (deriveProcessingLifecycleNarrative) and rendered in Appendix A; the
    // spine's "may be presented" sentence stays honestly absent in the body
    // so the same facts are not printed twice in II.A.
    lifecycleNarrative: null,
    processingResult: clause(intake.processing_result) || null,
    interactionMethod: s(intake.consumer_interaction_method) || null,
    interactionPurpose: clause(intake.consumer_interaction_purpose) || null,
    approxCaConsumers: clause(intake.approximate_ca_consumers) || null,
    piCategories: asProse(arr(intake.q4_pi_categories)) || null,
    piInventory: deriveActivityPiInventory(intake),
    i4bSources: clause(intake.i4b_sources) || null,
    recipientsNames: recipientsNames || null,
    recipientsDetail: recipientsDetail || null,
    retentionPeriod: clause(intake.i2_retention_period) || null,
    retentionCriteria: clause(intake.i2_retention_criteria) || null,
    retentionDetail: clause(intake.i2_retention_detail) || null,
    retentionByCategory: retentionByCategory || null,

    // Section III
    minPi: clause(intake.i1b_min_pi) || null,

    // Section IV
    activityDisclosures: disclosureRows || null,
    privacyPolicyUrl: s(intake.public_privacy_policy_url) || null,

    // Section X
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
    // D6 — organization-level fields; resolve through the bag when the org
    // profile supplies them, drop honestly otherwise.
    certifierIsExec: yn(intake.certifier_is_executive_management) || null,
    certifierResponsible: yn(intake.certifier_directly_responsible_for_ra_compliance) || null,
    certifierKnowledge: yn(intake.certifier_has_sufficient_knowledge) || null,
    certifierAuthorized: yn(intake.certifier_authorized_to_submit) || null,
    submissionContact: submissionContact || null,
  };
}

// ── Conditional composers (Phase B triggers over established facts) ─────────

function composeSecondaryUses(intake: Bag): string {
  if (!isYes(intake.has_secondary_uses)) return "";
  const uses = rows(intake.secondary_activities)
    .map((a) => [clause(a.name ?? a.activity_name), clause(a.purpose ?? a.activity_purpose)].filter(Boolean).join(" — "))
    .filter(Boolean)
    .join("; ") ||
    arr(intake.secondary_activities).join("; ") ||
    clause(intake.secondary_uses_detail);
  if (!uses) return "";
  return `${RISK_FIXED.secondary_uses_lead} ${uses}.`;
}

function composePriorAssessment(intake: Bag): string {
  if (!isYes(intake.i9_has_existing_dpia)) return "";
  const summary = clause(intake.i9_existing_dpia_summary);
  if (!summary) return "";
  return `${RISK_FIXED.prior_assessment_lead} ${summary}. ${RISK_FIXED.prior_assessment_note}`;
}

function composeExternalParticipants(intake: Bag): string {
  const external = clause(intake.i7_external_consultees) || asProse(arr(intake.i7_external_consultees));
  if (!external) return "";
  return `${RISK_FIXED.external_participants_lead} ${external}.`;
}

function composeSpi(intake: Bag): string {
  const spi = deriveActivitySpiInventory(intake);
  if (!spi) return "";
  return `${RISK_FIXED.spi_lead} ${spi}. ${RISK_FIXED.spi_note}`;
}

function composeBenefit(
  identified: unknown,
  narrative: unknown,
  fact: unknown,
): string {
  if (!(isYes(identified) || (identified === undefined && s(narrative)))) return "";
  const n = clause(narrative);
  if (!n) return "";
  const f = clause(fact);
  return `${RISK_FIXED.benefit_identifies_lead} ${n}.${
    f ? ` ${RISK_FIXED.benefit_supporting_lead} ${f}.` : ""
  }`;
}

function composeBenefitNone(
  identified: unknown,
  narrative: unknown,
  noneText: string,
): string {
  if (isYes(identified) || (identified === undefined && s(narrative))) return "";
  return noneText;
}

function composeExecCompanyDecision(intake: Bag): string {
  const decision = clause(intake.final_processing_decision);
  if (!decision) return "";
  const notes = clause(intake.final_processing_decision_notes);
  return `${RISK_FIXED.exec_company_decision_lead} ${decision}.${notes ? ` ${notes}.` : ""}`;
}

function composeIxCompanyDecision(intake: Bag): string {
  const decision = clause(intake.final_processing_decision);
  if (!decision) return "";
  const notes = clause(intake.final_processing_decision_notes);
  return `${fillDrop(RISK_FIXED.ix_company_decision, { decision })}${notes ? ` ${notes}.` : ""}`;
}

function composeXApproval(intake: Bag): string {
  const reviewerRows = rows(intake.assessment_reviewers_approvers)
    .map((r) => [s(r.name), s(r.position), s(r.role)].filter(Boolean).join(", "))
    .filter(Boolean)
    .join("; ");
  // a9 approver fields are the ratified migration source for the finalization
  // reviewer record (field-map §3).
  const migrated = s(intake.a9_approver_name)
    ? `${s(intake.a9_approver_name)}${s(intake.a9_approver_position) ? `, ${s(intake.a9_approver_position)}` : ""} (Approved)`
    : "";
  const reviewers = reviewerRows || migrated;
  const approvalDate = s(intake.a9_approval_date);
  const authority = yn(intake.approver_authority_confirmed);
  const basis = clause(intake.approver_authority_basis);
  if (!reviewers && !approvalDate && !authority) return "";

  const bits: string[] = [RISK_FIXED.x_approval_head];
  if (reviewers) bits.push(`${RISK_FIXED.x_approval_reviewers} ${reviewers}.`);
  if (approvalDate) bits.push(`${RISK_FIXED.x_approval_date_label} ${approvalDate}.`);
  if (authority) bits.push(`${RISK_FIXED.x_approval_authority} ${authority}.`);
  if (basis) bits.push(`${RISK_FIXED.x_approval_authority_basis} ${basis}.`);
  return bits.join(" ");
}

function composeXTiming(intake: Bag): string {
  const deadline = deriveInitialAssessmentDeadline(intake);
  if (!deadline) return "";
  const start = s(intake.processing_start_date);
  const rule = start && start < "2026-01-01"
    ? RISK_FIXED.x_timing_pre2026
    : RISK_FIXED.x_timing_post2026;
  return `${rule} ${deadline}`;
}

function composeMaterialChangeDetails(intake: Bag): string {
  if (!isYes(intake.material_change_since_prior)) return "";
  const bits: string[] = [];
  if (s(intake.material_change_date)) {
    bits.push(`${RISK_FIXED.x_material_change_date_label} ${s(intake.material_change_date)}.`);
  }
  if (s(intake.material_change_description)) {
    bits.push(`${RISK_FIXED.x_material_change_desc_label} ${clause(intake.material_change_description)}.`);
  }
  if (s(intake.prior_risk_assessment_date)) {
    bits.push(`${RISK_FIXED.x_material_change_prior_label} ${s(intake.prior_risk_assessment_date)}.`);
  }
  return bits.join(" ");
}

function composeAdmtBlocks(intake: Bag): Record<string, string> {
  if (!isYes(intake.q18_admt_use)) return {};
  const out: Record<string, string> = {
    "v_admt:0": fillDrop(RISK_FIXED.admt_a, {
      q19: clause(intake.q19_admt_description) || null,
      role: clause(intake.admt_operational_role) || null,
    }),
    "v_admt:2": fillDrop(RISK_FIXED.admt_b, {
      logic: clause(intake.i5_admt_logic) || null,
      assumptions: clause(intake.admt_assumptions_limitations) || null,
    }),
    "v_admt:4": fillDrop(RISK_FIXED.admt_c, {
      output: clause(intake.admt_output) || null,
      outputUse: clause(intake.admt_output_use) || null,
      consumerEffect: clause(intake.admt_consumer_effect) || null,
    }),
    "v_admt:6": fillDrop(RISK_FIXED.admt_d, {
      humanReview: clause(intake.i5_admt_human_review) || null,
    }),
    "v_admt:8": fillDrop(RISK_FIXED.admt_e, {
      testing: clause(intake.i5_admt_fairness_testing) || null,
    }),
    "v_admt:10": fillDrop(RISK_FIXED.admt_f, {
      trainingSource: clause(intake.i5_admt_training_source) || null,
    }),
    "v_admt:14": RISK_FIXED.admt_appendix_pointer,
    "appendix_d:0": RISK_FIXED.appendix_d_intro,
  };
  if (isYes(intake.admt_made_available_to_other_business)) {
    out["v_admt:12"] = fillDrop(RISK_FIXED.admt_g, {
      madeAvailable: yn(intake.admt_made_available_to_other_business) || null,
      trainedPi: yn(intake.admt_provider_trained_using_pi) || null,
      recipientSignificant: yn(intake.recipient_business_uses_admt_for_significant_decision) || null,
    });
  }
  return out;
}

// ── Appendix G — factor / intake / determination / authority matrix ─────────
//
// Spine v4.5 replaces the Table of Authorities with a customer-readable audit
// trail (Part 3.F–G of the spine docx): for each material factor, the row
// shows the customer's own intake data, the exact deterministic sentence(s)
// printed for that factor in the report body, and the verified primary
// authority. No new legal content is produced here — "Deterministic Report
// Language" is read straight from the factor engine's own composed blocks
// (`engine.blocks`), the same values already printed in the body, so there is
// no way for an Appendix G row to say something the report itself does not.
// A row is suppressed (never printed as N/A) when the underlying factor did
// not compose for this fixture, matching the NO-PADDING LAW.

/** Joins the composed text for one or more factor-engine block keys, in order; null if none composed. */
function blockText(engine: RiskFactorEngineResult, keys: readonly string[]): string | null {
  const parts = keys
    .map((k) => engine.blocks[k])
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0);
  return parts.length ? parts.join(" ") : null;
}

interface FactorMatrixRowSpec {
  readonly label: string;
  readonly authority: string;
  /** engine.blocks keys whose composed text is joined for "Deterministic Report Language". */
  readonly blockKeys?: readonly string[];
  /** Overrides blockKeys for factors not sourced from the factor engine. */
  readonly reportLanguage?: (report: Bag, intake: Bag, engine: RiskFactorEngineResult) => string | null;
  readonly intakeData: (intake: Bag, report: Bag) => string | null;
}

const FACTOR_MATRIX_ROWS: readonly FactorMatrixRowSpec[] = [
  {
    label: "Regulatory trigger and applicability",
    authority: "11 CCR § 7150(a)–(b)",
    blockKeys: ["i_purpose_scope:6"],
    intakeData: (intake) => {
      const bits = [
        s(intake.q5_sell_share) ? `Sell/share: ${s(intake.q5_sell_share)}` : "",
        s(intake.q15_sensitive_pi) ? `Sensitive PI: ${s(intake.q15_sensitive_pi)}` : "",
        s(intake.q18_admt_use) ? `ADMT for a significant decision: ${s(intake.q18_admt_use)}` : "",
        s(intake.q5b_profiling_observation) ? `Profiling: ${s(intake.q5b_profiling_observation)}` : "",
      ].filter(Boolean);
      return bits.length ? bits.join("; ") : null;
    },
  },
  {
    label: "Stakeholder involvement and information providers",
    authority: "11 CCR § 7151; § 7152(a)(8)",
    blockKeys: ["i_purpose_scope:12"],
    intakeData: (intake) => {
      const bits = [
        s(intake.a8_information_providers) ? `Information providers: ${clause(intake.a8_information_providers)}` : "",
        s(intake.i7_internal_contributors) ? `Internal contributors: ${clause(intake.i7_internal_contributors)}` : "",
        s(intake.i7_external_consultees) ? `External consultees: ${clause(intake.i7_external_consultees)}` : "",
      ].filter(Boolean);
      return bits.length ? bits.join(". ") : null;
    },
  },
  {
    label: "Processing purpose specificity",
    authority: "11 CCR § 7152(a)(1)",
    blockKeys: ["i_purpose_scope:1"],
    intakeData: (intake) =>
      s(intake.primary_activity_name)
        ? `Activity: ${clause(intake.primary_activity_name)}. Stated purpose: ${clause(intake.primary_activity_purpose)}.`
        : null,
  },
  {
    label: "Scope and comparable processing",
    authority: "11 CCR § 7156(a)",
    blockKeys: ["i_purpose_scope:3", "i_purpose_scope:7"],
    intakeData: (intake) => {
      if (!isYes(intake.has_secondary_uses)) return "Secondary uses: No.";
      const uses = rows(intake.secondary_activities)
        .map((a) => clause(a.name ?? a.activity_name))
        .filter(Boolean)
        .join("; ");
      return `Secondary uses: Yes${uses ? ` (${uses})` : ""}.`;
    },
  },
  {
    label: "Prior DPIA or other assessment",
    authority: "11 CCR § 7156(b)",
    reportLanguage: (_report, intake) => composePriorAssessment(intake) || null,
    intakeData: (intake) =>
      isYes(intake.i9_has_existing_dpia)
        ? `Existing assessment identified: Yes. Summary: ${clause(intake.i9_existing_dpia_summary)}.`
        : null,
  },
  {
    label: "Personal-information profile",
    authority: "11 CCR § 7152(a)(2)",
    blockKeys: ["ii_processing_context:6"],
    intakeData: (intake) => {
      const cats = arr(intake.q4_pi_categories);
      if (!cats.length) return null;
      return `Categories: ${cats.join("; ")}. Sensitive PI: ${s(intake.q15_sensitive_pi) || "not indicated"}.`;
    },
  },
  {
    label: "Necessity and minimization",
    authority: "11 CCR § 7152(a)(2)",
    blockKeys: ["iii_necessity:1", "iii_necessity:4"],
    intakeData: (intake) => {
      const n = rows(intake.a2_necessity_set).length;
      return s(intake.i1b_min_pi) || n
        ? `Minimum information identified: ${clause(intake.i1b_min_pi) || "not separately stated"}. Necessity record: ${n} element(s) assessed.`
        : null;
    },
  },
  {
    label: "Processing methods and coherence",
    authority: "11 CCR § 7152(a)(3)(A)",
    blockKeys: ["ii_processing_context:1"],
    intakeData: (intake) =>
      s(intake.processing_entry_point)
        ? `Entry point: ${clause(intake.processing_entry_point)}. Result: ${clause(intake.processing_result)}.`
        : null,
  },
  {
    label: "Sources of information",
    authority: "11 CCR § 7152(a)(3)(A)",
    blockKeys: ["ii_processing_context:9"],
    intakeData: (intake) => (s(intake.i4b_sources) ? `Sources: ${clause(intake.i4b_sources)}.` : null),
  },
  {
    label: "Retention",
    authority: "11 CCR § 7152(a)(3)(B)",
    blockKeys: ["ii_processing_context:13"],
    intakeData: (intake) =>
      s(intake.i2_retention_period)
        ? `Retention period: ${clause(intake.i2_retention_period)}. Criteria: ${clause(intake.i2_retention_criteria) || "not separately stated"}.`
        : null,
  },
  {
    label: "Consumer interaction and scale",
    authority: "11 CCR § 7152(a)(3)(C)–(D)",
    blockKeys: ["ii_processing_context:3"],
    intakeData: (intake) =>
      s(intake.consumer_interaction_method)
        ? `Interaction: ${clause(intake.consumer_interaction_method)}. Purpose: ${clause(intake.consumer_interaction_purpose)}. Approximate California consumers: ${clause(intake.approximate_ca_consumers) || "not stated"}.`
        : null,
  },
  {
    label: "Transparency and disclosures",
    authority: "11 CCR § 7152(a)(3)(E); § 7152(a)(5)(C)",
    blockKeys: ["iv_consumer_transparency:2"],
    intakeData: (intake) => {
      const n = rows(intake.activity_disclosures).length;
      const url = s(intake.public_privacy_policy_url);
      if (!n && !url) return null;
      return `Disclosures recorded: ${n}.${url ? ` Public privacy policy: ${url}.` : ""}`;
    },
  },
  {
    label: "Recipients and disclosures",
    authority: "11 CCR § 7152(a)(3)(F)",
    blockKeys: ["ii_processing_context:11"],
    intakeData: (intake) => {
      const names = rows(intake.recipients).map((r) => s(r.recipient_name_or_category)).filter(Boolean);
      return names.length ? `Recipients: ${asProse(names)}.` : null;
    },
  },
  {
    label: "ADMT logic and limitations",
    authority: "11 CCR § 7152(a)(3)(G)(i)",
    blockKeys: ["v_admt:3"],
    intakeData: (intake) =>
      s(intake.i5_admt_logic)
        ? `Logic: ${clause(intake.i5_admt_logic)}. Assumptions/limitations: ${clause(intake.admt_assumptions_limitations) || "none identified"}.`
        : null,
  },
  {
    label: "ADMT output and decision effect",
    authority: "11 CCR § 7152(a)(3)(G)(ii)",
    blockKeys: ["v_admt:5"],
    intakeData: (intake) =>
      s(intake.admt_output)
        ? `Output: ${clause(intake.admt_output)}. Use: ${clause(intake.admt_output_use)}. Consumer effect: ${clause(intake.admt_consumer_effect)}.`
        : null,
  },
  {
    label: "Human review of ADMT",
    authority: "11 CCR § 7001(e); § 7150(b)(3)",
    blockKeys: ["v_admt:7"],
    intakeData: (intake) => (s(intake.i5_admt_human_review) ? `Human review: ${clause(intake.i5_admt_human_review)}.` : null),
  },
  {
    label: "ADMT fairness and bias testing",
    authority: "11 CCR § 7152(a)(5)(B); § 7152(a)(6)(A)(iv)",
    blockKeys: ["v_admt:9"],
    intakeData: (intake) => (s(intake.i5_admt_fairness_testing) ? `Testing reported: ${clause(intake.i5_admt_fairness_testing)}.` : null),
  },
  {
    label: "ADMT training data",
    authority: "11 CCR § 7150(b)(6); § 7153",
    blockKeys: ["v_admt:11"],
    intakeData: (intake) => (s(intake.i5_admt_training_source) ? `Training-data source: ${clause(intake.i5_admt_training_source)}.` : null),
  },
  {
    label: "ADMT made available to another business",
    authority: "11 CCR § 7153(a)–(b)",
    // v_admt:13 ("H. Overall ADMT Conclusion") also carries the unconditional
    // overall-ADMT analysis, so it composes whenever ADMT applies at all —
    // gate on the actual § 7153 trigger, not just block presence, or this row
    // would print the overall conclusion for every ADMT fixture regardless of
    // whether the recipient-business branch ever fired.
    reportLanguage: (_report, intake, engine) =>
      isYes(intake.admt_made_available_to_other_business) ? blockText(engine, ["v_admt:13"]) : null,
    intakeData: (intake) =>
      isYes(intake.admt_made_available_to_other_business)
        ? `Made available to another business: Yes. Trained using personal information: ${yn(intake.admt_provider_trained_using_pi)}. Recipient uses it for a significant decision: ${yn(intake.recipient_business_uses_admt_for_significant_decision)}.`
        : null,
  },
  {
    label: "Consumer benefit",
    authority: "11 CCR § 7152(a)(4)",
    blockKeys: ["vi_benefits:4"],
    // Mirrors composeBenefit's own gate (isYes(identified) || (identified
    // undefined && narrative present)) — checking only the flag missed
    // fixtures that never set benefit_consumer_identified but do carry a
    // real benefit narrative, wrongly printing "not separately recorded"
    // next to report language that plainly discusses the benefit.
    intakeData: (intake) =>
      isYes(intake.benefit_consumer_identified) ||
        (intake.benefit_consumer_identified === undefined && s(intake.a4_benefit_consumer))
        ? `Benefit: ${clause(intake.a4_benefit_consumer)}. Support: ${clause(intake.a4_benefit_consumer_fact) || "not separately stated"}.`
        : null,
  },
  {
    label: "Business benefit",
    authority: "11 CCR § 7152(a)(4)",
    blockKeys: ["vi_benefits:8"],
    intakeData: (intake) =>
      isYes(intake.benefit_business_identified) ||
        (intake.benefit_business_identified === undefined && s(intake.a4_benefit_business))
        ? `Benefit: ${clause(intake.a4_benefit_business)}. Support: ${clause(intake.a4_benefit_business_fact) || "not separately stated"}.`
        : null,
  },
  {
    label: "Other-stakeholder benefit",
    authority: "11 CCR § 7152(a)(4)",
    blockKeys: ["vi_benefits:12"],
    intakeData: (intake) =>
      isYes(intake.benefit_other_stakeholders_identified) ||
        (intake.benefit_other_stakeholders_identified === undefined && s(intake.a4_benefit_other_stakeholders))
        ? `Benefit: ${clause(intake.a4_benefit_other_stakeholders)}. Support: ${clause(intake.a4_benefit_other_stakeholders_fact) || "not separately stated"}.`
        : null,
  },
  {
    label: "Public benefit",
    authority: "11 CCR § 7152(a)(4)",
    blockKeys: ["vi_benefits:16"],
    intakeData: (intake) =>
      isYes(intake.benefit_public_identified) ||
        (intake.benefit_public_identified === undefined && s(intake.a4_benefit_public))
        ? `Benefit: ${clause(intake.a4_benefit_public)}. Support: ${clause(intake.a4_benefit_public_fact) || "not separately stated"}.`
        : null,
  },
  {
    label: "Material privacy-risk pathways",
    authority: "11 CCR § 7152(a)(5)(A)–(H)",
    blockKeys: ["vii_risks:1"],
    intakeData: (intake) => {
      const harms = rows(intake.a5_harm_pathways).map((p) => s(p.harm)).filter(Boolean);
      return harms.length ? `${harms.length} pathway(s) recorded: ${asProse(harms)}.` : null;
    },
  },
  {
    label: "Consumer expectations",
    authority: "11 CCR § 7152(a)(5)(C)",
    blockKeys: ["iv_consumer_transparency:4"],
    intakeData: (intake) => {
      const n = rows(intake.activity_disclosures).length;
      return s(intake.consumer_interaction_method)
        ? `Interaction: ${clause(intake.consumer_interaction_method)}. Disclosures recorded: ${n}.`
        : null;
    },
  },
  {
    label: "Practical consumer control",
    authority: "11 CCR § 7152(a)(5)(C)",
    blockKeys: ["iv_consumer_transparency:6"],
    intakeData: (intake) => {
      const bits = [
        s(intake.q6_right_know) ? `Right to know: ${s(intake.q6_right_know)}` : "",
        s(intake.q7_right_delete) ? `Right to delete: ${s(intake.q7_right_delete)}` : "",
        s(intake.q8_right_correct) ? `Right to correct: ${s(intake.q8_right_correct)}` : "",
        s(intake.q9_opt_out) ? `Opt-out: ${s(intake.q9_opt_out)}` : "",
      ].filter(Boolean);
      return bits.length ? bits.join("; ") + "." : null;
    },
  },
  {
    label: "Coercion and choice architecture",
    authority: "11 CCR § 7152(a)(5)(D)",
    blockKeys: ["iv_consumer_transparency:8"],
    intakeData: (intake) => (s(intake.q9_opt_out) ? `Opt-out mechanism: ${s(intake.q9_opt_out)}.` : null),
  },
  {
    label: "Safeguards",
    authority: "11 CCR § 7152(a)(6)",
    blockKeys: ["viii_safeguards:1"],
    intakeData: (intake) => {
      const g = rows(intake.a6_safeguards);
      if (!g.length) return null;
      const byStatus = new Map<string, number>();
      for (const row of g) {
        const st = s(row.safeguard_status) || "Not specified";
        byStatus.set(st, (byStatus.get(st) ?? 0) + 1);
      }
      const parts = Array.from(byStatus.entries()).map(([st, n]) => `${st}: ${n}`);
      return `${g.length} safeguard(s) recorded, by status — ${parts.join("; ")}.`;
    },
  },
  {
    label: "Residual risk",
    authority: "11 CCR § 7152(a)(5)–(6); § 7154",
    blockKeys: ["viii_safeguards:7"],
    intakeData: () => "Derived from the risk-pathway and safeguard facts recorded above (see Material privacy-risk pathways; Safeguards).",
  },
  {
    label: "Benefits-risks balancing",
    authority: "11 CCR § 7152(a); § 7154",
    blockKeys: ["ix_balancing:3"],
    intakeData: () => "Synthesizes the benefit, risk, safeguard, and residual-risk facts recorded above.",
  },
  {
    label: "Recommended processing outcome",
    authority: "11 CCR § 7152(a)(7); § 7154",
    blockKeys: ["ix_balancing:4"],
    intakeData: () => "Follows from the benefits–risks balancing result recorded above.",
  },
  {
    label: "Approval and authority",
    authority: "11 CCR § 7152(a)(9)",
    blockKeys: ["x_governance:1"],
    intakeData: (intake) => {
      const reviewerRows = rows(intake.assessment_reviewers_approvers)
        .map((r) => [s(r.name), s(r.position)].filter(Boolean).join(", "))
        .filter(Boolean)
        .join("; ");
      const migrated = s(intake.a9_approver_name)
        ? `${s(intake.a9_approver_name)}${s(intake.a9_approver_position) ? `, ${s(intake.a9_approver_position)}` : ""}`
        : "";
      const reviewers = reviewerRows || migrated;
      if (!reviewers && !s(intake.a9_approval_date)) return null;
      return `Reviewer(s)/approver(s): ${reviewers || "not stated"}. Approval date: ${s(intake.a9_approval_date) || "not stated"}. Authority confirmed: ${yn(intake.approver_authority_confirmed) || "not stated"}.`;
    },
  },
  {
    label: "Assessment timing and material changes",
    authority: "11 CCR § 7155(a)–(b)",
    blockKeys: ["x_governance:6"],
    intakeData: (intake) =>
      s(intake.processing_status)
        ? `Processing status: ${s(intake.processing_status)}. Material change since prior assessment: ${s(intake.material_change_since_prior) || "No"}.`
        : null,
  },
  {
    label: "Assessment retention",
    authority: "11 CCR § 7155(c)",
    reportLanguage: (_report, intake) => deriveAssessmentRetentionEnd(intake),
    intakeData: (intake) => (s(intake.processing_status) ? `Processing status: ${s(intake.processing_status)} (governs the later-of retention rule).` : null),
  },
  {
    label: "CPPA submission and certifying executive",
    authority: "11 CCR § 7157(a)–(e)",
    blockKeys: ["x_governance:9"],
    intakeData: (intake) =>
      s(intake.i8_certifying_exec_name)
        ? `Certifying executive: ${s(intake.i8_certifying_exec_name)}${clause(intake.i8_certifying_exec_title) ? `, ${clause(intake.i8_certifying_exec_title)}` : ""}.`
        : null,
  },
];

/** Appendix G — {{DERIVED.factor_input_determination_authority_matrix}}. Suppresses uncomposed factors (NO-PADDING LAW); never prints N/A. */
export function buildFactorAuthorityMatrixTable(
  report: Bag,
  intake: Bag,
  engine: RiskFactorEngineResult,
): RenderedTable | null {
  const rowsOut: string[][] = [];
  for (const spec of FACTOR_MATRIX_ROWS) {
    const language = spec.reportLanguage
      ? spec.reportLanguage(report, intake, engine)
      : blockText(engine, spec.blockKeys ?? []);
    if (!language) continue;
    const data = spec.intakeData(intake, report) ?? "Not separately recorded in the intake.";
    rowsOut.push([spec.label, data, language, spec.authority]);
  }
  if (rowsOut.length === 0) return null;
  return {
    key: "",
    surface: "factor_authority_matrix",
    // Left empty: the section heading already prints the full Appendix G
    // title, so a second title line on the table itself would repeat it.
    title: "",
    columns: ["Factor", "Customer Intake Data", "Deterministic Report Language", "Primary Authority"],
    rows: rowsOut,
  };
}

// ── Assembly ────────────────────────────────────────────────────────────────

export interface RiskSkeletonResult {
  readonly document: RenderedSkeletonDocument;
  readonly conformance: ReturnType<typeof verifySkeletonConformance>;
  readonly register_findings: string[];
  /** RK3-C — the factor engine's output (provenance persisted for the RK3-D App G feed). */
  readonly factor_engine: RiskFactorEngineResult;
}

export function assembleRiskSkeletonDocument(report: Bag, intake: Bag): RiskSkeletonResult {
  const values = buildRiskSlotValues(intake, report);
  const assessmentDate = String(values.assessmentDate);

  // RK3-C/RK3-D — {{FACTOR.*}} generated blocks (Classes A + B; the RK3-D
  // conversion composed the former Class C set from the doc 33 D-L3 typed
  // operands). Keys are disjoint from the Phase B conditional/rule keys
  // below, except i_purpose_scope:4 where the Phase B secondary-uses lead
  // and the RK3-D per-row analysis share the spine block and are joined.
  const engine = runRiskFactorEngine(intake, report, assessmentDate);

  // RK3-D — join the Phase B conditional content with the engine's factor
  // analysis for a block the spine defines as carrying both.
  const joinBlock = (fixed: string | null, factor: string | undefined): string | null => {
    if (fixed && factor) return `${fixed} ${factor}`;
    return fixed ?? factor ?? null;
  };

  const composed: ComposedBlocks = {
    ...engine.blocks,

    // Executive summary
    "executive_summary:7": composeExecCompanyDecision(intake),

    // Section I
    "i_purpose_scope:4": joinBlock(composeSecondaryUses(intake), engine.blocks["i_purpose_scope:4"]),
    "i_purpose_scope:8": composePriorAssessment(intake),
    "i_purpose_scope:11": composeExternalParticipants(intake),

    // Section II
    "ii_processing_context:5": composeSpi(intake),

    // Section V + Appendix D conditionals
    ...composeAdmtBlocks(intake),

    // Section VI benefit gates (field-map §2b: never force a benefit)
    "vi_benefits:2": composeBenefit(intake.benefit_consumer_identified, intake.a4_benefit_consumer, intake.a4_benefit_consumer_fact),
    "vi_benefits:3": composeBenefitNone(intake.benefit_consumer_identified, intake.a4_benefit_consumer, RISK_FIXED.benefit_none_consumer),
    "vi_benefits:6": composeBenefit(intake.benefit_business_identified, intake.a4_benefit_business, intake.a4_benefit_business_fact),
    "vi_benefits:7": composeBenefitNone(intake.benefit_business_identified, intake.a4_benefit_business, RISK_FIXED.benefit_none_business),
    "vi_benefits:10": composeBenefit(intake.benefit_other_stakeholders_identified, intake.a4_benefit_other_stakeholders, intake.a4_benefit_other_stakeholders_fact),
    "vi_benefits:11": composeBenefitNone(intake.benefit_other_stakeholders_identified, intake.a4_benefit_other_stakeholders, RISK_FIXED.benefit_none_other),
    "vi_benefits:14": composeBenefit(intake.benefit_public_identified, intake.a4_benefit_public, intake.a4_benefit_public_fact),
    "vi_benefits:15": composeBenefitNone(intake.benefit_public_identified, intake.a4_benefit_public, RISK_FIXED.benefit_none_public),

    // Section IX
    "ix_balancing:5": composeIxCompanyDecision(intake),

    // Section X
    "x_governance:0": composeXApproval(intake),
    "x_governance:3": composeXTiming(intake),
    "x_governance:5": composeMaterialChangeDetails(intake),
  };

  // v4.5 — Appendix G replaces the Table of Authorities. It is assembled
  // directly from the factor engine's own composed blocks and provenance, so
  // (unlike the ToA) it needs no draft/iff-cited two-pass render.
  const matrixTable = buildFactorAuthorityMatrixTable(report, intake, engine);
  // Part B item 3 (2026-08-21, CEO-confirmed) — Appendices A, D, E and F's
  // {{DERIVED.*}} projections are structured facts, not narrative, so they
  // now render as tables like Appendix G does, instead of a joined "rule"
  // string that fell through to the plain-paragraph branch.
  const tables: SkeletonTables = {
    "table_of_authorities:1": matrixTable,
    "appendix_a:1": deriveProcessingAndDataInventory(intake),
    "appendix_d:1": deriveAdmtTechnicalFacts(intake),
    "appendix_e:1": deriveSubmissionSupportRecord(intake, report, assessmentDate),
    "appendix_e:2": deriveBusinessLevelOutstanding(),
    "appendix_f:1": deriveMaterialsConsideredIndex(intake),
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
    // SO-11 exact exemption: pass the same values the renderer used so
    // null-dropped sentences are exempted precisely, not heuristically.
    conformance: verifySkeletonConformance(document, SKELETON_SECTIONS, values),
    register_findings,
    factor_engine: engine,
  };
}
