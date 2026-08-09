// ─────────────────────────────────────────────────────────────────────────────
// ITEM 414 — IR PLAYBOOK PROSE PLAN ENCODE (P9, LEG A).
//
// PLACEMENT. This module lives in `generate-ir-playbook/_local/prose/` and not
// in `_shared/prose/plans/`. The post-402-C-3 rule is: a module whose closure
// is reached by exactly one function's entry point is colocated in that
// function's `_local`, so no other function pays its bytes on upload. The only
// consumers of this spine are `generate-ir-playbook/index.ts` and this
// function's own `_local/ltp/ir-prose-gold.ts` / `ir-finalize.ts`. (Contrast
// `_shared/prose/plans/lia.spine.ts`, which stays shared because
// `generate-report-pdf` also imports it.) Every other function's upload size is
// therefore unchanged by item 414.
//
// SOURCE OF TRUTH: `prose_document_plans` row for product `ir-playbook`,
// version `prose-plans-2026-08-09-item414`, approved = true. That row is the
// approval act (panel-delegated per CEO delegation 2026-08-06) and is NEVER
// written by runtime code. This module is a FAITHFUL ENCODE of it;
// `tests/edge/item414/plan-fidelity.test.ts` asserts the encode against the
// row's JSON, so drift in either direction breaks the build.
//
// ─────────────────────────────────────────────────────────────────────────────
// TWO ARTIFACTS, TWO REGISTERS.
//
//   (i)  STANDING PLAYBOOK  — durable instructional reference prose. It stands
//        until the organisation changes it. It asserts, it may be pre-filled
//        from the record, and where the record is silent it says so once in a
//        ledger and once at the section, each time naming what would fill it.
//
//   (ii) INCIDENT WORKSHEET — operational, fill-in, incident-time. Instruction
//        lines only. It never asserts, never cites, never analyses, and never
//        ships a cell with content in it: a specimen entry in a live incident
//        invites a responder to leave the specimen in place.
//
// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE RENDER IS FACT-EXEMPT — HARD RULE.
//
// The two walked renders are an ARCHITECTURE AND REGISTER reference ONLY. No
// fact, name, figure, entity or scenario from either may ever reach a customer
// document or be seeded into a fixture as record truth. `REFERENCE_RENDER_TOKENS`
// exists so `tests/edge/item414/register-battery.test.ts` can prove that no IR
// builder literal carries a token from a walked render.
//
// AUTHORITY IS NOT TEMPLATE — HARD RULE (this product's defining discipline).
// NIST SP 800-61r3, the CISA federal incident-response playbooks and the ICO
// breach-management toolkit fix section order, table shape and column sets.
// They are drafting templates. Nothing in either artifact is asserted on their
// basis, they are never phrased as requirements, and they never enter the
// authority exhibit.
// ─────────────────────────────────────────────────────────────────────────────

export const IR_PLAN_PRODUCT = "ir-playbook";
export const IR_PLAN_VERSION = "prose-plans-2026-08-09-item414";

/** The finalize-point stamp written into `_meta.internal.ir_pipeline_stamp`. */
export const IR_PIPELINE_STAMP = "ir-pipeline@item414-2026-08-09";

/** Transcribed verbatim from the approved plan row. */
export const IR_THESIS =
  "This product ships two documents from one record, and each has its own voice. The standing playbook is a durable instruction that stands until the organisation changes it: it says what this organisation will do, who does it, and against which law, and where the organisation has not yet recorded something it names that gap once, in one ledger, and tells the reader exactly what would fill it. The incident worksheet is a blank operational form: it never asserts, never analyses and never arrives pre-filled, because a specimen entry in a live incident is worse than an empty line. Drafting templates set the shape of both documents and are named as templates; only statute, regulation and regulator guidance are ever cited as authority.";

export type IrArtifact = "standing_playbook" | "incident_worksheet";

export type IrArcStage =
  | "frame"
  | "activation"
  | "people"
  | "first_response"
  | "analysis"
  | "notification"
  | "communications"
  | "assurance"
  | "capture"
  | "decision"
  | "review"
  | "remediation";

export type IrLead = "determination" | "record";

export interface IrSectionSpec {
  readonly id: string;
  readonly title: string;
  readonly artifact: IrArtifact;
  readonly arc_stage: IrArcStage;
  readonly lead: IrLead;
  readonly source_key: string;
  readonly themes: readonly string[];
  readonly required: boolean;
}

/**
 * The 20-section registry: 16 standing-playbook sections (the 14 rendered
 * sections plus the two frame surfaces — the template note and the single
 * unrecorded ledger this item introduces) and the 4 worksheet forms.
 */
export const IR_SECTION_SPECS: readonly IrSectionSpec[] = [
  { id: "template_note", title: "How this playbook was drafted", artifact: "standing_playbook", arc_stage: "frame", lead: "record", source_key: "standing_playbook.template_note", themes: ["template_not_authority", "provenance"], required: true },
  { id: "unrecorded_ledger", title: "What this playbook still needs", artifact: "standing_playbook", arc_stage: "frame", lead: "determination", source_key: "standing_playbook.unrecorded_ledger", themes: ["one_ledger", "named_sections", "what_would_fill_it"], required: false },
  { id: "activation_criteria", title: "Activation criteria", artifact: "standing_playbook", arc_stage: "activation", lead: "record", source_key: "standing_playbook.activation_criteria", themes: ["trigger", "source_of_trigger", "activates"], required: true },
  { id: "severity_matrix", title: "Severity matrix", artifact: "standing_playbook", arc_stage: "activation", lead: "record", source_key: "standing_playbook.severity_matrix", themes: ["levels", "thresholds", "escalation"], required: true },
  { id: "response_team", title: "Response team and alternates", artifact: "standing_playbook", arc_stage: "people", lead: "record", source_key: "standing_playbook.response_team", themes: ["roles", "primary", "alternate", "single_point_of_failure"], required: true },
  { id: "key_contacts", title: "Key contacts", artifact: "standing_playbook", arc_stage: "people", lead: "record", source_key: "standing_playbook.key_contacts", themes: ["counsel", "privilege", "insurer", "forensics", "law_enforcement"], required: true },
  { id: "first_hour_checklist", title: "First-hour checklist", artifact: "standing_playbook", arc_stage: "first_response", lead: "record", source_key: "standing_playbook.first_hour_checklist", themes: ["fixed_items", "owner", "standing_confirmation"], required: true },
  { id: "first_24_hours_checklist", title: "First-24-hours checklist", artifact: "standing_playbook", arc_stage: "first_response", lead: "record", source_key: "standing_playbook.first_24_hours_checklist", themes: ["phasing", "owner", "notification_content"], required: true },
  { id: "evidence_preservation", title: "Evidence preservation", artifact: "standing_playbook", arc_stage: "first_response", lead: "record", source_key: "standing_playbook.evidence_preservation", themes: ["estate", "log_rotation", "preservation_action"], required: true },
  { id: "containment_eradication_recovery", title: "Containment, eradication and recovery", artifact: "standing_playbook", arc_stage: "analysis", lead: "determination", source_key: "standing_playbook.containment_eradication_recovery", themes: ["order_of_operations", "generic_scope", "decision_log"], required: true },
  { id: "breach_classification", title: "Breach classification framework", artifact: "standing_playbook", arc_stage: "analysis", lead: "record", source_key: "standing_playbook.breach_classification", themes: ["cia_taxonomy", "data_categories", "elevated_severity"], required: true },
  { id: "statutory_notification_determinations", title: "Statutory notification determinations", artifact: "standing_playbook", arc_stage: "notification", lead: "determination", source_key: "standing_playbook.statutory_notification_determinations", themes: ["by_reference", "no_restatement", "single_writer"], required: true },
  { id: "contractual_notification_finding", title: "Contractual notification obligations — determination", artifact: "standing_playbook", arc_stage: "notification", lead: "determination", source_key: "standing_playbook.contractual_notification_finding", themes: ["contractual_clock", "parallel_duties", "shorter_period_governs"], required: true },
  { id: "contractual_notifications", title: "Contractual notification obligations", artifact: "standing_playbook", arc_stage: "notification", lead: "record", source_key: "standing_playbook.contractual_notifications", themes: ["counterparty", "deadline", "clause_reference"], required: true },
  { id: "communications", title: "Communications and holding statements", artifact: "standing_playbook", arc_stage: "communications", lead: "determination", source_key: "standing_playbook.communications", themes: ["single_spokesperson", "holding_statement", "privilege", "no_premature_numbers"], required: true },
  { id: "testing_training", title: "Testing and training", artifact: "standing_playbook", arc_stage: "assurance", lead: "determination", source_key: "standing_playbook.testing_training", themes: ["cadence", "exercise_findings_are_remediation", "new_joiners"], required: true },
  { id: "incident_log", title: "Incident log", artifact: "incident_worksheet", arc_stage: "capture", lead: "record", source_key: "incident_worksheet.incident_log", themes: ["contemporaneous", "observation_not_conclusion", "utc"], required: true },
  { id: "decision_log", title: "Decision log", artifact: "incident_worksheet", arc_stage: "decision", lead: "record", source_key: "incident_worksheet.decision_log", themes: ["decision", "decided_by", "rationale_at_the_time"], required: true },
  { id: "after_action_review", title: "After-action review", artifact: "incident_worksheet", arc_stage: "review", lead: "record", source_key: "incident_worksheet.after_action_review", themes: ["chronology", "detection", "departures", "changes_required"], required: true },
  { id: "remediation_tracker", title: "Remediation tracker", artifact: "incident_worksheet", arc_stage: "remediation", lead: "record", source_key: "incident_worksheet.remediation_tracker", themes: ["action", "owner", "deadline", "status"], required: true },
];

export function irSectionsFor(artifact: IrArtifact): readonly IrSectionSpec[] {
  return IR_SECTION_SPECS.filter((s) => s.artifact === artifact);
}

export function irSectionTitle(id: string): string | null {
  return IR_SECTION_SPECS.find((s) => s.id === id)?.title ?? null;
}

// ── BANNED REGISTER, PER REGISTER ───────────────────────────────────────────
// `SHARED` binds both artifacts. The per-artifact lists bind only their own.

export const IR_BANNED_SHARED: readonly string[] = [
  "record_insufficient",
  "information_needed",
  "intake field:",
  "intake fields:",
  "[TO BE COMPLETED]",
  "on the record",
  "on this record",
  "on the present record",
  "TEST-STATES",
  "RESOLVED_MET",
  "RESOLVED_NOT_MET",
  "RESOLVED_CHECK_REQUIRED",
  "INDETERMINATE",
  "CANDIDATE",
  "We could not verify this item from the information provided",
  "The information provided does not resolve",
];

export const IR_BANNED_STANDING: readonly string[] = [
  "Not recorded.",
  "Not stated.",
  "Unknown.",
  "as instructed",
  "per the rulebook",
  "in accordance with NIST",
  "as NIST requires",
  "as CISA requires",
  "as the ICO toolkit requires",
];

export const IR_BANNED_WORKSHEET: readonly string[] = [
  "we determine",
  "the assessment finds",
  "Art. 33",
  "Article 33",
  "45 C.F.R.",
  "e.g.",
  "for example",
];

export function irBannedRegister(artifact: IrArtifact): readonly string[] {
  return [
    ...IR_BANNED_SHARED,
    ...(artifact === "standing_playbook" ? IR_BANNED_STANDING : IR_BANNED_WORKSHEET),
  ];
}

// ── AUTHORITY VS TEMPLATE ───────────────────────────────────────────────────

export const IR_TEMPLATE_SOURCES: readonly string[] = [
  "NIST SP 800-61r3",
  "CISA federal incident-response playbooks",
  "ICO breach-management toolkit",
];

/** Verbs that would turn a template into a requirement. Banned next to a template name. */
export const IR_TEMPLATE_AUTHORITY_RES: readonly RegExp[] = [
  /\b(?:NIST|CISA|ICO breach-management toolkit)\b[^.]{0,80}\b(?:requires?|mandates?|obliges?|prescribes?)\b/i,
  /\b(?:as|per|under|pursuant to)\s+(?:NIST SP 800-61r3|the CISA (?:federal )?(?:incident-response )?playbooks?|the ICO breach-management toolkit)\b/i,
  /\bin accordance with (?:NIST|CISA|the ICO breach-management toolkit)\b/i,
];

/**
 * HIPAA PART-164 ANCHOR DISCIPLINE. The prompt core verifies every 45 C.F.R.
 * subsection this product may emit against this set; a subsection outside it is
 * never emitted from memory (the subpart is named in words instead). Encoded
 * here so the seam battery can assert it over the assembled artifacts.
 */
export const IR_HIPAA_VERIFIED_ANCHORS: readonly string[] = [
  "160.103",
  "164.402",
  "164.404",
  "164.406",
  "164.408",
  "164.410",
  "164.412",
  "164.514",
];

export const IR_CFR_SUBSECTION_RE = /45\s*C\.?\s*F\.?\s*R\.?[^0-9]{0,12}(\d{3}\.\d{3})/g;

/** Returns every 45 C.F.R. subsection in `text` that is NOT a verified anchor. */
export function unverifiedCfrAnchors(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(IR_CFR_SUBSECTION_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(text ?? ""))) !== null) {
    if (!IR_HIPAA_VERIFIED_ANCHORS.includes(m[1])) out.push(m[1]);
  }
  return [...new Set(out)];
}

// ── FACT-EXEMPT REFERENCE RENDER ────────────────────────────────────────────

export const IR_REFERENCE_RENDER_IDS: readonly string[] = [
  "b6e26ca0-194d-4dd5-8ef7-3b3204f84f45",
  "333770f8-de66-4da1-98d8-652f6ea0e36a",
];

/**
 * Tokens carried by the walked renders. FACT-EXEMPT: none of these may appear
 * as a literal in any IR builder or fixture. Only the register and the
 * architecture of those renders were taken.
 */
export const REFERENCE_RENDER_TOKENS: readonly string[] = [
  "Meridian Health Systems",
  "Meridian Health",
];
