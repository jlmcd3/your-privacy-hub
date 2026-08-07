// ITEM 401 LEG B — GOVERNANCE PERFECT FIXTURE (×1).
//
// One truly-complete governance record under the item380r5 `emptyAskedKeys`
// semantics against the live `governanceContract`
// (`_shared/intake-contracts/governance-assessment.ts`): every ASKED field is
// non-empty (untriggered skip-logic conditionals and SYSTEM_KEYS excluded),
// and every answer is SUFFICIENT rather than merely present — a named DPO with
// a reporting line, named systems and vendors each with their Art. 28 basis,
// control descriptions with owners and cadences, dated records, and retention
// periods with the thing that sets them.
//
// DEGRADED PILOT SOURCES (named, not extended):
//   * GOLDEN_BY_TOOL["governance"] — `_shared/golden/governance.ts`, four cases
//     (`gov-eu-mature-tuning`, `gov-us-multistate-tuning`,
//     `gov-five-tools-count-trap-adversarial`, `gov-perfect-record`). The last
//     is "perfect" only in the item-313 sense (it supplies the item-313 fields);
//     it leaves the enum posture answers thin and is a degraded pilot for this
//     purpose.
//   * MESSY_BY_TOOL["governance"] — `gov-messy-thin-transfer-and-dpo-record`
//     in `_shared/golden/messy-registry.ts`, a deliberate thinning of
//     `gov-perfect-record`.
// Nothing degraded is authored here; neither set is modified.
//
// FACT-EXEMPT REFERENCE RENDER (item 382/400 hard rule). This scenario is
// entirely new: no token from `REFERENCE_RENDER_TOKENS` in the item-400
// governance spine appears anywhere below, which the item-401 battery asserts
// mechanically.

import type { GoldenCase } from "./types.ts";

export const GOVERNANCE_PERFECT: GoldenCase[] = [
  {
    id: "gov-occupational-health-eu-uk-perfect",
    tool: "governance",
    set: "tuning",
    intake: {
      // ── Identity and scope ─────────────────────────────────────────────
      // Named legal entity — the assessment's subject anchor.
      organization_name: "Aldergate Occupational Health Services Ltd",
      // Verbatim GOV_SECTORS option; the sector the fitness-for-work service sits in.
      sector: "Healthcare/Life Sciences",
      // Verbatim GOV_SIZES option; 620 employees at the 2026-01-31 headcount.
      org_size: "251-1000",
      // Verbatim GOV_JURISDICTIONS options; both establishments hold the records.
      jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
      // Triggers the DPO and vendor branches; EU/UK personal data is in scope.
      eu_uk_data: "Yes",
      // Verbatim GOV_TOOLS options — the three tools with an AI feature in use.
      tools: ["Google Workspace / Gemini", "Zoom + AI features", "HubSpot"],
      // Verbatim GOV_DATA_CATS options; the four categories the service holds.
      data_categories: [
        "Contact details",
        "Employee records",
        "Health or medical data",
        "Communications content",
      ],
      // Occupational-health records are Art. 9 data by definition here.
      special_category: "Yes",
      // Verbatim GOV_SPECIAL_CATS option; only health data is held.
      special_categories_list: ["Health data"],

      // ── Notice and accountability ──────────────────────────────────────
      // Verbatim PRIVACY_POLICY option; the notice was reviewed 2026-02-09.
      privacy_policy: "Yes, current (reviewed in last 12 months)",
      // Verbatim PRIVACY_NOTICE_COVERAGE option; the review closed the tool gap.
      privacy_notice_coverage:
        "Yes — notice covers all current activities, transfers, retention, and rights",
      // Verbatim DPO_STATUS option; the named DPO and reporting line are below.
      dpo_status: "Yes, formal DPO",
      // Verbatim DPIA_STATUS option; three DPIAs are on the register.
      dpia_status: "Yes, multiple DPIAs completed",
      // Verbatim DPIA_AI_COVERAGE option; the transcription tool is assessed.
      dpia_ai_coverage: "Yes — all AI/high-risk tools assessed",
      // Verbatim INCIDENT_RESPONSE option; tabletop exercise run 2025-11-18.
      incident_response: "Yes, tested in last 12 months",
      // Verbatim TRAINING_STATUS option; induction plus annual refresh.
      training_status: "Yes, formal onboarding + annual refresh",
      // Verbatim TRAINING_AI_COVERAGE option; the 2026 module is AI-specific.
      training_ai_coverage: "Yes — explicitly covers AI tools",
      // Verbatim TOOL_INSTRUCTION option; the AI-use standard names prohibitions.
      tool_instruction: "Yes, written policy with specific prohibitions",

      // ── Vendors and transfers ──────────────────────────────────────────
      // Verbatim DPA_STATUS option; every processor is under a signed DPA.
      dpa_status: "Yes, all vendors",
      // Verbatim DPA_ART28 option; clause-by-clause verification is recorded.
      dpa_art28_verified: "Yes — verified",
      // Verbatim TRANSFER_STATUS option; two processors are US-established.
      transfer_status: "Yes, US-based tools",
      // Verbatim TRANSFER_MECHANISM option; SCCs plus the UK Addendum are used.
      transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",

      // ── Controls and rights ────────────────────────────────────────────
      // Verbatim TECHNICAL_CONTROLS option; DLP is enforced, not advisory.
      technical_controls: "Yes — DLP/content filtering actively enforced",
      // Verbatim TECHNICAL_CONTROLS_LIST options; the four controls in force.
      technical_controls_list: [
        "DLP rules",
        "Content filtering",
        "Endpoint upload restrictions",
        "Approval workflow",
      ],
      // Verbatim DSR_CAPABILITY option; the runbook was tested across vendors.
      dsr_capability: "Yes — documented and tested across all vendors",
      // Verbatim DSR_RIGHTS_TESTED options; all four rights were exercised in test.
      dsr_rights_tested: ["Access", "Erasure", "Portability", "Rectification"],
      // Verbatim INVENTORY_AUDIT option; the RoPA is audited and approved.
      inventory_audit: "Yes — audited + formal approval process",

      // ── Article 24(1) second sentence ──────────────────────────────────
      // Verbatim REVIEW_CADENCE option; the measures review is annual.
      measures_review_cadence: "Annually or more often",
      // The dated last review — the fact the cadence claim stands or falls on.
      measures_last_review_date: "2026-02-09",

      // ── Article 24(1) calibration factors (nature/scope/context/purposes) ─
      // Nature: names the systems, the vendors, and the Art. 28 basis for each.
      processing_nature:
        "Aldergate runs pre-placement and periodic fitness-for-work assessments for employer clients. Clinical records are held in Medisyne OH (Medisyne Software BV, Utrecht — processor under a signed Art. 28 DPA dated 2025-09-04), appointment scheduling and client correspondence run in HubSpot (HubSpot Inc., Cambridge MA — processor under HubSpot's Art. 28 DPA with the 2021 EU SCCs and the UK Addendum, countersigned 2025-10-16), remote consultations run in Zoom with the AI companion summary feature restricted to Aldergate's clinician accounts (Zoom Communications Inc. — processor under an Art. 28 DPA dated 2025-07-22), and internal correspondence runs in Google Workspace with Gemini enabled for administrative staff only (Google Ireland Ltd — processor under the Google Workspace Data Processing Addendum, in force from 2025-04-01). No automated system issues a fitness determination; every determination is signed by a named occupational-health physician.",
      // Scope: volumes, refresh, retention and what sets the retention period.
      processing_scope:
        "Approximately 74,000 assessment records covering employees of 310 client employers across Ireland, the Netherlands and the United Kingdom, with roughly 2,100 new assessments each month. Clinical records are retained for 40 years from the date of the last assessment, the period set by the UK Control of Substances Hazardous to Health Regulations 2002 reg. 11 health-record duty for the surveillance cohort and applied as the single clinical retention rule; scheduling and billing records are retained for 7 years from the end of the accounting period, set by the Companies Act audit-trail requirement, and are deleted by a scheduled quarterly job owned by the Head of IT.",
      // Context: the relationship, the imbalance, and where expectations come from.
      processing_context:
        "The people assessed are employees of Aldergate's client employers, not Aldergate's own customers, and attendance is a condition of their employment, so their ability to decline is limited and the imbalance is material. Clinical findings are never released to the employer: the employer receives only a fitness outcome and any recommended adjustments, and the underlying record stays with the Aldergate clinician. Expectations are set by the appointment notice issued by Aldergate at booking and by the employer's own staff privacy notice, which the contract requires the employer to keep aligned.",
      // Purposes: the specific ends, stated without a secondary-use hedge.
      processing_purposes:
        "Determining fitness for a specific role, recommending workplace adjustments under equality legislation, carrying out statutory health surveillance for employees exposed to noise, vibration and respiratory sensitisers, and reporting anonymised aggregate attendance and outcome statistics to the commissioning employer. There is no secondary research use, no profiling, and no onward disclosure to insurers.",

      // ── Remediation defaults (owner, date, priority, validation) ────────
      // Named accountable owner for adverse findings without a specific owner.
      remediation_default_owner:
        "Priya Raghunathan, Data Protection Officer, reporting directly to the Chief Executive with a standing quarterly item at the Board Audit and Risk Committee",
      // A concrete date, not a relative horizon.
      remediation_default_target_date: "2026-12-18",
      // Verbatim REMEDIATION_PRIORITY option.
      remediation_default_priority: "High — remediate this quarter",
      // Verbatim VALIDATION_METHOD option; internal audit samples the closure.
      remediation_default_validation_method: "Internal audit sample",

      // ── Free narrative ─────────────────────────────────────────────────
      // Substantive context: the live governance question this record raises.
      additional_context:
        "The Data Protection Officer holds no other role and does not own the information-security function, which sits with the Head of IT, so there is no Art. 38(6) conflict. The open governance question is the Zoom AI companion summary: it is enabled for clinician accounts, its output is written into the Medisyne consultation note, and the DPIA dated 2026-01-22 records the control as a mandatory clinician review of every generated summary before the note is signed. Aldergate has not yet evidenced that the review actually occurs on each note — the audit trail records the signature but not the edit history — and the Head of Clinical Governance is scheduled to report on that evidence gap by 2026-09-30.",
    },
    assertions: [
      { kind: "must_include", pattern: "Article 5\\(2\\)|Art\\. 5\\(2\\)", flags: "i", label: "accountability standard cited" },
      { kind: "must_include", pattern: "Article 24|Art\\. 24", flags: "i", label: "Art. 24(1) duty reached" },
      { kind: "must_include", pattern: "domain_element_findings", label: "ICO tracker element findings emitted" },
      { kind: "must_include", pattern: "remediation_plan", label: "remediation plan emitted" },
    ],
  },
];
