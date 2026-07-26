// Four dummy personas. Each tool fixture has 4 variants with identical key
// shape so `blend()` can pick each field from a random variant — producing
// varied, sector-mixed payloads that better stress the edge functions.

export type Persona = "hermey-dental" | "moonracer-capital" | "misfit-toys" | "silver-gold-logistics";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

/**
 * For each key in the union of variant keys, pick the value from a random
 * variant. Recurses into plain-object children so nested fields are also
 * randomly mixed. Arrays are treated atomically (pick the whole array).
 */
export function blend<T extends Record<string, unknown>>(variants: T[], anchorKeys: string[] = []): T {
  if (!variants.length) throw new Error("blend: no variants");
  const anchor = variants[Math.floor(Math.random() * variants.length)];
  const anchorSet = new Set(anchorKeys);
  const keys = new Set<string>();
  variants.forEach((v) => Object.keys(v).forEach((k) => keys.add(k)));
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (anchorSet.has(k) && k in anchor) {
      // Identity-defining field: always take from the anchor so the label
      // (which reads these fields) accurately reflects the report content.
      out[k] = (anchor as Record<string, unknown>)[k];
      continue;
    }
    const candidates = variants.filter((v) => k in v).map((v) => (v as Record<string, unknown>)[k]);
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (isPlainObject(pick) && candidates.every(isPlainObject)) {
      out[k] = blend(candidates as Record<string, unknown>[]);
    } else {
      out[k] = pick;
    }
  }
  return out as T;
}

/** Pick one whole variant at random (for tools whose payload contains arrays
 *  of structured rows that should stay internally consistent — e.g. RoPA
 *  activities, CPPA cyber controls). */
export function pickOne<T>(variants: T[]): T {
  return variants[Math.floor(Math.random() * variants.length)];
}

/** Short, deterministic suffix derived from a UUID for human-readable labels. */
export function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 6);
}

// ─── LIA ─────────────────────────────────────────────────────────────────────

export const LIA_VARIANTS = [
  {
    stage: "final",
    organization_name: "Hermey Dental & Health Group Ltd",
    status: "pending",
    processing_description:
      "Hermey Dental & Health Group processes patient health records to provide predictive analytics to NHS and private clinic clients.",
    relationship_type: "Existing patient (indirect — collected from clinic, not directly from patient)",
    data_categories: ["Health or medical data", "Contact details", "Device/technical data"],
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    sector: "Healthcare/Life Sciences",
    stated_purpose: "Identify patients at elevated risk so clinical teams can intervene earlier.",
    alternatives_considered:
      "Manual clinical review, aggregate anonymised analytics, explicit consent model — all impractical at NHS scale.",
    purpose_details: {
      interest_holder: "Controller and treating clinicians",
      interest_type: "Clinical / public-interest health benefit",
      purpose_text: "Predictive risk stratification for direct clinical benefit.",
    },
    necessity_details: {
      alternatives: "See alternatives_considered.",
      why_consent_not_used: "Operationally impractical at NHS scale.",
      data_minimised: "Only fields required for risk scoring ingested.",
      pseudonymisation_options: "Pseudonymisation applied during inference.",
    },
    balancing_details: {
      reasonable_expectation: "Patients expect records to be used for direct care.",
      vulnerable_subjects: ["Patients"],
      potential_harm: "Inappropriate disclosure of health data.",
      safeguards: ["Pseudonymisation", "Access restricted to treating clinicians", "Audit logging"],
      opt_out_mechanism: "Patients can opt out via the clinic.",
      special_category_data: true,
      employment_safeguards: "n/a",
      statutory_restrictions: "UK Common Law Duty of Confidentiality.",
      balancing_text: "Low risk of harm; high clinical benefit.",
    },
    preview_signal: { harness: true },
  },
  {
    stage: "final",
    organization_name: "Moonracer Capital Inc.",
    status: "pending",
    processing_description:
      "Moonracer Capital monitors customer card-not-present transactions in real time to detect and block fraudulent activity across its EU and UK retail-banking customer base.",
    relationship_type: "Existing customer (direct)",
    data_categories: ["Financial / transaction data", "Contact details", "Device/technical data", "Behavioural data"],
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    sector: "Financial Services / Banking",
    stated_purpose: "Prevent unauthorised payments and reduce fraud losses for customers.",
    alternatives_considered:
      "Static rules, manual reviewer queue, post-hoc reimbursement — all materially less effective and slower.",
    purpose_details: {
      interest_holder: "Controller and its customers (shared interest in fraud prevention)",
      interest_type: "Fraud prevention; regulatory expectation under PSD2/PSR",
      purpose_text: "Real-time scoring of card-not-present transactions to block high-risk authorisations.",
    },
    necessity_details: {
      alternatives: "Static rule-based filters miss ~40% of novel fraud patterns.",
      why_consent_not_used: "Fraud detection cannot rely on opt-in (fraudsters opt out).",
      data_minimised: "Only transaction features and stable device IDs used; no message content read.",
      pseudonymisation_options: "Customer IDs hashed in the model pipeline.",
    },
    balancing_details: {
      reasonable_expectation: "Customers expect their bank to actively prevent fraud.",
      vulnerable_subjects: ["Elderly customers exposed to scam patterns"],
      potential_harm: "False-positive declines causing customer inconvenience.",
      safeguards: ["Human review for borderline declines", "In-app appeal channel", "Quarterly bias review"],
      opt_out_mechanism: "Customers may request manual-only review (slower).",
      special_category_data: false,
      employment_safeguards: "n/a",
      statutory_restrictions: "FCA SYSC requirements; PSD2 SCA.",
      balancing_text: "High benefit to customers; controllable false-positive harm.",
    },
    preview_signal: { harness: true },
  },
  {
    stage: "final",
    organization_name: "Misfit Toys Trading Co.",
    status: "pending",
    processing_description:
      "Misfit Toys Trading Co. uses on-site behavioural signals to personalise product recommendations and outbound marketing for registered shoppers in the US, UK and EU.",
    relationship_type: "Existing customer and prospect (direct)",
    data_categories: ["Contact details", "Behavioural data", "Device/technical data", "Purchase history"],
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)", "California (CCPA/CPRA)"],
    sector: "Retail / E-commerce",
    stated_purpose: "Improve product discovery and conversion through tailored recommendations.",
    alternatives_considered: "Generic best-seller lists, opt-in only personalisation — measurably lower conversion.",
    purpose_details: {
      interest_holder: "Controller (commercial)",
      interest_type: "Direct marketing of own goods to existing customers",
      purpose_text: "Surface relevant products to logged-in shoppers; suppress irrelevant categories.",
    },
    necessity_details: {
      alternatives: "Non-personalised search degrades discovery for >70% of users.",
      why_consent_not_used: "LI relied on for first-party recommendations; consent used for third-party adtech.",
      data_minimised: "Only first-party browsing and order signals; no cross-context tracking.",
      pseudonymisation_options: "Account ID separated from analytics warehouse via tokenisation.",
    },
    balancing_details: {
      reasonable_expectation: "Shoppers expect a logged-in store to remember preferences.",
      vulnerable_subjects: [],
      potential_harm: "Filter bubbles; surfacing of sensitive product categories.",
      safeguards: ["Suppression list for sensitive categories", "Easy in-account preference controls", "Frequency capping"],
      opt_out_mechanism: "One-click opt-out in account settings and every email.",
      special_category_data: false,
      employment_safeguards: "n/a",
      statutory_restrictions: "PECR / ePrivacy for marketing emails.",
      balancing_text: "Material commercial benefit; low harm with safeguards in place.",
    },
    preview_signal: { harness: true },
  },
  {
    stage: "final",
    organization_name: "Silver & Gold Logistics Ltd",
    status: "pending",
    processing_description:
      "Silver & Gold Logistics tracks driver telemetry (location, speed, harsh-braking events) across its EU fleet to improve route safety, reduce insurance premiums and meet tachograph obligations.",
    relationship_type: "Employee",
    data_categories: ["Location data", "Device/technical data", "Employee records", "Behavioural data"],
    jurisdictions: ["EU (GDPR)"],
    sector: "Logistics / Transportation",
    stated_purpose: "Reduce road-traffic incidents and meet statutory driving-time recording duties.",
    alternatives_considered:
      "Paper logbooks, anonymous fleet aggregates, opt-in telemetry — none meet tachograph or insurance requirements.",
    purpose_details: {
      interest_holder: "Controller (employer) and the wider public (road safety)",
      interest_type: "Safety, compliance, cost control",
      purpose_text: "Monitor in-vehicle behaviour during working hours only.",
    },
    necessity_details: {
      alternatives: "Aggregate telemetry cannot satisfy tachograph audit obligations.",
      why_consent_not_used: "Imbalance of power — employee consent not freely given.",
      data_minimised: "Telemetry restricted to working hours; private use mode disables tracking.",
      pseudonymisation_options: "Driver ID only resolved by HR on incident investigation.",
    },
    balancing_details: {
      reasonable_expectation: "Professional drivers expect vehicle telemetry for safety.",
      vulnerable_subjects: ["Employees (imbalance of power)"],
      potential_harm: "Performance surveillance; chilling effect on rest breaks.",
      safeguards: ["Works-council consultation", "Private-mode toggle", "Strict purpose limitation in policy"],
      opt_out_mechanism: "No individual opt-out; aggregate-only access by default.",
      special_category_data: false,
      employment_safeguards: "Works council agreement; DPIA reviewed annually.",
      statutory_restrictions: "EU Tachograph Regulation; national labour codes.",
      balancing_text: "Significant safety and statutory benefit outweighs controlled employee impact.",
    },
    preview_signal: { harness: true },
  },
];

// ─── DPIA ────────────────────────────────────────────────────────────────────

export const DPIA_VARIANTS = [
  {
    processing_activity_name: "AI-Powered Patient Risk Stratification",
    description:
      "Automated processing of patient health records using ML models to generate 30-day readmission risk scores. Systematic, large-scale, ~50,000 patients across 12 NHS clinics.",
    purpose: "Enable clinical teams to prioritise interventions for high-risk patients.",
    data_categories: ["Health or medical data", "Contact details", "Device/technical data"],
    data_subjects: "NHS and private clinic patients — vulnerable population, ~50,000 individuals.",
    volume_frequency: "~50,000 patients, continuous ingestion.",
    retention: "Risk scores 24 months. Raw patient data not retained.",
    third_party_processors: ["Microsoft Azure (EU), Snowflake (EU)"],
    automated_decisions:
      "Automated risk scores generated without human review; clinician makes final decision (not Article 22 scope).",
    existing_safeguards: [],
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    legal_basis_proposed: "Legitimate interests (Art 6(1)(f)) + explicit consent (Art 9(2)(a)) for special category.",
    sector: "Healthcare/Life Sciences",
    source_assessment_id: null as string | null,
  },
  {
    processing_activity_name: "Real-Time Card-Not-Present Fraud Scoring",
    description:
      "ML-based scoring of every CNP card authorisation across ~3M retail-banking customers in the EU and UK; decisions to challenge or block in under 200 ms.",
    purpose: "Reduce fraud losses and meet SCA / PSD2 obligations.",
    data_categories: ["Financial / transaction data", "Device/technical data", "Behavioural data", "Contact details"],
    data_subjects: "Active retail-banking customers (~3 million).",
    volume_frequency: "~40M authorisations per month, continuous.",
    retention: "Model features 13 months; decisions 6 years (regulatory).",
    third_party_processors: ["AWS (EU)", "Featurespace (UK)"],
    automated_decisions: "Article 22 in scope — automated declines reviewable on request.",
    existing_safeguards: [],
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    legal_basis_proposed: "Legitimate interests (Art 6(1)(f)); legal obligation for SCA.",
    sector: "Financial Services / Banking",
    source_assessment_id: null as string | null,
  },
  {
    processing_activity_name: "Personalised Product Recommendation Engine",
    description:
      "Logged-in shopper behaviour processed through a recommendation model that re-ranks search results and triggers tailored marketing emails.",
    purpose: "Improve discovery and conversion for ~8M registered shoppers across US/UK/EU.",
    data_categories: ["Contact details", "Behavioural data", "Device/technical data", "Purchase history"],
    data_subjects: "Registered shoppers (~8M).",
    volume_frequency: "Continuous; ~200M events/day.",
    retention: "Behavioural events 18 months; preferences indefinitely while account is active.",
    third_party_processors: ["GCP (EU + US)", "SendGrid (US)"],
    automated_decisions: "Recommendation ranking is automated but non-Article-22 (no legal/significant effect).",
    existing_safeguards: [],
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)", "California (CCPA/CPRA)"],
    legal_basis_proposed: "Legitimate interests for first-party recs; consent for cross-context adtech.",
    sector: "Retail / E-commerce",
    source_assessment_id: null as string | null,
  },
  {
    processing_activity_name: "Driver Telemetry & Safety Analytics",
    description:
      "In-cab telematics capturing location, speed and harsh-event data from ~1,200 HGV drivers across 6 EU member states, scored to identify high-risk driving patterns.",
    purpose: "Improve road safety, reduce insurance loss ratio, meet tachograph duties.",
    data_categories: ["Location data", "Device/technical data", "Employee records", "Behavioural data"],
    data_subjects: "Employee HGV drivers (~1,200).",
    volume_frequency: "Continuous during working hours.",
    retention: "Raw telemetry 12 months; aggregated safety scores 5 years.",
    third_party_processors: ["Geotab (CA)", "Azure (EU)"],
    automated_decisions: "Safety scores reviewed by supervisor; no automated termination decisions.",
    existing_safeguards: [],
    jurisdictions: ["EU (GDPR)"],
    legal_basis_proposed: "Legitimate interests + legal obligation (tachograph).",
    sector: "Logistics / Transportation",
    source_assessment_id: null as string | null,
  },
];

// ─── Governance ──────────────────────────────────────────────────────────────

export const GOV_VARIANTS = [
  {
    sector: "Healthcare/Life Sciences",
    org_size: "51-250",
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)", "California (CCPA/CPRA)"],
    eu_uk_data: "Yes",
    tools: ["Microsoft 365 / Copilot", "ChatGPT / OpenAI", "Salesforce + Einstein"],
    data_categories: ["Health or medical data", "Employee records", "Customer records", "Financial data"],
    special_category: "Yes",
    special_categories_list: ["Health data"],
    privacy_policy: "Yes, but outdated",
    dpo_status: "Yes, informal privacy lead",
    dpia_status: "No, none conducted",
    incident_response: "Yes, but not tested",
    training_status: "Yes, onboarding only",
    tool_instruction: "Verbal guidance only",
    dpa_status: "Some vendors",
    transfer_status: "Yes, US-based tools",
    additional_context: "Interim DPO covering while we recruit a permanent hire; sub-processor register under refresh.",
    test_run: true,
  },
  {
    sector: "Financial Services / Banking",
    org_size: "251-1000",
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    eu_uk_data: "Yes",
    tools: ["Microsoft 365 / Copilot", "AWS Bedrock", "Snowflake Cortex"],
    data_categories: ["Financial data", "Customer records", "Employee records", "Behavioural data"],
    special_category: "No",
    special_categories_list: [],
    privacy_policy: "Yes, reviewed in last 12 months",
    
    dpo_status: "Yes, statutory DPO appointed",
    dpia_status: "Yes, for high-risk activities only",
    incident_response: "Yes, tested in last 12 months",
    training_status: "Yes, annual + role-specific",
    tool_instruction: "Written policy with examples",
    dpa_status: "All material vendors",
    transfer_status: "Yes, with SCCs in place",
    test_run: true,
  },
  {
    sector: "Retail / E-commerce",
    org_size: "1000+",
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)", "California (CCPA/CPRA)", "Virginia (VCDPA)"],
    eu_uk_data: "Yes",
    tools: ["Google Workspace + Gemini", "ChatGPT / OpenAI", "Salesforce + Einstein", "Klaviyo"],
    data_categories: ["Customer records", "Behavioural data", "Financial data", "Employee records"],
    special_category: "No",
    special_categories_list: [],
    privacy_policy: "Yes, reviewed in last 12 months",
    
    dpo_status: "Yes, informal privacy lead",
    dpia_status: "Yes, for new products only",
    incident_response: "Yes, but not tested",
    training_status: "Yes, annual",
    tool_instruction: "Written policy with examples",
    dpa_status: "All material vendors",
    transfer_status: "Yes, US-based tools",
    test_run: true,
  },
  {
    sector: "Logistics / Transportation",
    org_size: "51-250",
    jurisdictions: ["EU (GDPR)"],
    eu_uk_data: "Yes",
    tools: ["Microsoft 365", "Geotab", "SAP"],
    data_categories: ["Employee records", "Location data", "Customer records"],
    special_category: "No",
    special_categories_list: [],
    privacy_policy: "Yes, but outdated",
    
    dpo_status: "No, no privacy lead",
    dpia_status: "No, none conducted",
    incident_response: "No, not in place",
    training_status: "No, no training",
    tool_instruction: "Verbal guidance only",
    dpa_status: "Some vendors",
    transfer_status: "No",
    test_run: true,
  },
];

// ─── Biometric (edge-function body) ──────────────────────────────────────────

export const BIOMETRIC_VARIANTS = [
  {
    biometricTypes: ["Facial geometry / facial recognition"],
    orgType: "Employer (employee biometrics)",
    purpose:
      "Time and attendance — employee clock-in/clock-out for a manufacturing facility. Vendor: US cloud. Consent: contract clause. Retention: undocumented.",
    jurisdictions: ["United Kingdom", "Illinois, USA (BIPA)"],
    is_free_tier: false,
  },
  {
    biometricTypes: ["Fingerprint"],
    orgType: "Financial institution (customer biometrics)",
    purpose:
      "Mobile-app login fingerprint authentication for retail-banking customers. Vendor: in-region cloud. Retention: device-bound, no server template.",
    jurisdictions: ["EU/EEA", "United Kingdom"],
    is_free_tier: false,
  },
  {
    biometricTypes: ["Voice recognition"],
    orgType: "Service provider (consumer biometrics)",
    purpose:
      "Voice authentication for contact-centre self-service for online shoppers. Vendor: US SaaS. Retention: 12 months. Consent banner present.",
    jurisdictions: ["California (CCPA/CPRA)", "Texas (CUBI)"],
    is_free_tier: false,
  },
  {
    biometricTypes: ["Iris or retina scan"],
    orgType: "Employer (employee biometrics)",
    purpose:
      "High-security warehouse access control for HGV drivers and despatch staff. Vendor: on-premise. Retention: while employed + 30 days.",
    jurisdictions: ["EU/EEA"],
    is_free_tier: false,
  },
];

// ─── DPA ─────────────────────────────────────────────────────────────────────

export const DPA_VARIANTS = [
  {
    entityName: "Hermey Dental & Health Group Ltd",
    controllerName: "Hermey Dental & Health Group Ltd",
    controllerJurisdiction: "United Kingdom",
    processorName: "CloudMed Processing GmbH",
    processorJurisdiction: "Germany",
    services:
      "AI-powered patient risk stratification analytics, including data ingestion, model inference, risk score generation, and structured report return.",
    dataCategories: ["Health / medical data", "Employee / HR data"],

    retention: "Fixed period: 24 months for risk scores; raw patient data not retained.",
    hasSubProcessors: true,
    subProcessorList: "Microsoft Azure (EU), Snowflake Inc (EU).",
    auditRights: "Annual audit — third-party audit summary plus right of on-site inspection on reasonable notice",
    transferMechanism: "EU Standard Contractual Clauses (SCCs)",
  },
  {
    entityName: "Moonracer Capital Bank plc",
    controllerName: "Moonracer Capital Bank plc",
    controllerJurisdiction: "United Kingdom",
    processorName: "Featurespace Limited",
    processorJurisdiction: "United Kingdom",
    services:
      "Real-time card-not-present fraud-detection scoring service, including feature engineering, model inference and decision return.",
    dataCategories: ["Financial / payment data", "General personal data"],

    retention: "Fixed period: Model features 13 months; decisions 6 years for regulatory retention.",
    hasSubProcessors: true,
    subProcessorList: "Amazon Web Services (EU regions).",
    auditRights: "Enhanced — on-site inspection on 30 days' notice plus continuous evidence access",
    transferMechanism: "UK IDTA / UK Addendum to EU SCCs",
  },
  {
    entityName: "Misfit Toys Trading Co. International Ltd",
    controllerName: "Misfit Toys Trading Co. International Ltd",
    controllerJurisdiction: "Ireland",
    processorName: "SendGrid Inc.",
    processorJurisdiction: "United States (federal)",
    services:
      "Transactional and marketing email delivery, including list management, send orchestration, deliverability analytics and engagement event capture.",
    dataCategories: ["General personal data"],

    retention: "For the duration of the principal agreement, then delete or return",
    hasSubProcessors: true,
    subProcessorList: "Twilio Inc. (US); Google Cloud Platform (US).",
    auditRights: "Documentation review — Processor provides audit reports/certifications on request",
    transferMechanism: "EU Standard Contractual Clauses (SCCs)",
  },
  {
    entityName: "Silver & Gold Logistics Ltd",
    controllerName: "Silver & Gold Logistics Ltd",
    controllerJurisdiction: "France",
    processorName: "Geotab Inc.",
    processorJurisdiction: "Canada (federal / PIPEDA)",
    services:
      "Fleet telematics platform — in-cab device data collection, transmission, storage and reporting for HGV fleet operations.",
    dataCategories: ["Employee / HR data", "Location data"],

    retention: "As directed by the Controller's documented instructions",
    hasSubProcessors: true,
    subProcessorList: "Microsoft Azure (EU regions).",
    auditRights: "Annual audit — third-party audit summary plus right of on-site inspection on reasonable notice",
    transferMechanism: "Adequacy decision or regulations",
  },
];

// ─── IR Playbook ─────────────────────────────────────────────────────────────

export const IR_VARIANTS = [
  {
    cause:
      "Ransomware attack on EHR server. ~5,000 NHS clinic patient records potentially exfiltrated. Systems partially restored.",
    dataTypes: ["Health / medical records", "Names and contact details", "Financial / payment data"],
    affectedCount: "1,000–10,000",
    jurisdictions: ["United Kingdom", "EU/EEA", "Ireland"],
    processorInvolved: false,
    contained: "No",
    organisationType: "Healthcare provider",
  },
  {
    cause:
      "Credential-stuffing attack against retail-banking web portal. Account takeover on ~12,000 customers; small-value unauthorised transactions on ~400 accounts.",
    dataTypes: ["Financial / payment data", "Names and contact details", "Authentication credentials"],
    affectedCount: "10,000–100,000",
    jurisdictions: ["United Kingdom", "EU/EEA"],
    processorInvolved: false,
    contained: "Partially",
    organisationType: "Financial institution",
  },
  {
    cause:
      "Misconfigured cloud storage bucket exposed customer order history including names, addresses and purchase items for ~250,000 shoppers; window of 9 days.",
    dataTypes: ["Names and contact details", "Purchase history", "Behavioural data"],
    affectedCount: "100,000–1,000,000",
    jurisdictions: ["EU/EEA", "United Kingdom", "California"],
    processorInvolved: true,
    contained: "Yes",
    organisationType: "Retailer / E-commerce",
  },
  {
    cause:
      "Lost unencrypted driver tablet containing local copies of route sheets and limited driver HR data. Estimated 320 individuals affected; no remote-wipe successful.",
    dataTypes: ["Employee / HR data", "Location data", "Names and contact details"],
    affectedCount: "100–1,000",
    jurisdictions: ["EU/EEA"],
    processorInvolved: false,
    contained: "Yes",
    organisationType: "Logistics / Transport operator",
  },
];

// ─── RoPA (whole-payload variants — activities kept consistent) ──────────────

export interface RopaPayload {
  org_name: string;
  legal_entity_type: string;
  employee_band: string;
  dpo_name: string;
  dpo_email: string;
  jurisdictions: { code: string; name: string; region: string }[];
  activities: {
    activity_name: string;
    category: string;
    purpose: string;
    lawful_basis: string;
    special_category_basis: string;
    data_categories: string[];
    data_subjects: string;
    recipients: string;
    transfer_destination: string;
    transfer_mechanism: string;
    retention_period: string;
    security_measures: string;
  }[];
}

export const ROPA_VARIANTS: RopaPayload[] = [
  {
    org_name: "Hermey Dental & Health Group Ltd",
    legal_entity_type: "Private limited company (UK)",
    employee_band: "50-249",
    dpo_name: "Donna Dasher",
    dpo_email: "dpo@hermeydentalhealth.example",
    jurisdictions: [
      { code: "EU_GDPR", name: "European Union", region: "EU & UK" },
      { code: "UK_GDPR", name: "United Kingdom", region: "EU & UK" },
    ],
    activities: [
      {
        activity_name: "Patient Risk Stratification Analytics",
        category: "technology",
        purpose: "AI-powered predictive analytics identifying patients at elevated risk of readmission",
        lawful_basis: "legitimate_interests",
        special_category_basis: "Article 9(2)(a) — explicit consent for health data",
        data_categories: ["Health or medical data", "Contact identifiers"],
        data_subjects: "NHS and private clinic patients",
        recipients: "Clinic clinical teams; CloudMed Processing GmbH (processor, Germany)",
        transfer_destination: "Germany (Azure EU)",
        transfer_mechanism: "EEA — no third-country transfer",
        retention_period: "Risk scores: 24 months. Raw patient data: not retained.",
        security_measures: "AES-256 at rest, TLS 1.3 in transit. SOC 2 certified.",
      },
      {
        activity_name: "Employee HR Processing",
        category: "hr_employment",
        purpose: "Recruitment, payroll, benefits administration, statutory employment compliance",
        lawful_basis: "contract",
        special_category_basis: "Not applicable",
        data_categories: ["Employee records", "Financial data", "Contact identifiers"],
        data_subjects: "Employees and contractors",
        recipients: "HR team; ADP payroll (US); HMRC",
        transfer_destination: "United States (ADP)",
        transfer_mechanism: "EU Standard Contractual Clauses",
        retention_period: "Active employment + 6 years post-termination",
        security_measures: "RBAC, MFA, encryption at rest",
      },
    ],
  },
  {
    org_name: "Moonracer Capital Bank plc",
    legal_entity_type: "Public limited company (UK)",
    employee_band: "250-999",
    dpo_name: "Yukon Cornelius",
    dpo_email: "dpo@moonracer-capital.example",
    jurisdictions: [
      { code: "UK_GDPR", name: "United Kingdom", region: "EU & UK" },
      { code: "EU_GDPR", name: "European Union", region: "EU & UK" },
    ],
    activities: [
      {
        activity_name: "Real-Time Fraud Detection",
        category: "technology",
        purpose: "Scoring of card-not-present transactions to prevent unauthorised payments",
        lawful_basis: "legitimate_interests",
        special_category_basis: "Not applicable",
        data_categories: ["Financial data", "Device identifiers", "Behavioural data"],
        data_subjects: "Retail banking customers",
        recipients: "Fraud operations team; Featurespace Ltd (UK processor)",
        transfer_destination: "United Kingdom",
        transfer_mechanism: "No third-country transfer",
        retention_period: "Features 13 months; decisions 6 years (regulatory)",
        security_measures: "TLS 1.3, HSM-managed keys, SOC 2 Type II, ISO 27001",
      },
      {
        activity_name: "KYC and Anti-Money Laundering",
        category: "legal_compliance",
        purpose: "Identity verification, sanctions and PEP screening, transaction monitoring",
        lawful_basis: "legal_obligation",
        special_category_basis: "Not applicable",
        data_categories: ["Identity documents", "Financial data", "Contact identifiers"],
        data_subjects: "All applicants and customers",
        recipients: "Onfido (UK); ComplyAdvantage (UK); FCA on request",
        transfer_destination: "United Kingdom",
        transfer_mechanism: "No third-country transfer",
        retention_period: "5 years post-relationship (regulatory)",
        security_measures: "RBAC, MFA, encryption at rest and in transit",
      },
    ],
  },
  {
    org_name: "Misfit Toys Trading Co. International Ltd",
    legal_entity_type: "Private limited company (Ireland)",
    employee_band: "1000+",
    dpo_name: "Rudy Rangifer",
    dpo_email: "dpo@misfit-toys.example",
    jurisdictions: [
      { code: "EU_GDPR", name: "European Union", region: "EU & UK" },
      { code: "UK_GDPR", name: "United Kingdom", region: "EU & UK" },
    ],
    activities: [
      {
        activity_name: "Personalised Recommendations",
        category: "marketing",
        purpose: "Tailor on-site product ranking and outbound marketing for logged-in shoppers",
        lawful_basis: "legitimate_interests",
        special_category_basis: "Not applicable",
        data_categories: ["Behavioural data", "Purchase history", "Contact identifiers"],
        data_subjects: "Registered shoppers",
        recipients: "Marketing team; SendGrid (US, processor); GCP (US, processor)",
        transfer_destination: "United States",
        transfer_mechanism: "EU SCCs + EU-US Data Privacy Framework",
        retention_period: "Engagement events 18 months; preferences while account active",
        security_measures: "TLS 1.3, RBAC, tokenisation of account IDs",
      },
      {
        activity_name: "Order Fulfilment",
        category: "operations",
        purpose: "Process and ship customer orders",
        lawful_basis: "contract",
        special_category_basis: "Not applicable",
        data_categories: ["Contact identifiers", "Purchase history", "Financial data"],
        data_subjects: "Customers",
        recipients: "Logistics carriers; payment processors",
        transfer_destination: "Multiple (US, UK, EU)",
        transfer_mechanism: "EU SCCs",
        retention_period: "7 years (tax)",
        security_measures: "Tokenised card data, SOC 2 vendors only",
      },
    ],
  },
  {
    org_name: "Silver & Gold Logistics Ltd",
    legal_entity_type: "Société par actions simplifiée (France)",
    employee_band: "50-249",
    dpo_name: "Clarice Caribou",
    dpo_email: "dpo@silver-gold-logistics.example",
    jurisdictions: [
      { code: "EU_GDPR", name: "European Union", region: "EU & UK" },
    ],
    activities: [
      {
        activity_name: "Driver Telematics & Safety Monitoring",
        category: "operations",
        purpose: "Monitor in-vehicle driving behaviour and meet statutory tachograph duties",
        lawful_basis: "legitimate_interests",
        special_category_basis: "Not applicable",
        data_categories: ["Location data", "Behavioural data", "Employee records"],
        data_subjects: "Employee HGV drivers",
        recipients: "Operations supervisors; Geotab Inc (Canada, processor)",
        transfer_destination: "Canada",
        transfer_mechanism: "EU adequacy decision (commercial scope)",
        retention_period: "Raw telemetry 12 months; aggregated 5 years",
        security_measures: "ISO 27001 vendor, TLS, RBAC, works-council oversight",
      },
      {
        activity_name: "Customer Account Management",
        category: "operations",
        purpose: "Manage freight customer accounts and contracts",
        lawful_basis: "contract",
        special_category_basis: "Not applicable",
        data_categories: ["Business contact identifiers", "Financial data"],
        data_subjects: "Customer contacts at freight clients",
        recipients: "Sales and finance teams",
        transfer_destination: "European Union",
        transfer_mechanism: "No third-country transfer",
        retention_period: "Contract + 10 years",
        security_measures: "RBAC, MFA, encryption at rest",
      },
    ],
  },
];

// ─── US Notice universal answers ─────────────────────────────────────────────

export const US_NOTICE_VARIANTS = [
  {
    business_name: "Hermey Dental & Health Group Ltd",
    business_description: "AI-powered patient risk-stratification analytics for clinics in the UK and US.",
    contact_email: "privacy@hermeydentalhealth.io",
    data_categories: "Identifiers; Health information; Employment data; Internet activity",
    collection_purposes: "Service delivery; R&D; Marketing; Fraud prevention; Legal compliance",
    third_party_sharing: "yes",
    third_party_categories: "Cloud infrastructure; payroll (US); email marketing (US); regulators",
    sale_or_sharing: "neither",
    retention_general: "Risk scores 24 months; marketing 2 years post-engagement.",
    sensitive_data_types: "Health information; precise geolocation",
    data_sources: "Directly from individuals; Clinic EHR systems; analytics vendors",
  },
  {
    business_name: "Moonracer Capital Bank plc",
    business_description: "Retail banking and payments for consumers across the US, UK and EU.",
    contact_email: "privacy@moonracer-capital.io",
    data_categories: "Identifiers; Financial information; Internet activity; Geolocation; Commercial information",
    collection_purposes: "Service delivery; Fraud prevention; Legal compliance; Marketing of own products",
    third_party_sharing: "yes",
    third_party_categories: "Cloud infrastructure; identity verification; credit reporting; regulators",
    sale_or_sharing: "sharing_only",
    retention_general: "Transaction records 6 years (regulatory); marketing 2 years post-engagement.",
    sensitive_data_types: "Financial account information; precise geolocation",
    data_sources: "Directly from individuals; credit bureaus; identity-verification vendors",
  },
  {
    business_name: "Misfit Toys Trading Co. International Ltd",
    business_description: "Direct-to-consumer e-commerce across US, UK and EU.",
    contact_email: "privacy@misfit-toys.io",
    data_categories: "Identifiers; Commercial information; Internet activity; Geolocation; Inferences",
    collection_purposes: "Service delivery; Marketing; Personalisation; Fraud prevention",
    third_party_sharing: "yes",
    third_party_categories: "Advertising partners; email/SMS vendors; logistics carriers; payment processors",
    sale_or_sharing: "both",
    retention_general: "Engagement events 18 months; orders 7 years (tax).",
    sensitive_data_types: "Precise geolocation",
    data_sources: "Directly from individuals; advertising partners; analytics vendors",
  },
  {
    business_name: "Silver & Gold Logistics US Inc.",
    business_description: "US arm of an EU-headquartered freight and logistics group.",
    contact_email: "privacy@silver-gold-logistics.io",
    data_categories: "Identifiers; Professional information; Geolocation; Internet activity",
    collection_purposes: "Service delivery; Employment; Safety monitoring; Legal compliance",
    third_party_sharing: "yes",
    third_party_categories: "Cloud infrastructure; telematics vendor; HR/payroll; regulators",
    sale_or_sharing: "neither",
    retention_general: "Telemetry 12 months; employment records active + 6 years.",
    sensitive_data_types: "Precise geolocation",
    data_sources: "Directly from individuals; in-vehicle devices; HR systems",
  },
];

// ─── EU Notice universal answers ─────────────────────────────────────────────

export const EU_NOTICE_VARIANTS = [
  {
    controller_name: "Hermey Dental & Health Group Ltd",
    controller_address: "1 Innovation Square, London EC2A 4BX, UK",
    contact_email: "privacy@hermeydentalhealth.io",
    dpo_details: "yes",
    dpo_name: "Donna Dasher, Privacy Officer",
    dpo_email: "privacy@hermeydentalhealth.io",
    processing_purposes: ["service_delivery", "analytics", "marketing", "security", "legal_compliance"],
    data_categories: ["identifiers", "health_medical", "professional", "internet_activity"],
    lawful_basis: ["legitimate_interests", "contract", "legal_obligation", "consent"],
    third_party_recipients: ["service_providers", "analytics", "regulators"],
    transfer_outside_eea: "yes",
    transfer_safeguards: ["sccs", "uk_addendum"],
    retention_period: "Risk scores 24 months; HR records active+6yr; marketing 2yr.",
    automated_decisions: "yes",
    special_category_basis: "Article 9(2)(a) explicit consent for health data",
    supervisory_authority_eu: "Irish Data Protection Commission (DPC)",
    supervisory_authority_uk: "Information Commissioner's Office (ICO)",
  },
  {
    controller_name: "Moonracer Capital Bank plc",
    controller_address: "30 Gresham Street, London EC2V 7QP, UK",
    contact_email: "privacy@moonracer-capital.io",
    dpo_details: "yes",
    dpo_name: "Yukon Cornelius, Data Protection Officer",
    dpo_email: "dpo@moonracer-capital.io",
    processing_purposes: ["service_delivery", "fraud_prevention", "legal_compliance", "marketing"],
    data_categories: ["identifiers", "financial", "behavioural", "device_technical"],
    lawful_basis: ["contract", "legal_obligation", "legitimate_interests"],
    third_party_recipients: ["service_providers", "credit_bureaus", "regulators"],
    transfer_outside_eea: "no",
    transfer_safeguards: [],
    retention_period: "Transaction records 6 years (regulatory); marketing 2 years.",
    automated_decisions: "yes",
    special_category_basis: "n/a",
    supervisory_authority_eu: "Central Bank of Ireland (joint with DPC)",
    supervisory_authority_uk: "Information Commissioner's Office (ICO)",
  },
  {
    controller_name: "Misfit Toys Trading Co. International Ltd",
    controller_address: "Spencer Dock, North Wall Quay, Dublin 1, Ireland",
    contact_email: "privacy@misfit-toys.io",
    dpo_details: "yes",
    dpo_name: "Rudy Rangifer, Group DPO",
    dpo_email: "dpo@misfit-toys.io",
    processing_purposes: ["service_delivery", "marketing", "analytics", "personalisation"],
    data_categories: ["identifiers", "commercial", "internet_activity", "geolocation"],
    lawful_basis: ["contract", "legitimate_interests", "consent"],
    third_party_recipients: ["service_providers", "advertising_partners", "logistics"],
    transfer_outside_eea: "yes",
    transfer_safeguards: ["sccs", "dpf"],
    retention_period: "Engagement events 18 months; orders 7 years (tax).",
    automated_decisions: "no",
    special_category_basis: "n/a",
    supervisory_authority_eu: "Irish Data Protection Commission (DPC)",
    supervisory_authority_uk: "Information Commissioner's Office (ICO)",
  },
  {
    controller_name: "Silver & Gold Logistics Ltd",
    controller_address: "12 Quai de la Loire, 75019 Paris, France",
    contact_email: "privacy@silver-gold-logistics.io",
    dpo_details: "yes",
    dpo_name: "Clarice Caribou, DPO",
    dpo_email: "dpo@silver-gold-logistics.io",
    processing_purposes: ["service_delivery", "legal_compliance", "security"],
    data_categories: ["identifiers", "professional", "geolocation", "device_technical"],
    lawful_basis: ["contract", "legal_obligation", "legitimate_interests"],
    third_party_recipients: ["service_providers", "regulators"],
    transfer_outside_eea: "yes",
    transfer_safeguards: ["adequacy"],
    retention_period: "Telemetry 12 months; employment records active+6yr.",
    automated_decisions: "no",
    special_category_basis: "n/a",
    supervisory_authority_eu: "Commission nationale de l'informatique et des libertés (CNIL)",
    supervisory_authority_uk: "n/a",
  },
];

// ─── Registration ───────────────────────────────────────────────────────────

export const REG_VARIANTS = [
  {
    organization_name: "Hermey Dental & Health Group Ltd",
    organization_country: "GB",
    organization_size: "medium",
    industry: "Healthcare / Life Sciences",
    email: "privacy@hermeydentalhealth.io",
    employee_count: 180,
    annual_revenue_usd: 60_000_000,
    data_subjects_count: 250_000,
    role: "controller",
    processes_personal_data: true,
    processes_special_categories: true,
    processes_children_data: false,
    large_scale_monitoring: true,
    uses_ai_systems: true,
    ai_high_risk: true,
    ai_general_purpose_provider: false,
    cross_border_transfers: true,
    markets_served: ["GB", "DE", "FR", "IE", "NL"],
    has_eu_establishment: false,
    has_uk_establishment: true,
    acts_as_data_broker: false,
    sells_or_shares_personal_info: false,
    processes_biometrics_for_id: false,
  },
  {
    organization_name: "Moonracer Capital Bank plc",
    organization_country: "GB",
    organization_size: "large",
    industry: "Financial Services / Banking",
    email: "privacy@moonracer-capital.io",
    employee_count: 850,
    annual_revenue_usd: 320_000_000,
    data_subjects_count: 3_000_000,
    role: "controller",
    processes_personal_data: true,
    processes_special_categories: false,
    processes_children_data: false,
    large_scale_monitoring: true,
    uses_ai_systems: true,
    ai_high_risk: false,
    ai_general_purpose_provider: false,
    cross_border_transfers: false,
    markets_served: ["GB", "IE"],
    has_eu_establishment: true,
    has_uk_establishment: true,
    acts_as_data_broker: false,
    sells_or_shares_personal_info: false,
    processes_biometrics_for_id: true,
  },
  {
    organization_name: "Misfit Toys Trading Co. International Ltd",
    organization_country: "IE",
    organization_size: "large",
    industry: "Retail / E-commerce",
    email: "privacy@misfit-toys.io",
    employee_count: 2100,
    annual_revenue_usd: 950_000_000,
    data_subjects_count: 8_000_000,
    role: "controller",
    processes_personal_data: true,
    processes_special_categories: false,
    processes_children_data: false,
    large_scale_monitoring: true,
    uses_ai_systems: true,
    ai_high_risk: false,
    ai_general_purpose_provider: false,
    cross_border_transfers: true,
    markets_served: ["IE", "GB", "DE", "FR", "ES", "IT", "NL", "US"],
    has_eu_establishment: true,
    has_uk_establishment: true,
    acts_as_data_broker: false,
    sells_or_shares_personal_info: true,
    processes_biometrics_for_id: false,
  },
  {
    organization_name: "Silver & Gold Logistics Ltd",
    organization_country: "FR",
    organization_size: "medium",
    industry: "Logistics / Transportation",
    email: "privacy@silver-gold-logistics.io",
    employee_count: 220,
    annual_revenue_usd: 85_000_000,
    data_subjects_count: 5_000,
    role: "controller",
    processes_personal_data: true,
    processes_special_categories: false,
    processes_children_data: false,
    large_scale_monitoring: true,
    uses_ai_systems: false,
    ai_high_risk: false,
    ai_general_purpose_provider: false,
    cross_border_transfers: true,
    markets_served: ["FR", "DE", "ES", "IT", "BE", "NL"],
    has_eu_establishment: true,
    has_uk_establishment: false,
    acts_as_data_broker: false,
    sells_or_shares_personal_info: false,
    processes_biometrics_for_id: true,
  },
];

// ─── CPPA Risk ──────────────────────────────────────────────────────────────

// R1a rewrite: all enumerated values are verbatim members of the live option
// arrays in src/pages/CPPARiskAssessment.tsx. Coverage requirements (per
// courier R1a): q1 covers both new bands ($25M–$50M, $50M–$100M) and legacy
// straddling "$25M–$100M"; q2 covers 100,000–249,999, 250,000–1 million,
// Fewer than 100,000, Over 10 million, Unsure, plus legacy "100,000–1 million"
// straddling variant; q15c_spi_volume present-and-absent (both bands + Unsure);
// q5c_share_revenue_50pct Yes/No/absent; exceptions with and without the two
// new per-exception fields (authority_basis, retention_period).
export const CPPA_RISK_VARIANTS = [
  {
    entity_name: "Cascade Health Partners, Inc.",
    q1_revenue: "Over $100M",
    q2_consumers: "1,000,000 or more",
    q3_sector: "Healthcare/Life Sciences",
    q4_pi_categories: [
      "Health or medical information",
      "Contact identifiers (name, email, phone)",
      "Device identifiers (IP, cookies, device IDs)",
      "Internet or network activity",
      "Employment information",
    ],
    q5_sell_share: "Both",
    q5c_share_revenue_50pct: "No",
    q6_right_know: "Online form with identity verification",
    q7_right_delete: "Manual process, documented",
    q8_right_correct: "Handled via support",
    q9_opt_out: "Yes, but in footer only",
    q10_id_verification: "Informal verification",
    q11_policy_review: "12–24 months ago",
    q12_notice_at_collection: "Yes, partial coverage",
    q13_notice_content: "Some elements",
    q14_employee_notice: "No — we use our general privacy policy",
    q15_sensitive_pi: "Yes",
    q15c_spi_volume: "50,000 or more",
    q16_sensitive_limit: "No",
    q17_sensitive_basis: "Other permitted purpose",
    q18_admt_use: "Yes",
    q19_admt_description: "ML model generates per-patient risk scores used by clinicians.",
    q20_admt_opt_out: "Planned for implementation",
    i1_processing_purpose: "Per-patient clinical-risk scores at point of care.",
    i2_retention_period: "60 months from encounter close",
    i2_retention_criteria: "Statutory or regulatory retention requirement",
    i2_retention_detail: "California medical-record retention rules apply.",
    i3_ca_consumer_band: "More than 1,000,000",
    i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy", "Just-in-time notice"],
    i5_admt_logic: "Gradient-boosted ensemble; risk score 0–100 plus Low/Med/High bucket.",
    i5_admt_training_source: "De-identified historical encounters 2018–2024.",
    i5_admt_fairness_testing: "Quarterly subgroup AUC + calibration audit.",
    i5_admt_human_review: "Score advisory; attending physician decides.",
    i6_vendors: "Azure; Snowflake; Epic; Acme Analytics",
    i7_internal_contributors: "CISO; CPO; VP Clinical Informatics; GC; Product Owner",
    i7_external_consultees: "External healthcare-privacy counsel; bias auditor (annual)",
    i8_certifying_exec_name: "Sam Snowman",
    i8_certifying_exec_title: "Chief Privacy Officer",
    i9_has_existing_dpia: "No",
    i9_existing_dpia_summary: "",
    // exceptions with the two new R1a fields on some claimed entries
    exceptions_intake: {
      security_integrity: {
        claimed: true,
        scope: "Access-anomaly detection across the EHR estate.",
        safeguards: "SIEM alerts; RBAC; pseudonymised dashboards.",
        authority_basis: "Cal. Civ. Code § 1798.140(e)(2); HIPAA Security Rule 45 CFR § 164.308.",
        retention_period: "90 days for raw alert data; 24 months for confirmed-incident tickets.",
      },
      legal_compliance: {
        claimed: true,
        scope: "Retention for HIPAA and CMS reporting.",
        safeguards: "Retention schedule enforced by system controls.",
        authority_basis: "45 CFR § 164.316(b)(2); Cal. Health & Safety Code § 123145.",
        retention_period: "7 years from encounter close.",
      },
    },
  },
  {
    entity_name: "Atlas Financial Services Corporation",
    q1_revenue: "Over $100M",
    q2_consumers: "1,000,000 or more",
    q3_sector: "Financial services",
    q4_pi_categories: [
      "Financial information",
      "Contact identifiers (name, email, phone)",
      "Device identifiers (IP, cookies, device IDs)",
      "Internet or network activity",
      "General location (city, region, ZIP, IP-derived)",
    ],
    q5_sell_share: "Yes — share for advertising only",
    q5c_share_revenue_50pct: "No",
    q6_right_know: "In-app account settings",
    q7_right_delete: "Automated deletion with confirmation",
    q8_right_correct: "Online self-service",
    q9_opt_out: "Yes, prominently on homepage",
    q10_id_verification: "Documented verification process matching CPPA guidance",
    q11_policy_review: "Within 12 months",
    q12_notice_at_collection: "Yes, covers all collection points",
    q13_notice_content: "Yes, all three",
    q14_employee_notice: "Yes",
    q15_sensitive_pi: "Yes",
    q15c_spi_volume: "Fewer than 50,000",
    q16_sensitive_limit: "Yes, with a separate \"Limit the Use of My Sensitive PI\" link",
    q17_sensitive_basis: "Necessary for the service",
    q18_admt_use: "Yes",
    q19_admt_description: "Real-time fraud-scoring model for card-not-present transactions.",
    q20_admt_opt_out: "Yes, with documented opt-out",
    i1_processing_purpose: "Authorise or decline payment authorisations in <200 ms.",
    i2_retention_period: "72 months from transaction",
    i2_retention_criteria: "Statutory or regulatory retention requirement",
    i2_retention_detail: "Bank Secrecy Act + state banking regulations.",
    i3_ca_consumer_band: "100,000–1,000,000",
    i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy", "Account-settings disclosure"],
    i5_admt_logic: "Gradient-boosted features + sequence model; score 0–1 with action threshold.",
    i5_admt_training_source: "Historical authorisations 2020–2025 with confirmed-fraud labels.",
    i5_admt_fairness_testing: "Monthly subgroup precision/recall audit; quarterly external review.",
    i5_admt_human_review: "Edge-case declines reviewed by fraud ops within 1 hour.",
    i6_vendors: "AWS; Featurespace; Onfido; ComplyAdvantage",
    i7_internal_contributors: "CISO; CPO; Head of Fraud; GC; Model Risk Lead",
    i7_external_consultees: "External privacy counsel; model-risk audit firm",
    i8_certifying_exec_name: "Yukon Cornelius",
    i8_certifying_exec_title: "Chief Privacy Officer",
    i9_has_existing_dpia: "Yes",
    i9_existing_dpia_summary: "UK DPIA completed 2024 covering fraud-scoring model.",
    // exceptions WITHOUT the two new R1a fields (legacy shape stays valid)
    exceptions_intake: {
      fraud_detection: {
        claimed: true,
        scope: "Automated fraud signals on account access and payment events.",
        safeguards: "Reviewed quarterly; RBAC; 90-day raw-signal retention.",
      },
      security_integrity: {
        claimed: true,
        scope: "Anomaly detection across authentication and API traffic.",
        safeguards: "SIEM alerts; least-privilege access; pseudonymised dashboards.",
      },
      legal_compliance: {
        claimed: true,
        scope: "Retention for tax and regulatory reporting obligations.",
        safeguards: "Retention schedule enforced by system controls.",
      },
    },
  },
  {
    entity_name: "Northwind Retail Group, LLC",
    // Legacy revenue-band coverage: keep "$25M–$100M" so T-1 straddle path is exercised.
    q1_revenue: "$25M to under $50M",
    q2_consumers: "1,000,000 or more",
    q3_sector: "Retail/ecommerce",
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Device identifiers (IP, cookies, device IDs)",
      "Internet or network activity",
      "General location (city, region, ZIP, IP-derived)",
    ],
    q5_sell_share: "Both",
    // q5c intentionally omitted — "absent" variant.
    q6_right_know: "Online form with identity verification",
    q7_right_delete: "Automated deletion with confirmation",
    q8_right_correct: "Online self-service",
    q9_opt_out: "Yes, prominently on homepage",
    q10_id_verification: "Documented verification process matching CPPA guidance",
    q11_policy_review: "Within 12 months",
    q12_notice_at_collection: "Yes, covers all collection points",
    q13_notice_content: "Yes, all three",
    q14_employee_notice: "Yes",
    q15_sensitive_pi: "No",
    // q15c intentionally omitted — hidden when q15 !== "Yes".
    q16_sensitive_limit: "Not yet implemented",
    q17_sensitive_basis: "Other permitted purpose",
    q18_admt_use: "No",
    q19_admt_description: "Recommendation ranking only; no decisions with legal/significant effect.",
    q20_admt_opt_out: "No",
    i1_processing_purpose: "Personalised product discovery and marketing for logged-in shoppers.",
    i2_retention_period: "18 months engagement events; 7 years transactional",
    i2_retention_criteria: "Fixed period from collection",
    i2_retention_detail: "California tax records retention 7 years.",
    i3_ca_consumer_band: "More than 1,000,000",
    i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy", "Just-in-time notice"],
    i5_admt_logic: "Two-tower recommender; ranking only, non-decisional.",
    i5_admt_training_source: "Logged-in shopper interactions 2022–2025.",
    i5_admt_fairness_testing: "Quarterly subgroup coverage audit.",
    i5_admt_human_review: "n/a",
    i6_vendors: "GCP; SendGrid; Klaviyo; Stripe",
    i7_internal_contributors: "CPO; Head of Marketing; CISO; GC; Product Lead",
    i7_external_consultees: "External adtech counsel",
    i8_certifying_exec_name: "Rudy Rangifer",
    i8_certifying_exec_title: "Group Data Protection Officer",
    i9_has_existing_dpia: "Yes",
    i9_existing_dpia_summary: "EU DPIA covers personalisation; updated annually.",
    // No exceptions_intake — leaving object empty is legal.
    exceptions_intake: {},
  },
  {
    entity_name: "Meridian Logistics Holdings, Inc.",
    q1_revenue: "Over $100M",
    q2_consumers: "Under 100,000",
    q3_sector: "Manufacturing",
    q4_pi_categories: [
      "Employment information",
      "General location (city, region, ZIP, IP-derived)",
      "Device identifiers (IP, cookies, device IDs)",
      "Contact identifiers (name, email, phone)",
    ],
    q5_sell_share: "No",
    // q5c hidden when q5 === "No".
    q6_right_know: "Email or written request process",
    q7_right_delete: "Manual process, documented",
    q8_right_correct: "Handled via support",
    q9_opt_out: "No",
    q10_id_verification: "Documented verification process matching CPPA guidance",
    q11_policy_review: "12–24 months ago",
    q12_notice_at_collection: "Yes, covers all collection points",
    q13_notice_content: "Yes, all three",
    q14_employee_notice: "Yes",
    q15_sensitive_pi: "Yes",
    q15c_spi_volume: "Unsure",
    q16_sensitive_limit: "Yes, handled within privacy settings",
    q17_sensitive_basis: "Employment contract",
    q18_admt_use: "No",
    q19_admt_description: "n/a",
    q20_admt_opt_out: "No",
    i1_processing_purpose: "Driver telematics for safety and tachograph compliance.",
    i2_retention_period: "12 months raw telemetry; 60 months aggregated",
    i2_retention_criteria: "Statutory or regulatory retention requirement",
    i2_retention_detail: "California labour-law retention for safety records.",
    i3_ca_consumer_band: "10,000–100,000",
    i4_disclosure_mechanisms: ["Privacy policy", "Contract / terms of service"],
    i5_admt_logic: "n/a — no ADMT in scope.",
    i5_admt_training_source: "n/a",
    i5_admt_fairness_testing: "n/a",
    i5_admt_human_review: "n/a",
    i6_vendors: "Geotab; Azure; ADP",
    i7_internal_contributors: "CISO; CPO; HR Director; GC; Fleet Operations Lead",
    i7_external_consultees: "Works council; employment counsel",
    i8_certifying_exec_name: "Clarice Caribou",
    i8_certifying_exec_title: "Group DPO",
    i9_has_existing_dpia: "Yes",
    i9_existing_dpia_summary: "EU DPIA for driver telematics, reviewed annually.",
    exceptions_intake: {
      employment_context: {
        claimed: true,
        scope: "Driver telematics used only for safety and statutory tachograph compliance.",
        safeguards: "Segregated HRIS; RBAC; retention aligned to statutory periods.",
        authority_basis: "49 CFR Part 395 (federal hours-of-service recordkeeping). No current CCPA statutory exemption for employment-context processing (former § 1798.145(m) inoperative since January 1, 2023) — counsel review recommended.",
        retention_period: "12 months raw telemetry; 60 months aggregated safety metrics.",
      },
    },
  },
  // R1a coverage variant #5 — new q1 band ($25M–$50M), q2 legacy straddle, q15c Fewer than 50,000, Yes on q5c.
  {
    entity_name: "Peppermint Analytics, Inc.",
    q1_revenue: "$25M to under $50M",
    q2_consumers: "100,000 to under 250,000", // BAND-REALIGNMENT-T2B: retargeted from legacy "100,000–1 million" straddle
    q3_sector: "Media/advertising",
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Device identifiers (IP, cookies, device IDs)",
      "Internet or network activity",
      "General location (city, region, ZIP, IP-derived)",
    ],
    q5_sell_share: "Yes — share for advertising only",
    q5c_share_revenue_50pct: "Yes",
    q6_right_know: "Online form with identity verification",
    q7_right_delete: "Automated deletion with confirmation",
    q8_right_correct: "Online self-service",
    q9_opt_out: "Yes, prominently on homepage",
    q10_id_verification: "Documented verification process matching CPPA guidance",
    q11_policy_review: "Within 12 months",
    q12_notice_at_collection: "Yes, covers all collection points",
    q13_notice_content: "Yes, all three",
    q14_employee_notice: "Not applicable (no CA employees)",
    q15_sensitive_pi: "Yes",
    q15c_spi_volume: "Fewer than 50,000",
    q16_sensitive_limit: "Yes, with a separate \"Limit the Use of My Sensitive PI\" link",
    q17_sensitive_basis: "Consent",
    q18_admt_use: "In evaluation",
    q19_admt_description: "Look-alike audience modelling for ad targeting; opt-in cohort scoring under evaluation.",
    q20_admt_opt_out: "Planned for implementation",
    i1_processing_purpose: "Build opt-in look-alike audiences for programmatic buys.",
    i2_retention_period: "13 months from event",
    i2_retention_criteria: "Until purpose is fulfilled, then deletion",
    i2_retention_detail: "Aligned to IAB TCF signal lifetime.",
    i3_ca_consumer_band: "100,000–1,000,000",
    i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy", "Consent screen"],
    i5_admt_logic: "Cohort clustering; no automated decisions with legal/significant effect.",
    i5_admt_training_source: "Consented first-party events.",
    i5_admt_fairness_testing: "Quarterly cohort composition audit.",
    i5_admt_human_review: "Analyst review before campaign launch.",
    i6_vendors: "GCP; LiveRamp; The Trade Desk",
    i7_internal_contributors: "CPO; Head of Analytics; CISO; GC",
    i7_external_consultees: "External adtech counsel",
    i8_certifying_exec_name: "Charlie Cornet",
    i8_certifying_exec_title: "Chief Privacy Officer",
    i9_has_existing_dpia: "No",
    i9_existing_dpia_summary: "",
    exceptions_intake: {},
  },
  // R1a coverage variant #6 — q1 $50M–$100M, q2 "Unsure", q15 No so Q15c hidden.
  {
    entity_name: "Bumble Aerospace, Inc.",
    q1_revenue: "$50M to $100M",
    q2_consumers: "Under 100,000",
    q3_sector: "Professional services",
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Employment information",
      "Internet or network activity",
    ],
    q5_sell_share: "No",
    q6_right_know: "Email or written request process",
    q7_right_delete: "Case-by-case handling",
    q8_right_correct: "Handled via support",
    q9_opt_out: "No",
    q10_id_verification: "Informal verification",
    q11_policy_review: "Over 24 months ago",
    q12_notice_at_collection: "Yes, partial coverage",
    q13_notice_content: "Some elements",
    q14_employee_notice: "Yes",
    q15_sensitive_pi: "No",
    q16_sensitive_limit: "Not yet implemented",
    q17_sensitive_basis: "Other permitted purpose",
    q18_admt_use: "No",
    q19_admt_description: "n/a",
    q20_admt_opt_out: "No",
    i1_processing_purpose: "Client engagement records for professional-services delivery.",
    i2_retention_period: "84 months from engagement close",
    i2_retention_criteria: "Duration of account / relationship",
    i2_retention_detail: "Aligned to professional-liability retention window.",
    i3_ca_consumer_band: "Fewer than 10,000",
    i4_disclosure_mechanisms: ["Privacy policy"],
    i5_admt_logic: "n/a",
    i5_admt_training_source: "n/a",
    i5_admt_fairness_testing: "n/a",
    i5_admt_human_review: "n/a",
    i6_vendors: "Microsoft 365; DocuSign",
    i7_internal_contributors: "CPO; Managing Partner; IT Director",
    i7_external_consultees: "External privacy counsel",
    i8_certifying_exec_name: "Bumble Aer",
    i8_certifying_exec_title: "Managing Partner",
    i9_has_existing_dpia: "No",
    i9_existing_dpia_summary: "",
    exceptions_intake: {
      consumer_request: {
        claimed: true,
        scope: "Processing PI to deliver the professional services the client requested.",
        safeguards: "Access limited to engagement team; matter-scoped RBAC.",
        // No authority_basis / retention_period on this claim — mixed shape variant.
      },
    },
  },
  // R1a coverage variant #7 — resolved new q2 band "100,000–249,999" (lower slice

  // of the legacy straddle). Keeps q15=Yes so q15c exercises "50,000 or more".
  {
    entity_name: "Sequoia Ledger Analytics, Inc.",
    q1_revenue: "$100M–$500M",
    q2_consumers: "100,000–249,999",
    q3_sector: "Financial services",
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Financial account information",
      "Internet or network activity",
      "Precise geolocation",
    ],
    q5_sell_share: "No",
    q5c_share_revenue_50pct: "No",
    q6_right_know: "Online form with identity verification",
    q7_right_delete: "Automated deletion with confirmation",
    q8_right_correct: "Online self-service",
    q9_opt_out: "Not applicable (no sale/share)",
    q10_id_verification: "Documented verification process matching CPPA guidance",
    q11_policy_review: "Within 12 months",
    q12_notice_at_collection: "Yes, covers all collection points",
    q13_notice_content: "Yes, all three",
    q14_employee_notice: "Yes",
    q15_sensitive_pi: "Yes",
    q15c_spi_volume: "50,000 or more",
    q16_sensitive_limit: "Yes, with a separate \"Limit the Use of My Sensitive PI\" link",
    q17_sensitive_basis: "Necessary to perform services requested",
    q18_admt_use: "No",
    q19_admt_description: "n/a",
    q20_admt_opt_out: "No",
    i1_processing_purpose: "Servicing brokerage accounts; fraud prevention.",
    i2_retention_period: "84 months post-closure",
    i2_retention_criteria: "Regulatory retention obligations",
    i2_retention_detail: "SEC/FINRA books-and-records aligned.",
    i3_ca_consumer_band: "100,000–1,000,000",
    i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy"],
    i5_admt_logic: "n/a",
    i5_admt_training_source: "n/a",
    i5_admt_fairness_testing: "n/a",
    i5_admt_human_review: "n/a",
    i6_vendors: "AWS; Plaid; Alloy",
    i7_internal_contributors: "CPO; CISO; Head of Compliance",
    i7_external_consultees: "External privacy counsel",
    i8_certifying_exec_name: "Sequoia Exec",
    i8_certifying_exec_title: "Chief Privacy Officer",
    i9_has_existing_dpia: "No",
    i9_existing_dpia_summary: "",
    exceptions_intake: {
      security_incident: {
        claimed: true,
        scope: "Fraud-detection processing across account activity.",
        safeguards: "Access controls; audit logs; retention limited to detection window.",
        authority_basis: "Cal. Civ. Code § 1798.140(e)(2) (security and integrity).",
        retention_period: "24 months rolling",
      },
    },
  },
  // R1a coverage variant #8 — resolved new q2 band "250,000–1 million" (upper
  // slice of the legacy straddle). q15=No so Q15c is hidden (absent-path).
  {
    entity_name: "Harbor Ridge Retail Co.",
    q1_revenue: "$100M–$500M",
    q2_consumers: "250,000–1 million",
    q3_sector: "Retail/e-commerce",
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Commercial information (purchase history)",
      "Internet or network activity",
    ],
    q5_sell_share: "Yes — share for advertising only",
    q5c_share_revenue_50pct: "No",
    q6_right_know: "Online form with identity verification",
    q7_right_delete: "Automated deletion with confirmation",
    q8_right_correct: "Online self-service",
    q9_opt_out: "Yes, prominently on homepage",
    q10_id_verification: "Documented verification process matching CPPA guidance",
    q11_policy_review: "Within 12 months",
    q12_notice_at_collection: "Yes, covers all collection points",
    q13_notice_content: "Yes, all three",
    q14_employee_notice: "Yes",
    q15_sensitive_pi: "No",
    q16_sensitive_limit: "Not applicable",
    q17_sensitive_basis: "Not applicable",
    q18_admt_use: "No",
    q19_admt_description: "n/a",
    q20_admt_opt_out: "No",
    i1_processing_purpose: "Loyalty program and personalised marketing.",
    i2_retention_period: "36 months from last activity",
    i2_retention_criteria: "Duration of account / relationship",
    i2_retention_detail: "Inactive accounts purged annually.",
    i3_ca_consumer_band: "100,000–1,000,000",
    i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy", "Do Not Sell link"],
    i5_admt_logic: "n/a",
    i5_admt_training_source: "n/a",
    i5_admt_fairness_testing: "n/a",
    i5_admt_human_review: "n/a",
    i6_vendors: "Shopify; Klaviyo; Meta Ads",
    i7_internal_contributors: "CPO; CMO; CISO",
    i7_external_consultees: "External marketing counsel",
    i8_certifying_exec_name: "Harbor Exec",
    i8_certifying_exec_title: "Chief Privacy Officer",
    i9_has_existing_dpia: "No",
    i9_existing_dpia_summary: "",
    exceptions_intake: {},
  },
];



// ─── CPPA Cyber (controls list kept consistent per persona) ──────────────────

export interface CppaCyberPayload {
  profile: { industry: string; incidents_12mo: string; framework: string; last_audit: string };
  controls: { key: string; label: string; maturity: string; notes: string }[];
  industry_sector: string;
}

const CYBER_CONTROL_KEYS: { key: string; label: string }[] = [
  { key: "c1_auth", label: "Authentication and access controls" },
  { key: "c2_encryption", label: "Encryption of personal information" },
  { key: "c3_zero_trust", label: "Zero-trust architecture" },
  { key: "c4_account_mgmt", label: "Account management and access control" },
  { key: "c5_inventory", label: "Inventory of personal information and systems" },
  { key: "c6_secure_config", label: "Secure configuration of hardware and software" },
  { key: "c7_vuln_mgmt", label: "Vulnerability management and patching" },
  { key: "c8_audit_logs", label: "Audit-log management" },
  { key: "c9_network_mon", label: "Network monitoring and defence" },
  { key: "c10_anti_malware", label: "Anti-malware protections" },
  { key: "c11_segmentation", label: "Network segmentation" },
  { key: "c12_physical", label: "Limitation of physical access" },
  { key: "c13_secure_dev", label: "Secure development of software" },
  { key: "c14_third_party", label: "Oversight of service providers and third parties" },
  { key: "c15_retention", label: "Retention schedules and secure disposal" },
  { key: "c16_training", label: "Cybersecurity awareness, education and training" },
  { key: "c17_incident", label: "Incident response and post-incident analysis" },
  { key: "c18_continuity", label: "Business continuity and disaster recovery" },
];

function mkControls(maturityByKey: Record<string, [string, string]>): CppaCyberPayload["controls"] {
  return CYBER_CONTROL_KEYS.map((c) => {
    const [maturity, notes] = maturityByKey[c.key] ?? ["Documented, partially implemented", "—"];
    return { key: c.key, label: c.label, maturity, notes };
  });
}

export const CPPA_CYBER_VARIANTS: CppaCyberPayload[] = [
  {
    profile: { industry: "Healthcare/Life Sciences", incidents_12mo: "1", framework: "SOC 2", last_audit: "Within 12 months" },
    industry_sector: "Healthcare/Life Sciences",
    controls: mkControls({
      c1_auth: ["Implemented across organisation", "MFA enforced; RBAC configured."],
      c2_encryption: ["Implemented with continuous monitoring", "AES-256 at rest; TLS 1.3."],
      c3_zero_trust: ["Documented, partially implemented", "Roadmap approved."],
      c4_account_mgmt: ["Implemented across organisation", "Automated provisioning via Entra ID."],
      c5_inventory: ["Ad hoc / informal", "No formal data map."],
      c7_vuln_mgmt: ["Implemented across organisation", "Qualys weekly; critical patches in 48h."],
      c8_audit_logs: ["Implemented across organisation", "Sentinel SIEM; 12-month retention."],
      c9_network_mon: ["Implemented with continuous monitoring", "24/7 SOC; IDS/IPS active."],
      c10_anti_malware: ["Implemented across organisation", "Defender for Endpoint."],
      c14_third_party: ["Documented, partially implemented", "MSA + DPA in place."],
      c15_retention: ["Ad hoc / informal", "No formal retention schedule."],
      c16_training: ["Implemented across organisation", "Annual + quarterly phishing sims."],
      c17_incident: ["Documented, partially implemented", "Plan documented; one tabletop."],
      c18_continuity: ["Documented, partially implemented", "BCP not tested in 18mo."],
    }),
  },
  {
    profile: { industry: "Financial Services / Banking", incidents_12mo: "0", framework: "ISO 27001", last_audit: "Within 6 months" },
    industry_sector: "Financial Services / Banking",
    controls: mkControls({
      c1_auth: ["Implemented with continuous monitoring", "MFA + step-up; HSM-backed keys."],
      c2_encryption: ["Implemented with continuous monitoring", "FIPS 140-2 modules; KMS rotation."],
      c3_zero_trust: ["Implemented across organisation", "Service mesh + mTLS in production."],
      c4_account_mgmt: ["Implemented with continuous monitoring", "JIT access; quarterly recerts."],
      c5_inventory: ["Implemented across organisation", "CMDB + automated discovery."],
      c7_vuln_mgmt: ["Implemented with continuous monitoring", "SLA: criticals 24h."],
      c8_audit_logs: ["Implemented with continuous monitoring", "Immutable WORM storage, 7yr."],
      c9_network_mon: ["Implemented with continuous monitoring", "24/7 SOC + NDR."],
      c10_anti_malware: ["Implemented across organisation", "EDR + sandbox detonation."],
      c14_third_party: ["Implemented across organisation", "TPRM programme with annual review."],
      c15_retention: ["Implemented across organisation", "Schedule mapped to regulatory minima."],
      c16_training: ["Implemented across organisation", "Annual + monthly phishing sims."],
      c17_incident: ["Implemented with continuous monitoring", "Tested quarterly."],
      c18_continuity: ["Implemented across organisation", "DR test annually; RTO 4h."],
    }),
  },
  {
    profile: { industry: "Retail / E-commerce", incidents_12mo: "2", framework: "PCI DSS", last_audit: "Within 12 months" },
    industry_sector: "Retail / E-commerce",
    controls: mkControls({
      c1_auth: ["Implemented across organisation", "MFA on all admin; SSO for staff."],
      c2_encryption: ["Implemented across organisation", "TLS 1.3; tokenised card data."],
      c3_zero_trust: ["Ad hoc / informal", "Limited segmentation only."],
      c4_account_mgmt: ["Documented, partially implemented", "Manual recerts twice yearly."],
      c5_inventory: ["Documented, partially implemented", "Partial CMDB; gaps in marketing estate."],
      c7_vuln_mgmt: ["Implemented across organisation", "Weekly scans; criticals in 7d."],
      c8_audit_logs: ["Implemented across organisation", "Cloud-native logging, 13 months."],
      c9_network_mon: ["Documented, partially implemented", "Business-hours SOC."],
      c10_anti_malware: ["Implemented across organisation", "EDR estate-wide."],
      c14_third_party: ["Documented, partially implemented", "Adtech vendor reviews lagging."],
      c15_retention: ["Documented, partially implemented", "Schedule exists but not enforced."],
      c16_training: ["Implemented across organisation", "Annual mandatory training."],
      c17_incident: ["Implemented across organisation", "Two real incidents handled in last 12mo."],
      c18_continuity: ["Documented, partially implemented", "DR tested 2yr ago."],
    }),
  },
  {
    profile: { industry: "Logistics / Transportation", incidents_12mo: "0", framework: "NIST CSF", last_audit: "Over 12 months ago" },
    industry_sector: "Logistics / Transportation",
    controls: mkControls({
      c1_auth: ["Documented, partially implemented", "MFA on cloud admin only."],
      c2_encryption: ["Documented, partially implemented", "TLS in transit; some at-rest gaps."],
      c3_zero_trust: ["Not in place", "—"],
      c4_account_mgmt: ["Documented, partially implemented", "Manual provisioning."],
      c5_inventory: ["Ad hoc / informal", "No formal asset inventory."],
      c7_vuln_mgmt: ["Ad hoc / informal", "Patching driven by vendor advisories."],
      c8_audit_logs: ["Documented, partially implemented", "Logs retained 90 days."],
      c9_network_mon: ["Ad hoc / informal", "No 24/7 monitoring."],
      c10_anti_malware: ["Implemented across organisation", "Endpoint AV deployed."],
      c14_third_party: ["Ad hoc / informal", "DPAs not in place with all vendors."],
      c15_retention: ["Ad hoc / informal", "No formal schedule."],
      c16_training: ["Ad hoc / informal", "Toolbox talks only."],
      c17_incident: ["Documented, partially implemented", "Draft IR plan, not tested."],
      c18_continuity: ["Ad hoc / informal", "No formal BCP."],
    }),
  },
];
