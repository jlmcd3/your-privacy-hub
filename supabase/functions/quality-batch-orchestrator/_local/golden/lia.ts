// QB-P20 — LIA golden set. 3 fixtures.
// Adversarial: key fact recorded ONLY in balancing_details.additional_context
// (tests CROSS-READ THE FULL INTAKE discipline).
import type { GoldenCase } from "./types.ts";

const base = {
  organization_name: "Meridian Insights Ltd",
  subject_anchor: "Website visitors",
  processing_description: "Behavioural analytics on the marketing site to measure conversion funnels.",
  data_categories: ["Browsing/behavioural data", "Device/technical data"],
  relationship_type: "Website visitor (no account)",
  jurisdictions: ["United Kingdom (UK GDPR)"],
  stated_purpose: "Measure conversion funnel performance to improve marketing efficiency.",
  alternatives_considered: "Aggregated third-party analytics considered but rejected due to lack of funnel-step attribution.",
  purpose_details: { interest_holder: "Meridian Insights Ltd", interest_type: "Commercial — marketing effectiveness", interest_statement: "Measure funnel to improve site." },
  necessity_details: { alternatives: "Aggregated telemetry considered; insufficient granularity." },
  balancing_details: {
    reasonable_expectation: "Yes",
    potential_harm: "Minor",
    opt_out_mechanism: "Consent banner with granular reject-all; server-side suppression on opt-out.",
  },
  stage: "submitted",
  preview_assessment_id: "gold-preview-id-000",
};

export const LIA_GOLDEN: GoldenCase[] = [
  {
    id: "lia-uk-analytics-tuning",
    tool: "lia",
    set: "tuning",
    // UPGRADE-4: the perfect tuning cases carry the ICO three-part-arc inputs
    // and the attestation close, so the seven upgrade-4 deliverables exercise
    // the analysed path rather than the record_insufficient scaffold.
    intake: {
      ...base,
      purpose_details: {
        ...base.purpose_details,
        specific_benefit:
          "Funnel-step attribution shows which of the six marketing landing pages loses visitors before the enquiry form, so spend is moved off the pages that do not convert instead of being increased across all of them.",
        beneficiary: "Our business",
      },
      necessity_details: {
        ...base.necessity_details,
        alternatives_rationale:
          "Aggregated third-party analytics — reports session totals per page but carries no step-to-step attribution, so it cannot show where in the funnel a visitor leaves.\nServer-log analysis alone — records requests but not in-page interactions, so form-abandonment is invisible.\nVisitor surveys — response rates below 2% on the marketing site, which is not a representative basis for reallocating spend.",
      },
      balancing_details: {
        ...base.balancing_details,
        relationship_category: "Member of the public — no relationship",
        scale_approx: "Approximately 42,000 unique website visitors per month across the UK marketing site",
        frequency: "Continuous during each site session; typically one to three sessions per visitor per month",
        duration: "Event-level behavioural data retained 13 months; aggregate funnel metrics 24 months",
        potential_harms: [
          "Loss of autonomy or control over data",
          "Distress or intrusion",
        ],
        opt_out_available: "Yes — unconditional, on request, with no consequence",
      },
      attestation: {
        dpo_reviewed: "Yes",
        dpo_reviewer: "Priya Raghunathan, Data Protection Officer",
        dpo_review_date: "2026-05-14",
        approver_name: "Tom Ellery",
        approver_position: "Head of Marketing",
        approval_date: "2026-05-21",
        review_triggers: [
          "A change in the purpose of the processing",
          "A change in the categories of data used",
          "An objection or complaint from a data subject",
          "New or amended regulatory guidance",
        ],
      },
    },
    assertions: [
      { kind: "must_include", pattern: "legitimate interest|Article\\s*6\\(1\\)\\(f\\)", flags: "i", label: "LI basis named" },
      // W3-T2: per-factor balancing objects with intake_evidence.
      { kind: "must_include", pattern: "reasonable_expectations", label: "factor: reasonable_expectations present" },
      { kind: "must_include", pattern: "\"factor\"\\s*:\\s*\"relationship\"", label: "factor: relationship present" },
      { kind: "must_include", pattern: "impact_severity", label: "factor: impact_severity present" },
      { kind: "must_include", pattern: "\"factor\"\\s*:\\s*\"safeguards\"", label: "factor: safeguards present" },
      { kind: "must_include", pattern: "intake_evidence", label: "factors carry intake_evidence anchors" },
      // UPGRADE-4 — presence only (verdict strings are model-dependent).
      { kind: "must_include", pattern: "interest_legitimacy", label: "upgrade-4: interest_legitimacy present" },
      { kind: "must_include", pattern: "attestation_block", label: "upgrade-4: attestation_block present" },
    ],
  },
  {
    id: "lia-fintech-fraud-tuning",
    tool: "lia",
    set: "tuning",
    intake: {
      ...base,
      organization_name: "Helios Payments",
      subject_anchor: "Merchant customers",
      processing_description: "Fraud scoring across merchant transaction streams.",
      data_categories: ["Financial data", "Device/technical data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      stated_purpose: "Detect and prevent payment fraud.",
      purpose_details: {
        ...base.purpose_details,
        interest_holder: "Helios Payments and the merchants whose settlements it processes",
        interest_type: "Fraud prevention on the payments book",
        interest_statement: "Identify fraudulent card transactions before settlement funds leave the merchant account.",
        specific_benefit:
          "Fraudulent authorisations are held before settlement, so the merchant does not carry the chargeback loss and the cardholder is not debited for a transaction they did not make.",
        beneficiary: "Our business and the individuals",
      },
      necessity_details: {
        ...base.necessity_details,
        alternatives:
          "Scheme-level fraud flags alone; manual review of every transaction above a value threshold — both tested and rejected.",
        alternatives_rationale:
          "Scheme-level fraud flags alone — carry no merchant-specific transaction history, so first-party fraud patterns on a known merchant stream are not detected.\nManual review above a value threshold — delays legitimate settlement by two working days, which defeats same-day settlement rather than merely costing more.\nPost-settlement recovery — the funds have already left the account, so the loss is realised before any control operates.",
      },
      balancing_details: {
        ...base.balancing_details,
        relationship_category: "Customer",
        scale_approx: "Approximately 3.1 million card transactions per month across 8,400 merchant accounts",
        frequency: "Every card authorisation is scored in real time, continuously",
        duration: "Transaction scores retained 24 months; confirmed-fraud case records 6 years",
        potential_harms: [
          "Financial loss",
          "Exclusion from a service",
          "Loss of autonomy or control over data",
        ],
        opt_out_available: "No opt-out is available",
      },
      attestation: {
        dpo_reviewed: "Yes",
        dpo_reviewer: "Anneke Verhoeven, Group Data Protection Officer",
        dpo_review_date: "2026-04-09",
        approver_name: "Lars Bergqvist",
        approver_position: "Chief Risk Officer",
        approval_date: "2026-04-16",
        review_triggers: [
          "A change in the purpose of the processing",
          "A change in the categories of data used",
          "A material change to the fraud-scoring model",
          "An objection or complaint from a data subject",
          "New or amended regulatory guidance",
        ],
      },
    },
    assertions: [
      { kind: "must_include", pattern: "necessity", flags: "i", label: "necessity assessed" },
      { kind: "must_include", pattern: "reasonable_expectations", label: "factor: reasonable_expectations present" },
      { kind: "must_include", pattern: "impact_severity", label: "factor: impact_severity present" },
      { kind: "must_include", pattern: "intake_evidence", label: "factors carry intake_evidence anchors" },
      // UPGRADE-4 — presence only (verdict strings are model-dependent).
      { kind: "must_include", pattern: "interest_legitimacy", label: "upgrade-4: interest_legitimacy present" },
      { kind: "must_include", pattern: "attestation_block", label: "upgrade-4: attestation_block present" },
    ],
  },
  {
    id: "lia-fact-in-balancing-only-adversarial",
    tool: "lia",
    set: "adversarial",
    intake: {
      ...base,
      organization_name: "Cascade HR Ltd",
      subject_anchor: "Employees",
      processing_description: "Internal collaboration analytics.",
      relationship_type: "Employee",
      // R-TURN-1 item 8 — HR sector override: prevent website-visitor
      // marketing base fields (data_categories, stated_purpose,
      // purpose_details) from leaking into an employee-analytics fixture.
      data_categories: ["Collaboration-platform metadata", "Employee identifiers"],
      stated_purpose: "Understand internal collaboration patterns and workload distribution to support workforce planning.",
      purpose_details: { interest_holder: "Cascade HR Ltd", interest_type: "Employer — workforce administration", interest_statement: "Support workload planning and internal collaboration." },
      necessity_details: { alternatives: "Manager self-report considered; insufficient granularity and consistency for workload planning." },
      balancing_details: {
        ...base.balancing_details,
        // Fact recorded ONLY here — tests cross-read:
        additional_context: "Analytics EXCLUDES manager-only channels; managers were consulted 2026-05-12 (Works Council minutes filed).",
      },
    },
    assertions: [
      { kind: "must_include", pattern: "Works Council|manager", flags: "i",
        label: "consumes fact from balancing_details.additional_context" },
      { kind: "must_include", pattern: "reasonable_expectations", label: "factor: reasonable_expectations present" },
      { kind: "must_include", pattern: "\"factor\"\\s*:\\s*\"safeguards\"", label: "factor: safeguards present" },
      { kind: "must_include", pattern: "intake_evidence", label: "factors carry intake_evidence anchors" },
    ],
  },
  {
    // R-TURN-3: absence-convention adversarial fixture. Intake omits any
    // safeguards or opt-out signal, so the safeguards factor MUST use the
    // absence convention (intake_evidence: [], evidence_absence populated).
    id: "lia-absence-convention-adversarial",
    tool: "lia",
    set: "adversarial",
    intake: {
      ...base,
      organization_name: "Northwind Retail Ltd",
      subject_anchor: "Loyalty-programme members",
      processing_description: "Segmentation of loyalty-programme members for cross-sell campaigns.",
      data_categories: ["Loyalty-programme transaction history", "Contact identifiers"],
      relationship_type: "Existing customer (loyalty enrolment)",
      stated_purpose: "Improve relevance of cross-sell offers to loyalty members.",
      balancing_details: {
        reasonable_expectation: "Yes",
        potential_harm: "Minor",
        // R-TURN-3 absence convention target is the SAFEGUARDS factor
        // (safeguards / safeguards_other / additional_context all omitted).
        // opt_out_mechanism is required-always by the LIA contract; we
        // populate it with a scenario-consistent narrative that itself
        // records an absence of a working mechanism, so the adversarial
        // intent (evidence_absence surfaces on the safeguards factor) is
        // preserved while the contract validator passes.
        opt_out_mechanism: "No standing opt-out mechanism is offered to loyalty members for cross-sell segmentation; profile removal requires unsubscribing from the loyalty programme.",
      },
    },
    assertions: [
      { kind: "must_include", pattern: "evidence_absence", label: "safeguards factor uses R-TURN-3 absence convention" },
      { kind: "must_include", pattern: "does not present", flags: "i", label: "canonical absence sentence surfaces" },
      { kind: "must_include", pattern: "\"factor\"\\s*:\\s*\"safeguards\"", label: "safeguards factor present" },
    ],
  },
  {
    // ITEM 311 — "Perfect Data" case. Supplies EVERY field the Chapter 7
    // rebuild added (balancing_details.collection_context /
    // .children_data_subjects / .additional_mitigations,
    // purpose_details.controller_is_public_authority / .public_task_processing)
    // with specific, scenario-bound content, so the lia deliverables exercise
    // the ANALYSED path rather than the record_insufficient scaffold.
    //
    // The collection_context is deliberately written to the RELATIONSHIP and
    // the SETTING of collection rather than to a notice — a notice-only record
    // is downgraded to partly_expected by design (EDPB 1/2024: the mere
    // fulfilment of information duties is not sufficient in itself).
    //
    // additional_mitigations carries one measure the GDPR already requires and
    // one that goes beyond it, so both arms of the EDPB II.C.4 classification
    // are exercised by a single fixture.
    id: "lia-perfect-record",
    tool: "lia",
    set: "tuning",
    intake: {
      organization_name: "Halden Acquiring AB",
      subject_anchor: "Merchant principals and their named finance contacts",
      processing_description:
        "Transaction-level fraud screening across the acquiring book: each card authorisation is scored against the merchant's own settlement history and against chargeback patterns on the acquiring portfolio, and scores above threshold hold the settlement for manual review.",
      data_categories: ["Purchase/transaction history", "Financial data", "Device/technical data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      stated_purpose:
        "Detect and hold fraudulent card settlements on the acquiring book before funds leave the client account.",
      alternatives_considered:
        "Scheme-level fraud flags alone were tested over the 2025 book and missed 41 of 63 confirmed first-party fraud cases because they carry no merchant settlement history; manual review of every settlement above EUR 2,000 was costed and rejected because it delays legitimate settlement by two working days, which defeats the purpose of same-day acquiring rather than merely costing more.",
      purpose_details: {
        interest_holder: "Halden Acquiring AB and the merchants whose settlements it holds",
        interest_type: "Fraud prevention on the acquiring book",
        interest_statement:
          "Halden Acquiring AB carries the settlement loss on fraudulent card authorisations under its scheme membership; the interest is in identifying those authorisations before funds leave the client account, and it is present rather than speculative — 63 first-party fraud cases were confirmed on the 2025 book.",
        controller_is_public_authority: "No",
        public_task_processing: "Not applicable",
      },
      necessity_details: {
        alternatives:
          "Scheme-level fraud flags alone were tested over the 2025 book and missed 41 of 63 confirmed cases because they carry no merchant settlement history; manual review of every settlement above EUR 2,000 was costed and rejected because it delays legitimate settlement by two working days, which defeats same-day acquiring.",
        why_consent_not_used:
          "A merchant asked to consent to fraud screening of its own settlements could withdraw that consent and continue to transact, which would leave the acquiring book unscreened at exactly the point where screening matters.",
        data_minimised:
          "Scoring reads settlement amount, timing, terminal identifier and chargeback history only; cardholder identity fields are not read into the model and the score is discarded 90 days after settlement clears.",
      },
      balancing_details: {
        reasonable_expectation: "Yes",
        reasonable_expectation_detail:
          "Fraud screening of settlements is a condition of scheme membership that the merchant itself relies on when it disputes a chargeback.",
        collection_context:
          "The data are collected at merchant onboarding, in the acquiring agreement signed on the merchant's premises or through the onboarding portal, and thereafter automatically at each card authorisation the merchant itself initiates. Fraud screening of those authorisations was described and negotiated at onboarding as part of the settlement terms, and it operates continuously from the first transaction — it is not a later use of data collected for something else.",
        children_data_subjects: "No",
        vulnerable_subjects: ["None"],
        potential_harm: "Moderate",
        potential_harm_detail:
          "A false positive holds a merchant's settlement for up to 24 hours, which for a small merchant can delay supplier payments; it does not affect the cardholder and does not produce a scheme-level record against the merchant.",
        safeguards: [
          "Access controls / least privilege",
          "Retention limits",
          "Independent oversight (DPO / privacy committee)",
        ],
        opt_out_mechanism:
          "A merchant may request that scoring be limited to scheme-level flags only; the request is actioned within one business day and recorded against the merchant record, with the trade-off (slower chargeback defence) set out in writing.",
        additional_mitigations:
          "Encryption at rest and in transit across the scoring pipeline; a merchant whose settlement is held may demand human re-review by a named analyst within 24 hours and receive the reason the score fired, neither of which the GDPR requires of the controller",
        special_category_data: false,
        additional_context:
          "The threshold was recalibrated on 2026-03-02 after the false-positive rate on merchants under EUR 50,000 monthly volume was found to be three times the book average.",
      },
      stage: "submitted",
      preview_assessment_id: "gold-preview-id-311",
    },
    assertions: [
      { kind: "must_include", pattern: "reasonable_expectations", label: "named reasonable-expectations finding present" },
      { kind: "must_include", pattern: "child_factor", label: "child factor is an explicit determination" },
      { kind: "must_include", pattern: "public_authority_exclusion", label: "public-authority exclusion is an explicit determination" },
      { kind: "must_include", pattern: "lia_determination", label: "determination object present" },
      { kind: "must_include", pattern: "mitigations", label: "determination carries mitigations" },
    ],
  },
  {
    // DOC 225 — V3 HOOK-AGREED FIXTURE.
    //
    // Designed for when LIA_HOOKS_ENABLED is true in a test environment and
    // the authority_hooks corpus contains a ratified direct-marketing hook.
    //
    // Scenario: email direct marketing to a subscriber list.  This maps
    // cleanly to class:direct_marketing + flag:electronic_marketing +
    // relationship:customer.  Both legs of the two-leg selection pass are
    // expected to agree ("same") on the hook's fact pattern — the processing
    // description names the marketing channel explicitly, the `opt_out_available`
    // atom is the unconditional variant, and no distinguishing atom (e.g.
    // flag:children) fires on this record.
    //
    // All fifteen V3 free-text fields are populated with substantive, span-able
    // content so the AI leg has enough material to find a verbatim evidence_span.
    // The assertions cover the deterministic engine output only — hook-sentence
    // assertions are intentionally absent because LIA_HOOKS ships [] and hook
    // output only appears when the corpus is populated and the flag is on.
    id: "lia-v3-direct-marketing-hook-agreed",
    tool: "lia",
    set: "tuning",
    intake: {
      organization_name: "Westlake Brands Ltd",
      subject_anchor: "Opted-in email subscribers",
      processing_description:
        "Westlake Brands sends promotional email newsletters and product-launch announcements to individuals who have joined its mailing list through the website subscription form. Each send uses first-party list data only (name and email address held in the CRM). The sending platform applies a one-click unsubscribe link on every message and a list-cleaning suppression on any address that bounces or opts out. No profiling, segmentation by inferred attributes, or third-party data enrichment takes place.",
      data_categories: ["Contact data"],
      relationship_type: "Existing customer",
      jurisdictions: ["United Kingdom (UK GDPR)"],
      stated_purpose:
        "Maintain direct marketing contact with opted-in subscribers to inform them of product launches, seasonal promotions, and brand news, using the email channel the subscriber selected at sign-up.",
      alternatives_considered:
        "Consent under Article 6(1)(a) was considered and rejected as the primary basis: the subscribers joined the mailing list voluntarily and the ICO's direct-marketing guidance confirms that legitimate interests is available for marketing to existing customers where a clear opt-out is offered. Paid social advertising considered but rejected as it requires sharing data with advertising platforms.",
      purpose_details: {
        interest_holder: "Our business",
        interest_type: "Commercial / revenue-related",
        interest_statement:
          "Westlake Brands has a commercial interest in informing existing customers of product launches and promotions through the channel — email — that the customer voluntarily selected when joining the mailing list. The interest is present and specific: without direct email contact the subscriber cohort cannot be informed of launches they opted in to receive.",
        specific_benefit:
          "Email announcements to the opted-in list drive 18–22 % of seasonal revenue, measured by tracked click-through to purchase. Subscribers who receive launch emails convert at four times the rate of uncontacted website visitors, according to the 2025 campaign analysis. The benefit accrues to both the business (revenue) and the subscriber (advance notice of products they expressed interest in).",
        beneficiary: "Our business and the individuals",
        controller_is_public_authority: "No",
        public_task_processing: "Not applicable",
        device_access: "No",
      },
      necessity_details: {
        alternatives:
          "Consent under Article 6(1)(a); paid social advertising to lookalike audiences; SMS marketing; in-app push notifications.",
        alternatives_rationale:
          "Consent — subscribers signed up voluntarily through a dedicated mailing-list form whose purpose was stated as receiving marketing emails; re-seeking consent from that group would be circular and would not improve transparency or control. The ICO's direct-marketing guidance confirms that legitimate interests is the appropriate basis for marketing to existing customers who have not objected.\nPaid social advertising — requires sharing the subscriber email list with a social platform's advertising system, which is a data-sharing step the subscriber did not agree to when joining the mailing list; it would be more intrusive, not less.\nSMS — a more intrusive channel that requires a separate subscriber opt-in; Westlake does not hold mobile numbers for the email subscriber cohort.\nPush notifications — available only to customers who have the Westlake app installed (a small subset of the subscriber list).",
        why_consent_not_used:
          "Consent is not the processing basis because the subscribers joined the mailing list specifically to receive product emails, and the ICO confirms that legitimate interests applies to direct email marketing to existing customers where a genuine opt-out is available and honoured. Using consent as the basis would not change what the subscriber receives — only the legal label — and would add a re-consent friction that the subscriber would find unexpected given how they joined.",
        data_minimised:
          "The send reads name and email address only. No behavioural data from previous sends (opens, clicks) is used to select recipients or personalise content — the same newsletter goes to every opted-in subscriber. Click and open events are logged for aggregate campaign reporting, not for per-subscriber profiling.",
        achievable_without_personal_data_rationale: null,
      },
      balancing_details: {
        reasonable_expectation: "Yes",
        reasonable_expectation_detail:
          "The subscriber provided their email address through a form titled 'Join our mailing list' and confirmed their subscription via a double-opt-in email. The form stated that joining would result in receiving product news and promotions by email. Receiving exactly that content is within the reasonable expectation created at the point of collection — it is not a new or extended use of the address.",
        collection_context:
          "Email addresses are collected through the website subscription form, through checkout (where customers may tick a newsletter opt-in), and at in-store events where visitors leave a business card. All collection points present the mailing-list purpose and a link to the privacy notice. The double-opt-in flow confirms the subscriber's intent before the address is added to the active list.",
        children_data_subjects: "No",
        vulnerable_subjects: ["None"],
        potential_harm: "Minor",
        potential_harm_detail:
          "The principal intrusion risk is receiving marketing email the subscriber did not want — but the subscriber chose the channel and a one-click unsubscribe is on every message. Data-security risk is limited to name and email address; a breach of the list would expose contact details but not financial, health, or identity data. There is no automated decision-making.",
        potential_harms: [
          "Unwanted commercial communications if opt-out is delayed or missed",
          "Email address exposure in a data breach",
        ],
        safeguards: ["Retention limits", "Access controls / least privilege"],
        safeguards_other:
          "One-click unsubscribe on every email, actioned within 10 days per PECR requirements; quarterly list suppression to remove bounced and opted-out addresses; email platform access limited to the two-person marketing team; subscriber list stored in the CRM behind MFA and not shared with any third-party advertising system.",
        opt_out_mechanism:
          "A one-click unsubscribe link is present on every email. Subscribers may also email marketing@westlakebrands.co.uk or write to the registered address. Unsubscribes are honoured within 10 days and confirmed by reply email.",
        opt_out_available: "Yes — unconditional, on request, with no consequence",
        special_category_data: false,
        relationship_category: "Customer",
        scale_approx:
          "Approximately 14,200 active opted-in subscribers on the UK mailing list",
        frequency:
          "Typically two to four emails per month; peak of six per month during major product launches",
        duration:
          "Subscriber records retained while the subscription is active plus 12 months after unsubscribe, then deleted. Email send logs retained 24 months for PECR compliance.",
        additional_mitigations:
          "Westlake conducts an annual review of the mailing list against suppression registers (the TPS is not applicable to email but the internal do-not-contact list is cross-checked) and removes any address that has not opened or clicked in 24 months, reducing the effective send volume and the data footprint.",
        additional_context:
          "Westlake does not sell, license, or share the subscriber list with any third party. All sending infrastructure is UK-hosted. The mailing-list programme has been in place since 2019; the basis for processing was reviewed and updated to the legitimate-interests basis following ICO guidance in 2022.",
        statutory_restrictions: null,
        employment_safeguards: null,
      },
      attestation: {
        dpo_reviewed: "Yes",
        dpo_reviewer: "Clare Okonkwo, Data Protection Officer",
        dpo_review_date: "2026-06-03",
        approver_name: "Sam Whitfield",
        approver_position: "Head of Marketing",
        approval_date: "2026-06-10",
        review_triggers: [
          "A change in the purpose of the processing",
          "A change in the categories of data used",
          "An objection or complaint from a data subject",
          "New or amended regulatory guidance",
          "A material change to the email platform or data processor",
        ],
      },
      stage: "submitted",
      preview_assessment_id: "gold-preview-id-v3-hook-agreed",
    },
    assertions: [
      { kind: "must_include", pattern: "legitimate interest|Article\\s*6\\(1\\)\\(f\\)", flags: "i", label: "LI basis named" },
      { kind: "must_include", pattern: "reasonable_expectations", label: "factor: reasonable_expectations present" },
      { kind: "must_include", pattern: "impact_severity", label: "factor: impact_severity present" },
      { kind: "must_include", pattern: "\"factor\"\\s*:\\s*\"safeguards\"", label: "factor: safeguards present" },
      { kind: "must_include", pattern: "intake_evidence", label: "factors carry intake_evidence anchors" },
      { kind: "must_include", pattern: "interest_legitimacy", label: "upgrade-4: interest_legitimacy present" },
      { kind: "must_include", pattern: "attestation_block", label: "upgrade-4: attestation_block present" },
      // V3 context: direct marketing class must surface in the report
      { kind: "must_include", pattern: "direct.marketing|marketing.*email|email.*marketing", flags: "i", label: "direct-marketing processing class acknowledged" },
      // V3 context: hook-shaped S1–S6x sentences are NOT hallucinations — the
      // grader must not deduct for their presence when LIA_HOOKS_ENABLED is on.
      // This assertion fires even with hooks off (the pattern simply won't match,
      // so the must_not_include below would be vacuously met). When hooks ARE on
      // in a test env, the output should never contain a fabrication deduction.
    ],
  },
  {
    // DOC 225 — V3 HOOK-DISAGREED FIXTURE (ROO path).
    //
    // Designed for when LIA_HOOKS_ENABLED is true and a ratified hook exists
    // for the fraud_prevention class.  The processing description deliberately
    // mentions BOTH fraud detection and behavioural analytics, and the
    // organisation sells age-restricted products, so the flag:children
    // distinguishing atom is ambiguous.  Leg 1 may read "same" (the context
    // is fraud prevention, children are disclaimed), while Leg 2 may read
    // "different" (the age-restriction mention triggers a flag:children reading
    // from the balancing_details).  That split → legs_disagreed → the engine
    // emits an information_needed entry from LIA_ROO_UNSETTLED_TEMPLATE.
    //
    // The grader MUST NOT deduct for the information_needed entry.  See
    // DOC 225 section in SHARED_GRADER_CONTEXT.  Assertions cover the
    // deterministic engine output only (hooks empty in production).
    id: "lia-v3-fraud-detection-hook-disagreed",
    tool: "lia",
    set: "adversarial",
    intake: {
      organization_name: "Thorne Vintners Ltd",
      subject_anchor: "Trade customers placing online orders",
      processing_description:
        "Thorne Vintners runs an online wholesale portal for licensed trade customers (restaurants, bars, hotels) who order cases of wine and spirits. Each order is screened for payment fraud before dispatch: the scoring model reads the delivery address, order value, the customer's prior-order and chargeback history, and four checkout device signals. Scores above threshold hold the order for manual review by the accounts team. As a secondary analytics function, aggregated order-pattern data is analysed quarterly to identify slow-moving stock and adjust purchasing forecasts — but no individual customer is profiled for that purpose. The portal is not accessible to consumers or to individuals under the age of 18; all registered accounts are verified as licensed trade premises at onboarding.",
      data_categories: ["Purchase/transaction history", "Financial data", "Device/technical data"],
      relationship_type: "Existing customer",
      jurisdictions: ["United Kingdom (UK GDPR)"],
      stated_purpose:
        "Detect and hold fraudulent card orders on the wholesale portal before dispatch, and analyse aggregated order patterns to support purchasing decisions — two distinct purposes operated from the same order dataset.",
      alternatives_considered:
        "Scheme-level fraud flags alone were insufficient (they missed first-party fraud patterns on specific trade accounts). Manual review of every order was costed and rejected (four accounts staff cannot review the 800–1,200 daily orders within dispatch SLAs). Aggregated third-party market data was considered for the purchasing-forecast function but rejected because it does not reflect Thorne's own regional trade patterns.",
      purpose_details: {
        interest_holder: "Our business",
        interest_type: "Security / fraud prevention",
        interest_statement:
          "Thorne Vintners carries the settlement loss on fraudulent card orders; the fraud-screening interest is present and quantifiable — 47 confirmed fraudulent orders were written off in 2025 at a total cost of GBP 28,400. The purchasing-forecast interest is commercial operational benefit: reducing overstock on slow-moving lines reduces warehouse costs.",
        specific_benefit:
          "Pre-dispatch fraud screening prevented an estimated GBP 22,000 in fraud loss in the first six months of operation (2026 Q1–Q2) by holding 31 orders before dispatch that were subsequently confirmed fraudulent. The aggregated stock-trend analysis reduced over-ordering on three underperforming lines by 15 % in the same period.",
        beneficiary: "Our business",
        controller_is_public_authority: "No",
        public_task_processing: "Not applicable",
        device_access: "Yes",
        device_access_strictly_necessary: "Yes — all of it is strictly necessary",
      },
      necessity_details: {
        alternatives:
          "Scheme-level fraud flags alone; manual review of every order above a value threshold; declining card-not-present orders from new accounts in the first 90 days.",
        alternatives_rationale:
          "Scheme-level flags alone — these carry no trade-account history, so they miss the first-party fraud pattern (a known account whose card details are compromised and used for a high-value order to a different delivery address).\nManual review above a value threshold — the median fraudulent order in the 2025 sample was GBP 580, below any workable threshold; a threshold set to catch that value would hold approximately 40 % of legitimate orders.\nNew-account restriction — excludes new legitimate trade customers from the portal for 90 days, which the sales team confirmed would lose onboarding orders to competitors.",
        why_consent_not_used:
          "A trade customer asked to consent to fraud screening of their own orders could withdraw that consent; a customer intending to place a fraudulent order would do so, defeating the screening entirely. Consent is not a workable basis for a control that operates on every transaction.",
        data_minimised:
          "Fraud scoring reads delivery address, order value, account history and four checkout device signals. No cardholder identity data beyond what the payment processor returns is read into the model. Device signals are discarded after 90 days; fraud scores after 18 months; the underlying order record follows the seven-year accounting retention.",
        achievable_without_personal_data_rationale: null,
      },
      balancing_details: {
        reasonable_expectation: "Yes",
        reasonable_expectation_detail:
          "Trade customers know they are ordering on a licensed-wholesale portal subject to payment terms and account verification. Fraud screening of payments is standard practice in trade wholesale; it is disclosed in the portal's terms of business and the privacy notice presented at account registration. The purchasing-forecast analysis uses aggregated data only and no individual is identified in it.",
        collection_context:
          "Order and payment data are collected at the time each order is placed on the portal. Device signals are collected by the checkout page. Account history is accumulated from prior orders placed by the same registered trade account.",
        children_data_subjects: "No",
        vulnerable_subjects: ["None"],
        potential_harm: "Moderate",
        potential_harm_detail:
          "A false-positive fraud hold delays a trade customer's order by up to one business day and may disrupt a restaurant's stock if the hold falls before a weekend. Repeated holds on a legitimate account create a poor customer experience. Device-signal collection reveals some information about the customer's equipment that they did not set out to disclose.",
        potential_harms: [
          "Delay of legitimate trade orders causing supply disruption",
          "Loss of autonomy or control over device data",
        ],
        safeguards: ["Retention limits", "Access controls / least privilege"],
        safeguards_other:
          "No order is refused by the score alone — every held order is reviewed by a named accounts team member within four business hours. Device signals are discarded at 90 days. Fraud scores and case notes are accessible only to accounts-team accounts (four users). The portal's checkout device signals do not include advertising identifiers, canvas fingerprinting, or location data.",
        opt_out_mechanism:
          "Trade customers may request that fraud screening be limited to scheme-level flags only by contacting their account manager; the request is recorded against the account and actioned within one business day. The trade-off (slower chargeback defence on the account) is set out in writing.",
        opt_out_available: "Yes — but conditional or subject to review",
        special_category_data: false,
        relationship_category: "Customer",
        scale_approx:
          "Approximately 800–1,200 trade orders per day across 2,400 active account holders",
        frequency:
          "Every card order is screened at the point of authorisation; typically two to three orders per trade account per week",
        duration:
          "Device signals retained 90 days; fraud scores 18 months; order records seven years",
        additional_mitigations:
          "The fraud-detection threshold is reviewed quarterly against the false-positive rate on established accounts; accounts with more than 36 months of clean history are placed on a lower-scrutiny tier. This is not required by the UK GDPR but reduces unnecessary holds on long-standing customers.",
        additional_context:
          "The portal is restricted to licensed trade premises verified at onboarding via a valid premises licence number. No consumer or retail customer has access; there is no age-verification step in the fraud-screening process because all accounts are pre-verified as adult trade buyers. The purchasing-forecast analysis is operated entirely on server-side aggregates — no personal data is exported to the analytics tool.",
        statutory_restrictions: null,
        employment_safeguards: null,
      },
      attestation: {
        dpo_reviewed: "Yes",
        dpo_reviewer: "Hannah Finch, Data Protection Consultant",
        dpo_review_date: "2026-07-11",
        approver_name: "David Osborne",
        approver_position: "Finance Director",
        approval_date: "2026-07-18",
        review_triggers: [
          "A change in the purpose of the processing",
          "A change in the categories of data used",
          "An objection or complaint from a data subject",
          "New or amended regulatory guidance",
          "A material change to the fraud-scoring model or thresholds",
        ],
      },
      stage: "submitted",
      preview_assessment_id: "gold-preview-id-v3-hook-disagreed",
    },
    assertions: [
      { kind: "must_include", pattern: "legitimate interest|Article\\s*6\\(1\\)\\(f\\)", flags: "i", label: "LI basis named" },
      { kind: "must_include", pattern: "necessity", flags: "i", label: "necessity assessed" },
      { kind: "must_include", pattern: "reasonable_expectations", label: "factor: reasonable_expectations present" },
      { kind: "must_include", pattern: "impact_severity", label: "factor: impact_severity present" },
      { kind: "must_include", pattern: "intake_evidence", label: "factors carry intake_evidence anchors" },
      { kind: "must_include", pattern: "interest_legitimacy", label: "upgrade-4: interest_legitimacy present" },
      { kind: "must_include", pattern: "attestation_block", label: "upgrade-4: attestation_block present" },
      // V3 ROO context: when LIA_HOOKS_ENABLED is true and legs disagree,
      // an information_needed entry is emitted from LIA_ROO_UNSETTLED_TEMPLATE.
      // The grader MUST NOT flag that entry as a defect (see DOC 225 in context.ts).
      // With hooks off (production) the assertion below is vacuously satisfied.
      { kind: "must_include", pattern: "fraud.prevention|payment.fraud|fraudulent", flags: "i", label: "fraud-prevention purpose class acknowledged" },
    ],
  },
];

