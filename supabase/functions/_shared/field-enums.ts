// RC-D.6 QL3-ENUM-1 — server-side mirror of the client refine-surface enum
// registry, keyed by the `enum_ref` string that appears on frozen open_items
// with input_spec.kind === "re-select".
//
// SYNC CONTRACT (do not drift):
//   These literals are copied verbatim from the intake exports referenced by
//   src/components/refine/fieldEnums.ts. If any of those exports change, this
//   mirror MUST be updated in the same courier. The client registry lives at
//   src/components/refine/fieldEnums.ts; per-tool sources are:
//     - cppa_risk_assessment  → src/pages/CPPARiskAssessment.enums.ts
//                              + src/pages/CPPARiskAssessment.tsx (T-class)
//     - cppa_admt             → src/pages/admt/ADMTChecker.enums.ts
//     - dpia_framework        → src/pages/DPIAFramework.tsx
//     - li_assessment         → src/pages/LIAssessment.tsx
//
// This mirror is READ-ONLY for QL3 dummy-answer generation. The client
// registry remains the source of truth for the refine UI; nothing here should
// override, subset, or rewrite an option literal. If a copied option ever
// contains a banned term (per project brand voice), flag it in review — do
// not silently edit it here.
//
// D8 audit (2026-07-13): none of the mirrored option strings below contain
// banned terms (no "AI-generated"; no bare "gap" appearing in user-facing
// copy — the only "gaps"-adjacent registry entry is a Yes/No answer).

// ── cppa_risk_assessment ────────────────────────────────────────────────
const IMPACT_LIKELIHOOD_OPTS = ["Unlikely", "Possible", "Likely", "Highly likely"];
const IMPACT_SEVERITY_OPTS = ["Minimal", "Moderate", "Significant", "Severe"];
const IMPACT_BENEFITS_OUTWEIGH_OPTS = ["Yes", "No", "Uncertain"];
const IMPACT_CYBER_GAPS_OPTS = ["Yes", "No"];
const HARM_TYPES = [
  "Unauthorised access, destruction, use, modification, or disclosure",
  "Loss of availability of personal information",
  "Unlawful discrimination",
  "Impairment of consumer control over personal information",
  "Coercion or dark patterns",
  "Economic harm",
  "Physical harm",
  "Reputational harm",
  "Psychological harm",
];
// BAND-REALIGNMENT-T2C (2026-07-26): V2 statutorily-aligned bands mirror the
// intake contract at supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts.
const REVENUE_OPTS = ["Under $25M", "$25M to under $50M", "$50M to $100M", "Over $100M"];
const CONSUMER_OPTS = ["Under 100,000", "100,000 to under 250,000", "250,000 to under 1,000,000", "1,000,000 or more"];
const SPI_VOLUME_OPTS = ["Fewer than 50,000", "50,000 or more", "Unsure"];
const SHARE_REVENUE_50PCT_OPTS = ["Yes", "No", "Unsure"];
const Q5_SELL_SHARE_OPTS = ["Yes — sell only", "Yes — share for advertising only", "Both", "No"];
const Q15_SENSITIVE_PI_OPTS = ["Yes", "No", "Unsure"];
const Q18_ADMT_USE_OPTS = ["Yes", "No", "In evaluation"];
const Q20_ADMT_OPT_OUT_OPTS = ["Yes, with documented opt-out", "Planned for implementation", "No"];

// ── cppa_admt ───────────────────────────────────────────────────────────
const ADMT_VENDOR_STATUS_OPTS = ["Service provider", "Contractor", "Third party", "Unsure"];
const ADMT_VENDOR_DOCS_OPTS = ["Model card / datasheet", "Validation report", "Bias-testing report", "SOC 2 / pen test", "DPIA", "None on file"];
const ADMT_YES_NO_OPTS = ["Yes", "No"];
const ADMT_YES_NO_UNSURE_OPTS = ["Yes", "No", "Unsure"];
const ADMT_HOSTING_OPTS = ["Hosted internally", "Hosted by the vendor", "Hybrid"];
const ADMT_MODEL_TYPE_OPTS = ["Rules engine", "Statistical model", "ML classifier", "Ranking / recommender", "Generative AI", "Biometric", "Emotion recognition", "Identity verification"];
const ADMT_DECISION_EFFECT_OPTS = ["Provision", "Denial", "Ranking", "Eligibility", "Pricing", "Allocation", "Assignment", "Promotion / demotion", "Suspension / termination", "Compensation", "Credentialing", "Diagnosis / care / treatment"];
const ADMT_DECISION_CADENCE_OPTS = ["One-time", "Repeated", "Continuous", "Systematic"];
const ADMT_SOLE_FACTOR_OPTS = ["Sole factor — output alone determines the outcome", "Material factor — heavily weighted alongside others", "One of many factors"];
const ADMT_SOLELY_ADVERTISING_OPTS = ["Yes — solely advertising", "No"];

// ── dpia_framework ──────────────────────────────────────────────────────
const DPIA_DATA_CATS = ["Contact details", "Employee records", "Customer records", "Health or medical data", "Financial data", "Biometric data", "Children's data", "Location data", "Communications content", "Other"];
const DPIA_TOOLS = ["Microsoft 365 / Copilot", "Google Workspace / Gemini", "Salesforce + Einstein", "ChatGPT / OpenAI", "Claude / Anthropic", "GitHub Copilot", "Zoom + AI features", "Slack + AI features", "Notion + AI", "Grammarly", "Otter.ai / Fireflies", "HubSpot", "Adobe Creative Cloud"];
const DPIA_SAFEGUARDS = ["Encryption at rest", "Encryption in transit", "Access controls", "Data minimisation", "Pseudonymisation", "Staff training", "DPA signed with processor", "Anonymisation", "Contractual restrictions", "None"];
const DPIA_JURISDICTIONS = ["EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal", "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)", "Australia", "Singapore", "Other"];
const DPIA_LEGAL_BASES = ["Consent (Art. 6(1)(a))", "Contract (Art. 6(1)(b))", "Legal obligation (Art. 6(1)(c))", "Vital interests (Art. 6(1)(d))", "Public task (Art. 6(1)(e))", "Legitimate interest (Art. 6(1)(f))"];
const DPIA_ARTICLE_9_CONDITIONS = ["Explicit consent (Art. 9(2)(a))", "Employment, social security & social protection law (Art. 9(2)(b))", "Vital interests — data subject incapable of consent (Art. 9(2)(c))", "Not-for-profit body's legitimate activities (Art. 9(2)(d))", "Data manifestly made public by the data subject (Art. 9(2)(e))", "Establishment, exercise or defence of legal claims (Art. 9(2)(f))", "Substantial public interest — Union/Member State law (Art. 9(2)(g))", "Preventive/occupational medicine, health or social care (Art. 9(2)(h))", "Public interest in public health (Art. 9(2)(i))", "Archiving, research or statistics — Art. 89(1) (Art. 9(2)(j))"];
const DPIA_REASONS_TO_CONDUCT = [
  "Systematic, extensive evaluation / profiling with significant effects (Art. 35(3)(a))",
  "Large-scale special-category or criminal-offence data (Art. 35(3)(b))",
  "Large-scale systematic monitoring of a public area (Art. 35(3)(c))",
  "Evaluation or scoring (incl. profiling / prediction)",
  "Automated decision-making with legal or significant effect",
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
];

// ── li_assessment ───────────────────────────────────────────────────────
const LIA_DATA_CATEGORIES = [
  "Contact data", "Purchase/transaction history", "Browsing/behavioural data",
  "Location data", "Employment data", "Financial data", "Health or medical data",
  "Biometric data", "Special category data", "Communications data", "Device/technical data", "Other",
];
const LIA_RELATIONSHIPS = [
  "Existing customer", "Prospective customer", "Employee", "Former employee",
  "Website visitor (no account)", "B2B contact", "Member of the public", "Other",
];
const LIA_JURISDICTIONS = [
  "EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal",
  "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)",
  "Australia", "Singapore", "Other",
];

// ── cppa_cybersecurity ─────────────────────────────────────────────────
// RC-C3.CLOSE-1 / RC-FLIP-2 — mirror of src/pages/CPPACybersecurity.enums.ts MATURITY.
// Shared across all 18 controls (T_CLASS_FIELDS routes every
// `controls.<slug>` ask to this single enum_ref).
const CYBER_MATURITY_OPTS = [
  "Not implemented",
  "Ad hoc / informal",
  "Documented, partially implemented",
  "Implemented across organization",
  "Implemented with continuous monitoring",
];

// enum_ref → options. Keys mirror the client REGISTRY keyPaths in
// src/components/refine/fieldEnums.ts; the enum_ref emitted on frozen
// open_items is "<tool_type>:<keyPath>".
export const FIELD_ENUM_MIRROR: Record<string, readonly string[]> = {
  // cppa_risk_assessment
  "cppa_risk_assessment:impact_intake.likelihood": IMPACT_LIKELIHOOD_OPTS,
  "cppa_risk_assessment:impact_intake.severity": IMPACT_SEVERITY_OPTS,
  "cppa_risk_assessment:impact_intake.benefitsOutweigh": IMPACT_BENEFITS_OUTWEIGH_OPTS,
  "cppa_risk_assessment:impact_intake.cyberGaps": IMPACT_CYBER_GAPS_OPTS,
  "cppa_risk_assessment:impact_intake.harmTypes": HARM_TYPES,
  "cppa_risk_assessment:impact.severity_of_harm": IMPACT_SEVERITY_OPTS,
  "cppa_risk_assessment:impact.likelihood_of_harm": IMPACT_LIKELIHOOD_OPTS,
  "cppa_risk_assessment:impact.benefits_outweigh_risks": IMPACT_BENEFITS_OUTWEIGH_OPTS,
  "cppa_risk_assessment:impact.cybersecurity_gaps_identified": IMPACT_CYBER_GAPS_OPTS,
  "cppa_risk_assessment:q1_revenue": REVENUE_OPTS,
  "cppa_risk_assessment:q2_consumers": CONSUMER_OPTS,
  "cppa_risk_assessment:i3_ca_consumer_band": CONSUMER_OPTS,
  "cppa_risk_assessment:annual_consumer_volume": CONSUMER_OPTS,
  "cppa_risk_assessment:q5_sell_share": Q5_SELL_SHARE_OPTS,
  "cppa_risk_assessment:q5c_share_revenue_50pct": SHARE_REVENUE_50PCT_OPTS,
  "cppa_risk_assessment:q15_sensitive_pi": Q15_SENSITIVE_PI_OPTS,
  "cppa_risk_assessment:q15c_spi_volume": SPI_VOLUME_OPTS,
  "cppa_risk_assessment:q18_admt_use": Q18_ADMT_USE_OPTS,
  "cppa_risk_assessment:q20_admt_opt_out": Q20_ADMT_OPT_OUT_OPTS,
  "cppa_risk_assessment:triggers.q1_revenue": REVENUE_OPTS,
  "cppa_risk_assessment:triggers.q2_consumers": CONSUMER_OPTS,
  "cppa_risk_assessment:triggers.q5_sell_share": Q5_SELL_SHARE_OPTS,
  "cppa_risk_assessment:triggers.q15_sensitive_pi": Q15_SENSITIVE_PI_OPTS,
  "cppa_risk_assessment:triggers.q18_admt_use": Q18_ADMT_USE_OPTS,
  // cppa_admt
  "cppa_admt:admt_detail.vendor_status": ADMT_VENDOR_STATUS_OPTS,
  "cppa_admt:admt_detail.vendor_docs": ADMT_VENDOR_DOCS_OPTS,
  "cppa_admt:admt_detail.v_audit": ADMT_YES_NO_OPTS,
  "cppa_admt:admt_detail.v_assist": ADMT_YES_NO_OPTS,
  "cppa_admt:admt_detail.v_optout": ADMT_YES_NO_OPTS,
  "cppa_admt:admt_detail.v_appeal": ADMT_YES_NO_OPTS,
  "cppa_admt:admt_detail.v_incident": ADMT_YES_NO_OPTS,
  "cppa_admt:admt_detail.vendor_makes_available": ADMT_YES_NO_UNSURE_OPTS,
  "cppa_admt:admt_detail.hosting": ADMT_HOSTING_OPTS,
  "cppa_admt:admt_detail.model_types": ADMT_MODEL_TYPE_OPTS,
  "cppa_admt:admt_detail.decision_effects": ADMT_DECISION_EFFECT_OPTS,
  "cppa_admt:admt_detail.decision_cadence": ADMT_DECISION_CADENCE_OPTS,
  "cppa_admt:admt_detail.sole_factor": ADMT_SOLE_FACTOR_OPTS,
  "cppa_admt:admt_detail.feeds_future_decisions": ADMT_YES_NO_UNSURE_OPTS,
  "cppa_admt:admt_detail.solely_advertising": ADMT_SOLELY_ADVERTISING_OPTS,
  // dpia_framework
  "dpia_framework:data_categories": DPIA_DATA_CATS,
  "dpia_framework:jurisdictions": DPIA_JURISDICTIONS,
  "dpia_framework:legal_basis_proposed": DPIA_LEGAL_BASES,
  "dpia_framework:article_9_condition": DPIA_ARTICLE_9_CONDITIONS,
  "dpia_framework:reasons_to_conduct": DPIA_REASONS_TO_CONDUCT,
  "dpia_framework:existing_safeguards": DPIA_SAFEGUARDS,
  "dpia_framework:processors": DPIA_TOOLS,
  // li_assessment
  "li_assessment:data_categories": LIA_DATA_CATEGORIES,
  "li_assessment:relationship_type": LIA_RELATIONSHIPS,
  "li_assessment:jurisdictions": LIA_JURISDICTIONS,
  // cppa_cybersecurity — single maturity enum, shared across 18 controls.
  "cppa_cybersecurity:maturity": CYBER_MATURITY_OPTS,
};

export function resolveEnumRef(enumRef: string | null | undefined): readonly string[] | null {
  if (!enumRef || typeof enumRef !== "string") return null;
  return FIELD_ENUM_MIRROR[enumRef] ?? null;
}
