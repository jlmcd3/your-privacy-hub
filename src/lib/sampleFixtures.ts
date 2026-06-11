// Sample report fixtures for SAMPLES-2.
// Each fixture mirrors the EXACT intake shape used by the matching admin
// Test* page so the live generators run unmodified. Parties/people use the
// agreed cast; all facts/data categories/safeguards are written professionally.

export type ToolSlug =
  | "li_assessment"
  | "dpia"
  | "dpa"
  | "governance"
  | "ir_playbook"
  | "biometric"
  | "cppa_risk"
  | "cppa_cyber"
  | "ropa"
  | "us_notice"
  | "eu_notice";

export interface SampleFixture {
  tool_slug: ToolSlug;
  variant: string;
  title: string;
  scenario_summary: string;
  // The generator-specific intake payload — mirrors the matching Test*.tsx shape.
  // The admin page dispatches on tool_slug to know how to use it.
  fixture: Record<string, unknown>;
  // For the snapshot, which row to copy from. The admin page sets this after
  // generation; here we just record the source table name to help the function.
  source_table: string;
  // Result-page URL pattern, with {id} placeholder; admin page substitutes.
  result_url_pattern: string;
}

// --- 1. LIA / UK ---------------------------------------------------------
const F_LIA_UK: SampleFixture = {
  tool_slug: "li_assessment",
  variant: "uk",
  title: "Wearable safety telemetry on underground shift workers",
  scenario_summary:
    "North Pole Manual Mining Ltd (UK rare-earth mine) proposes wearable safety telemetry (location + heart rate) on underground shift workers. CPO Rudy Rangifer is leading the legitimate-interest analysis with works-council consultation, pseudonymised dashboards, and a 90-day retention cap.",
  source_table: "li_assessments",
  result_url_pattern: "/li-assessment/result/{id}",
  fixture: {
    insert: {
      stage: "final",
      status: "pending",
      processing_description:
        "North Pole Manual Mining Ltd proposes wearable safety telemetry on underground shift workers at its UK rare-earth mining sites. Devices record approximate underground location (via beacon proximity) and continuous heart-rate. Data feeds a real-time control-room dashboard so supervisors can trigger evacuation, dispatch medics, or pause haulage when a worker exhibits signs of physiological stress or has entered a restricted zone.",
      relationship_type: "Employee (existing employment relationship)",
      data_categories: ["Location data (workplace beacon proximity)", "Health or medical data (heart rate)", "Employee records"],
      jurisdictions: ["United Kingdom (UK GDPR)"],
      sector: "Mining and resource extraction",
      stated_purpose:
        "To reduce the risk of fatality and serious injury underground by detecting medical events and unauthorised zone entry in real time so the control room can intervene immediately.",
      alternatives_considered:
        "Alternatives considered: (1) scheduled supervisor check-ins — too infrequent to detect acute medical events; (2) zone-only sensors without physiological data — would not detect cardiac or heat events; (3) voluntary opt-in only — selection bias would leave the most at-risk workers unmonitored. Telemetry on all underground workers is necessary to achieve the safety objective.",
      purpose_details: {
        interest_holder: "Controller (North Pole Manual Mining) and the shift workforce",
        interest_type: "Health and safety / vital interests of workers",
        purpose_text:
          "Real-time detection of medical events and unauthorised zone entry to prevent fatalities and serious injury.",
      },
      necessity_details: {
        alternatives:
          "Scheduled check-ins; zone sensors only; voluntary opt-in — each rejected as insufficient to meet the safety objective.",
        why_consent_not_used:
          "Workers are in a clear power imbalance with the employer; consent could not be freely given for safety monitoring that is uniformly applied across all underground shifts.",
        data_minimised:
          "Only beacon-proximity zone (not GPS-precise location) and heart-rate (not ECG) are processed. No surface or break-room monitoring.",
        pseudonymisation_options:
          "Dashboards display shift-ID and zone, not name. Identity is re-linked only when an alarm is triggered and only for the named on-call supervisor and medic.",
      },
      balancing_details: {
        reasonable_expectation:
          "Workers reasonably expect proportionate safety monitoring underground given the inherent risks of the work environment, but do not expect continuous physiological monitoring without notice.",
        vulnerable_subjects: ["Employees in a power-imbalance relationship"],
        potential_harm:
          "Misuse for productivity surveillance; inference of medical conditions; chilling effect on legitimate rest breaks.",
        safeguards: [
          "Pseudonymised dashboards (shift-ID, zone only)",
          "90-day raw-data retention; 12-month aggregate retention",
          "Strict purpose limitation: safety only, contractually excluded from performance management",
          "Works-council consultation completed before deployment",
          "Annual independent review by external H&S consultant",
        ],
        opt_out_mechanism:
          "Workers may request reassignment to surface roles without detriment; medical exemptions handled by occupational health.",
        special_category_data: true,
        employment_safeguards:
          "Works-council agreement signed; no individual-level data shared with line managers; safety-only purpose written into the employment-handbook addendum.",
        statutory_restrictions:
          "Mines Regulations 2014; Health and Safety at Work etc. Act 1974; UK GDPR Art. 9(2)(b) employment-law condition for health data.",
        balancing_text:
          "Strong safety justification (vital interests of workers in a hazardous environment); proportionate technical safeguards; works-council oversight; explicit purpose limitation prevents secondary use.",
      },
      preview_signal: { sample_run: true },
    },
    invoke: { fn: "run-li-assessment", id_key: "assessment_id" },
    poll: { table: "li_assessments", terminal: ["complete", "failed"], max: 30, interval_ms: 4000 },
  },
};

// --- 2. DPIA / EU --------------------------------------------------------
const F_DPIA_EU: SampleFixture = {
  tool_slug: "dpia",
  variant: "eu",
  title: "Drone-based geological survey imagery",
  scenario_summary:
    "Really, Really North Gold Possibilities GmbH conducts drone-based magnetic and visual surveys over German prospecting permits. Survey imagery incidentally captures residential property edges along access roads. DPO Donna Dasher's DPIA covers the blurring pipeline, 30-day raw-frame deletion, and consultation with the relevant Landesdatenschutzbehörde.",
  source_table: "dpia_frameworks",
  result_url_pattern: "/dpia-framework/result/{id}",
  fixture: {
    insert: {
      status: "pending",
      is_subscriber_credit: true,
      intake_data: {
        processing_activity_name: "Drone-based geological survey imagery capture",
        description:
          "Really, Really North Gold Possibilities GmbH operates fixed-wing and multirotor drones to capture aerial magnetometry and high-resolution visual imagery over prospecting permits in Saxony and Brandenburg. Flights are pre-cleared with Luftfahrt-Bundesamt and stay above 120m AGL. Despite buffer zones around populated areas, transit corridors and the edges of survey blocks incidentally capture residential property boundaries, gardens, and occasionally identifiable individuals.",
        purpose:
          "To produce ortho-rectified visual mosaics and magnetic-anomaly maps used by exploration geologists to identify drill-target prospects. Imagery is not used for any non-geological purpose.",
        data_categories: ["Image data (incidental — building edges, gardens, occasional individuals)", "Location data (flight telemetry)"],
        data_subjects:
          "Residents of properties along survey transit corridors. Estimated 600–1,200 individuals per campaign; no targeting, no tracking, no enrolment.",
        volume_frequency:
          "4–6 campaigns per year, each producing ~40,000 raw frames. Raw frames retained 30 days; processed mosaics (with all residential edges blurred) retained for the life of the prospecting permit.",
        retention:
          "Raw frames: 30 days from capture, then deleted via automated job. Blurred mosaics: duration of the prospecting permit plus 2 years for regulatory dispute window.",
        third_party_processors: ["Glacier Peak Hosting GmbH (DE) cloud storage; OrthoMosaic Alpine SA (CH) photogrammetry processing"],
        automated_decisions:
          "No. Geologists review mosaics manually. The blurring pipeline applies a YOLOv8-based detector for faces, license plates, and house numbers and is reviewed by a human before mosaic release.",
        existing_safeguards: [
          "Flight planning excludes school and hospital airspace",
          "Automated blur pipeline with human QA before any external release",
          "30-day raw-frame deletion enforced via storage lifecycle policy",
        ],
        jurisdictions: ["EU (GDPR)"],
        legal_basis_proposed:
          "Article 6(1)(f) legitimate interests for the geological survey purpose; no special category data is processed (imagery does not reveal Article 9 data once blurred).",
        sector: "Mining and resource extraction (exploration)",
        source_assessment_id: null,
      },
    },
    invoke: { fn: "run-dpia-framework", id_key: "dpia_id" },
    poll: { table: "dpia_frameworks", terminal: ["complete", "failed", "error"], max: 90, interval_ms: 4000 },
  },
};

// --- 3. DPA / EU ---------------------------------------------------------
const F_DPA_EU: SampleFixture = {
  tool_slug: "dpa",
  variant: "eu",
  title: "Payroll/HR processing DPA with sub-processor",
  scenario_summary:
    "North Pole Manual Mining Ltd (UK Controller, ~2,400 employees) engages Abominal SM GmbH (German Processor) for payroll and HR processing, with Whiteout Watch Ltd (UK) as a sub-processor for security monitoring. The DPA spans UK GDPR + EU GDPR with SCCs and the UK IDTA addendum.",
  source_table: "dpa_documents",
  result_url_pattern: "/dpa-generator/result/{id}",
  fixture: {
    invoke_body_extras: {
      controllerName: "North Pole Manual Mining Ltd",
      controllerJurisdiction: "United Kingdom",
      processorName: "Abominal SM GmbH",
      processorJurisdiction: "Germany",
      services:
        "Payroll calculation, HR record-keeping, benefits administration, and statutory reporting for the Controller's ~2,400 UK-based mining and corporate employees, including underground shift workers.",
      dataCategories: ["Employee / HR data", "Financial / payment data", "Government identifiers (NI numbers)"],
      dataSubjectCount: "approximately 2,400",
      retention: "Active employment plus 6 years post-termination (UK statutory retention for payroll records).",
      hasSubProcessors: true,
      subProcessorList:
        "Whiteout Watch Ltd (UK, managed security monitoring for the payroll/HR systems).",
      legalFramework: "EU GDPR + UK GDPR (dual regime)",
      auditRights: "annual third-party audit plus right of on-site inspection on 30 days' notice",
      includeTransferClause: true,
      transferMechanism:
        "EU Standard Contractual Clauses (2021/914) with the UK International Data Transfer Addendum",
    },
    invoke: { fn: "generate-dpa", returns_id: true },
    poll: null,
  },
};

// --- 4. Governance / EU --------------------------------------------------
const F_GOV_EU: SampleFixture = {
  tool_slug: "governance",
  variant: "eu",
  title: "EU e-commerce fulfilment programme review",
  scenario_summary:
    "Misfit Toys Logistics Ltd is an Irish e-commerce fulfilment company operating across 11 EU jurisdictions with ~180 staff. The privacy programme has matured around DPA-DK and DPC-IE engagement but has no appointed DPO yet — a finding the assessment surfaces.",
  source_table: "governance_assessments",
  result_url_pattern: "/governance-assessment/result/{id}",
  fixture: {
    insert: {
      status: "pending",
      intake_data: {
        sector: "Logistics / e-commerce fulfilment",
        org_size: "51-250",
        jurisdictions: ["EU (GDPR)", "Ireland (Data Protection Act 2018)"],
        eu_uk_data: "Yes",
        tools: ["Microsoft 365 / Copilot", "Shopify Plus", "ShipHero WMS"],
        data_categories: ["Customer records", "Employee records", "Contact identifiers", "Order history"],
        special_category: "No",
        special_categories_list: [],
        privacy_policy: "Yes, up to date",
        acceptable_use: "Yes, but general only",
        dpo_status: "No DPO appointed",
        dpia_status: "Some conducted, ad-hoc",
        incident_response: "Yes, tested in last 12 months",
        training_status: "Yes, annual mandatory",
        tool_instruction: "Documented policy",
        dpa_status: "Most vendors",
        transfer_status: "Yes, US-based marketing tools",
        sample_run: true,
      },
    },
    invoke: { fn: "run-governance-assessment", id_key: "assessment_id" },
    poll: { table: "governance_assessments", terminal: ["complete", "failed"], max: 75, interval_ms: 4000 },
  },
};

// --- 5. Governance / US --------------------------------------------------
const F_GOV_US: SampleFixture = {
  tool_slug: "governance",
  variant: "us",
  title: "Multi-state US privacy programme review",
  scenario_summary:
    "Busted Sled Solutions, Inc. (Delaware-incorporated, Illinois HQ) is a logistics-tech company with consumer-facing shipment tracking and a CCPA/CPA/VCDPA footprint plus Illinois operations. The assessment covers the privacy programme across the three state regimes and the BIPA exposure.",
  source_table: "governance_assessments",
  result_url_pattern: "/governance-assessment/result/{id}",
  fixture: {
    insert: {
      status: "pending",
      intake_data: {
        sector: "Logistics / SaaS",
        org_size: "251-1000",
        jurisdictions: ["California (CCPA/CPRA)", "Colorado (CPA)", "Virginia (VCDPA)", "Illinois (BIPA)"],
        eu_uk_data: "No",
        tools: ["Microsoft 365 / Copilot", "Salesforce", "Snowflake", "HubSpot"],
        data_categories: ["Customer records", "Employee records", "Contact identifiers", "Internet/network activity", "Biometric identifiers (fingerprint timeclocks)"],
        special_category: "Yes",
        special_categories_list: ["Biometric data (fingerprint templates)"],
        privacy_policy: "Yes, but outdated",
        acceptable_use: "Yes, up to date",
        dpo_status: "Yes, informal privacy lead",
        dpia_status: "No, none conducted",
        incident_response: "Yes, but not tested",
        training_status: "Yes, onboarding only",
        tool_instruction: "Verbal guidance only",
        dpa_status: "Some vendors",
        transfer_status: "No (US-only operations)",
        sample_run: true,
      },
    },
    invoke: { fn: "run-governance-assessment", id_key: "assessment_id" },
    poll: { table: "governance_assessments", terminal: ["complete", "failed"], max: 75, interval_ms: 4000 },
  },
};

// --- 6. IR Playbook / EU -------------------------------------------------
const F_IR_EU: SampleFixture = {
  tool_slug: "ir_playbook",
  variant: "eu",
  title: "Ransomware on cold-chain warehouse-management system",
  scenario_summary:
    "Silver & Gold Cold Storage A/S (Denmark) suffered a ransomware incident on its warehouse-management system, which held driver schedules, employee records, and refrigerated-shipment manifests. The playbook covers Datatilsynet notification, affected-individual communication, and downstream cold-chain customer notice.",
  source_table: "ir_playbooks",
  result_url_pattern: "/ir-playbook/result/{id}",
  fixture: {
    invoke_body_extras: {
      discoveryDateTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      cause:
        "Unauthorised external access / ransomware on warehouse-management system. WMS holds driver schedules, employee personnel data, and refrigerated-shipment manifests for ~70 cold-chain customers. Backups were partially encrypted; recovery from off-site backup is underway. No evidence of public exfiltration yet.",
      dataTypes: ["Employee records", "Driver / contractor records", "Customer business-contact data"],
      affectedCount: "1,000–10,000",
      jurisdictions: ["Denmark", "EU/EEA"],
      processorInvolved: false,
      contained: "No — recovery underway",
      organisationType: "Cold-chain warehousing and logistics",
    },
    invoke: { fn: "generate-ir-playbook", returns_id: true },
    poll: null,
  },
};

// --- 7. IR Playbook / US -------------------------------------------------
const F_IR_US: SampleFixture = {
  tool_slug: "ir_playbook",
  variant: "us",
  title: "Credential stuffing on consumer shipment-tracking accounts",
  scenario_summary:
    "Busted Sled Solutions, Inc. detected credential stuffing against consumer shipment-tracking accounts, with successful logins on roughly 8,400 accounts across California, Colorado, Virginia, and Illinois. The playbook covers multi-state notification analysis and the BIPA-adjacent considerations from the linked fingerprint timeclock data.",
  source_table: "ir_playbooks",
  result_url_pattern: "/ir-playbook/result/{id}",
  fixture: {
    invoke_body: {
      discoveryDateTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      cause:
        "Credential-stuffing attack against the consumer shipment-tracking portal. Successful logins on ~8,400 accounts across CA, CO, VA, and IL. Compromised accounts expose shipment history, delivery addresses, and last-4 of payment card. No direct access to the BIPA-scope fingerprint timeclock data (separate system).",
      dataTypes: ["General personal data", "Financial / payment data (last-4)", "Shipment / delivery history"],
      affectedCount: "8,400",
      jurisdictions: ["California", "Colorado", "Virginia", "Illinois"],
      processorInvolved: false,
      contained: "Yes — credential rotation forced, MFA enrolment now mandatory, attacking IPs blocked.",
      organisationType: "Logistics-tech (consumer shipment-tracking SaaS, ~600 employees, CA/CO/VA/IL footprint)",
    },
    invoke: { fn: "generate-ir-playbook", returns_id: true },
    poll: null,
  },
};

// --- 8. Biometric / US ---------------------------------------------------
const F_BIO_US: SampleFixture = {
  tool_slug: "biometric",
  variant: "us",
  title: "Fingerprint time-clocks across Illinois warehouses",
  scenario_summary:
    "Busted Sled Solutions, Inc. uses vendor-hosted fingerprint time-clocks across its Illinois warehouses (~600 enrolled workers). The assessment covers BIPA §15(a)–(d) exposure, vendor template handling, written release wording, and the retention/destruction schedule.",
  source_table: "biometric_assessments",
  result_url_pattern: "/biometric-checker/result/{id}",
  fixture: {
    invoke_body_extras: {
      biometricTypes: ["Fingerprint / finger geometry"],
      orgType: "Employer (employee biometrics)",
      purpose:
        "Time and attendance for warehouse shift workers across three Illinois facilities. Sector: Logistics. Vendor: Yes — fingerprint timeclock hardware and template storage provided by a US-based vendor with cloud-hosted templates. Existing consent: Embedded in employment paperwork, not a standalone BIPA written release. Retention policy: Not formally documented.",
      jurisdictions: ["Illinois, USA (BIPA)"],
      enrolledCount: "500-5,000",
      is_free_tier: false,
    },
    invoke: { fn: "check-biometric-compliance", returns_id: true },
    poll: null,
  },
};

// --- 9. CPPA Risk / US ---------------------------------------------------
const F_CPPA_RISK_US: SampleFixture = {
  tool_slug: "cppa_risk",
  variant: "us",
  title: "Behavioral ad personalization profiling of CA consumers",
  scenario_summary:
    "Tomorrow4Cariboo, Inc. is a California ad-tech/personalization company. Its risk assessment covers behavioral profiling of CA consumers across publisher partners, with both 'sells' and 'shares' signals, ADMT for audience scoring, and sensitive-PI in inferences.",
  source_table: "cppa_assessments",
  result_url_pattern: "/cppa-risk-assessment/result/{id}",
  fixture: {
    insert: {
      module: "risk_assessment",
      status: "pending",
      intake_data: {
        q1_revenue: "$100M–$500M",
        q2_consumers: "10+ million",
        q3_sector: "Advertising / Marketing technology",
        q4_pi_categories: [
          "Contact identifiers (email, hashed email, IP)",
          "Device identifiers (cookies, MAIDs, device IDs)",
          "Internet or network activity (browsing, app usage, search)",
          "Geolocation data (IP-derived city/region)",
          "Inferences (audience segments, interest categories)",
        ],
        q5_sell_share: "Both",
        q6_right_know: "Online form with identity verification",
        q7_right_delete: "Manual process, documented",
        q8_right_correct: "Handled via support",
        q9_opt_out: "Yes, GPC honored + footer link",
        q10_id_verification: "Documented verification ladder",
        q11_policy_review: "0–12 months ago",
        q12_notice_at_collection: "Yes, full coverage on owned properties",
        q13_notice_content: "All elements",
        q14_employee_notice: "Yes, standalone employee notice",
        q15_sensitive_pi: "Yes",
        q16_sensitive_limit: "Yes — service-provider purposes only",
        q17_sensitive_basis: "Service delivery and fraud prevention",
        q18_admt_use: "Yes",
        q19_admt_description:
          "Audience-scoring models segment consumers into interest cohorts and predicted-purchase-intent bands. Outputs drive bid eligibility and frequency caps. No financial-eligibility, employment, or housing decisions.",
        q20_admt_opt_out: "Yes",
        i1_processing_purpose:
          "To generate audience-segment and purchase-intent scores from 13 months of cross-publisher browsing, app-usage, and engagement events, used to determine bid eligibility for advertising auctions on partner publishers.",
        i2_retention_period: "13 months from last engagement",
        i2_retention_criteria: "Business purpose duration",
        i2_retention_detail: "Rolling 13-month deletion enforced via warehouse lifecycle policy.",
        i3_ca_consumer_band: "More than 1,000,000",
        i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy", "Just-in-time notice", "GPC honoring"],
        i5_admt_logic: "Gradient-boosted ensemble producing a 0–100 segment-affinity score plus a categorical bucket.",
        i5_admt_training_source: "De-identified engagement data 2022–2025 across publisher partners.",
        i5_admt_fairness_testing: "Quarterly subgroup AUC + lift analysis across reported age band, region, and language preference.",
        i5_admt_human_review: "Bid eligibility is fully automated; no human-in-the-loop. Opt-out request immediately suppresses scoring.",
        i6_vendors: "Snowflake (warehouse); AWS (hosting); LiveRamp (identity resolution); ad-exchange partners",
        i7_internal_contributors: "CISO Blitz Zenn; CPO Rudy Rangifer (advisory); VP Engineering; General Counsel; Product Owner",
        i7_external_consultees: "Outside privacy counsel; independent bias auditor (annual)",
        i8_certifying_exec_name: "Rudy Rangifer",
        i8_certifying_exec_title: "Chief Privacy Officer (advisory)",
        i9_has_existing_dpia: "No",
        i9_existing_dpia_summary: "",
      },
    },
    invoke: { fn: "run-cppa-risk-assessment", id_key: "assessment_id" },
    poll: { table: "cppa_assessments", terminal: ["complete", "failed", "error"], max: 60, interval_ms: 4000 },
  },
};

// --- 10. CPPA Cyber / US -------------------------------------------------
const F_CPPA_CYBER_US: SampleFixture = {
  tool_slug: "cppa_cyber",
  variant: "us",
  title: "Cybersecurity readiness for ad-tech processing estate",
  scenario_summary:
    "Cybersecurity readiness assessment for Tomorrow4Cariboo, Inc.'s ad-tech processing estate. CISO Blitz Zenn provided maturity ratings across the 18 CPPA-listed controls; the assessment surfaces inventory gaps, secure-development gaps, and retention/disposal gaps as priority items.",
  source_table: "cppa_assessments",
  result_url_pattern: "/cppa-cybersecurity/result/{id}",
  fixture: {
    insert: {
      module: "cybersecurity",
      status: "pending",
      intake_data: {
        profile: {
          industry: "Advertising / Marketing technology",
          incidents_12mo: "0",
          framework: "SOC 2",
          last_audit: "Within 12 months",
        },
        controls: [
          { key: "c1_auth", label: "Authentication and access controls", maturity: "Implemented across organisation", notes: "MFA enforced via Okta; SSO for all production systems." },
          { key: "c2_encryption", label: "Encryption of personal information", maturity: "Implemented with continuous monitoring", notes: "AES-256 at rest, TLS 1.3 in transit; AWS KMS." },
          { key: "c3_zero_trust", label: "Zero-trust architecture", maturity: "Documented, partially implemented", notes: "Service mesh in production; corporate network not yet zero-trust." },
          { key: "c4_account_mgmt", label: "Account management and access control", maturity: "Implemented across organisation", notes: "Automated joiner/leaver via Okta + Terraform." },
          { key: "c5_inventory", label: "Inventory of personal information and systems", maturity: "Ad hoc / informal", notes: "No formal data map; sensitive-PI inventory is a known gap." },
          { key: "c6_secure_config", label: "Secure configuration of hardware and software", maturity: "Documented, partially implemented", notes: "CIS benchmarks on AWS; endpoint hardening incomplete." },
          { key: "c7_vuln_mgmt", label: "Vulnerability management and patching", maturity: "Implemented across organisation", notes: "Snyk + AWS Inspector; critical patches within 7 days." },
          { key: "c8_audit_logs", label: "Audit-log management", maturity: "Implemented across organisation", notes: "Centralised Datadog; 13-month retention." },
          { key: "c9_network_mon", label: "Network monitoring and defence", maturity: "Implemented with continuous monitoring", notes: "MSSP-run 24/7 SOC; IDS active." },
          { key: "c10_anti_malware", label: "Anti-malware protections", maturity: "Implemented across organisation", notes: "CrowdStrike on all endpoints." },
          { key: "c11_segmentation", label: "Network segmentation", maturity: "Documented, partially implemented", notes: "Prod / staging / corporate segmented; partner-data tenants not yet micro-segmented." },
          { key: "c12_physical", label: "Limitation of physical access", maturity: "Implemented across organisation", notes: "Co-located AWS only; office uses keycard + CCTV." },
          { key: "c13_secure_dev", label: "Secure development of software", maturity: "Ad hoc / informal", notes: "No formal secure-SDLC; SAST not in CI." },
          { key: "c14_third_party", label: "Oversight of service providers and third parties", maturity: "Documented, partially implemented", notes: "DPAs for top vendors; no continuous monitoring." },
          { key: "c15_retention", label: "Retention schedules and secure disposal", maturity: "Ad hoc / informal", notes: "13-month deletion enforced on warehouse only; no enterprise schedule." },
          { key: "c16_training", label: "Cybersecurity awareness, education and training", maturity: "Implemented across organisation", notes: "Annual training + quarterly phishing." },
          { key: "c17_incident", label: "Incident response and post-incident analysis", maturity: "Documented, partially implemented", notes: "IR plan documented; one tabletop in the past 18 months." },
          { key: "c18_continuity", label: "Business continuity and disaster recovery", maturity: "Documented, partially implemented", notes: "BCP documented; DR drill annually." },
        ],
        industry_sector: "Advertising / Marketing technology",
      },
    },
    invoke: { fn: "run-cppa-cybersecurity", id_key: "assessment_id" },
    poll: { table: "cppa_assessments", terminal: ["complete", "failed", "error"], max: 60, interval_ms: 4000 },
  },
};

// --- 11. RoPA / EU -------------------------------------------------------
const F_ROPA_EU: SampleFixture = {
  tool_slug: "ropa",
  variant: "eu",
  title: "Article 30 RoPA for UK mining controller",
  scenario_summary:
    "North Pole Manual Mining Ltd Article 30 record of processing activities covering HR, wearable safety telemetry, visitor management at mine sites, and supplier vetting. DPO Donna Dasher is the named contact.",
  source_table: "ropa_document_versions",
  result_url_pattern: "/ropa/documents",
  fixture: {
    org_name: "North Pole Manual Mining Ltd",
    author_name: "Donna Dasher (DPO)",
    profile: {
      legal_entity_type: "Private limited company (UK)",
      employee_band: "1000-4999",
      is_controller: true,
      is_processor: false,
      dpo_name: "Donna Dasher",
      dpo_email: "dpo@northpolemanualmining.example",
      dpo_phone: "+44 20 7946 0010",
      eu_rep_name: "North Pole EU Representative GmbH",
      eu_rep_email: "eu-rep@northpolemanualmining.example",
      uk_rep_name: "North Pole Manual Mining Ltd",
      uk_rep_email: "uk-rep@northpolemanualmining.example",
    },
    jurisdictions: [
      { jurisdiction_code: "EU_GDPR", jurisdiction_name: "European Union", jurisdiction_region: "EU & UK" },
      { jurisdiction_code: "UK_GDPR", jurisdiction_name: "United Kingdom", jurisdiction_region: "EU & UK" },
    ],
    activities: [
      {
        activity_name: "Employee HR Processing",
        category: "hr_employment",
        purpose: "Recruitment, payroll, benefits administration, performance management, and statutory employment-law compliance for ~2,400 UK employees and contractors.",
        lawful_basis: "contract",
        special_category_basis: "Article 9(2)(b) employment-law condition for occupational-health data",
        data_categories: ["Employee records", "Financial data", "Contact identifiers", "Occupational-health data"],
        data_subjects: "Employees and contractors of North Pole Manual Mining Ltd",
        recipients: "HR team; payroll processor Abominal SM GmbH (DE); HMRC; occupational-health provider",
        transfer_destination: "Germany (Abominal SM GmbH)",
        transfer_mechanism: "EU SCCs + UK IDTA addendum",
        retention_period: "Active employment plus 6 years post-termination",
        security_measures: "RBAC, MFA, AES-256 at rest, quarterly access reviews, ISO 27001 vendor.",
      },
      {
        activity_name: "Underground Wearable Safety Telemetry",
        category: "health_safety",
        purpose: "Real-time detection of medical events and unauthorised zone entry for shift workers underground.",
        lawful_basis: "legitimate_interests",
        special_category_basis: "Article 9(2)(b) employment-law / occupational-safety",
        data_categories: ["Location data (beacon proximity)", "Health data (heart rate)", "Employee records"],
        data_subjects: "Underground shift workers (~1,100 individuals)",
        recipients: "Control-room operators; on-call medics; occupational-health provider",
        transfer_destination: "United Kingdom (on-premise + UK cloud)",
        transfer_mechanism: "No third-country transfer",
        retention_period: "Raw telemetry: 90 days; aggregate safety metrics: 12 months",
        security_measures: "Pseudonymised dashboards; identity re-link only on alarm; purpose-limited to safety; works-council oversight.",
      },
      {
        activity_name: "Site Visitor Management",
        category: "physical_security",
        purpose: "Identify and log visitors to mine sites for safety briefing, evacuation accountability, and site-security compliance.",
        lawful_basis: "legitimate_interests",
        special_category_basis: "Not applicable",
        data_categories: ["Contact identifiers", "Photo (badge)", "Vehicle registration"],
        data_subjects: "Site visitors (contractors, auditors, regulators, journalists)",
        recipients: "Site security; emergency services on evacuation; HSE inspectors on request",
        transfer_destination: "United Kingdom",
        transfer_mechanism: "No third-country transfer",
        retention_period: "Visitor log: 24 months for HSE reporting; CCTV: 30 days",
        security_measures: "Badge data on-site only; CCTV recorded to encrypted NVR; access restricted to security team.",
      },
      {
        activity_name: "Supplier Vetting and KYS",
        category: "procurement",
        purpose: "Know-Your-Supplier checks for sanctions, beneficial ownership, and modern-slavery compliance.",
        lawful_basis: "legal_obligation",
        special_category_basis: "Not applicable",
        data_categories: ["Beneficial-owner identifiers", "Contact identifiers", "Sanctions-screening results"],
        data_subjects: "Supplier directors and beneficial owners",
        recipients: "Procurement team; sanctions-screening vendor (Whiteout Watch Ltd, UK)",
        transfer_destination: "United Kingdom",
        transfer_mechanism: "No third-country transfer",
        retention_period: "Duration of supplier relationship plus 7 years",
        security_measures: "Sanctions results access-controlled; supplier records in dedicated KYS platform; quarterly access reviews.",
      },
    ],
    invoke: { fn: "generate-ropa-document", format: "pdf" },
  },
};

// --- 12. US Notice / US --------------------------------------------------
const F_US_NOTICE: SampleFixture = {
  tool_slug: "us_notice",
  variant: "us",
  title: "Consumer shipment-tracking app notice (CA + CO + VA)",
  scenario_summary:
    "Busted Sled Solutions, Inc. consumer shipment-tracking app privacy notice covering California (CCPA/CPRA), Colorado (CPA), and Virginia (VCDPA). Contact email routes to privacy@bustedsled.example.",
  source_table: "us_notice_sessions",
  result_url_pattern: "/us-notices/{id}/documents",
  fixture: {
    session: { scope: "all_states", mode: "standalone" },
    states: [
      { name: "California", code: "CA", framework: "ccpa" },
      { name: "Colorado", code: "CO", framework: "virginia_model" },
      { name: "Virginia", code: "VA", framework: "virginia_model" },
    ],
    universal: {
      business_name: "Busted Sled Solutions, Inc.",
      business_description:
        "Busted Sled Solutions operates a consumer shipment-tracking app and a B2B logistics-tech platform serving carriers and shippers across the United States.",
      contact_email: "privacy@bustedsled.example",
      data_categories:
        "Identifiers (name, email, phone, account ID); Shipment and delivery history; Device identifiers (IP, app install ID); Internet/network activity (in-app behavior); Inferences (delivery-window preferences).",
      collection_purposes:
        "Providing shipment-tracking functionality; account management; fraud prevention; service improvement; transactional communications.",
      third_party_sharing: "yes",
      third_party_categories:
        "Carriers (for delivery handoff); cloud infrastructure providers; SMS/email delivery vendors; analytics processors; service providers under written contract.",
      sale_or_sharing: "neither",
      retention_general:
        "Account data is retained while the account is active and for 36 months after last activity. Shipment records are retained 7 years for carrier-dispute resolution. Marketing contacts are retained until opt-out.",
      sensitive_data_types: "Precise geolocation (delivery and pickup coordinates).",
      data_sources:
        "Directly from individuals (account signup and in-app); from carriers (delivery scans and exceptions); from authentication providers (sign-in metadata).",
    },
    invoke: { fn: "generate-us-notice" },
  },
};

// --- 13. EU Notice / EU --------------------------------------------------
const F_EU_NOTICE: SampleFixture = {
  tool_slug: "eu_notice",
  variant: "eu",
  title: "Customer-facing notice for Irish fulfilment company (EU + UK)",
  scenario_summary:
    "Misfit Toys Logistics Ltd customer-facing privacy notice spanning EU GDPR and UK GDPR. The notice covers fulfilment, returns, marketing (opt-in), and the SCC + UK addendum transfer story for US-based marketing tooling.",
  source_table: "eu_notice_sessions",
  result_url_pattern: "/eu-notices/{id}/documents",
  fixture: {
    session: { scope: "suite", mode: "standalone" },
    frameworks: [
      { code: "EU_GDPR", name: "EU GDPR", region: "EU" },
      { code: "UK_GDPR", name: "UK GDPR", region: "UK" },
    ],
    universal: {
      controller_name: "Misfit Toys Logistics Ltd",
      controller_address:
        "Unit 4, North Docks Business Park, Dublin D01 X4Y2, Ireland (Company No. IE-678901)",
      contact_email: "privacy@misfittoyslogistics.example",
      dpo_details: "yes",
      dpo_name: "Donna Dasher (acting DPO, shared service)",
      dpo_email: "dpo@misfittoyslogistics.example",
      processing_purposes: ["service_delivery", "analytics", "marketing", "security", "legal_compliance"],
      data_categories: ["identifiers", "professional", "internet_activity", "order_history"],
      lawful_basis: ["contract", "legitimate_interests", "legal_obligation", "consent"],
      third_party_recipients: ["service_providers", "analytics", "regulators"],
      transfer_outside_eea: "yes",
      transfer_safeguards: ["sccs", "uk_addendum"],
      retention_period:
        "Order records: 7 years for tax. Customer accounts: duration of relationship plus 24 months. Marketing contacts: until opt-out.",
      automated_decisions: "no",
      special_category_basis: "Not applicable — no special-category data collected from customers.",
      supervisory_authority_eu: "Irish Data Protection Commission (DPC)",
      supervisory_authority_uk: "Information Commissioner's Office (ICO)",
    },
    invoke: { fn: "generate-eu-notice" },
  },
};

export const SAMPLE_FIXTURES: SampleFixture[] = [
  F_LIA_UK,
  F_DPIA_EU,
  F_DPA_EU,
  F_GOV_EU,
  F_GOV_US,
  F_IR_EU,
  F_IR_US,
  F_BIO_US,
  F_CPPA_RISK_US,
  F_CPPA_CYBER_US,
  F_ROPA_EU,
  F_US_NOTICE,
  F_EU_NOTICE,
];
