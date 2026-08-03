// RC-REM-P1-C — Governance Assessment intake contract.
//
// Intake shape verified against src/pages/GovernanceAssessment.tsx
// buildIntake() (~L193). 28 keys; form code is the source of truth.
//
// Option lists are literal copies of the page's inline Radio/Pills option
// arrays (~L43–L149, L594–L667). Parity is enforced by the test — every
// option string must appear verbatim in the page source.

import type { IntakeContract } from "./types.ts";

// ── Inline lists ───────────────────────────────────────────────────────
export const GOV_SECTORS = [
  "Technology/SaaS", "Healthcare/Life Sciences", "Financial services",
  "Retail/ecommerce", "Media/advertising", "Professional services",
  "Education", "Government/public sector", "Legal services",
  "Manufacturing", "Other",
] as const;
export const GOV_SIZES = ["1-10", "11-50", "51-250", "251-1000", "1001+"] as const;
export const GOV_JURISDICTIONS = [
  "EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal",
  "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)",
  "Australia", "Singapore", "Japan", "Other",
] as const;
export const GOV_TOOLS = [
  "Microsoft 365 / Copilot", "Google Workspace / Gemini", "Salesforce + Einstein",
  "ChatGPT / OpenAI", "Claude / Anthropic", "GitHub Copilot",
  "Zoom + AI features", "Slack + AI features", "Notion + AI",
  "Grammarly", "Otter.ai / Fireflies", "HubSpot", "Adobe Creative Cloud",
] as const;
export const GOV_DATA_CATS = [
  "Contact details", "Employee records", "Customer records",
  "Health or medical data", "Financial data", "Biometric data",
  "Children's data", "Location data", "Communications content", "Other",
] as const;
export const GOV_SPECIAL_CATS = [
  "Health data", "Biometric data", "Genetic data", "Racial/ethnic origin",
  "Political opinions", "Religious beliefs", "Trade union membership",
  "Sexual orientation",
] as const;

const YES_NO = ["Yes", "No"] as const;

// GOVERNANCE UPGRADE — remediation menus (mirrored in the deliverables
// registry at _shared/ltp/governance-deliverables/elements.ts).
const REMEDIATION_PRIORITY = [
  "Critical — remediate now",
  "High — remediate this quarter",
  "Medium — remediate this year",
  "Low — monitor",
] as const;
const VALIDATION_METHOD = [
  "Documentary evidence review",
  "Control re-test by a second reviewer",
  "Internal audit sample",
  "External audit or assurance report",
  "Management sign-off against the artifact",
] as const;

// Radio option groups from steps 3–5
const PRIVACY_POLICY = [
  "Yes, current (reviewed in last 12 months)",
  "Yes, but outdated",
  "No",
] as const;
const PRIVACY_NOTICE_COVERAGE = [
  "Yes — notice covers all current activities, transfers, retention, and rights",
  "Partially — some activities or tools not yet reflected",
  "No — notice not updated for current tools",
  "Unsure",
] as const;
const DPO_STATUS = ["Yes, formal DPO", "Yes, informal privacy lead", "No"] as const;
const DPIA_STATUS = [
  "Yes, multiple DPIAs completed", "Yes, one DPIA completed",
  "No, none conducted", "Unsure",
] as const;
const DPIA_AI_COVERAGE = [
  "Yes — all AI/high-risk tools assessed", "Some covered",
  "No — not for AI tools", "Unsure",
] as const;
const INCIDENT_RESPONSE = [
  "Yes, tested in last 12 months", "Yes, but not tested",
  "Documented but informal", "No",
] as const;
const TRAINING_STATUS = [
  "Yes, formal onboarding + annual refresh", "Yes, onboarding only",
  "Ad hoc only", "No formal training",
] as const;
const TRAINING_AI_COVERAGE = [
  "Yes — explicitly covers AI tools", "Generally covers data handling",
  "No — not AI-specific", "Unsure",
] as const;
const TOOL_INSTRUCTION = [
  "Yes, written policy with specific prohibitions",
  "Verbal guidance only", "No instruction provided",
] as const;
const DPA_STATUS = [
  "Yes, all vendors", "Most vendors", "Some vendors", "No",
] as const;
const DPA_ART28 = ["Yes — verified", "Partially", "Not verified", "Unsure"] as const;
const TRANSFER_STATUS = [
  "Yes, US-based tools", "Yes, other non-adequate countries",
  "All tools store data in EU/UK", "Unsure",
] as const;
// Union of the three branch-specific transfer_mechanism option lists
// (isUk&!isEu / isEu&!isUk / mixed) as computed in
// GovernanceAssessment.tsx L146–L149.
const TRANSFER_MECHANISM = [
  "UK IDTA", "UK Addendum to EU SCCs", "UK adequacy regulations",
  "EU Standard Contractual Clauses (SCCs)", "Binding Corporate Rules",
  "Adequacy decision",
  "UK IDTA / Addendum", "EU SCCs", "Adequacy decision/regulations",
  "None",
] as const;
const TECHNICAL_CONTROLS = [
  "Yes — DLP/content filtering actively enforced",
  "Partial — some tools or categories",
  "No — policy and training only", "Unsure",
] as const;
const TECHNICAL_CONTROLS_LIST = [
  "DLP rules", "Content filtering", "Endpoint upload restrictions",
  "Prompt-injection detection", "Approval workflow",
] as const;
const DSR_CAPABILITY = [
  "Yes — documented and tested across all vendors",
  "Documented but not tested", "Ad hoc / not documented",
  "No process in place", "Unsure",
] as const;
const DSR_RIGHTS_TESTED = ["Access", "Erasure", "Portability", "Rectification"] as const;
const INVENTORY_AUDIT = [
  "Yes — audited + formal approval process",
  "Inventory exists, no formal audit/approval",
  "No formal inventory", "Unsure",
] as const;
// ITEM 313 — Art. 24(1) second sentence ("Those measures shall be reviewed and
// updated where necessary") is unanswerable without a cadence and a date.
const REVIEW_CADENCE = [
  "Annually or more often",
  "Every 1–2 years",
  "Less often than every 2 years",
  "On material change only",
  "No defined cadence",
  "Unsure",
] as const;


export const governanceContract: IntakeContract = {
  tool_type: "governance_assessment",
  table: "governance_assessments",
  fields: [
    { key: "organization_name", kind: "text", required: "always" },
    { key: "sector", kind: "enum", required: "always", options: GOV_SECTORS },
    { key: "org_size", kind: "enum", required: "always", options: GOV_SIZES },
    { key: "jurisdictions", kind: "multi-enum", required: "always", options: GOV_JURISDICTIONS },
    { key: "eu_uk_data", kind: "enum", required: "always", options: YES_NO },
    // `tools` is a flat string[] in the real form (GovernanceAssessment.tsx
    // ~L99), always drawn from GOV_TOOLS. The form additionally folds an
    // optional "Other: <text>" suffix (page ~L196) — that non-verbatim
    // string would be flagged by multi-enum validation, but validateIntake
    // is invoked only on AI-generated intakes (run-quality-batch) and
    // fixture cold-starts (ql3-orchestrator); real end-user submissions
    // bypass it entirely, so shape enforcement is safe here. Prior
    // "structured" classification left the shape unconstrained, which
    // allowed a nested-object intake past the AI validator and crashed the
    // .join() at run-governance-assessment L802 (RC-Gov-Crash-2026-07-15).
    { key: "tools", kind: "multi-enum", required: "optional", options: GOV_TOOLS },
    { key: "data_categories", kind: "multi-enum", required: "always", options: GOV_DATA_CATS },
    { key: "special_category", kind: "enum", required: "always", options: YES_NO },
    { key: "special_categories_list", kind: "multi-enum", required: "optional", options: GOV_SPECIAL_CATS },
    { key: "privacy_policy", kind: "enum", required: "always", options: PRIVACY_POLICY },
    { key: "privacy_notice_coverage", kind: "enum", required: "conditional",
      requiredWhen: 'privacy_policy starts with "Yes"',
      hiddenValue: "n/a", options: [...PRIVACY_NOTICE_COVERAGE, "n/a"] as unknown as readonly string[] },
    { key: "dpo_status", kind: "enum", required: "conditional",
      requiredWhen: 'eu_uk_data === "Yes" OR org_size ∈ {"251-1000","1001+"}',
      hiddenValue: "n/a", options: [...DPO_STATUS, "n/a"] as unknown as readonly string[] },
    { key: "dpia_status", kind: "enum", required: "always", options: DPIA_STATUS },
    { key: "incident_response", kind: "enum", required: "always", options: INCIDENT_RESPONSE },
    { key: "training_status", kind: "enum", required: "always", options: TRAINING_STATUS },
    { key: "tool_instruction", kind: "enum", required: "always", options: TOOL_INSTRUCTION },
    { key: "dpa_status", kind: "enum", required: "conditional",
      requiredWhen: 'eu_uk_data === "Yes"',
      hiddenValue: "n/a", options: [...DPA_STATUS, "n/a"] as unknown as readonly string[] },
    { key: "transfer_status", kind: "enum", required: "conditional",
      requiredWhen: 'eu_uk_data === "Yes"',
      hiddenValue: "n/a", options: [...TRANSFER_STATUS, "n/a"] as unknown as readonly string[] },
    { key: "technical_controls", kind: "enum", required: "always", options: TECHNICAL_CONTROLS },
    { key: "technical_controls_list", kind: "multi-enum", required: "conditional",
      requiredWhen: 'technical_controls === "Yes — DLP/content filtering actively enforced" OR starts with "Partial"',
      options: TECHNICAL_CONTROLS_LIST },
    { key: "dsr_capability", kind: "enum", required: "always", options: DSR_CAPABILITY },
    { key: "dsr_rights_tested", kind: "multi-enum", required: "conditional",
      requiredWhen: 'dsr_capability === "Yes — documented and tested across all vendors"',
      options: DSR_RIGHTS_TESTED },
    { key: "inventory_audit", kind: "enum", required: "always", options: INVENTORY_AUDIT },
    { key: "dpia_ai_coverage", kind: "enum", required: "conditional",
      requiredWhen: 'dpia_status starts with "Yes"',
      hiddenValue: "n/a", options: [...DPIA_AI_COVERAGE, "n/a"] as unknown as readonly string[] },
    { key: "training_ai_coverage", kind: "enum", required: "conditional",
      requiredWhen: 'training_status starts with "Yes"',
      hiddenValue: "n/a", options: [...TRAINING_AI_COVERAGE, "n/a"] as unknown as readonly string[] },
    { key: "dpa_art28_verified", kind: "enum", required: "conditional",
      requiredWhen: 'dpa_status ∈ {"Yes, all vendors","Most vendors"}',
      hiddenValue: "n/a", options: [...DPA_ART28, "n/a"] as unknown as readonly string[] },
    { key: "transfer_mechanism", kind: "enum", required: "conditional",
      requiredWhen: 'transfer_status ∈ {"Yes, US-based tools","Yes, other non-adequate countries"}',
      hiddenValue: "n/a", options: [...TRANSFER_MECHANISM, "n/a"] as unknown as readonly string[] },
    { key: "additional_context", kind: "narrative", required: "optional" },
    // ── ITEM 313 additions ────────────────────────────────────────────
    // Op. 5 (Art. 24(1) second sentence) inputs.
    { key: "measures_review_cadence", kind: "enum", required: "optional", options: REVIEW_CADENCE },
    { key: "measures_last_review_date", kind: "text", required: "optional" },
    // Op. 1 (Art. 24(1) named risk factors). Deliberately NOT duplicated from
    // sector/org_size/data_categories: Article 24(1) names nature, scope,
    // context and purposes as the calibration factors, and the existing fields
    // answer none of them in their own terms.
    { key: "processing_nature", kind: "narrative", required: "optional" },
    { key: "processing_scope", kind: "narrative", required: "optional" },
    { key: "processing_context", kind: "narrative", required: "optional" },
    { key: "processing_purposes", kind: "narrative", required: "optional" },
    // ── GOVERNANCE UPGRADE additions ──────────────────────────────────
    // Remediation defaults. Optional by design: a blank field produces a
    // record_insufficient remediation record, never an invented plan.
    { key: "remediation_default_owner", kind: "text", required: "optional" },
    { key: "remediation_default_target_date", kind: "text", required: "optional" },
    { key: "remediation_default_priority", kind: "enum", required: "optional", options: REMEDIATION_PRIORITY },
    { key: "remediation_default_validation_method", kind: "enum", required: "optional", options: VALIDATION_METHOD },
  ],
};


export const GOVERNANCE_INLINE_LISTS = {
  GOV_SECTORS, GOV_SIZES, GOV_JURISDICTIONS, GOV_TOOLS, GOV_DATA_CATS,
  GOV_SPECIAL_CATS, PRIVACY_POLICY, PRIVACY_NOTICE_COVERAGE, DPO_STATUS,
  DPIA_STATUS, DPIA_AI_COVERAGE, INCIDENT_RESPONSE, TRAINING_STATUS,
  TRAINING_AI_COVERAGE, TOOL_INSTRUCTION, DPA_STATUS, DPA_ART28,
  TRANSFER_STATUS, TRANSFER_MECHANISM, TECHNICAL_CONTROLS,
  TECHNICAL_CONTROLS_LIST, DSR_CAPABILITY, DSR_RIGHTS_TESTED, INVENTORY_AUDIT, REVIEW_CADENCE,
  REMEDIATION_PRIORITY, VALIDATION_METHOD,
};
