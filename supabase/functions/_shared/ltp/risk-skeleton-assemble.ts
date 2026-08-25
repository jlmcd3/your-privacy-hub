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
  buildNecessityMatrixTable,
  buildRiskAndSafeguardRegisterTable,
  type RiskFactorEngineResult,
} from "./risk-factor-engine.ts";
// SO-3 DEFECT CLASS 2 fix (2026-08-21, quality-batch 2fc40a52) — see the
// identical note in risk-factor-engine.ts. This module carried the same
// naive, non-abbreviation-aware copy of firstSentence(); replaced with the
// shared implementation already proven out for DPIA.
import { firstSentence, firstSubstantiveSentence } from "./clause-bound.ts";
// v4.6 — corpus program phase 2: Appendix I renders by pure attachment
// over the Risk CAM (the determinism law's generation-plane mechanism).
import { attachCorpusRows } from "../corpus/cam-attach.ts";
import { RISK_CORPUS_MAP } from "../corpus/maps/risk-corpus-map.ts";

export const RISK_SKELETON_ASSEMBLER_STAMP =
  "risk-skeleton-assembler@corpus-phase2-appendix-i-2026-08-22";

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

/**
 * {{DERIVED.cover_summary}} — CEO report review 2026-08-23/24: the cover
 * block flips from one prose sentence ("Prepared for: X. Processing
 * Activity: Y. …") to a label/value table. Same four facts the sentence
 * stated (entity, activity, date, version); no new fact, table
 * presentation only.
 */
export function deriveCoverTable(values: SlotValues): RenderedTable {
  const v = (k: string): string => {
    const val = values[k];
    return typeof val === "string" && val.trim() ? val : "Not reported.";
  };
  return {
    key: "",
    surface: "cover_summary",
    title: "",
    columns: ["Field", "Value"],
    // CEO report review 2026-08-24 — the header row adds nothing the row's
    // own first cell ("Prepared for", "Assessment date", ...) doesn't
    // already say.
    hideHeader: true,
    rows: [
      ["Prepared for", v("entityName")],
      ["Processing activity", v("activityName")],
      ["Assessment date", v("assessmentDate")],
      ["Assessment version", v("versionNumber")],
    ],
  };
}

/**
 * v4.7.2 — the cover's executive status panel (spine block cover:2). A
 * PROJECTION of the factor engine's own typed determinations (trigger
 * engagement, the two materiality tiers, the balancing consequence) —
 * never a new determination. CEO output review 2026-08-25: the headline
 * outcome should be visible before the prose.
 */
export function deriveExecStatusPanel(
  panel: RiskFactorEngineResult["exec_panel"],
): RenderedTable | null {
  if (!panel.assessment_required && !panel.inherent && !panel.residual) return null;
  const tier = (t: string | null): string => t ?? "Not assessed — no risks recorded.";
  const disposition = panel.disposition
    .split(" ")
    .map((w) => (w === "with" || w === "not" ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
  return {
    key: "",
    surface: "exec_status_panel",
    title: "",
    columns: ["Determination", "Result"],
    hideHeader: true,
    rows: [
      ["Assessment required", panel.assessment_required ? "Yes" : "No"],
      ["Inherent privacy risk", tier(panel.inherent)],
      ["Residual privacy risk", tier(panel.residual)],
      ["Disposition", disposition],
    ],
  };
}

/**
 * {{DERIVED.review_approval_signatures}} — CEO report review 2026-08-24: a
 * blank-signature-line table for the § 7152(a)(9) reviewers/approvers
 * already named in Section I.E. Name/Title are drawn from the record when
 * present; Signature and Date are NEVER pre-filled — this is a page a
 * human signs, not an attestation the tool performs on anyone's behalf.
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
 * {{DERIVED.agency_submission_checklist}} — CEO report review 2026-08-24: a
 * one-page extract of the § 7157(b) submission fields already on this
 * assessment's record, so the submitting executive does not have to hunt
 * through the report for them. States facts already in the record only;
 * performs no submission and adds no new intake field.
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
  const contact = contactName
    ? `${contactName}${contactTitle ? `, ${contactTitle}` : ""}`
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
  // v4.7.2 — "skeleton version" was a development artifact in customer
  // output (CEO output review); the stamp itself is unchanged.
  push("Assessment date", `${assessmentDateIso}; assessment version: ${RISK_SKELETON_VERSION}`);

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
    // v4.7.2 — "Outstanding" read as this assessment being unfinished (CEO
    // output review); these items are inherently reporting-period work.
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

/**
 * {{DERIVED.materials_considered_index}} — Appendix F index of the record
 * and the materials it names. Presentation-only fix (2026-08-21, Part B
 * item 3): now returns a single-column RenderedTable instead of a numbered
 * joined string (row order supplies the numbering); materials unchanged.
 */
export function deriveMaterialsConsideredIndex(intake: Bag): RenderedTable {
  const rowsOut: string[][] = [
    ["The Company’s CPPA risk-assessment intake record (Intake Contract v2.0), including its structured processing, disclosure, recipient, retention, necessity, benefit, risk and safeguard records."],
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
  return { key: "", surface: "admt_technical_facts", title: "", columns: ["Field", "Detail"], hideHeader: true, rows: rowsOut };
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
  // APPENDIX-G DETERMINED-OUTCOME RULE (CEO-ratified 2026-08-22): "yes, a
  // prior assessment exists" with no summary used to suppress — reading
  // identically to "no". The Company asserted the assessment exists, so the
  // factor applies and the missing summary is the outcome to state. A "No"
  // or unanswered i9 flag still suppresses as genuine N/A.
  if (!summary) {
    return "The Company indicates that a prior assessment of this processing was conducted but has not provided a summary of it.";
  }
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

function composeXApproval(intake: Bag, assessmentDateIso?: string): string {
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
  if (approvalDate) {
    bits.push(`${RISK_FIXED.x_approval_date_label} ${approvalDate}.`);
    // v4.7.2 (CEO output review) — an approval date earlier than the
    // report's own date read as a credibility defect when left bare. The
    // date is the Company's intake fact; where it precedes the report date,
    // say why that can be so instead of leaving the anomaly unexplained.
    const apv = /^\d{4}-\d{2}-\d{2}/.exec(approvalDate)?.[0];
    const asm = assessmentDateIso ? /^\d{4}-\d{2}-\d{2}/.exec(assessmentDateIso)?.[0] : undefined;
    if (apv && asm && apv < asm) {
      bits.push(
        "The approval date precedes this report's date because it records the Company's internal review of the assessment record, which occurred before this report was generated.",
      );
    }
  }
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
  // v4.7.2 (CEO output review) — a non-ADMT activity used to drop Section V
  // and Appendix F entirely, leaving unexplained IV→VI and E→G numbering
  // gaps that read as an unfinished report. The fixed numbering stays; the
  // section and appendix now carry a one-line not-applicable record instead.
  if (!isYes(intake.q18_admt_use)) {
    return {
      "v_admt:0":
        "Not applicable. The Company's structured record does not identify automated decisionmaking technology in this activity, so the ADMT analyses this section would carry are not required for this assessment. The section number is retained so the report's fixed structure reads consistently across assessments.",
      "appendix_d:0":
        "Not applicable. The activity does not involve automated decisionmaking technology, so no ADMT technical and decision record is required. The appendix letter is retained so the report's fixed structure reads consistently across assessments.",
    };
  }
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

// ── Appendix A (formerly "G") — factor / determination / authority matrix ──
//
// Spine v4.5 replaces the Table of Authorities with a customer-readable audit
// trail (Part 3.F–G of the spine docx): for each material factor, the row
// shows the customer's own intake data, the exact deterministic sentence(s)
// printed for that factor in the report body, and the verified primary
// authority. No new legal content is produced here — the Report Determination
// is read straight from the factor engine's own composed blocks
// (`engine.blocks`), the same values already printed in the body, so there is
// no way for an Appendix G row to say something the report itself does not.
// A row is suppressed (never printed as N/A) when the underlying factor did
// not compose for this fixture, matching the NO-PADDING LAW. v4.5.1
// (CEO-ratified 2026-08-22): the intake-data column is dropped — the factor
// engine's own composed text already IS the determination, so restating the
// raw intake facts beside it would be exactly the redundant-detail problem
// the redesign fixed for DPIA. The column names below simply track the
// fleet-wide "Report Determination" convention.

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
  /** engine.blocks keys whose composed text is joined for the Report Determination. */
  readonly blockKeys?: readonly string[];
  /** Overrides blockKeys for factors not sourced directly from the factor engine's block bag. */
  readonly reportDetermination?: (report: Bag, intake: Bag, engine: RiskFactorEngineResult) => string | null;
}

const FACTOR_MATRIX_ROWS: readonly FactorMatrixRowSpec[] = [
  {
    label: "Regulatory trigger and applicability",
    authority: "11 CCR § 7150(a)–(b)",
    blockKeys: ["i_purpose_scope:6"],
  },
  {
    label: "Stakeholder involvement and information providers",
    authority: "11 CCR § 7151; § 7152(a)(8)",
    blockKeys: ["i_purpose_scope:12"],
  },
  {
    label: "Processing purpose specificity",
    authority: "11 CCR § 7152(a)(1)",
    blockKeys: ["i_purpose_scope:1"],
  },
  {
    label: "Scope and comparable processing",
    authority: "11 CCR § 7156(a)",
    blockKeys: ["i_purpose_scope:3", "i_purpose_scope:7"],
  },
  {
    label: "Prior DPIA or other assessment",
    authority: "11 CCR § 7156(b)",
    reportDetermination: (_report, intake) => composePriorAssessment(intake) || null,
  },
  {
    label: "Personal-information profile",
    authority: "11 CCR § 7152(a)(2)",
    blockKeys: ["ii_processing_context:6"],
  },
  {
    label: "Necessity and minimization",
    authority: "11 CCR § 7152(a)(2)",
    // CEO report review 2026-08-23/24 — was ["iii_necessity:1",
    // "iii_necessity:4"], joining the whole "B. Analysis" paragraph with
    // the "C. Conclusion" paragraph (the row-length complaint). Re-pointed
    // to the conclusion block alone; the analysis stays in the body, where
    // it belongs.
    blockKeys: ["iii_necessity:4"],
  },
  {
    label: "Processing methods and coherence",
    authority: "11 CCR § 7152(a)(3)(A)",
    blockKeys: ["ii_processing_context:1"],
  },
  {
    label: "Sources of information",
    authority: "11 CCR § 7152(a)(3)(A)",
    blockKeys: ["ii_processing_context:9"],
  },
  {
    label: "Retention",
    authority: "11 CCR § 7152(a)(3)(B)",
    blockKeys: ["ii_processing_context:13"],
  },
  {
    label: "Consumer interaction and scale",
    authority: "11 CCR § 7152(a)(3)(C)–(D)",
    blockKeys: ["ii_processing_context:3"],
  },
  {
    label: "Transparency and disclosures",
    authority: "11 CCR § 7152(a)(3)(E); § 7152(a)(5)(C)",
    blockKeys: ["iv_consumer_transparency:2"],
  },
  {
    label: "Recipients and disclosures",
    authority: "11 CCR § 7152(a)(3)(F)",
    blockKeys: ["ii_processing_context:11"],
  },
  {
    label: "ADMT logic and limitations",
    authority: "11 CCR § 7152(a)(3)(G)(i)",
    blockKeys: ["v_admt:3"],
  },
  {
    label: "ADMT output and decision effect",
    authority: "11 CCR § 7152(a)(3)(G)(ii)",
    blockKeys: ["v_admt:5"],
  },
  {
    label: "Human review of ADMT",
    authority: "11 CCR § 7001(e); § 7150(b)(3)",
    blockKeys: ["v_admt:7"],
  },
  {
    label: "ADMT fairness and bias testing",
    authority: "11 CCR § 7152(a)(5)(B); § 7152(a)(6)(A)(iv)",
    blockKeys: ["v_admt:9"],
  },
  {
    label: "ADMT training data",
    authority: "11 CCR § 7150(b)(6); § 7153",
    blockKeys: ["v_admt:11"],
  },
  {
    label: "ADMT made available to another business",
    authority: "11 CCR § 7153(a)–(b)",
    // v_admt:13 ("H. Overall ADMT Conclusion") also carries the unconditional
    // overall-ADMT analysis, so it composes whenever ADMT applies at all —
    // gate on the actual § 7153 trigger, not just block presence, or this row
    // would print the overall conclusion for every ADMT fixture regardless of
    // whether the recipient-business branch ever fired.
    reportDetermination: (_report, intake, engine) =>
      isYes(intake.admt_made_available_to_other_business) ? blockText(engine, ["v_admt:13"]) : null,
  },
  {
    label: "Consumer benefit",
    authority: "11 CCR § 7152(a)(4)",
    blockKeys: ["vi_benefits:4"],
  },
  {
    label: "Business benefit",
    authority: "11 CCR § 7152(a)(4)",
    blockKeys: ["vi_benefits:8"],
  },
  {
    label: "Other-stakeholder benefit",
    authority: "11 CCR § 7152(a)(4)",
    blockKeys: ["vi_benefits:12"],
  },
  {
    label: "Public benefit",
    authority: "11 CCR § 7152(a)(4)",
    // Appendix-A audit (2026-08-22): "vi_benefits:16" is NOT safe to read via
    // blockKeys here — the engine's overall_benefits_conclusion (the
    // cross-stakeholder Section IX rollup) is put() at this SAME key
    // unconditionally (risk-factor-engine.ts ~1421), and put() APPENDS onto
    // an existing block rather than replacing it. So blockText() either
    // concatenated the Public-benefit analysis with the unrelated overall
    // conclusion, or — when no Public benefit was claimed at all — printed
    // ONLY the overall conclusion (e.g. "No benefit is established for any
    // stakeholder category...") mislabeled as this factor's own finding.
    // engine.factors["public_benefit_analysis"] is the same text WITHOUT the
    // collision — put() also stores each analysis under its own factorId in
    // a separate, non-concatenated bag.
    reportDetermination: (_report, _intake, engine) => {
      const t = engine.factors["public_benefit_analysis"];
      return typeof t === "string" && t.trim().length > 0 ? t : null;
    },
  },
  {
    label: "Material privacy risks",
    authority: "11 CCR § 7152(a)(5)(A)–(H)",
    blockKeys: ["vii_risks:1"],
  },
  {
    label: "Consumer expectations",
    authority: "11 CCR § 7152(a)(5)(C)",
    blockKeys: ["iv_consumer_transparency:4"],
  },
  {
    label: "Practical consumer control",
    authority: "11 CCR § 7152(a)(5)(C)",
    blockKeys: ["iv_consumer_transparency:6"],
  },
  {
    label: "Coercion and choice architecture",
    authority: "11 CCR § 7152(a)(5)(D)",
    blockKeys: ["iv_consumer_transparency:8"],
  },
  {
    label: "Safeguards",
    authority: "11 CCR § 7152(a)(6)",
    blockKeys: ["viii_safeguards:1"],
  },
  {
    label: "Residual risk",
    authority: "11 CCR § 7152(a)(5)–(6); § 7154",
    blockKeys: ["viii_safeguards:7"],
  },
  {
    label: "Benefits-risks balancing",
    authority: "11 CCR § 7152(a); § 7154",
    blockKeys: ["ix_balancing:3"],
  },
  {
    label: "Recommended processing outcome",
    authority: "11 CCR § 7152(a)(7); § 7154",
    blockKeys: ["ix_balancing:4"],
  },
  {
    label: "Approval and authority",
    authority: "11 CCR § 7152(a)(9)",
    blockKeys: ["x_governance:1"],
  },
  {
    label: "Assessment timing and material changes",
    authority: "11 CCR § 7155(a)–(b)",
    blockKeys: ["x_governance:6"],
  },
  {
    label: "Assessment retention",
    authority: "11 CCR § 7155(c)",
    reportDetermination: (_report, intake) => deriveAssessmentRetentionEnd(intake),
  },
  {
    label: "CPPA submission and certifying executive",
    authority: "11 CCR § 7157(a)–(e)",
    blockKeys: ["x_governance:9"],
  },
];

/** Appendix A (formerly "G") — {{DERIVED.factor_input_determination_authority_matrix}}. Suppresses uncomposed factors (NO-PADDING LAW); never prints N/A.
 *
 * v4.6 — `persuasiveTrail` (optional): the Factor-Bearing Law's S3 anchor
 * (doc 48 §II.2a). When Appendix I renders, the trigger factor's authority
 * cell carries the compact interpretive citation trail for the attached
 * precedent rows, appended AT ASSEMBLY so the pointer can never dangle on
 * a report whose Appendix I is suppressed. Citations only — content stays
 * in Appendix I.
 *
 * WAVE C1 (doc 62 §11's R1 amendment): every factor row also picks up any
 * `trail_impact` tag(s) the CAM carries for its factor_id — the "how" a
 * logic-bearing corpus row shaped this factor, stated in the cell itself
 * rather than left as a bare citation. R2's admission rule means at most
 * one CAM row per factor carries a tag (the curation-time aggregate
 * convention documented in risk-corpus-map.ts), so this never floods the
 * cell; the aggregate budget (doc 62 §11.4, ≤2 tags/row) is respected by
 * construction. */
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
      : blockText(engine, spec.blockKeys ?? []);
    if (!determination) continue;
    let authority = spec.authority;
    const tagged = RISK_CORPUS_MAP.rows.find((r) => r.factor_id === spec.label && r.trail_impact);
    if (tagged?.trail_impact) authority = `${authority}; ${tagged.trail_impact}`;
    if (persuasiveTrail && spec.label === "Regulatory trigger and applicability") {
      authority = `${authority}; persuasive (Appendix B): analogous enforcement — ${persuasiveTrail}`;
    }
    // CEO report review 2026-08-23/24: the Report Determination cell is
    // the ONE determination sentence for the factor, not the full body
    // analysis — bounded to its lead sentence (the fleet's own convention
    // for a compact cell; see clause-bound.ts). The full reasoning stays
    // in the body section this row cites.
    //
    // CEO report review 2026-08-24: several composed blocks open with a
    // bare structural subheading ("C. Conclusion.", "B. Material Risk
    // Pathways.", "Analysis.") — plain firstSentence() truncated at that
    // fragment, printing a bare "C." or "Analysis." in this column.
    // firstSubstantiveSentence() strips the subheading first.
    rowsOut.push([spec.label, firstSubstantiveSentence(determination), authority]);
  }
  if (rowsOut.length === 0) return null;
  return {
    key: "",
    surface: "factor_authority_matrix",
    // Left empty: the section heading already prints the full Appendix G
    // title, so a second title line on the table itself would repeat it.
    title: "",
    columns: ["Factor", "Report Determination", "Primary Authority"],
    rows: rowsOut,
  };
}

// ── Appendix B (formerly "I") — Persuasive Authority (the S5 surface) ──────

/** Appendix I lead — ratified fixed prose (advance-ratification ledger,
 * 2026-08-22 build). Composed iff ≥1 precedent row attaches. */
export const RISK_APPENDIX_I_LEAD =
  "This appendix collects enforcement decisions issued under analogous data-protection law that bear on factors assessed in this report. These decisions were issued under the EU General Data Protection Regulation, not the CCPA or its regulations; they are persuasive context only, are not binding on the California Privacy Protection Agency or on any court applying California law, and are cited because the processing or the failure they address is analogous to a factor this assessment addresses. Each entry names the factor it bears on. The operative determination for every factor remains the analysis in the body of this report.";

/** The report's fired-state tokens for CAM attachment (pure derivation
 * from surfaces the pipeline has already persisted — the determinism
 * law's typed-state input). Exported for tests. */
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
 * CAM. NO-PADDING LAW: no attached row → null table → Appendix I drops. */
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
    // Empty for the same reason as Appendix G: the section heading
    // carries the full title.
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
    "x_governance:0": composeXApproval(intake, assessmentDate),
    "x_governance:3": composeXTiming(intake),
    "x_governance:5": composeMaterialChangeDetails(intake),
  };

  // v4.7.2 (CEO output review) — Section VIII's fixed subsection lettering
  // (A, B, C, D, E) used to show an unexplained A-B-E gap when no planned
  // safeguards or gaps existed. The lettering stays fixed; the absent case
  // now states itself. Both fallbacks are mechanically true when their
  // engine block is absent: no planned rows composed ⇒ none recorded; no
  // gap rows composed ⇒ no material pathway lacks an implemented safeguard.
  composed["viii_safeguards:4"] ??=
    "C. Planned Safeguards. None recorded: the Company identifies no planned safeguards for this activity, and the analysis rests on the implemented safeguards above.";
  composed["viii_safeguards:5"] ??=
    "D. Safeguard Gaps. None identified: on the information provided, no material risk lacks a safeguard at implemented status.";

  // v4.6 — Appendix B (formerly "I", Persuasive Authority): pure CAM
  // attachment over the report's fired trigger states. Computed BEFORE
  // Appendix A (formerly "G") so the trigger row's authority cell can
  // carry the S3 citation trail exactly when the appendix renders
  // (Factor-Bearing Law; no dangling pointer).
  const persuasive = buildPersuasiveAuthority(report);
  composed["appendix_i:0"] = persuasive.table ? RISK_APPENDIX_I_LEAD : null;
  composed["appendix_i:2"] = persuasive.table ? persuasive.warning : null;

  // v4.5 — Appendix A (formerly "G") replaces the Table of Authorities. It
  // is assembled directly from the factor engine's own composed blocks and
  // provenance, so (unlike the ToA) it needs no draft/iff-cited two-pass
  // render.
  const matrixTable = buildFactorAuthorityMatrixTable(report, intake, engine, persuasive.trail);
  // Part B item 3 (2026-08-21, CEO-confirmed) — Appendices C, F, G and H's
  // {{DERIVED.*}} projections are structured facts, not narrative, so they
  // render as tables like Appendix A does, instead of a joined "rule"
  // string that fell through to the plain-paragraph branch. v4.7
  // (2026-08-23/24): the cover block and Appendices D/E (formerly "B"/"C")
  // join them — see deriveCoverTable / buildNecessityMatrixTable /
  // buildRiskAndSafeguardRegisterTable.
  const tables: SkeletonTables = {
    "cover:0": deriveCoverTable(values),
    // v4.7.2 — executive status panel (spine block cover:2).
    "cover:2": deriveExecStatusPanel(engine.exec_panel),
    // CEO report review 2026-08-24 — signature pages, ahead of Appendix A.
    "review_and_approval:1": deriveReviewApprovalTable(intake),
    "agency_submission_checklist:1": deriveAgencySubmissionChecklistTable(intake, values),
    "table_of_authorities:1": matrixTable,
    "appendix_a:1": deriveProcessingAndDataInventory(intake),
    "appendix_b:1": buildNecessityMatrixTable(intake),
    "appendix_c:1": buildRiskAndSafeguardRegisterTable(intake),
    "appendix_d:1": deriveAdmtTechnicalFacts(intake),
    "appendix_e:1": deriveSubmissionSupportRecord(intake, report, assessmentDate),
    "appendix_e:2": deriveBusinessLevelOutstanding(),
    "appendix_f:1": deriveMaterialsConsideredIndex(intake),
    // v4.6 — Appendix B (null when no precedent attaches; section drops).
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
    // SO-11 exact exemption: pass the same values the renderer used so
    // null-dropped sentences are exempted precisely, not heuristically.
    conformance: verifySkeletonConformance(document, SKELETON_SECTIONS, values),
    register_findings,
    factor_engine: engine,
  };
}
