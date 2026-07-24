// Sample report fixtures for SAMPLES-2.
// Each fixture mirrors the EXACT intake shape used by the matching tool page
// (LIAssessment / DPIAFramework / etc.) so the live generators run unmodified.
// Parties/people use the agreed Rudolph-adjacent cast; all facts/data
// categories/safeguards are written professionally.
// Keep in sync: generate-stress-fixtures specs <-> src/lib/sampleFixtureShapes.ts
// (sample fixtures drift guard).

export type ToolSlug =
  | "li_assessment"
  | "dpia"
  | "dpa"
  | "governance"
  | "ir_playbook"
  | "biometric"
  | "cppa_risk"
  | "cppa_cyber"
  | "cppa_admt"
  | "ropa"
  | "us_notice"
  | "eu_notice";

export interface SampleFixture {
  tool_slug: ToolSlug;
  variant: string;
  title: string;
  scenario_summary: string;
  fixture: Record<string, unknown>;
  source_table: string;
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
      stage: "submitted",
      preview_assessment_id: "sample-preview-lia-uk-000",
      organization_name: "North Pole Manual Mining Ltd",
      subject_anchor:
        "Wearable safety telemetry (underground location and heart rate) on underground shift workers",
      processing_description:
        "North Pole Manual Mining Ltd proposes wearable safety telemetry on underground shift workers at its UK rare-earth mining sites (sector: Mining and resource extraction). Devices record approximate underground location (via beacon proximity) and continuous heart-rate. Data feeds a real-time control-room dashboard so supervisors can trigger evacuation, dispatch medics, or pause haulage when a worker exhibits signs of physiological stress or has entered a restricted zone.",
      relationship_type: "Employee",
      data_categories: [
        "Location data",
        "Health or medical data",
        "Employment data",
        "Other: beacon-proximity zone identifier (not GPS-precise)",
      ],
      jurisdictions: ["United Kingdom (UK GDPR)"],
      stated_purpose:
        "To reduce the risk of fatality and serious injury underground by detecting medical events and unauthorised zone entry in real time so the control room can intervene immediately.",
      alternatives_considered:
        "Alternatives considered: (1) scheduled supervisor check-ins — too infrequent to detect acute medical events; (2) zone-only sensors without physiological data — would not detect cardiac or heat events; (3) voluntary opt-in only — selection bias would leave the most at-risk workers unmonitored. Telemetry on all underground workers is necessary to achieve the safety objective.",
      purpose_details: {
        interest_holder: "Controller (North Pole Manual Mining) and the shift workforce",
        interest_type: "Health and safety / vital interests of workers",
        interest_statement:
          "Real-time detection of medical events and unauthorised zone entry to prevent fatalities and serious injury.",
      },
      necessity_details: {
        alternatives:
          "Scheduled check-ins; zone sensors only; voluntary opt-in — each rejected as insufficient to meet the safety objective.",
        why_consent_not_used:
          "Workers are in a clear power imbalance with the employer; consent could not be freely given for safety monitoring that is uniformly applied across all underground shifts.",
        data_minimised:
          "Only beacon-proximity zone (not GPS-precise location) and heart-rate (not ECG) are processed. No surface or break-room monitoring. Per-category retention and deletion triggers: (a) Location data (beacon proximity) — 90 days from the capture timestamp, deletion trigger is capture_ts + 90d enforced by an automated storage-lifecycle job that runs daily and writes a deletion attestation; (b) Health data (heart rate) — 90 days from the capture timestamp on the same daily automated job as (a); (c) Employee records (worker-to-shift-ID mapping used for identity re-link on alarm) — retained for the duration of the employment relationship, with a deletion trigger of employment termination + 6 years (UK statutory retention for occupational-health-adjacent records), after which the mapping row is purged by the HR system's leaver job. Aggregate safety metrics (no individual identifiers) — 12 months from computation, deletion trigger is computation_ts + 12m on the same automated lifecycle job.",
        pseudonymisation_options:
          "Dashboards display shift-ID and zone, not name. Identity is re-linked only when an alarm is triggered and only for the named on-call supervisor and medic.",
      },
      balancing_details: {
        reasonable_expectation: "Partly",
        reasonable_expectation_detail:
          "Workers reasonably expect proportionate safety monitoring underground given the inherent risks of the work environment, but do not expect continuous physiological monitoring without notice; the works-council consultation and handbook addendum close that expectation gap before deployment.",
        vulnerable_subjects: ["Employees in a power-imbalance relationship"],
        potential_harm: "Severe",
        potential_harm_detail:
          "Without safeguards, continuous heart-rate and zone telemetry could enable misuse for productivity surveillance, inference of medical conditions (cardiac, pregnancy, stress disorders), and a chilling effect on legitimate rest breaks — hence the strict purpose-limitation, pseudonymisation and works-council oversight controls listed below.",
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
        additional_context:
          "Strong safety justification (vital interests of workers in a hazardous environment); proportionate technical safeguards; works-council oversight; explicit purpose limitation prevents secondary use.",
      },
    },
    invoke: { fn: "run-li-assessment", id_key: "assessment_id" },
    poll: { table: "li_assessments", terminal: ["complete", "failed"], max: 75, interval_ms: 4000 },
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
        organization_name: "Really, Really North Gold Possibilities GmbH",
        processing_activity_name: "Drone-based geological survey imagery capture",
        description:
          "Fixed-wing and multirotor drones capture aerial magnetometry and high-resolution visual imagery over prospecting permits in Saxony and Brandenburg; transit corridors and survey-block edges incidentally capture residential property boundaries and occasionally identifiable individuals, feeding a blurring pipeline with 30-day raw-frame deletion.",
        purpose:
          "To produce ortho-rectified visual mosaics and magnetic-anomaly maps used by exploration geologists to identify drill-target prospects. Imagery is not used for any non-geological purpose.",
        data_categories: ["Location data", "Other"],
        data_subjects:
          "Residents of properties along survey transit corridors. Estimated 600–1,200 individuals per campaign; no targeting, no tracking, no enrolment.",
        volume_frequency:
          "4–6 campaigns per year, each producing ~40,000 raw frames. Raw frames retained 30 days; processed mosaics (with all residential edges blurred) retained for the life of the prospecting permit.",
        retention_period:
          "Raw frames: 30 days from capture, then deleted via automated job. Blurred mosaics: duration of the prospecting permit plus 2 years for regulatory dispute window.",
        third_party_processors: [
          "Glacier Peak Hosting GmbH (DE) cloud storage; OrthoMosaic Alpine SA (CH) photogrammetry processing",
        ],
        existing_safeguards: [
          "Data minimisation",
          "Anonymisation",
          "Access controls",
          "DPA signed with processor",
        ],
        jurisdictions: ["EU (GDPR)"],
        legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
        article_9_condition: "",
        necessity_proportionality:
          "The blurring pipeline plus 30-day raw-frame deletion is the least-intrusive means of producing usable geological mosaics; alternatives (ground surveys, satellite imagery at lower resolution) were considered and rejected as insufficient for drill-target identification.",
        controller_sector: "Mining and resource extraction (exploration)",
        controller_country: "Germany",
        nature_scope_context:
          "Data categories in scope: (a) image data incidentally capturing building edges, gardens, and occasional individuals along transit corridors; (b) location data from flight telemetry. Imagery is blurred (faces, license plates, house numbers) before any external release; raw frames are deleted after 30 days.",
        dp_by_design_measures:
          "No automated decision-making with legal or significant effect: geologists review mosaics manually. A YOLOv8-based detector proposes blur regions for faces, license plates, and house numbers; a human QA reviewer approves every mosaic before release. Flight planning excludes school and hospital airspace. 30-day raw-frame deletion is enforced via a storage lifecycle policy with an attestation ledger.",
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
      entityName: "North Pole Manual Mining Ltd",
      controllerName: "North Pole Manual Mining Ltd",
      controllerJurisdiction: "United Kingdom",
      processorName: "Abominal SM GmbH",
      processorJurisdiction: "Germany",
      services:
        "Payroll calculation, HR record-keeping, benefits administration, and statutory reporting for the Controller's ~2,400 UK-based mining and corporate employees, including underground shift workers.",
      dataCategories: ["Employee / HR data", "Financial / payment data"],
      // Fixed-period shape — page fold-in string.
      retention: "Fixed period: Active employment plus 6 years post-termination (UK statutory retention for payroll records).",
      hasSubProcessors: true,
      subProcessorList:
        "Whiteout Watch Ltd (UK, managed security monitoring for the payroll/HR systems).",
      auditRights: "Annual audit — third-party audit summary plus right of on-site inspection on reasonable notice",
      transferMechanism: "UK IDTA / UK Addendum to EU SCCs",
    },
    invoke: { fn: "generate-dpa", returns_id: true },
    poll: null,
  },
};

// --- 4. Governance / EU --------------------------------------------------
// SAMPLES-CONTRACT-governance (6/8) reconciliation notes:
//   - Intake keys and enum literals mirror GovernanceAssessment.tsx
//     buildIntake() (L200-224) and governanceContract exactly.
//   - Free-text drift ("Yes, up to date", "All vendors", "Logistics /
//     e-commerce fulfilment", etc.) normalized to contract enum literals.
//   - Showcase substance NOT lost: sector prose, extra tools (Shopify Plus,
//     ShipHero WMS), Order-history data category, and the Irish DPA-2018
//     national overlay are preserved verbatim in `additional_context`.
//   - `sample_run` removed — verified NOT emitted by buildIntake()
//     (GovernanceAssessment.tsx L200-224); it was a fixture-only marker
//     with no downstream consumers (rg confirmed).
//   - Conditional slots (privacy_notice_coverage, dpo_status,
//     dpia_ai_coverage, training_ai_coverage, dpa_art28_verified,
//     transfer_mechanism) populated with valid enum literals so the
//     showcase reads as a realistic mature-programme submission.
const F_GOV_EU: SampleFixture = {
  tool_slug: "governance",
  variant: "eu",
  title: "EU e-commerce fulfilment programme review",
  scenario_summary:
    "Misfit Toys Logistics Ltd is an Irish e-commerce fulfilment company operating across 11 EU jurisdictions with ~180 staff. The privacy programme is mature: appointed DPO, formal DPIA programme with register, tested incident-response plan, annual mandatory training, SCCs and TIAs in place for transfers, and DPAs with all vendors.",
  source_table: "governance_assessments",
  result_url_pattern: "/governance-assessment/result/{id}",
  fixture: {
    insert: {
      status: "pending",
      intake_data: {
        organization_name: "Misfit Toys Logistics Ltd",
        sector: "Other",
        org_size: "51-250",
        jurisdictions: ["EU (GDPR)", "Other"],
        eu_uk_data: "Yes",
        tools: ["Microsoft 365 / Copilot"],
        data_categories: ["Customer records", "Employee records", "Contact details", "Other"],
        special_category: "No",
        special_categories_list: [],
        privacy_policy: "Yes, current (reviewed in last 12 months)",
        privacy_notice_coverage:
          "Yes — notice covers all current activities, transfers, retention, and rights",
        dpo_status: "Yes, formal DPO",
        dpia_status: "Yes, multiple DPIAs completed",
        dpia_ai_coverage: "Yes — all AI/high-risk tools assessed",
        incident_response: "Yes, tested in last 12 months",
        training_status: "Yes, formal onboarding + annual refresh",
        training_ai_coverage: "Yes — explicitly covers AI tools",
        tool_instruction: "Yes, written policy with specific prohibitions",
        dpa_status: "Yes, all vendors",
        dpa_art28_verified: "Yes — verified",
        transfer_status: "Yes, other non-adequate countries",
        transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
        technical_controls: "Yes — DLP/content filtering actively enforced",
        technical_controls_list: ["DLP rules", "Content filtering", "Endpoint upload restrictions"],
        dsr_capability: "Yes — documented and tested across all vendors",
        dsr_rights_tested: ["Access", "Erasure", "Portability", "Rectification"],
        inventory_audit: "Yes — audited + formal approval process",
        additional_context:
          "Sector context: logistics / e-commerce fulfilment operating across 11 EU jurisdictions. " +
          "Additional jurisdictional overlay folded into 'Other': Irish Data Protection Act 2018 as the national implementation of the GDPR. " +
          "Additional operational tools folded into the intake narrative (not on the standard governance tool list): Shopify Plus (storefront platform) and ShipHero WMS (warehouse-management system). " +
          "Additional data category folded into 'Other': order history (used for fulfilment routing and returns). " +
          "Transfer mechanism SCCs are supplemented by transfer impact assessments (TIAs) for each US-based sub-processor.",
      },
    },
    invoke: { fn: "run-governance-assessment", id_key: "assessment_id" },
    poll: { table: "governance_assessments", terminal: ["complete", "failed"], max: 75, interval_ms: 4000 },
  },
};

// --- 5. Governance / US --------------------------------------------------
// SAMPLES-CONTRACT-governance (6/8) reconciliation notes:
//   - Same reconciliation model as F_GOV_EU (see above).
//   - US state overlays (Colorado CPA, Virginia VCDPA, Illinois BIPA)
//     folded into the contract's `Other US States` enum literal; the state
//     specifics — including the BIPA driver (fingerprint timeclocks) —
//     preserved verbatim in `additional_context`.
//   - Tools not on GOV_TOOLS ("Salesforce" ≠ "Salesforce + Einstein",
//     "Snowflake") preserved in `additional_context`.
//   - Biometric identifier specifics folded to the contract enum literal
//     "Biometric data"; fingerprint-templates gloss preserved in
//     `additional_context`.
//   - transfer_status/transfer_mechanism = "n/a" per form behaviour when
//     eu_uk_data === "No" (GovernanceAssessment.tsx L213, L222).
//   - `sample_run` removed for the same reason as EU variant.
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
        organization_name: "Busted Sled Solutions, Inc.",
        sector: "Other",
        org_size: "251-1000",
        jurisdictions: ["California (CCPA/CPRA)", "Other US States"],
        eu_uk_data: "No",
        tools: ["Microsoft 365 / Copilot", "HubSpot"],
        data_categories: [
          "Customer records",
          "Employee records",
          "Contact details",
          "Biometric data",
          "Other",
        ],
        special_category: "Yes",
        special_categories_list: ["Biometric data"],
        privacy_policy: "Yes, current (reviewed in last 12 months)",
        privacy_notice_coverage:
          "Yes — notice covers all current activities, transfers, retention, and rights",
        dpo_status: "Yes, formal DPO",
        dpia_status: "Yes, multiple DPIAs completed",
        dpia_ai_coverage: "Yes — all AI/high-risk tools assessed",
        incident_response: "Yes, tested in last 12 months",
        training_status: "Yes, formal onboarding + annual refresh",
        training_ai_coverage: "Yes — explicitly covers AI tools",
        tool_instruction: "Yes, written policy with specific prohibitions",
        dpa_status: "Yes, all vendors",
        dpa_art28_verified: "Yes — verified",
        transfer_status: "n/a",
        transfer_mechanism: "n/a",
        technical_controls: "Yes — DLP/content filtering actively enforced",
        technical_controls_list: ["DLP rules", "Content filtering", "Endpoint upload restrictions"],
        dsr_capability: "Yes — documented and tested across all vendors",
        dsr_rights_tested: ["Access", "Erasure", "Portability", "Rectification"],
        inventory_audit: "Yes — audited + formal approval process",
        additional_context:
          "Sector context: multi-state US logistics/SaaS with consumer-facing shipment tracking; Delaware-incorporated, Illinois HQ. " +
          "State overlays folded into 'Other US States': Colorado Privacy Act (CPA), Virginia Consumer Data Protection Act (VCDPA), and Illinois Biometric Information Privacy Act (BIPA). " +
          "The Illinois BIPA exposure is driven by fingerprint timeclocks in warehouse operations. " +
          "Additional operational tools folded into the intake narrative (not on the standard governance tool list): Salesforce (CRM) and Snowflake (analytical data warehouse). " +
          "Additional data category folded into 'Other': internet/network activity (product telemetry from the shipment-tracking web experience). " +
          "Biometric identifier specifics: fingerprint templates enrolled and matched at the employee timeclock endpoint.",
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
    "Silver & Gold Cold Storage A/S (Denmark) suffered a ransomware incident on its warehouse-management system, which held driver schedules, employee records, and refrigerated-shipment manifests for ~70 cold-chain customers. Attacker access was contained within 3 hours by network isolation; the encrypted segment was rebuilt from immutable off-site backups. Forensics (Mandiant) confirmed no successful exfiltration and no public leak-site posting; ransomware execution was blocked on the primary tenant and only affected the WMS staging tier. Data at issue also included driver schedules and refrigerated-shipment manifests alongside employee personnel data (~1,900 employees and contractors). Organisation type: cold-chain logistics operator (Denmark). The playbook covers Datatilsynet notification, affected-individual communication, and downstream cold-chain customer notice.",
  source_table: "ir_playbooks",
  result_url_pattern: "/ir-playbook/result/{id}",
  fixture: {
    invoke_body_extras: {
      organizationName: "Silver & Gold Cold Storage A/S",
      discoveryDateTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      cause: "Ransomware or malware",
      dataTypes: ["Names and contact details"],
      affectedCount: "1,000–10,000",
      jurisdictions: ["Denmark", "EU/EEA"],
      processorInvolved: true,
      contained: "Yes",
      organisationType: "Company",
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
    "Busted Sled Solutions, Inc. detected credential-stuffing against the consumer shipment-tracking portal, with successful logins on ~8,400 consumer accounts across California, Colorado, Virginia, and Illinois. Compromised accounts expose shipment history, delivery addresses, and last-4 of payment card (shipment-tracking account data). No direct access to the BIPA-scope fingerprint timeclock data (separate system); linked fingerprint time-clock records are surfaced as an adjacent-scope consideration. Organisation type: logistics-technology company (US multi-state). The playbook covers multi-state notification analysis and BIPA-adjacent considerations from the linked fingerprint timeclock data.",
  source_table: "ir_playbooks",
  result_url_pattern: "/ir-playbook/result/{id}",
  fixture: {
    invoke_body: {
      organizationName: "Busted Sled Solutions, Inc.",
      discoveryDateTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      cause: "Phishing / credential compromise",
      dataTypes: ["Names and contact details", "Biometric data"],
      affectedCount: "1,000–10,000",
      jurisdictions: ["California", "Colorado", "Virginia", "Illinois"],
      processorInvolved: true,
      contained: "Yes",
      organisationType: "Company",
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
      orgName: "Busted Sled Solutions, Inc.",
      orgType: "logistics-technology company",
      biometricTypes: ["fingerprint"],
      purpose:
        "Time and attendance for warehouse shift workers across three Illinois facilities. Sector: Logistics. Vendor: Yes — fingerprint timeclock hardware and template storage provided by a US-based vendor bound by a written BIPA-compliant DPA that prohibits secondary use, sale, or lease of templates and requires deletion on request. Existing consent: Standalone written BIPA release signed by each enrolled worker before enrollment, separate from the employment agreement, referencing specific purpose (time and attendance), retention (3 years after last interaction or separation, whichever first), and destruction schedule. Published BIPA policy on the company intranet and worker handbook. Retention policy: Formally documented and published — templates destroyed when the initial purpose is satisfied or within 3 years of the individual's last interaction, whichever occurs first, with automated deletion job and quarterly attestation.",
      jurisdictions: ["Illinois, USA (BIPA)"],
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
        entity_name: "Tomorrow4Cariboo, Inc.",
        subject_anchor:
          "Consumer shipment-tracking profiles — cross-context behavioural advertising and sale/share of tracking data",
        q1_revenue: "$100M–$500M",
        q2_consumers: "Over 10 million",
        q3_sector: "Media/advertising",
        q4_pi_categories: [
          "Contact identifiers (name, email, phone)",
          "Device identifiers (IP, cookies, device IDs)",
          "Internet or network activity",
          "General location (city, region, ZIP, IP-derived)",
        ],
        q5_sell_share: "Both",
        q5b_profiling_observation: "No",
        q6_right_know: "Online form with identity verification",
        q6_right_know_multi: ["Online form with identity verification"],
        q7_right_delete: "Manual process, documented",
        q8_right_correct: "Online self-service",
        q9_opt_out: "Yes, prominently on homepage",
        q10_id_verification: "Documented verification process matching CPPA guidance",
        q11_policy_review: "Within 12 months",
        q12_notice_at_collection: "Yes, covers all collection points",
        q13_notice_content: "Yes, all three",
        q14_employee_notice: "Yes",
        q15_sensitive_pi: "Yes",
        q15b_under16_knowledge: "No — we do not knowingly process under-16 data",
        q15c_spi_volume: "Fewer than 50,000",
        q16_sensitive_limit: "Yes, with a separate \"Limit the Use of My Sensitive PI\" link",
        q17_sensitive_basis: "Necessary for the service",
        q18_admt_use: "Yes",
        q18b_admt_training: "No",
        q19_admt_description:
          "Audience-scoring models segment consumers into interest cohorts and predicted-purchase-intent bands. Outputs drive bid eligibility and frequency caps. No financial-eligibility, employment, or housing decisions.",
        q20_admt_opt_out: "Yes, with documented opt-out",
        i1_processing_purpose:
          "To generate audience-segment and purchase-intent scores from 13 months of cross-publisher browsing, app-usage, and engagement events, used to determine bid eligibility for advertising auctions on partner publishers.",
        i1b_min_pi:
          "Data elements limited to shipment identifiers, delivery addresses, and device identifiers required for tracking display; quarterly review removes unused elements",
        i2_retention_period: "13 months from last engagement",
        i2_retention_criteria: "Until purpose is fulfilled, then deletion",
        i2_retention_detail: "Rolling 13-month deletion enforced via warehouse lifecycle policy.",
        i3_ca_consumer_band: "More than 1,000,000",
        i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy", "Just-in-time notice"],
        i4b_sources:
          "Directly from consumers at account creation; carrier scan events; device signals from the tracking page",
        i5_admt_logic: "Gradient-boosted ensemble producing a 0–100 segment-affinity score plus a categorical bucket.",
        i5_admt_training_source: "De-identified engagement data 2022–2025 across publisher partners.",
        i5_admt_fairness_testing: "Quarterly subgroup AUC + lift analysis across reported age band, region, and language preference.",
        i5_admt_human_review: "Bid eligibility is fully automated; no human-in-the-loop. Opt-out request immediately suppresses scoring.",
        i6_vendors: "Snowflake (warehouse); AWS (hosting); LiveRamp (identity resolution); ad-exchange partners",
        i7_internal_contributors: "CISO Blitz Zenn; CPO Rudy Rangifer (advisory); VP Engineering; General Counsel; Product Owner",
        i7_external_consultees: "Outside privacy counsel; independent bias auditor (annual)",
        i8_certifying_exec_name: "Rudy Rangifer",
        i8_certifying_exec_title: "Chief Privacy Officer",
        i8_contact_email: "privacy@bustedsled.example",
        i8_contact_phone: "+1 312 555 0148",
        i9_has_existing_dpia: "No",
        i9_existing_dpia_summary: "",
        exceptions_intake: {
          fraud_detection: {
            claimed: true,
            scope: "Velocity and anomaly checks on tracking-account logins and address changes",
            safeguards: "Scoped to security telemetry; 90-day retention; access limited to the fraud team",
          },
          security_integrity: {
            claimed: true,
            scope: "Monitoring of authenticated sessions for credential-stuffing patterns",
            safeguards: "Pseudonymised session identifiers; alerts reviewed by the security team",
          },
          debugging: { claimed: false, scope: "", safeguards: "" },
          transient_use: { claimed: false, scope: "", safeguards: "" },
          internal_research: { claimed: false, scope: "", safeguards: "" },
          employment_context: { claimed: false, scope: "", safeguards: "" },
          legal_compliance: { claimed: false, scope: "", safeguards: "" },
          consumer_request: { claimed: false, scope: "", safeguards: "" },
        },
        impact_intake: {
          likelihood: "Possible",
          severity: "Moderate",
          harmTypes: [
            "Impairment of consumer control over personal information",
            "Unauthorised access, destruction, use, modification, or disclosure",
            "Reputational harm",
          ],
          vulnerable:
            "No known processing of consumers under 16; household tracking pages may be viewed by minors",
          benefitsOutweigh: "Yes",
          benefitsRationale:
            "Real-time shipment visibility and fraud screening benefit consumers directly; advertising revenue funds the free tracking tier",
          cyberGaps: "No",
          businessBenefits: "Fraud-loss reduction; advertising revenue on the free tier",
          consumerBenefits: "Real-time delivery visibility; fewer account-takeover incidents",
          stakeholderBenefits: "Carriers receive fewer misdelivery disputes",
          safeguards:
            "Opt-out honoured within 15 business days; GPC support; role-based access; encryption in transit and at rest",
          harmCauses:
            "Over-broad ad-segment sharing; retention beyond the stated period; credential-stuffing exposure",
        },
        public_privacy_policy_url: "https://www.tomorrow4cariboo.example/privacy",
        // Precise geolocation is truncated to 3 decimals at ingest and
        // excluded from audience models, so no sensitive-location processing
        // occurs at the CCPA § 7150(b)(5) threshold. Selecting the "Not
        // applicable" enum option is the strongest legitimate contract-legal
        // value; supporting narrative captured in scenario_summary above.
        sensitive_location_basis: "Not applicable — no sensitive-location processing",
      },
    },
    invoke: { fn: "run-cppa-risk-assessment", id_key: "assessment_id" },
    poll: { table: "cppa_assessments", terminal: ["complete", "failed", "error"], max: 60, interval_ms: 4000 },
  },
};

// --- 10. CPPA Cyber / US -------------------------------------------------
// Note: tool page (`CPPACybersecurity.tsx`) submits `{ profile, controls: [...] }`
// with controls as an ARRAY of `{ key, label, maturity, notes }`. Per the
// sample-refresh rule "on conflict, the tool page wins", we retain the array
// shape. The 18 control `key`s are re-keyed to match the tool page exactly
// (c1_auth … c18_continuity per CPPACybersecurity.tsx CONTROLS).
const F_CPPA_CYBER_US: SampleFixture = {
  tool_slug: "cppa_cyber",
  variant: "us",
  title: "Cybersecurity readiness for ad-tech processing estate",
  scenario_summary:
    "Cybersecurity readiness assessment for Tomorrow4Cariboo, Inc.'s ad-tech processing estate. CISO Blitz Zenn provided maturity ratings across the 18 CPPA-listed controls; all eighteen assess as implemented with documentation noted, producing a clean readiness posture.",
  source_table: "cppa_assessments",
  result_url_pattern: "/cppa-cybersecurity/result/{id}",
  fixture: {
    insert: {
      module: "cybersecurity",
      status: "pending",
      intake_data: {
        profile: {
          entity_name: "Tomorrow4Cariboo, Inc.",
          industry: "Advertising / Marketing technology",
          incidents_12mo: "None",
          framework: "SOC 2",
          last_audit: "Within 12 months",
          // TURN 3 — scope framing showcase.
          in_scope_frameworks: ["SOC 2", "NIST CSF"],
          audit_scope_rationale:
            "In scope: the multi-tenant ad-tech production estate (AWS us-east-1/us-west-2) and the customer-facing publisher app. Out of scope: internal HR and finance systems (no partner PI processing). Leverages the 2026 SOC 2 Type II under § 7123(f); supplemented for segmentation (§ 7123(c)(10)) and retention (§ 7123(c)(16)) which SOC 2 does not directly test.",
        },
        controls: [
          { key: "c1_auth", label: "Authentication", maturity: "Implemented across organization", notes: "MFA enforced via Okta; SSO for all production systems.", evidence: ["Policy / procedure document", "SOC 2 or auditor letter", "Screenshot / config export"] },
          { key: "c2_encryption", label: "Encryption of personal information", maturity: "Implemented with continuous monitoring", notes: "AES-256 at rest, TLS 1.3 in transit; AWS KMS.", evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"] },
          { key: "c3_account_access", label: "Account management and access controls", maturity: "Implemented across organization", notes: "Automated joiner/leaver via Okta + Terraform; least-privilege reviews quarterly.", evidence: ["Policy / procedure document", "Sample log / report"] },
          { key: "c4_inventory", label: "Inventory and management of personal information and systems", maturity: "Implemented across organization", notes: "Enterprise data map maintained in OneTrust; sensitive-PI inventory reviewed quarterly by CPO and CISO; all production data stores tagged in the CMDB.", evidence: ["Policy / procedure document", "Runbook / SOP"] },
          { key: "c5_secure_config", label: "Secure configuration of hardware and software", maturity: "Implemented across organization", notes: "CIS benchmarks enforced on AWS via config-as-code; hardened AMIs and container base images; endpoint hardening baselines applied via MDM (Jamf/Intune) with quarterly compliance attestation.", evidence: ["Policy / procedure document", "Screenshot / config export"] },
          { key: "c6_vuln_mgmt", label: "Vulnerability scanning and penetration testing", maturity: "Implemented across organization", notes: "Snyk + AWS Inspector; annual third-party pen test; critical patches within 7 days.", evidence: ["Policy / procedure document", "Sample log / report", "Third-party pen test / scan report"] },
          { key: "c7_audit_logs", label: "Audit-log management", maturity: "Implemented across organization", notes: "Centralised Datadog; 13-month retention.", evidence: ["Policy / procedure document", "Sample log / report"] },
          { key: "c8_network_mon", label: "Network monitoring and defenses", maturity: "Implemented with continuous monitoring", notes: "MSSP-run 24/7 SOC; IDS active.", evidence: ["Policy / procedure document", "Runbook / SOP"] },
          { key: "c9_anti_malware", label: "Antivirus and anti-malware protections", maturity: "Implemented across organization", notes: "CrowdStrike on all endpoints.", evidence: ["Policy / procedure document", "Screenshot / config export"] },
          { key: "c10_segmentation", label: "Segmentation of an information system", maturity: "Implemented across organization", notes: "Prod / staging / corporate networks segmented at VPC and IAM boundary; per-tenant micro-segmentation for partner-data tenants via AWS PrivateLink and per-tenant IAM roles; segmentation reviewed quarterly by the security architecture team.", evidence: ["Policy / procedure document", "Runbook / SOP"] },
          { key: "c11_port_protocol", label: "Port and protocol management and protection", maturity: "Implemented across organization", notes: "Default-deny security groups managed as code; quarterly security-group inventory review; egress filtering enforced via AWS Network Firewall with allow-listed destinations for production workloads.", evidence: ["Policy / procedure document", "Screenshot / config export"] },
          { key: "c12_awareness", label: "Cybersecurity awareness", maturity: "Implemented across organization", notes: "Formal enterprise threat-intel programme; membership in Retail & Hospitality ISAC and MS-ISAC; monthly threat-brief circulated to engineering and product; CISO briefs the executive team quarterly.", evidence: ["Policy / procedure document", "Training completion record"] },
          { key: "c13_training", label: "Cybersecurity education and training", maturity: "Implemented across organization", notes: "Annual training + quarterly phishing simulations for all staff.", evidence: ["Policy / procedure document", "Training completion record"] },
          { key: "c14_secure_dev", label: "Secure development and coding practices", maturity: "Implemented across organization", notes: "Formal secure SDLC; mandatory code review; SAST (Semgrep) and SCA (Snyk) enforced in CI; annual secure-coding training for engineers.", evidence: ["Policy / procedure document", "Runbook / SOP", "Third-party pen test / scan report"] },
          { key: "c15_third_party", label: "Oversight of service providers, contractors, and third parties", maturity: "Implemented across organization", notes: "Vendor risk programme with tiered onboarding assessments; DPAs for all processors; SOC 2 reports reviewed annually; continuous monitoring via SecurityScorecard for tier-1 vendors.", evidence: ["Policy / procedure document", "SOC 2 or auditor letter"] },
          { key: "c16_retention", label: "Retention schedules and proper disposal of personal information", maturity: "Implemented across organization", notes: "Enterprise retention schedule published; 13-month deletion enforced on warehouse; automated lifecycle policies on S3 and Snowflake; quarterly disposal attestations.", evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"] },
          { key: "c17_incident", label: "Security-incident response management", maturity: "Implemented across organization", notes: "Formal IR plan owned by CISO; on-call rotation with defined severity playbooks; two full tabletops in the last 12 months (ransomware and credential-stuffing scenarios) plus one live purple-team exercise; retained IR counsel and forensics retainer (Mandiant) on standby.", evidence: ["Policy / procedure document", "Runbook / SOP"] },
          { key: "c18_continuity", label: "Business-continuity and disaster-recovery planning", maturity: "Implemented across organization", notes: "BCP and DR runbooks maintained per system tier; RTO/RPO targets defined and tested; full multi-region failover drill completed in the last 12 months with results reviewed by the executive team.", evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"] },
        ],
      },
    },
    invoke: { fn: "run-cppa-cybersecurity", id_key: "assessment_id" },
    poll: { table: "cppa_assessments", terminal: ["complete", "failed", "error"], max: 60, interval_ms: 4000 },
  },
};

// --- 10b. CPPA ADMT / US -------------------------------------------------
const F_CPPA_ADMT_US: SampleFixture = {
  tool_slug: "cppa_admt",
  variant: "us",
  title: "ADMT gap analysis for an automated loan-approval engine",
  scenario_summary:
    "Tomorrow4Cariboo Lending uses a gradient-boosted ML model to score California loan applicants. The ADMT Compliance Assessment reviews pre-use notice, opt-out mechanisms, and access-right disclosures against 11 CCR §§ 7220–7222 ahead of the January 1, 2027 deadline.",
  source_table: "cppa_assessments",
  result_url_pattern: "/cppa-admt-checker/result/{id}",
  fixture: {
    insert: {
      module: "admt",
      status: "pending",
      intake_data: {
        organization_name: "Tomorrow4Cariboo Lending",
        system_name: "Loan Approval Engine",
        system_type: "Gradient-boosted ML model",
        system_description:
          "A gradient-boosted ensemble scoring loan applications 0–100. Scores below 40 are automatically declined; 40–65 go to underwriter review; above 65 are auto-approved.",
        decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
        human_review: "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
        training_data_use: "Yes",
        profiling_use: "No",
        third_party_admt: "No",
        admt_system_count: "1",

        admt_detail: {},
        notice_delivery: ["In-app just-in-time notice before data collection", "Account-creation or onboarding flow"],
        notice_has_specific_purpose: "Yes",
        notice_purpose_text:
          "We use an automated decision-making technology to evaluate your loan application by scoring your creditworthiness based on income, existing debt, payment history, and application details, so we can decide whether to approve your loan, refer it to a human underwriter, or decline it.",
        notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
        notice_has_access_desc: "Yes",
        notice_has_anti_retaliation: "Yes",
        notice_has_how_it_works: "Yes — via hyperlink or layered notice",
        notice_has_alternative_process: "Yes",
        opt_out_exception: "No exception — we provide a full opt-out right",
        opt_out_methods: ["Interactive online form linked from the Pre-use Notice", "Toll-free phone number", "Designated email address"],
        opt_out_link_title: "Your Privacy Choices",
        opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
        opt_out_no_account_required: "Confirmed — no account required",
        opt_out_confirmation_mechanism: "Confirmation email within 24 hours plus in-app confirmation banner",
        opt_out_15_day_process:
          "Opt-outs processed within 15 business days; confirmation email sent on completion; audit log retained for 24 months",
        opt_out_service_provider_notice:
          "Service providers processing on our behalf are notified of opt-outs within 10 business days via the vendor portal and required by contract to cease ADMT processing within 5 business days of notice",
        opt_out_appeal_process: "Applicants who receive an adverse decision may appeal to a senior human underwriter within 30 days; decisions on appeal issued within 15 business days",
        opt_out_fairness_doc: "Quarterly subgroup performance testing (AUC and adverse-impact ratio) across protected classes; results reviewed by the Model Risk Committee and retained for 5 years",
        access_submission_methods: "Same webform as right-to-know requests at privacy.tomorrow4cariboo.example/requests, plus toll-free number and email",
        access_verification_process: "Email verification plus account login for existing customers; knowledge-based verification for non-account holders",
        access_logic_disclosure:
          "We provide the consumer's individual score, the top five input features that most influenced their score with plain-language explanations, and the score-band thresholds used for approve / refer / decline decisions",
        access_outcome_disclosure:
          "We disclose the decision outcome (approved / referred / declined), the primary factors driving the outcome in plain language, and the steps the consumer can take to improve future outcomes",
        access_response_timeline: "Within 45 calendar days (standard)",
        access_trade_secret_policy: "We do not withhold information required by 11 CCR § 7222 on trade-secret grounds; where a granular model weight would reveal proprietary information, we provide a plain-language equivalent that satisfies the disclosure requirement",
        affected_population_band: "100,001 – 1,000,000",
        role_roster: [
          "Privacy officer / DPO",
          "Product owner",
          "Data scientist / ML engineer",
          "Human reviewer",
          "Legal counsel",
          "Consumer-request handler",
        ],
      },
    },
    invoke: { fn: "run-admt-checker", id_key: "assessment_id" },
    poll: { table: "cppa_assessments", terminal: ["complete", "failed", "error"], max: 120, interval_ms: 4000 },
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
    // author_name and eu_rep_name / uk_rep_name are still read by
    // generate-ropa-document (author_name → header/footer authorship;
    // eu_rep_name / uk_rep_name → representative disclosure block). Keep.
    author_name: "Donna Dasher (DPO)",
    profile: {
      legal_entity_type: "Private limited company (UK)",
      employee_band: "1000+",
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
      { code: "EU_GDPR", name: "European Union", region: "EU & UK" },
      { code: "UK_GDPR", name: "United Kingdom", region: "EU & UK" },
    ],
    activities: [
      {
        activity_name: "Employee HR Processing",
        category: "hr_employment",
        purpose:
          "Recruitment, payroll, benefits administration, performance management, and statutory employment-law compliance for ~2,400 UK employees and contractors.",
        lawful_basis: "contract",
        special_category_basis: "Article 9(2)(b) employment-law condition for occupational-health data",
        data_categories: ["Employee records", "Financial data", "Contact identifiers", "Occupational-health data"],
        data_subjects: "Employees and contractors of North Pole Manual Mining Ltd",
        recipients: "HR team; payroll processor Abominal SM GmbH (DE); HMRC; occupational-health provider",
        transfer_destination: "Germany (Abominal SM GmbH)",
        transfer_mechanism: "UK adequacy regulations — no Art. 46 safeguard required (UK→EEA)",
        retention_period: "Active employment plus 6 years post-termination",
        security_measures: "RBAC, MFA, AES-256 at rest, quarterly access reviews, ISO 27001 vendor.",
      },
      {
        activity_name: "Underground Wearable Safety Telemetry",
        category: "hr_employment",
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
        category: "operations",
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
        category: "third_party",
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
  result_url_pattern: "/eu-notices/review/{id}",
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

// --- WS6 v2.1 supplemental-capture variants ------------------------------
// One "-supplemental" variant per WS6-wired tool family (9 total). Each
// clones the base fixture and injects `supplemental_responses` +
// `supplemental_context` at the fixture's intake locator so stress runs
// exercise the SUPPLEMENTAL RESPONSES consumption path end-to-end.
// LIA supplements land at insert.* (dedicated columns on li_assessments);
// the other 8 tools land inside intake_data / invoke_body_extras per shape.

type SupplementalPayload = {
  supplemental_responses: Array<{ ref_field: string; ask: string; response: string }>;
  supplemental_context: string;
};

function withSupplemental(
  base: SampleFixture,
  at: "insert" | "insert.intake_data" | "invoke_body_extras",
  payload: SupplementalPayload,
  meta: { title: string; scenario_summary: string }
): SampleFixture {
  const fix = JSON.parse(JSON.stringify(base.fixture)) as any;
  if (at === "insert") {
    fix.insert = { ...(fix.insert ?? {}), ...payload };
  } else if (at === "insert.intake_data") {
    fix.insert = fix.insert ?? {};
    fix.insert.intake_data = { ...(fix.insert.intake_data ?? {}), ...payload };
  } else {
    fix.invoke_body_extras = { ...(fix.invoke_body_extras ?? {}), ...payload };
  }
  return {
    ...base,
    variant: `${base.variant}-supplemental`,
    title: meta.title,
    scenario_summary: meta.scenario_summary,
    fixture: fix,
  };
}

const F_LIA_UK_SUPP = withSupplemental(F_LIA_UK, "insert", {
  supplemental_responses: [
    { ref_field: "purpose_details.purpose_text", ask: "Clarify who inside the control room receives the identity re-link on an alarm.", response: "Only the named on-call shift supervisor and the on-shift occupational-health medic; access is logged and reviewed monthly by the works-council H&S representative." },
    { ref_field: "balancing_details.opt_out_mechanism", ask: "Confirm whether reassignment to surface roles preserves pay grade.", response: "Yes — reassignment preserves grade, shift premium, and pension accrual under the works-council agreement; no detriment provisions are explicit in the handbook addendum." },
  ],
  supplemental_context: "Works-council ratification vote passed 14-2 with two abstentions on 4 June; independent H&S consultant Q3 review already booked.",
}, {
  title: "Wearable safety telemetry — supplemental (WS6)",
  scenario_summary: "LIA supplemental-capture variant: clarifies alarm re-link access and reassignment-parity questions raised on the first-pass information_needed list.",
});

const F_DPIA_EU_SUPP = withSupplemental(F_DPIA_EU, "insert.intake_data", {
  supplemental_responses: [
    { ref_field: "necessity_proportionality", ask: "Confirm the raw-frame deletion job is automated end-to-end.", response: "Yes — nightly lifecycle job on the survey-imagery bucket at 02:00 UTC deletes any object with a capture_ts older than 30 days and writes an attestation row to the deletion_ledger table." },
    { ref_field: "retention_period", ask: "State the retention for the blurred derivative products.", response: "Blurred orthomosaics: 5 years to support the mineral-permit lifecycle; retention trigger is permit-cycle close + 5y, enforced by the same lifecycle job." },
  ],
  supplemental_context: "Landesdatenschutzbehörde consultation letter dated 12 May confirms no prior authorisation required given the blurring pipeline and 30-day raw-frame cap.",
}, {
  title: "Drone survey imagery — supplemental (WS6)",
  scenario_summary: "DPIA supplemental-capture variant: closes deletion-automation and derivative-retention questions from the first pass.",
});

const F_DPA_EU_SUPP = withSupplemental(F_DPA_EU, "invoke_body_extras", {
  supplemental_responses: [
    { ref_field: "services", ask: "Specify whether the processor uses sub-processors located outside the EEA.", response: "One sub-processor in the United States (cloud storage tier) covered by SCCs Module 3 with UK addendum; no other extra-EEA sub-processors." },
  ],
  supplemental_context: "Controller has confirmed no additional processing purposes beyond those listed in Annex I(B); the audit right in Clause 7.6(d) is exercised annually.",
}, {
  title: "Controller/processor DPA — supplemental (WS6)",
  scenario_summary: "DPA supplemental-capture variant: closes the sub-processor location question raised on the first pass.",
});

const F_GOV_EU_SUPP = withSupplemental(F_GOV_EU, "insert.intake_data", {
  supplemental_responses: [
    { ref_field: "dpo_status", ask: "State whether the DPO reports directly to the highest management level.", response: "Yes — the DPO reports quarterly to the Management Board and has a standing agenda item; no line-management conflict." },
    { ref_field: "training_status", ask: "Provide completion rate for the most recent annual privacy training round.", response: "96% completion within the 30-day window; the remaining 4% completed within an extended 14-day grace period tracked in the LMS." },
  ],
  supplemental_context: "Board-level privacy review minutes for Q1 and Q2 are on file with the DPO office.",
}, {
  title: "Governance assessment — supplemental (WS6)",
  scenario_summary: "Governance supplemental-capture variant: closes DPO reporting and training-completion questions.",
});

const F_IR_EU_SUPP = withSupplemental(F_IR_EU, "invoke_body_extras", {
  supplemental_responses: [
    { ref_field: "contained", ask: "Confirm the forensics report's conclusion on exfiltration was without qualification.", response: "Mandiant's final report (dated 3 days post-incident) states 'no evidence of data exfiltration' without qualification; egress logs on the affected segment show only backup traffic to the immutable off-site vault." },
  ],
  supplemental_context: "Datatilsynet was pre-notified within 12 hours as a courtesy; formal Art. 33 notice not required given the forensic conclusion but the courtesy note is logged.",
}, {
  title: "Cold-chain ransomware IR — supplemental (WS6)",
  scenario_summary: "IR Playbook supplemental-capture variant: reinforces the no-exfiltration finding for the Art. 33 threshold analysis.",
});

const F_BIO_US_SUPP = withSupplemental(F_BIO_US, "invoke_body_extras", {
  supplemental_responses: [
    { ref_field: "purpose", ask: "Confirm whether the vendor has re-executed standalone BIPA §15(b) releases with all currently enrolled workers.", response: "Yes — vendor written releases (BIPA §15(b)) were re-signed by all currently enrolled workers last month, standalone from the employment agreement, referencing purpose, retention, and destruction schedule." },
  ],
  supplemental_context: "Vendor written release (BIPA §15(b)) has been re-signed by all currently enrolled workers as of last month; retention/destruction schedule attested by the vendor quarterly.",
}, {
  title: "BIPA fingerprint time-clocks — supplemental (WS6)",
  scenario_summary: "Biometric checker supplemental-capture variant: confirms release re-signing.",
});

const F_CPPA_RISK_US_SUPP = withSupplemental(F_CPPA_RISK_US, "insert.intake_data", {
  supplemental_responses: [
    { ref_field: "i1_processing_purpose", ask: "Clarify whether the profiling described in q5b is used for any pricing decision.", response: "No — profiling is used only for content recommendation ranking; pricing is uniform across the audience and is not personalised on any profiling signal." },
    { ref_field: "impact_intake.safeguards", ask: "List the specific safeguard added since the last assessment cycle.", response: "Added per-request logging of the profiling feature vector so DSAR responses can reconstruct the exact ranking inputs used within the 12-month audit window." },
  ],
  supplemental_context: "Cybersecurity audit completed 45 days ago; risk-assessment cadence set to annual with an interim review on any material-change trigger.",
}, {
  title: "CPPA risk assessment — supplemental (WS6)",
  scenario_summary: "CPPA Risk supplemental-capture variant: closes pricing-scope and safeguard-delta questions raised on the first pass.",
});

const F_CPPA_CYBER_US_SUPP = withSupplemental(F_CPPA_CYBER_US, "insert.intake_data", {
  supplemental_responses: [
    { ref_field: "controls.c1_auth", ask: "Confirm phishing-resistant MFA is enforced for all privileged accounts.", response: "Yes — FIDO2 hardware keys enforced for all admin, break-glass, and vendor accounts; TOTP retained only for a small legacy service account slated for retirement next quarter." },
    { ref_field: "controls.c17_incident", ask: "State the tested mean time to contain from the last tabletop exercise.", response: "42 minutes from initial alert to network isolation in the March tabletop; documented in the exercise after-action report." },
  ],
  supplemental_context: "External assessor's Reg. §7123(b) report attests to controls c1–c18; no material gaps flagged.",
}, {
  title: "CPPA cybersecurity audit — supplemental (WS6)",
  scenario_summary: "CPPA Cyber supplemental-capture variant: reinforces c1 (MFA) and c17 (IR) evidence.",
});

const F_CPPA_ADMT_US_SUPP = withSupplemental(F_CPPA_ADMT_US, "insert.intake_data", {
  supplemental_responses: [
    { ref_field: "human_review", ask: "Clarify whether the human reviewer can override the ADMT output in all decision domains.", response: "Yes — the reviewer has unconditional override authority in every decision domain; overrides are logged with the reviewer's ID and reasoning and audited monthly." },
    { ref_field: "opt_out_15_day_process", ask: "State the operational SLA for opt-out processing.", response: "Median 3 business days, 95th percentile 9 business days, hard cap at 14 business days to preserve one-day buffer against the 15-day statutory ceiling." },
  ],
  supplemental_context: "Pre-use notice deployed on all consumer-facing surfaces since Q1; access-request response templates approved by counsel.",
}, {
  title: "ADMT compliance check — supplemental (WS6)",
  scenario_summary: "ADMT supplemental-capture variant: closes human-override scope and opt-out SLA questions.",
});

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
  F_CPPA_ADMT_US,
  F_ROPA_EU,
  F_US_NOTICE,
  F_EU_NOTICE,
  // WS6 v2.1 supplemental-capture variants (9 total, one per wired family)
  F_LIA_UK_SUPP,
  F_DPIA_EU_SUPP,
  F_DPA_EU_SUPP,
  F_GOV_EU_SUPP,
  F_IR_EU_SUPP,
  F_BIO_US_SUPP,
  F_CPPA_RISK_US_SUPP,
  F_CPPA_CYBER_US_SUPP,
  F_CPPA_ADMT_US_SUPP,
];
