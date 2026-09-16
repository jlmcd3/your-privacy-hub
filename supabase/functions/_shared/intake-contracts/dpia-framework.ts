// RC-REM-P1-C — DPIA Framework intake contract.
//
// Intake shape verified against src/pages/DPIAFramework.tsx buildIntake()
// (~L283). 49 user-facing keys + `source_assessment_id` system key.
//
// Enum options are literal copies of src/pages/DPIAFramework.enums.ts. Parity
// enforced by the test.

import type { IntakeContract } from "./types.ts";

export const DPIA_DATA_CATS = [
  "Contact details", "Employee records", "Customer records", "Health or medical data",
  "Financial data", "Biometric data", "Children's data", "Location data",
  "Communications content", "Other",
] as const;

export const DPIA_TOOLS = [
  "Microsoft 365 / Copilot", "Google Workspace / Gemini", "Salesforce + Einstein",
  "ChatGPT / OpenAI", "Claude / Anthropic", "GitHub Copilot", "Zoom + AI features",
  "Slack + AI features", "Notion + AI", "Grammarly", "Otter.ai / Fireflies",
  "HubSpot", "Adobe Creative Cloud",
] as const;

export const DPIA_SAFEGUARDS = [
  "Encryption at rest", "Encryption in transit", "Access controls", "Data minimisation",
  "Pseudonymisation", "Staff training", "DPA signed with processor", "Anonymisation",
  "Contractual restrictions", "None",
] as const;

export const DPIA_JURISDICTIONS = [
  "EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal",
  "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)",
  "Australia", "Singapore", "Other",
] as const;

export const DPIA_LEGAL_BASES = [
  "Consent (Art. 6(1)(a))", "Contract (Art. 6(1)(b))", "Legal obligation (Art. 6(1)(c))",
  "Vital interests (Art. 6(1)(d))", "Public task (Art. 6(1)(e))",
  "Legitimate interest (Art. 6(1)(f))",
] as const;

export const DPIA_ART9 = [
  "Explicit consent (Art. 9(2)(a))",
  "Employment, social security & social protection law (Art. 9(2)(b))",
  "Vital interests — data subject incapable of consent (Art. 9(2)(c))",
  "Not-for-profit body's legitimate activities (Art. 9(2)(d))",
  "Data manifestly made public by the data subject (Art. 9(2)(e))",
  "Establishment, exercise or defence of legal claims (Art. 9(2)(f))",
  "Substantial public interest — Union/Member State law (Art. 9(2)(g))",
  "Preventive/occupational medicine, health or social care (Art. 9(2)(h))",
  "Public interest in public health (Art. 9(2)(i))",
  "Archiving, research or statistics — Art. 89(1) (Art. 9(2)(j))",
  // DPIA master review (2026-09-15, F08) — two honest non-affirmative answers.
  // The first is recorded automatically when biometric data is the only
  // candidate category and the company states it is NOT used to uniquely
  // identify people (Art. 9(1) purpose test); the second records that the
  // condition is still to be identified rather than forcing a wrong one.
  "Not applicable — the biometric data is not used to uniquely identify individuals",
  "Not yet established — condition still to be identified",
] as const;

export const DPIA_REASONS = [
  "Systematic, extensive evaluation / profiling with significant effects (Art. 35(3)(a))",
  "Large-scale special-category or criminal-offence data (Art. 35(3)(b))",
  "Large-scale systematic monitoring of a public area (Art. 35(3)(c))",
  "Evaluation or scoring (incl. profiling / prediction)",
  "Automated decision-making with legal or significant effect",
  "Systematic monitoring (of employees, a defined population, or a non-public space)",
  "Sensitive or highly personal data",
  "Data processed on a large scale",
  "Matching or combining datasets",
  "Data concerning vulnerable subjects",
  "Innovative use of new technology",
  "Processing prevents exercising a right / using a service",
  "Required by national law",
  "DPO or data-subject recommendation",
  "Required by a code of conduct / standard",
  "Risk management / accountability (beneficial)",
  "Existing processing — the risk has changed",
] as const;

// DOC 259A §5.1 (CEO 2026-09-11) — shown when an evaluation, scoring or
// automated-decision reason is selected. Decides whether the Art. 22 risk
// (r8) or the scoring-informs-human-decisions risk (r8b) is carried.
export const DPIA_AUTOMATED_DECISION_NATURE = [
  "Solely automated — no person with authority to change the outcome reviews the decision before it takes effect",
  "Automated processing with meaningful human review — a person with authority to change the outcome reviews each decision before it takes effect",
  "No decisions with legal or similarly significant effects are taken on the basis of this processing",
] as const;

// DOC 131 (DPIA batch, CEO-ratified 2026-09-01 per doc 130 B1 option (a)) —
// the imagery-capture typed facts. Fixed-choice enums (radio buttons in the
// UI, never free text) so the r10 risk-spec trigger and the Art. 35(3)(c)
// fact-walk branch on byte-exact values; the optional detail narrative is
// quoted verbatim as supporting context and never decides anything (the LIA
// reasonable_expectation_detail pattern). All optional (degradation law) so
// legacy rows validate; Lovable UI wiring follows.
export const DPIA_IMAGERY_CAPTURE = [
  "No imagery or video of identifiable individuals",
  "Imagery or video in which identifiable individuals are the subjects",
  "Imagery or video in which identifiable individuals appear incidentally",
] as const;
export const DPIA_IMAGERY_SPACES = [
  "Publicly accessible spaces",
  "Private or controlled premises",
  "Both",
] as const;

// DPIA master review (2026-09-15, F08) — Art. 9(1) makes biometric data
// special-category only "for the purpose of uniquely identifying a natural
// person". Asked when Biometric data is selected; decides whether the Art.
// 9(2) selector is required and how the engine classifies the item.
export const DPIA_BIOMETRIC_UNIQUE_ID = [
  "Yes — used to uniquely identify individuals",
  "No — not used to uniquely identify individuals",
  "Not sure",
] as const;
// F11 — transfer presence is an explicit state; an empty row list no longer
// asserts "no transfer" on its own.
export const DPIA_TRANSFER_PRESENCE = [
  "Yes — data leaves the EEA or the UK",
  "No — all processing stays within the EEA and the UK",
  "Not yet assessed",
] as const;
// F11 — ongoing / temporary / undecided are distinct; nothing is inferred
// from a blank end date.
export const DPIA_PROCESSING_END_STATUS = [
  "Ongoing — no planned end",
  "Temporary — ends on the date or condition below",
  "Not yet decided",
] as const;
// F09 — an alternative may be viable; the historical rows (no outcome) are
// rejected alternatives and keep that meaning.
export const DPIA_ALTERNATIVE_OUTCOMES = [
  "Rejected — it would not achieve the purpose",
  "Rejected — other reason (explained)",
  "Viable — still under consideration",
  "Adopted in part",
] as const;
// F06 — picker sentinels the country fields may carry instead of an ISO code.
export const DPIA_COUNTRY_SENTINELS = ["OTHER", "UNKNOWN"] as const;

// SPECIAL_CATEGORY_CATS — page L58; gates article_9_condition requiredness.
const SPECIAL_CATEGORY_CATS = ["Health or medical data", "Biometric data"] as const;

export { SPECIAL_CATEGORY_CATS };

export const dpiaFrameworkContract: IntakeContract = {
  tool_type: "dpia_framework",
  table: "dpia_frameworks",
  fields: [
    { key: "organization_name", kind: "text", required: "always" },
    { key: "processing_activity_name", kind: "text", required: "always" },
    { key: "description", kind: "narrative", required: "always" },
    { key: "purpose", kind: "narrative", required: "always" },
    { key: "data_categories", kind: "multi-enum", required: "always", options: DPIA_DATA_CATS },
    // DPIA master review (2026-09-15, F08) — the explanatory input behind
    // "Other", and the Art. 9(1) purpose question behind "Biometric data".
    { key: "data_categories_other", kind: "text", required: "conditional",
      requiredWhen: 'data_categories includes "Other"',
      trigger: { key: "data_categories[]", equals: ["Other"] }, hiddenValue: "" },
    { key: "biometric_unique_identification", kind: "enum", required: "conditional",
      requiredWhen: 'data_categories includes "Biometric data"',
      trigger: { key: "data_categories[]", equals: ["Biometric data"] }, hiddenValue: "",
      options: DPIA_BIOMETRIC_UNIQUE_ID },
    { key: "data_subjects", kind: "text", required: "always" },
    { key: "volume_frequency", kind: "text", required: "always" },
    // third_party_processors — Pills multi-select over TOOLS plus optional
    // "Other: <text>" append. Flat string[] (DPIAFramework.tsx L290:
    // [...processors, `Other: ${otherProcessor.trim()}`]).
    { key: "third_party_processors", kind: "string-array", required: "optional" },
    { key: "existing_safeguards", kind: "multi-enum", required: "optional", options: DPIA_SAFEGUARDS },
    // DPIA master review (2026-09-15, F10) — measures the fixed list does not name.
    { key: "safeguards_other", kind: "narrative", required: "optional" },
    { key: "jurisdictions", kind: "multi-enum", required: "always", options: DPIA_JURISDICTIONS },
    { key: "legal_basis_proposed", kind: "enum", required: "always", options: DPIA_LEGAL_BASES },
    // DPIA master review (2026-09-15, F07) — the VALUE-EQUALS trigger the
    // record-complete gate and the coach read (the doc 158 lesson): the page
    // shows and requires this selector exactly when a special-category label
    // is selected, so the gate must count it as asked then. When biometric
    // data is the only label and is not used to identify people, the page
    // records the explicit "Not applicable" answer (never a blank).
    { key: "article_9_condition", kind: "enum", required: "conditional",
      requiredWhen: 'data_categories overlaps SPECIAL_CATEGORY_CATS',
      trigger: { key: "data_categories[]", equals: [...SPECIAL_CATEGORY_CATS] },
      hiddenValue: "", options: DPIA_ART9 },
    { key: "necessity_proportionality", kind: "narrative", required: "always" },
    { key: "retention_period", kind: "text", required: "always" },

    // DOC 131 — imagery-capture typed facts (doc 130 B1 option (a)). The
    // spaces question is asked only when capture is reported (the
    // article_9_condition conditional/hiddenValue pattern), so a "No"
    // answer legitimately leaves it hidden-empty.
    { key: "imagery_capture", kind: "enum", required: "optional", options: DPIA_IMAGERY_CAPTURE },
    // DOC 160 (2026-09-03) — VALUE-EQUALS trigger (the doc 158 lesson): a
    // conditional leaf without a machine trigger is never counted as asked,
    // so the coach and the record-complete gate ignored an open spaces
    // answer. Asked exactly when capture is reported.
    { key: "imagery_capture_spaces", kind: "enum", required: "conditional",
      requiredWhen: 'imagery_capture is answered and is not the "No imagery" value',
      trigger: { key: "imagery_capture", equals: [DPIA_IMAGERY_CAPTURE[1], DPIA_IMAGERY_CAPTURE[2]] },
      hiddenValue: "", options: DPIA_IMAGERY_SPACES },
    { key: "imagery_capture_detail", kind: "narrative", required: "optional" },

    // EDPB §0 — carried now, consumed by edge rebuild
    { key: "controller_contact", kind: "text", required: "optional" },
    { key: "dpo_info", kind: "text", required: "optional" },
    { key: "processor_obligations", kind: "narrative", required: "optional" },
    { key: "processing_version", kind: "text", required: "optional" },
    { key: "estimated_launch_date", kind: "date", required: "optional" },
    // DPIA master review (2026-09-15, F11) — ongoing / temporary / undecided
    // is stated, never inferred from a blank end date.
    { key: "processing_end_status", kind: "enum", required: "optional", options: DPIA_PROCESSING_END_STATUS },
    { key: "estimated_end_date", kind: "date", required: "optional" },
    { key: "dpia_team", kind: "narrative", required: "optional" },
    // DPIA UPGRADE ITEM 2 — EDPB template v1.0 (adopted 10 March 2026) § 0.5
    // ¶6 and ¶10. ALL OPTIONAL so legacy dpia_frameworks rows continue to
    // validate; they ride intake_data (jsonb), so no column and no migration.
    { key: "dpia_prepared_by", kind: "narrative", required: "optional" },
    { key: "dpia_approved_by_name", kind: "text", required: "optional" },
    { key: "dpia_approved_by_title", kind: "text", required: "optional" },
    { key: "dpia_approval_date", kind: "date", required: "optional" },
    { key: "dpia_signoff_basis", kind: "narrative", required: "optional" },
    { key: "reference_materials", kind: "narrative", required: "optional" },
    { key: "reasons_to_conduct", kind: "multi-enum", required: "optional", options: DPIA_REASONS },
    // DOC 259A §5.1 — asked only where an evaluation / scoring / automated-decision
    // reason is selected (skip-logic; an untriggered field is never an "asked" key
    // for the record-complete gate).
    { key: "automated_decision_nature", kind: "enum", required: "conditional", options: DPIA_AUTOMATED_DECISION_NATURE,
      requiredWhen: "reasons_to_conduct includes an evaluation, scoring or automated-decision reason",
      trigger: { key: "reasons_to_conduct[]", equals: [DPIA_REASONS[0], DPIA_REASONS[3], DPIA_REASONS[4]] } },
    { key: "dpia_scope_note", kind: "narrative", required: "optional" },
    { key: "publication_intent", kind: "text", required: "optional" },

    // EDPB §§1/2/5
    { key: "secondary_uses", kind: "narrative", required: "optional" },
    { key: "nature_scope_context", kind: "narrative", required: "optional" },
    { key: "functional_description", kind: "narrative", required: "optional" },
    { key: "supporting_assets", kind: "narrative", required: "optional" },
    { key: "codes_of_conduct", kind: "narrative", required: "optional" },
    { key: "data_minimisation_justification", kind: "narrative", required: "optional" },
    { key: "data_quality_measures", kind: "narrative", required: "optional" },
    { key: "data_subject_rights_mechanisms", kind: "narrative", required: "optional" },
    { key: "dp_by_design_measures", kind: "narrative", required: "optional" },
    { key: "dpo_advice", kind: "narrative", required: "optional" },
    { key: "data_subjects_views_sought", kind: "text", required: "optional" },
    { key: "data_subjects_views", kind: "narrative", required: "optional" },

    // ITEM 310 — Chapter 6 (E)(4). The least-intrusive-means test cannot be
    // PERFORMED without the alternatives the controller actually considered
    // and rejected. Array of { processing_operation, alternative,
    // rejection_reason } records (DPIAFramework.tsx repeater).
    // PROMPT 8H item 1(a) — inner record shape is pinned; run #182 drifted to
    // {alternative, reason_rejected} with no processing_operation.
    { key: "alternatives_considered", kind: "structured", required: "optional",
      itemKeys: [
        { key: "processing_operation", kind: "text" },
        { key: "alternative", kind: "text" },
        { key: "rejection_reason", kind: "narrative" },
        // DPIA master review (2026-09-15, F09) — optional; absent means the
        // alternative was rejected (the historical meaning of a row).
        { key: "outcome", kind: "text", note: "one of DPIA_ALTERNATIVE_OUTCOMES; absent = rejected" },
      ],
      shapeNote: "NEVER emit reason_rejected; the key is rejection_reason." },

    // INTAKE-4d — CEO-approved addition. Residual risk left after the measures
    // recorded above (Art. 35(7)(d)). Optional so legacy rows keep validating.
    { key: "residual_risks", kind: "narrative", required: "optional" },


    // Jurisdiction resolver inputs
    // DPIA master review (2026-09-15, F06) — an ISO-2 code as stored by the
    // picker ("GB" for the UK; the engine canonicalises GB/GBR/UK), or one
    // of DPIA_COUNTRY_SENTINELS when the country is not listed or not known.
    { key: "controller_country", kind: "text", required: "optional" },
    { key: "controller_country_other", kind: "text", required: "conditional",
      requiredWhen: 'controller_country === "OTHER"',
      trigger: { key: "controller_country", equals: ["OTHER"] }, hiddenValue: "" },
    // ITEM 380 r5b — real skip logic: DPIAFramework.tsx L911 renders this
    // select only when `controllerCountry === "DE"`. F04: the page now emits
    // "" when the Land is hidden, so a stale Land never travels.
    { key: "controller_land", kind: "text", required: "conditional",
      requiredWhen: "controller_country === \"DE\"",
      trigger: { key: "controller_country", equals: ["DE"] }, hiddenValue: "" },

    // F06 — controller_sector is the REGULATOR-ROUTING category
    // (private / public / federal-public / telecom / postal) the resolver
    // reads; controller_industry is the industry the company is in. Legacy
    // rows that carry an industry word in controller_sector are mapped by the
    // engine to "private" routing and the word is kept as the industry.
    { key: "controller_sector", kind: "text", required: "optional" },
    { key: "controller_industry", kind: "text", required: "optional" },
    { key: "central_administration_country", kind: "text", required: "optional" },
    // ITEM 380 r5c — emptyIsAnswer. DPIAFramework.tsx:936-941 presents this
    // select unconditionally; its empty option carries emptyLabel
    // "No — decisions are made elsewhere", so blank is a substantive answer.
    { key: "eu_decision_establishment_country", kind: "text", required: "optional", emptyIsAnswer: true },
    // DPIA master review (2026-09-15, F11) — the presence of transfers is an
    // explicit answer (Yes / No / Not yet assessed). Optional so legacy rows
    // validate; where it is absent, zero rows keep their historical meaning.
    { key: "transfer_presence", kind: "enum", required: "optional", options: DPIA_TRANSFER_PRESENCE },
    // ITEM 380 r5c — emptyIsAnswer. DPIAFramework.tsx:752-756 presents the
    // transfer-flow repeater unconditionally; zero rows states that
    // "no cross-border transfer is on the record" (read with transfer_presence).
    //
    // F05 — ONE schema. These snake_case keys are canonical; the page emits
    // them. The engine's reader (supabase/functions/_shared/dpia-transfer-rows.ts)
    // also accepts the legacy camelCase rows the page used to emit
    // (importer / destination / originRegime / dpfCertified / ukExtensionCertified)
    // and the resolver shape, losslessly.
    { key: "transfer_flows", kind: "structured", required: "optional", emptyIsAnswer: true,
      itemKeys: [
        { key: "recipient", kind: "text" },
        { key: "destination_country", kind: "text", note: "ISO-2, e.g. \"DE\", \"US\"; \"GB\" for the UK; or OTHER / UNKNOWN" },
        { key: "origin_regime", kind: "text", note: "\"EU\" or \"UK\" — confirmed by the customer, never defaulted" },
        { key: "transfer_mechanism", kind: "text" },
        { key: "dpf_certified", kind: "text", note: "boolean — importer certified under the EU–US Data Privacy Framework" },
        { key: "uk_extension_certified", kind: "text", note: "boolean — importer certified under the UK Extension" },
        { key: "notes", kind: "text" },
      ],
      shapeNote: "Emit an EMPTY ARRAY where no cross-border flow exists." },
    { key: "retention_record_type", kind: "text", required: "optional" },

    // System key
    { key: "source_assessment_id", kind: "text", required: "optional" },
  ],
};
