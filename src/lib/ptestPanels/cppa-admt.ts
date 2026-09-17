// /all-ptest fixture panel — cppa-admt. Fifteen complete, internally consistent
// intakes authored 2026-09-14 (see ./types.ts and scripts/ptest/PANEL-BRIEF.md).
// Validated by tests/edge/ptest/panels.test.ts.

import type { PanelFixture } from "./types.ts";

export const PANEL_CPPA_ADMT: PanelFixture[] = [
  // ── p01 — Meridian Trust Bank, N.A.: lending, human reviewer with full
  // authority, full opt-out right, vendor-hosted scoring engine. ──────────
  {
    id: "cppa-admt-p01-lending-vendor-hosted-full-optout",
    tool: "cppa-admt",
    label: "Community bank credit decisioning — vendor-hosted model, reviewer with override authority, full opt-out",
    company: "Meridian Trust Bank, N.A.",
    sector: "Community banking and consumer lending",
    geo: "us",
    summary:
      "Meridian licenses a vendor-hosted credit decisioning engine that scores consumer loan applications; a senior underwriter reviews every score alongside other file materials and can override it, and the bank offers a full opt-out with no exception claimed. Exercises: Financial/lending domain, human review with override authority, vendor-hosted ADMT with full vendor documentation, and a fully-answered § 7221 opt-out handling checklist.",
    intake: {
      organization_name: "Meridian Trust Bank, N.A.",
      system_name: "Consumer Credit Decisioning Engine (CCD Engine v5)",
      system_type: "Vendor-hosted gradient-boosted scoring model",
      system_description:
        "Every consumer loan and credit-line application submitted through Meridian's retail and online banking channels is scored by the Consumer Credit Decisioning Engine, a hosted service licensed from FinScore Analytics Inc. The model reads verified income, twelve months of deposit-account cash-flow data, bureau tradeline data from Apex Bureau Analytics LLC, requested amount and term, and prior Meridian repayment history where one exists. It returns a 300-850 score band and the top three factors driving the score. A senior underwriter reviews the score together with the applicant's file, any adverse-action factors, and any explanation the applicant supplied, and has authority to approve, modify pricing, or decline regardless of the score.",
      decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
      human_review:
        "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
      training_data_use: "Yes",
      profiling_use: "Yes",

      notice_delivery: [
        "Included in our Notice at Collection",
        "Separate standalone Pre-use Notice",
      ],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the Consumer Credit Decisioning Engine to score your loan or credit-line application and to help decide whether to approve it, on what terms, and at what interest-rate tier. We do not use it to decide whether to close an existing account.",
      notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — included inline in the notice",
      notice_has_alternative_process: "Yes",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception: "No exception — we provide a full opt-out right",
      opt_out_handling_confirmations: [
        "No identity verification is required to submit an opt-out request (§ 7221(f))",
        "One option opts the consumer out of every use of ADMT we make for significant decisions (§ 7221(i))",
        "We accept opt-out requests from an authorized agent with the consumer's signed permission (§ 7221(j))",
        "We do not ask a consumer who opted out to consent again for at least 12 months (§ 7221(k))",
        "An opt-out received before processing begins prevents that processing (§ 7221(m))",
      ],
      opt_out_methods: [
        "Interactive online form linked from the Pre-use Notice",
        "Toll-free phone number",
        "Designated email address",
      ],
      opt_out_link_title: "Apply Without Automated Credit Scoring",
      opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      opt_out_no_account_required: "Confirmed — no account required",
      opt_out_confirmation_mechanism:
        "A confirmation email is sent from privacy@meridiantrustbank.com within one business hour of the request, quoting the application reference number, and the opt-out is logged against the application record in the loan-origination system before underwriting begins.",
      opt_out_appeal_process:
        "An applicant may also ask a branch manager to reconsider any declined application within thirty days; the manager, who did not originate the decision, reviews the file without the score and may approve the loan on manual underwriting terms.",
      opt_out_fairness_doc:
        "Meridian's compliance department commissioned an independent disparate-impact review of CCD Engine outcomes from Highmark Fair Lending Analytics, dated 2026-04-02, testing approval and pricing distribution across race, ethnicity, sex and age proxies over 14,600 applications; the report is retained in the fair-lending file MTB-DIR-2026.",
      opt_out_15_day_process:
        "Opt-out requests route to the manual-underwriting desk on receipt; a decision on the manually-underwritten application issues within fifteen business days, with escalation to the Chief Credit Officer at day ten if still open.",

      access_submission_methods:
        "Requests are accepted through the privacy request form at meridiantrustbank.com/privacy-request, the toll-free line 1-877-555-0119, and by email to privacy@meridiantrustbank.com; every channel opens a ticket in the compliance case-management system.",
      access_verification_process:
        "The requester confirms the application reference number, the last four digits of the SSN on file, and the date of birth on the application, then completes a one-time passcode sent to the phone number of record; an authorized agent must additionally supply signed written authorization.",
      access_logic_disclosure:
        "Meridian supplies a plain-language explanation naming the five inputs the CCD Engine uses (income, deposit cash flow, bureau tradelines, requested amount and term, and prior repayment history where applicable), the direction each pushed the score, the score band returned, and the top three factors driving that applicant's result. Underlying model weights are withheld under the trade-secret policy below.",
      access_outcome_disclosure:
        "The response states the score band returned, the date it was returned, the underwriting decision the senior underwriter issued, the approved amount and pricing tier if approved, and the adverse-action reasons if declined.",
      access_response_timeline: "Within 45 days with documented 45-day extension capability",
      access_trade_secret_policy:
        "The CCD Engine's model coefficients and score-band thresholds are withheld as trade secrets of FinScore Analytics Inc. under Cal. Civ. Code § 3426.1(d); the withholding is noted on the response and the plain-language factor explanation above is supplied in full.",

      ca_consumer_count: "82,000",
      third_party_admt:
        "Yes — the scoring engine itself is a hosted service licensed from FinScore Analytics Inc., engaged as a service provider under a CCPA service-provider addendum dated 2026-02-10; bureau tradeline data is separately supplied by Apex Bureau Analytics LLC under a standard credit-reporting agreement.",
      admt_system_count: "1",
      affected_population_band: "10,001 – 100,000",
      role_roster: [
        "Executive sponsor",
        "Privacy officer / DPO",
        "Legal counsel",
        "Product owner",
        "Data scientist / ML engineer",
        "Human reviewer",
        "Consumer-request handler",
        "Vendor manager",
      ],

      admt_detail: {
        vendor_status: "Service provider",
        vendor_docs: ["Model card / datasheet", "Validation report", "Bias-testing report", "SOC 2 / pen test"],
        vendor_makes_available: "Yes",
        v_audit: "Yes",
        v_assist: "Yes",
        v_optout: "Yes",
        v_appeal: "Yes",
        v_incident: "Yes",
        hosting: "Hosted by the vendor",
        model_types: ["Statistical model", "ML classifier"],
        decision_effects: ["Eligibility", "Pricing", "Denial", "Provision"],
        decision_cadence: "Repeated",
        sole_factor: "Material factor — heavily weighted alongside others",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        decision_domains_other: "",
        hi_reviewer_present: "Yes — on every decision",
        hi_reviewer_role: "Senior Underwriter, Consumer Lending",
        hi_stage: "Before the decision is issued",
        hi_trained: "Yes",
        hi_reviews_other_info: "Yes",
        hi_authority_override: "Yes",
        hi_override_rate: "About one scored application in fifteen over the trailing twelve months",
        other_factors: "Deposit-account cash-flow trend, employment verification, and any written explanation the applicant supplied for adverse bureau entries",
        vendor_product: "FinScore Analytics Inc. — Consumer Credit Decisioning Platform (CCD Engine v5)",
        vendor_training_rights: "No — the service-provider addendum prohibits FinScore from using Meridian applicant data to train or improve models for other customers",
        appeal_reviewer_role: "Branch manager independent of the original underwriting decision",
        appeal_trained: "Yes",
        appeal_authority_overturn: "Yes",
        appeal_step_count: "2",
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "Yes — documented testing record",
        access_secure_transmission: "Encrypted self-service portal",
        access_denial_basis: "Adverse-action reasons are disclosed in full under the Equal Credit Opportunity Act; no trade-secret withholding applies to the outcome disclosure itself.",
      },

      notice_element_text: {
        purpose:
          "We use the Consumer Credit Decisioning Engine to score your loan or credit-line application and help decide whether to approve it, on what terms, and at what pricing tier.",
        optout:
          "You can ask us to underwrite your application without the Consumer Credit Decisioning Engine. Use the link 'Apply Without Automated Credit Scoring' on our website, call 1-877-555-0119, or email privacy@meridiantrustbank.com. We confirm within one business hour and issue a manually-underwritten decision within fifteen business days.",
        access:
          "You can ask us for an explanation of how the Engine scored your application. Submit the request at meridiantrustbank.com/privacy-request, by phone, or by email; we respond within 45 days and will tell you if we need one additional 45-day extension.",
        antiretaliation:
          "We will not deny your application, offer you worse pricing, or provide a lower level of service because you asked us to underwrite your application without the Engine or because you asked for an explanation.",
        howworks_inputs:
          "The Engine considers your verified income, twelve months of deposit-account cash flow, bureau tradeline data, the amount and term you requested, and your prior repayment history with us, if any.",
        howworks_output:
          "It returns a score band and the top three factors that drove your result; a senior underwriter reviews that score with your full file and has authority to approve, adjust pricing, or decline regardless of the score.",
        altprocess:
          "If you opt out, a senior underwriter manually reviews your application from your income and cash-flow documentation and your bureau report, without the Engine's score, and issues a lending decision within fifteen business days.",
      },
      notice_full_text:
        "PRE-USE NOTICE — AUTOMATED CREDIT DECISIONING (Meridian Trust Bank, N.A., published 2026-01-12, meridiantrustbank.com/admt-notice)\n\nWhat we use it for. We use the Consumer Credit Decisioning Engine to score your loan or credit-line application and help decide whether to approve it, on what terms, and at what pricing tier.\n\nHow it works. The Engine considers your verified income, twelve months of deposit-account cash flow, bureau tradeline data, the amount and term you requested, and your prior repayment history with us, if any. It returns a score band and the top three factors that drove your result; a senior underwriter reviews that score with your full file and has authority to approve, adjust pricing, or decline regardless of the score.\n\nYour right to opt out. You can ask us to underwrite your application without the Engine. Use the link 'Apply Without Automated Credit Scoring' on our website, call 1-877-555-0119, or email privacy@meridiantrustbank.com. You do not need an account to opt out. We confirm within one business hour and issue a manually-underwritten decision within fifteen business days.\n\nWhat happens instead. A senior underwriter manually reviews your application from your income and cash-flow documentation and your bureau report, without the Engine's score, and issues a lending decision within fifteen business days.\n\nYour right to an explanation. You can ask us for an explanation of how the Engine scored your application. Submit the request at meridiantrustbank.com/privacy-request, by phone, or by email. We respond within 45 days and will tell you if we need one additional 45-day extension. Model weights are withheld as trade secrets and we will say so on the response.\n\nNo retaliation. We will not deny your application, offer you worse pricing, or provide a lower level of service because you opted out or asked for an explanation.\n\nQuestions. Privacy Officer, Meridian Trust Bank, N.A., 220 Commerce Plaza, Springfield, IL 62701 — privacy@meridiantrustbank.com.",

      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process: "The consumer-request handler inserts the published purpose paragraph from the current Pre-use Notice register entry.",
        b2_logic_ready: "Yes — we can produce this today",
        b2_logic_process: "The handler runs the CCD Engine's explanation report, which lists the five inputs and the top three factors driving the score.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process: "The loan-origination audit trail records the score band and the underwriter's decision on it.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The final underwriting decision, approved amount and pricing tier are read from the loan file and stated in the response.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The origination system names the underwriter who reviewed the score and the action taken.",
        b4_rights_ready: "Yes — we can produce this today",
        b4_rights_process: "The response template carries the anti-retaliation statement and a link to the rights section of the privacy policy.",
      },
    },
  },

  // ── p02 — Cascadia Home Rentals LLC: housing, reviewer with authority,
  // full opt-out, vendor-supplied tenant-screening input. ─────────────────
  {
    id: "cppa-admt-p02-housing-reviewer-authority",
    tool: "cppa-admt",
    label: "Regional landlord tenant-screening score — housing domain, reviewer with override authority",
    company: "Cascadia Home Rentals LLC",
    sector: "Residential property management",
    geo: "us",
    summary:
      "Cascadia scores rental applications with an in-house model that folds in a vendor eviction-search feed; a leasing supervisor reviews every score and can override it before a lease decision issues, and the company offers a full opt-out. Exercises: Housing domain with the § 7001(ddd)(2) basis question answered 'other factors are considered', reviewer-with-authority human review, and a named third-party data vendor distinct from the ADMT system itself.",
    intake: {
      organization_name: "Cascadia Home Rentals LLC",
      system_name: "Tenant Placement Score (TPS 3.1)",
      system_type: "In-house statistical scoring model",
      system_description:
        "Every completed rental application submitted through the Cascadia resident portal is scored by the Tenant Placement Score model before a leasing supervisor issues a decision. The model reads verified monthly income against posted rent, eighteen months of rental-payment history supplied by prior landlords, an eviction-record search returned by vendor Northgate Screening Services, and application-packet completeness. It returns a three-tier placement recommendation (Standard, Elevated Deposit, Refer to Manual Review) and the two inputs that moved the tier furthest. A leasing supervisor reviews the tier, the applicant packet, and any written explanation supplied, and issues the leasing decision; the model never issues a decision on its own.",
      decision_domains: ["Housing (rental or purchase eligibility)"],
      human_review:
        "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
      training_data_use: "Yes",
      profiling_use: "Yes",

      notice_delivery: [
        "Separate standalone Pre-use Notice",
        "In-app just-in-time notice before data collection",
      ],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the Tenant Placement Score to decide whether to approve your rental application, whether to require a higher security deposit, or whether to send your application to manual review. We do not use it to set the advertised rent.",
      notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — included inline in the notice",
      notice_has_alternative_process: "Yes",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception: "No exception — we provide a full opt-out right",
      opt_out_handling_confirmations: [
        "No identity verification is required to submit an opt-out request (§ 7221(f))",
        "One option opts the consumer out of every use of ADMT we make for significant decisions (§ 7221(i))",
        "An opt-out received before processing begins prevents that processing (§ 7221(m))",
      ],
      opt_out_methods: [
        "Interactive online form linked from the Pre-use Notice",
        "Designated email address",
        "In-person form",
      ],
      opt_out_link_title: "Review My Application Without Automated Scoring",
      opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      opt_out_no_account_required: "Confirmed — no account required",
      opt_out_confirmation_mechanism:
        "An automated confirmation email is sent from leasing@cascadiahomerentals.com within four business hours of the request, and the same confirmation is logged against the application record in the resident portal.",
      opt_out_fairness_doc:
        "Cascadia commissioned an annual disparate-impact review of Tenant Placement Score outcomes from Cedarline Housing Analytics; the 2026 review, dated 2026-03-10, tested placement-tier distribution across race, familial status, source of income and disability proxies over 6,200 applications.",
      opt_out_15_day_process:
        "Opt-out requests route to the manual-review queue on receipt; the queue must complete a non-automated assessment and issue the leasing decision within fifteen business days, escalating to the Director of Leasing at day ten if still open.",

      access_submission_methods:
        "Requests are accepted through the privacy request form at cascadiahomerentals.com/privacy-request, at any leasing office, and by email to privacy@cascadiahomerentals.com; every route opens a ticket in the resident-request register.",
      access_verification_process:
        "The requester confirms the application reference number and the property applied for, then completes a one-time code sent to the email on the application; authorized agents must additionally supply signed authorization.",
      access_logic_disclosure:
        "Cascadia supplies a plain-language explanation naming the four inputs (income-to-rent ratio, eighteen-month rental-payment history, eviction-record search result, packet completeness), the direction each pushed the tier, the tier returned, and the two inputs that moved this applicant's tier furthest.",
      access_outcome_disclosure:
        "The response states the tier the model returned, the date it was returned, the leasing decision issued, and whether a higher deposit was required or the application was referred to manual review.",
      access_response_timeline: "Within 45 calendar days (standard)",
      access_trade_secret_policy:
        "The tier-threshold table is withheld as a trade secret under Cal. Civ. Code § 3426.1(d); the plain-language logic explanation above is supplied in full regardless.",

      ca_consumer_count: "6,200",
      third_party_admt:
        "Yes — the eviction-record search input is returned by Northgate Screening Services, a consumer reporting agency engaged as a service provider under a CCPA addendum dated 2026-01-15; the scoring model itself runs on Cascadia's own infrastructure.",
      admt_system_count: "1",
      affected_population_band: "1,000 – 10,000",
      role_roster: [
        "Privacy officer / DPO",
        "Legal counsel",
        "Product owner",
        "Human reviewer",
        "Consumer-request handler",
        "Vendor manager",
      ],

      admt_detail: {
        vendor_status: "Service provider",
        vendor_docs: ["SOC 2 / pen test"],
        vendor_makes_available: "Unsure",
        v_audit: "Yes",
        v_assist: "Yes",
        v_optout: "Yes",
        v_appeal: "No",
        v_incident: "Yes",
        hosting: "Hosted internally",
        model_types: ["Statistical model"],
        decision_effects: ["Eligibility", "Denial", "Provision"],
        decision_cadence: "Repeated",
        sole_factor: "Material factor — heavily weighted alongside others",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        housing_decision_basis: "No — other factors are considered",
        decision_domains_other: "",
        hi_reviewer_present: "Yes — on every decision",
        hi_reviewer_role: "Leasing Supervisor",
        hi_stage: "Before the decision is issued",
        hi_trained: "Yes",
        hi_reviews_other_info: "Yes",
        hi_authority_override: "Yes",
        hi_override_rate: "About one scored application in twenty over the trailing twelve months",
        other_factors: "Income-to-rent ratio verified by the leasing supervisor and the applicant's own written explanation",
        vendor_product: "Northgate Screening Services — Eviction Record Search API",
        vendor_training_rights: "No — the addendum prohibits Northgate from using Cascadia applicant data for model training",
        appeal_reviewer_role: "Regional Leasing Manager independent of the original decision",
        appeal_trained: "Yes",
        appeal_authority_overturn: "Yes",
        appeal_step_count: "2",
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "Yes — documented testing record",
        access_secure_transmission: "Encrypted self-service portal",
        access_denial_basis: "Adverse rental-decision reasons are disclosed in full to the applicant; no withholding applies to the outcome disclosure.",
      },

      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process: "The consumer-request handler copies the published purpose paragraph from the current notice register entry.",
        b2_logic_ready: "Yes — we can produce this today",
        b2_logic_process: "The handler runs the TPS explanation report, which lists the four inputs and the two that moved the tier furthest.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process: "The application audit trail records the tier returned and the supervisor's decision.",
        b3_outcome_ready: "Partially — we can produce some of it",
        b3_outcome_process: "The leasing decision is on the application record, but deposit-tier history is stored in a separate finance system requiring manual retrieval.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The portal names the leasing supervisor who reviewed the tier and the action taken.",
        b4_rights_ready: "Yes — we can produce this today",
        b4_rights_process: "The response template includes the anti-retaliation statement and a link to the rights section of the resident handbook.",
      },

      notice_element_text: {
        purpose:
          "We use the Tenant Placement Score to decide whether to approve your rental application, whether to require a higher security deposit, or whether to send your application to manual review.",
        optout:
          "You can ask us to review your application without the Tenant Placement Score. Use the link 'Review My Application Without Automated Scoring' in the resident portal, or email leasing@cascadiahomerentals.com. We confirm within four business hours and issue a manual-review decision within fifteen business days.",
        access:
          "You can ask us for an explanation of how the Score reached your result. Submit the request at cascadiahomerentals.com/privacy-request, at any leasing office, or by email; we respond within 45 calendar days.",
        antiretaliation:
          "We will not deny your application, charge a higher deposit, or provide a lower level of service because you asked us to review your application without the Score or because you asked for an explanation.",
        howworks_inputs:
          "The Score uses four things: your income compared with the rent, eighteen months of rental-payment history, an eviction-record search from Northgate Screening Services, and whether your application packet is complete.",
        howworks_output:
          "It returns one of three tiers — Standard, Elevated Deposit, or Refer to Manual Review — together with the two inputs that moved your tier the most; a leasing supervisor reviews the tier with your packet before issuing the decision.",
        altprocess:
          "If you opt out, a leasing supervisor assesses your application manually from your packet and payment history, without the Score, and issues the leasing decision within fifteen business days.",
      },
      notice_full_text:
        "PRE-USE NOTICE — AUTOMATED TENANT SCREENING (Cascadia Home Rentals LLC, published 2026-01-20, cascadiahomerentals.com/admt-notice)\n\nWhat we use it for. We use the Tenant Placement Score to decide whether to approve your rental application, whether to require a higher security deposit, or whether to send your application to manual review.\n\nHow it works. The Score uses four things: your income compared with the rent, eighteen months of rental-payment history, an eviction-record search from Northgate Screening Services, and whether your application packet is complete. It returns one of three tiers — Standard, Elevated Deposit, or Refer to Manual Review — together with the two inputs that moved your tier the most; a leasing supervisor reviews the tier with your packet before issuing the decision.\n\nYour right to opt out. You can ask us to review your application without the Score. Use the link 'Review My Application Without Automated Scoring' in the resident portal, or email leasing@cascadiahomerentals.com. You do not need an account to opt out. We confirm within four business hours and issue a decision within fifteen business days.\n\nWhat happens instead. A leasing supervisor assesses your application manually from your packet and payment history, without the Score, and issues the leasing decision within fifteen business days.\n\nYour right to an explanation. You can ask us for an explanation of how the Score reached your result. Submit the request at cascadiahomerentals.com/privacy-request, at any leasing office, or by email. We respond within 45 calendar days.\n\nNo retaliation. We will not deny your application, charge a higher deposit, or provide a lower level of service because you opted out or asked for an explanation.\n\nQuestions. Privacy Officer, Cascadia Home Rentals LLC, 480 Harborview Drive, Suite 210, Tacoma, WA 98402 — privacy@cascadiahomerentals.com.",
    },
  },

  // ── p03 — BrightPath Staffing Solutions, Inc.: hiring, advisory human
  // review, hiring/admission exception with bias-testing evidence. ───────
  {
    id: "cppa-admt-p03-hiring-admission-exception",
    tool: "cppa-admt",
    label: "Staffing agency resume-ranking model — hiring domain, advisory-only review, § 7221(b)(2) exception claimed",
    company: "BrightPath Staffing Solutions, Inc.",
    sector: "Staffing and recruitment services",
    geo: "us",
    summary:
      "BrightPath uses a vendor resume-ranking model to shortlist candidates; recruiters can see the ranking but cannot override it before the shortlist is generated, so the record answers 'Partial' human review, and BrightPath claims the § 7221(b)(2) hiring/admission opt-out exception supported by documented non-discrimination testing. Exercises: hiring domain, advisory (non-overriding) human review, the hiring/admission exception with its bias-testing evidence block, and a third-party AI vendor.",
    intake: {
      organization_name: "BrightPath Staffing Solutions, Inc.",
      system_name: "Candidate Shortlist Ranker (CSR)",
      system_type: "Vendor-supplied NLP resume-ranking model",
      system_description:
        "Every candidate application submitted for a BrightPath-managed requisition is parsed and scored by the Candidate Shortlist Ranker, a hosted service from Talent Signal AI Corp. The model reads the resume text, the application questionnaire answers, and years of relevant experience self-reported by the candidate, and returns a 0-100 fit score used solely to order candidates for recruiter review. A recruiter sees the score and the ranked list before deciding whom to contact for a screening call, but the score itself determines the initial ordering the recruiter starts from; the recruiter does not re-score or annotate a reason to move a candidate up the list before first contact.",
      decision_domains: ["Hiring or admission decisions"],
      human_review: "Partial — reviewer sees the output but cannot override it",
      training_data_use: "Yes",
      profiling_use: "Yes",

      notice_delivery: ["Account-creation or onboarding flow"],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the Candidate Shortlist Ranker to score and order applications for open positions so recruiters can prioritize their initial outreach. It does not make a hiring decision.",
      notice_has_opt_out_desc: "We rely on an exception and the notice identifies the specific exception",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — included inline in the notice",
      notice_has_alternative_process: "Not applicable — we rely on an opt-out exception",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception:
        "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination",
      opt_out_fairness_doc:
        "Talent Signal AI Corp.'s quarterly bias audit (report TSA-BIAS-2026Q2, dated 2026-06-30) is the fairness and non-discrimination testing documentation supporting this exception; it is retained in BrightPath's vendor file and summarized in the bias-testing block below.",
      admt_detail: {
        vendor_status: "Service provider",
        vendor_docs: ["Model card / datasheet", "Bias-testing report"],
        vendor_makes_available: "Yes",
        v_audit: "Yes",
        v_assist: "Yes",
        v_optout: "No",
        v_appeal: "No",
        v_incident: "Yes",
        hosting: "Hosted by the vendor",
        model_types: ["ML classifier"],
        decision_effects: ["Ranking", "Eligibility"],
        decision_cadence: "Repeated",
        sole_factor: "One of many factors",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        decision_domains_other: "",
        hi_reviewer_present: "Sometimes / on a subset",
        hi_reviewer_role: "Staffing recruiter reviewing the top-20 ranked candidates",
        hi_stage: "After the decision (review of completed decisions)",
        hi_trained: "Yes",
        hi_reviews_other_info: "Yes",
        hi_authority_override: "No",
        hi_override_rate: "Recruiters occasionally contact candidates outside the top 20, tracked at roughly 4% of hires",
        other_factors: "Years of self-reported relevant experience and the application questionnaire answers",
        vendor_product: "Talent Signal AI Corp. — Candidate Shortlist Ranker (CSR v2.3)",
        vendor_training_rights: "Yes — the master services agreement permits Talent Signal to use de-identified ranking outcomes to retrain the shared model across customers",
        sole_use_attestation: "Yes — solely to assess ability to perform",
        nondiscrimination_testing: "Yes — documented testing record",
        bias_protected_chars: ["Race", "Sex / gender", "Age", "National origin"],
        bias_proxy_vars:
          "The vendor's bias audit flagged zip code and undergraduate institution name as potential proxies for race and national origin; BrightPath configured the model to exclude both fields from scoring in 2026-02.",
        bias_testing_cadence: "Pre-deployment + ongoing monitoring",
        bias_last_test: "2026-06-30",
        bias_next_test: "2026-12-31",
        bias_adverse_impact: "No",
        bias_outcome_summary:
          "The 2026-06-30 quarterly audit by Talent Signal AI Corp. found no statistically significant adverse impact on the ranking outcomes for any protected class tested, across 3,140 applications scored in the quarter; the full report (TSA-BIAS-2026Q2) is retained in BrightPath's vendor file.",
        access_secure_transmission: "Encrypted email",
        access_denial_basis: "Not applicable — the model ranks candidates for outreach priority and does not itself deny an application.",
      },

      access_submission_methods:
        "Requests are accepted through the applicant portal at brightpathstaffing.com/privacy-request and by email to privacy@brightpathstaffing.com; each request opens a ticket in the HR compliance tracker.",
      access_verification_process:
        "The requester confirms the application reference number and the email address used to apply, then completes a one-time code sent to that email.",
      access_logic_disclosure:
        "BrightPath supplies a plain-language explanation naming the three inputs the Ranker uses (resume text, questionnaire answers, self-reported years of experience) and the general basis for the fit score; individual scoring weights are withheld under the trade-secret policy below.",
      access_outcome_disclosure:
        "The response states the fit score band the candidate received, the date it was returned, and whether the candidate's application was reviewed by a recruiter for outreach.",
      access_response_timeline: "Within 45 calendar days (standard)",
      access_trade_secret_policy:
        "The Ranker's scoring weights are withheld as a trade secret of Talent Signal AI Corp. under Cal. Civ. Code § 3426.1(d); the general logic explanation above is supplied in full.",

      ca_consumer_count: "3,140",
      third_party_admt:
        "Yes — the ranking model is a hosted service from Talent Signal AI Corp., engaged as a service provider under a master services agreement dated 2025-11-01.",
      admt_system_count: "1",
      affected_population_band: "1,000 – 10,000",
      role_roster: [
        "Privacy officer / DPO",
        "Legal counsel",
        "Product owner",
        "Vendor manager",
        "Consumer-request handler",
      ],

      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process: "The consumer-request handler inserts the published purpose paragraph from the onboarding-flow notice text.",
        b2_logic_ready: "Yes — we can produce this today",
        b2_logic_process: "The handler names the three inputs (resume text, questionnaire answers, self-reported years of experience) and the general basis for the fit score from the vendor's published model card.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process: "The applicant-tracking system records the fit score band and whether a recruiter reviewed the application.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The tracking system records whether the candidate was contacted for a screening call.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The tracking system records which recruiter reviewed the ranked list and, for the top-20 default review, that no re-scoring occurred before contact.",
        b4_rights_ready: "Yes — we can produce this today",
        b4_rights_process: "The response template carries the anti-retaliation statement and a link to the applicant privacy notice.",
      },

      notice_element_text: {
        purpose:
          "We use the Candidate Shortlist Ranker to score and order your application so recruiters can prioritize their initial outreach. It does not make a hiring decision.",
        optout:
          "We rely on the § 7221(b)(2) hiring/admission exception: because the Ranker is used solely to assess candidates' relevant ability and is tested for unlawful discrimination, we do not offer a separate opt-out right for this use.",
        access:
          "You can ask us for an explanation of how the Ranker scored your application. Submit the request through the applicant portal or by email to privacy@brightpathstaffing.com; we respond within 45 calendar days.",
        antiretaliation:
          "We will not take an adverse action against you because you asked for an explanation of how the Ranker scored your application.",
        howworks_inputs:
          "The Ranker reads your resume text, your application questionnaire answers, and your self-reported years of relevant experience.",
        howworks_output:
          "It returns a 0-100 fit score used only to order applications for recruiter review; a recruiter reviews the ranked list and decides whom to contact for a screening call.",
        altprocess: "",
      },
      notice_full_text:
        "PRE-USE NOTICE — AUTOMATED CANDIDATE RANKING (BrightPath Staffing Solutions, Inc., published 2026-02-01, brightpathstaffing.com/admt-notice)\n\nWhat we use it for. We use the Candidate Shortlist Ranker to score and order your application so recruiters can prioritize their initial outreach. It does not make a hiring decision.\n\nHow it works. The Ranker reads your resume text, your application questionnaire answers, and your self-reported years of relevant experience, and returns a 0-100 fit score used only to order applications for recruiter review. A recruiter reviews the ranked list and decides whom to contact for a screening call.\n\nYour rights. We rely on the § 7221(b)(2) hiring/admission exception: because the Ranker is used solely to assess candidates' relevant ability and is tested for unlawful discrimination, we do not offer a separate opt-out right for this use. You can ask us for an explanation of how the Ranker scored your application by submitting a request through the applicant portal or by email to privacy@brightpathstaffing.com; we respond within 45 calendar days. We will not take an adverse action against you because you asked for an explanation.\n\nQuestions. Privacy Officer, BrightPath Staffing Solutions, Inc., 900 Enterprise Way, Suite 400, Charlotte, NC 28202 — privacy@brightpathstaffing.com.",
    },
  },

  // ── p04 — Summit Ridge University: education admission, reviewer with
  // authority, notice not yet published. ──────────────────────────────────
  {
    id: "cppa-admt-p04-education-notice-not-yet-provided",
    tool: "cppa-admt",
    label: "University admissions triage score — education domain, notice not yet published, compliance program mid-build",
    company: "Summit Ridge University",
    sector: "Higher education",
    geo: "us",
    summary:
      "Summit Ridge built an in-house admissions triage model this year; an admissions officer reviews and can override every recommendation, but the university has not yet published a Pre-use Notice, so the record exercises the 'We have not yet provided a Pre-use Notice' branch and the corresponding gaps in the notice-element and access-readiness answers, alongside a still-offered full opt-out and a fully-answered § 7221 handling checklist.",
    intake: {
      organization_name: "Summit Ridge University",
      system_name: "Admissions Triage Model (ATM)",
      system_type: "In-house statistical scoring model",
      system_description:
        "Every completed undergraduate application submitted through the Summit Ridge applicant portal is scored by the Admissions Triage Model, which reads self-reported GPA, standardized test scores where submitted, the number and type of advanced coursework completed, and extracurricular-activity categories selected by the applicant. It returns a triage tier (Priority Review, Standard Review, Additional-Information Requested) used only to sequence which applications an admissions officer reviews first; every application, regardless of tier, receives a full manual review before any admission decision is made.",
      decision_domains: ["Education enrollment or opportunities (admission, credentials, suspension)"],
      human_review:
        "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
      training_data_use: "No",
      profiling_use: "No",

      notice_delivery: ["We have not yet provided a Pre-use Notice"],
      notice_has_specific_purpose: "We have not yet created a Pre-use Notice",
      notice_has_opt_out_desc: "No",
      notice_has_access_desc: "No",
      notice_has_anti_retaliation: "No",
      notice_has_how_it_works: "Not yet",
      notice_has_alternative_process: "No",

      opt_out_exception: "No exception — we provide a full opt-out right",
      opt_out_handling_confirmations: [
        "No identity verification is required to submit an opt-out request (§ 7221(f))",
        "One option opts the consumer out of every use of ADMT we make for significant decisions (§ 7221(i))",
        "An opt-out received before processing begins prevents that processing (§ 7221(m))",
      ],
      opt_out_methods: ["Designated email address", "Mail-based form"],
      opt_out_link_title: "Request Manual-Only Application Review",
      opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      opt_out_no_account_required: "Account is currently required (gap)",
      opt_out_confirmation_mechanism:
        "The admissions office sends a confirmation email from admissions@summitridge.edu within two business days of receiving an opt-out request, referencing the application ID.",
      opt_out_fairness_doc:
        "No fairness or disparate-impact review of the Admissions Triage Model has yet been commissioned; the Office of Institutional Research has scheduled the university's first review for the 2027 admissions cycle.",
      opt_out_15_day_process:
        "An applicant who opts out is flagged in the applicant portal so the model never scores that file; the file is queued directly into the standard manual-review pool with no differential timeline.",

      access_submission_methods:
        "Requests are accepted by email to registrar-privacy@summitridge.edu and by paper form available at the Office of Admissions front desk.",
      access_verification_process:
        "The requester confirms the application ID and the date of birth on file; the registrar's office calls back the phone number on the application to confirm identity before releasing information.",
      access_logic_disclosure:
        "Summit Ridge can currently describe, in general terms, that the triage model considers GPA, standardized test scores where submitted, advanced coursework, and extracurricular categories, but has not yet built a per-applicant explanation showing the direction each input pushed the tier.",
      access_outcome_disclosure:
        "The response states the triage tier assigned and the date the admission decision was issued after full manual review.",
      access_response_timeline: "Our process is not yet defined",
      access_trade_secret_policy:
        "No trade-secret withholding policy has been adopted; the general description of inputs above is the extent of what the university can currently disclose.",

      ca_consumer_count: "9,400",
      third_party_admt: "No",
      admt_system_count: "1",
      affected_population_band: "1,000 – 10,000",
      role_roster: [
        "Privacy officer / DPO",
        "Legal counsel",
        "Product owner",
        "Human reviewer",
      ],

      admt_detail: {
        hosting: "Hosted internally",
        model_types: ["Statistical model"],
        decision_effects: ["Eligibility", "Ranking"],
        decision_cadence: "Repeated",
        sole_factor: "One of many factors",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        decision_domains_other: "",
        hi_reviewer_present: "Yes — on every decision",
        hi_reviewer_role: "Admissions Officer",
        hi_stage: "Before the decision is issued",
        hi_trained: "Yes",
        hi_reviews_other_info: "Yes",
        hi_authority_override: "Yes",
        hi_override_rate: "Every application receives full manual review; the triage tier only affects reading order",
        other_factors: "Personal statement, letters of recommendation, and the full application file read by the admissions officer",
        appeal_reviewer_role: "Associate Director of Admissions",
        appeal_trained: "Yes",
        appeal_authority_overturn: "Yes",
        appeal_step_count: "1",
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "No testing performed",
        access_secure_transmission: "Postal mail",
        access_denial_basis: "Not yet defined.",
      },

      access_readiness: {
        b1_purpose_ready: "No — we cannot produce this today",
        b1_purpose_process: "No published Pre-use Notice exists yet, so there is no purpose statement to hand to a requester; this waits on the notice project.",
        b2_logic_ready: "Partially — we can produce some of it",
        b2_logic_process: "The admissions office can describe the four general inputs but has no per-applicant explanation report yet.",
        b3_output_use_ready: "Partially — we can produce some of it",
        b3_output_use_process: "The applicant portal records the triage tier assigned but does not yet log which reviewer read the file first.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The final admission decision and date are recorded in the student information system.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The admissions file names the reviewing officer for every application.",
        b4_rights_ready: "No — we cannot produce this today",
        b4_rights_process: "No anti-retaliation statement or rights-links template exists yet; this waits on the same notice project as the purpose element.",
      },
    },
  },

  // ── p05 — Harborview Health Network: healthcare access, reviewer with
  // authority, vendor diagnostic-triage input, full opt-out. ────────────
  {
    id: "cppa-admt-p05-healthcare-vendor-triage",
    tool: "cppa-admt",
    label: "Regional health network specialist-referral triage — healthcare domain, vendor model, reviewer with authority",
    company: "Harborview Health Network",
    sector: "Outpatient healthcare services",
    geo: "us",
    summary:
      "Harborview uses a vendor clinical-decision-support model to triage which patients are flagged for expedited specialist referral; a referral coordinator and physician review every flag and can override it, and the network offers a full opt-out. Exercises: healthcare-access domain, reviewer-with-authority human review, a third-party clinical AI vendor with full documentation, and strong access-readiness answers consistent with a mature compliance program.",
    intake: {
      organization_name: "Harborview Health Network",
      system_name: "Specialist Referral Priority Model (SRPM)",
      system_type: "Vendor-supplied clinical decision-support model",
      system_description:
        "For patients seen in Harborview's primary-care clinics, the Specialist Referral Priority Model, a hosted service from Meridix Clinical AI Inc., reads structured intake vitals, lab-result trends over the prior twelve months, and problem-list codes to flag patients who may benefit from an expedited specialist referral. The model returns a priority flag (Expedite, Routine, No Flag) and the clinical indicators behind it. A referral coordinator and the treating physician review every flagged and unflagged case before any referral is placed; the model never places a referral on its own and never determines eligibility for treatment itself.",
      decision_domains: ["Healthcare services (diagnosis, treatment, care eligibility)"],
      human_review:
        "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
      training_data_use: "Yes",
      profiling_use: "Yes",

      notice_delivery: [
        "Included in our Notice at Collection",
        "In-app just-in-time notice before data collection",
      ],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the Specialist Referral Priority Model to help identify patients whose recent vitals and lab trends suggest they may benefit from a faster specialist referral. It does not diagnose, treat, or decide whether you receive care.",
      notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — via hyperlink or layered notice",
      notice_has_alternative_process: "Yes",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception: "No exception — we provide a full opt-out right",
      opt_out_handling_confirmations: [
        "No identity verification is required to submit an opt-out request (§ 7221(f))",
        "One option opts the consumer out of every use of ADMT we make for significant decisions (§ 7221(i))",
        "We accept opt-out requests from an authorized agent with the consumer's signed permission (§ 7221(j))",
        "An opt-out received before processing begins prevents that processing (§ 7221(m))",
      ],
      opt_out_methods: [
        "Interactive online form linked from the Pre-use Notice",
        "Toll-free phone number",
        "In-person form",
      ],
      opt_out_link_title: "Opt Out of Referral Priority Scoring",
      opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      opt_out_no_account_required: "Confirmed — no account required",
      opt_out_confirmation_mechanism:
        "The patient-experience team confirms the opt-out by phone or portal message within one business day and flags the patient record in the electronic health record so the model excludes future visits.",
      opt_out_fairness_doc:
        "Meridix Clinical AI Inc. provides Harborview an annual bias-testing report; the 2026 report, dated 2026-05-01, found no statistically significant disparity in flag rates across race, ethnicity, sex, age, or insurance-type proxies over 22,400 encounters.",
      opt_out_15_day_process:
        "An opted-out patient's referrals are triaged manually by the referral coordinator using standard clinical protocols within the same fifteen-business-day window as flagged patients receive.",

      access_submission_methods:
        "Requests are accepted through the patient portal privacy-request form, by calling the Health Information Management line at 1-855-555-0177, and by email to privacy@harborviewhealth.org.",
      access_verification_process:
        "The requester confirms the medical record number and date of birth, then completes identity verification consistent with Harborview's HIPAA-aligned release-of-information procedure.",
      access_logic_disclosure:
        "Harborview supplies a plain-language explanation naming the three input categories (intake vitals, twelve-month lab-result trends, problem-list codes), the priority flag returned, and the specific clinical indicators that drove the flag for that patient.",
      access_outcome_disclosure:
        "The response states the priority flag returned, the date it was returned, and the referral decision the coordinator and physician issued.",
      access_response_timeline: "Within 45 days with documented 45-day extension capability",
      access_trade_secret_policy:
        "Underlying model coefficients are withheld as a trade secret of Meridix Clinical AI Inc. under Cal. Civ. Code § 3426.1(d); the clinical-indicator explanation above is supplied in full.",

      ca_consumer_count: "22,400",
      third_party_admt:
        "Yes — the model is a hosted clinical decision-support service from Meridix Clinical AI Inc., engaged as a service provider under a business-associate and CCPA service-provider agreement dated 2025-09-20.",
      admt_system_count: "1",
      affected_population_band: "10,001 – 100,000",
      role_roster: [
        "Executive sponsor",
        "Privacy officer / DPO",
        "Legal counsel",
        "Human reviewer",
        "Consumer-request handler",
        "Vendor manager",
        "Security officer",
      ],

      admt_detail: {
        vendor_status: "Service provider",
        vendor_docs: ["Model card / datasheet", "Validation report", "Bias-testing report", "SOC 2 / pen test", "DPIA"],
        vendor_makes_available: "Yes",
        v_audit: "Yes",
        v_assist: "Yes",
        v_optout: "Yes",
        v_appeal: "Yes",
        v_incident: "Yes",
        hosting: "Hosted by the vendor",
        model_types: ["ML classifier"],
        decision_effects: ["Ranking", "Eligibility"],
        decision_cadence: "Continuous",
        sole_factor: "Material factor — heavily weighted alongside others",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        decision_domains_other: "",
        hi_reviewer_present: "Yes — on every decision",
        hi_reviewer_role: "Referral Coordinator and treating physician",
        hi_stage: "Before the decision is issued",
        hi_trained: "Yes",
        hi_reviews_other_info: "Yes",
        hi_authority_override: "Yes",
        hi_override_rate: "Clinicians upgrade an unflagged patient to expedited referral in roughly 3% of visits based on clinical judgment",
        other_factors: "Physician clinical judgment, patient-reported symptoms, and full chart review",
        vendor_product: "Meridix Clinical AI Inc. — Specialist Referral Priority Model",
        vendor_training_rights: "No — the business-associate agreement prohibits Meridix from using Harborview patient data to train shared models",
        appeal_reviewer_role: "Medical Director of Ambulatory Services",
        appeal_trained: "Yes",
        appeal_authority_overturn: "Yes",
        appeal_step_count: "2",
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "Yes — documented testing record",
        access_secure_transmission: "Encrypted self-service portal",
        access_denial_basis: "Not applicable — the model does not itself deny care; referral decisions rest with the treating physician.",
      },

      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process: "The Health Information Management team inserts the published purpose paragraph from the current notice.",
        b2_logic_ready: "Yes — we can produce this today",
        b2_logic_process: "The team runs the Meridix explanation report, which lists the clinical indicators behind the flag.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process: "The electronic health record logs the flag returned and the referral action taken.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The referral decision and date are recorded in the patient's chart.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The chart names the coordinator and physician who reviewed the flag.",
        b4_rights_ready: "Yes — we can produce this today",
        b4_rights_process: "The response template includes the anti-retaliation statement and a link to the Notice of Privacy Practices.",
      },

      notice_element_text: {
        purpose:
          "We use the Specialist Referral Priority Model to help identify patients whose recent vitals and lab trends suggest they may benefit from a faster specialist referral. It does not diagnose, treat, or decide whether you receive care.",
        optout:
          "You can ask us to triage your referral without the Model. Use the link 'Opt Out of Referral Priority Scoring' in the patient portal, call 1-855-555-0177, or ask at your next visit. We confirm within one business day and your referrals are then triaged manually.",
        access:
          "You can ask us for an explanation of how the Model flagged your case. Submit the request through the patient portal, by phone, or by email; we respond within 45 days and will tell you if we need one additional 45-day extension.",
        antiretaliation:
          "We will not deny you care, delay your referral, or provide a lower level of service because you opted out of the Model or asked for an explanation.",
        howworks_inputs:
          "The Model reads your intake vitals, twelve months of lab-result trends, and your problem-list codes.",
        howworks_output:
          "It returns a priority flag — Expedite, Routine, or No Flag — and the clinical indicators behind it; a referral coordinator and your treating physician review every case, flagged or not, before any referral is placed.",
        altprocess:
          "If you opt out, your referral is triaged manually by the referral coordinator using standard clinical protocols, within the same timeframe as flagged patients.",
      },
      notice_full_text:
        "PRE-USE NOTICE — SPECIALIST REFERRAL PRIORITY MODEL (Harborview Health Network, published 2026-01-08, harborviewhealth.org/admt-notice)\n\nWhat we use it for. We use the Specialist Referral Priority Model to help identify patients whose recent vitals and lab trends suggest they may benefit from a faster specialist referral. It does not diagnose, treat, or decide whether you receive care.\n\nHow it works. The Model reads your intake vitals, twelve months of lab-result trends, and your problem-list codes, and returns a priority flag — Expedite, Routine, or No Flag — and the clinical indicators behind it. A referral coordinator and your treating physician review every case, flagged or not, before any referral is placed.\n\nYour right to opt out. You can ask us to triage your referral without the Model. Use the link 'Opt Out of Referral Priority Scoring' in the patient portal, call 1-855-555-0177, or ask at your next visit. You do not need an account to opt out. We confirm within one business day.\n\nWhat happens instead. Your referral is triaged manually by the referral coordinator using standard clinical protocols, within the same timeframe as flagged patients.\n\nYour right to an explanation. You can ask us for an explanation of how the Model flagged your case through the patient portal, by phone, or by email. We respond within 45 days and will tell you if we need one additional 45-day extension.\n\nNo retaliation. We will not deny you care, delay your referral, or provide a lower level of service because you opted out or asked for an explanation.\n\nQuestions. Privacy Officer, Harborview Health Network, 3100 Ridgeline Parkway, San Jose, CA 95134 — privacy@harborviewhealth.org.",
    },
  },

  // ── p06 — Vantage Logistics Workforce Solutions LLC: work allocation,
  // fully automated, § 7221(b)(3) exception with bias-testing evidence. ──
  {
    id: "cppa-admt-p06-work-allocation-exception",
    tool: "cppa-admt",
    label: "Warehouse shift-and-load allocation algorithm — fully automated, § 7221(b)(3) exception claimed",
    company: "Vantage Logistics Workforce Solutions LLC",
    sector: "Third-party logistics and warehouse staffing",
    geo: "us",
    summary:
      "Vantage runs an in-house algorithm that assigns warehouse shifts, task load, and shift-differential pay with no human review before assignment, and the company claims the § 7221(b)(3) work-allocation/compensation exception supported by a documented quarterly bias audit. Exercises: work-allocation domain, fully-automated (no) human review, the work-allocation/compensation exception with its bias-testing evidence block, and an in-house system with no third-party vendor.",
    intake: {
      organization_name: "Vantage Logistics Workforce Solutions LLC",
      system_name: "Dynamic Shift Allocation Engine (DSAE)",
      system_type: "In-house constraint-optimization algorithm",
      system_description:
        "Every warehouse associate's daily shift assignment, task load, and shift-differential pay tier is set by the Dynamic Shift Allocation Engine, which reads certified availability windows, seniority date, cross-training qualifications, and the prior thirty days' logged throughput to balance labor cost against warehouse volume forecasts. The engine posts assignments to the workforce app each evening with no supervisor review or override before the shift begins; a shift lead may adjust an assignment only after the shift starts, in response to an unplanned absence or safety issue, and that after-the-fact change does not revisit the engine's original assignment logic.",
      decision_domains: ["Work allocation, scheduling, or compensation"],
      human_review: "No — fully automated, no human review",
      training_data_use: "Yes",
      profiling_use: "Yes",

      notice_delivery: ["Included in our Notice at Collection", "Account-creation or onboarding flow"],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the Dynamic Shift Allocation Engine to set your daily shift assignment, task load, and shift-differential pay tier based on your availability, seniority, qualifications, and recent throughput.",
      notice_has_opt_out_desc: "We rely on an exception and the notice identifies the specific exception",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — included inline in the notice",
      notice_has_alternative_process: "Not applicable — we rely on an opt-out exception",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception:
        "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination",
      opt_out_fairness_doc:
        "Vantage's People Analytics team commissioned a quarterly disparate-impact review of DSAE assignment and pay-tier outcomes from Northbeam Labor Analytics; the 2026-Q2 review, dated 2026-07-08, found no statistically significant disparity across race, sex, age, or disability-accommodation-status proxies over 2,860 associates. The report (NBA-DSAE-2026Q2) is retained in the HR compliance file.",

      access_submission_methods:
        "Requests are accepted through the workforce app's privacy-request tile and by email to privacy@vantagelogistics.com; every request opens a ticket in the HR compliance tracker.",
      access_verification_process:
        "The requester confirms their employee ID and the email address on file, then completes a one-time code sent to that email.",
      access_logic_disclosure:
        "Vantage supplies a plain-language explanation naming the four inputs the Engine uses (availability, seniority date, cross-training qualifications, trailing-thirty-day throughput) and the general basis for that associate's assignment and pay tier.",
      access_outcome_disclosure:
        "The response states the shift, task load, and pay tier the Engine assigned for the period requested and the date the assignment posted.",
      access_response_timeline: "Within 45 calendar days (standard)",
      access_trade_secret_policy:
        "The Engine's optimization weighting is withheld as a trade secret under Cal. Civ. Code § 3426.1(d); the general logic explanation above is supplied in full.",

      ca_consumer_count: "2,860",
      third_party_admt: "No — the allocation engine is designed, trained, and hosted entirely by Vantage's internal data science team.",
      admt_system_count: "1",
      affected_population_band: "1,000 – 10,000",
      role_roster: [
        "Privacy officer / DPO",
        "Legal counsel",
        "Product owner",
        "Data scientist / ML engineer",
        "Consumer-request handler",
      ],

      admt_detail: {
        hosting: "Hosted internally",
        model_types: ["Statistical model"],
        decision_effects: ["Assignment", "Compensation"],
        decision_cadence: "Continuous",
        sole_factor: "Sole factor — output alone determines the outcome",
        feeds_future_decisions: "Yes",
        solely_advertising: "No",
        decision_domains_other: "",
        hi_reviewer_present: "No — fully automated",
        sole_use_attestation: "Yes — solely for the allocation/assignment of work or compensation",
        nondiscrimination_testing: "Yes — documented testing record",
        bias_protected_chars: ["Race", "Sex / gender", "Age", "Disability"],
        bias_proxy_vars:
          "The 2026-Q2 audit tested home zip code and shift-time preference as potential proxies for protected characteristics correlated with caregiving status; neither showed a significant correlation with outcomes.",
        bias_testing_cadence: "Pre-deployment + ongoing monitoring",
        bias_last_test: "2026-07-08",
        bias_next_test: "2026-10-08",
        bias_adverse_impact: "No",
        bias_outcome_summary:
          "The 2026-Q2 quarterly audit (NBA-DSAE-2026Q2) found no statistically significant adverse impact on shift assignment or pay-tier outcomes for any protected class tested, across 2,860 associates and approximately 51,000 shift-assignment events in the quarter.",
        access_secure_transmission: "Encrypted self-service portal",
        access_denial_basis: "Not applicable — the response discloses the assignment and pay tier in full; no withholding applies to the outcome disclosure.",
      },

      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process: "The HR compliance handler inserts the published purpose paragraph from the onboarding-flow notice text.",
        b2_logic_ready: "Yes — we can produce this today",
        b2_logic_process: "The handler runs the DSAE explanation report, which lists the four inputs and the general basis for the assignment.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process: "The workforce app's assignment log records the shift, task load, and pay tier posted for each date.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The assignment log is the outcome record; it is queried by employee ID and date range.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The log confirms no supervisor review occurred before the assignment posted, consistent with the fully-automated process.",
        b4_rights_ready: "Yes — we can produce this today",
        b4_rights_process: "The response template carries the anti-retaliation statement and a link to the employee privacy notice.",
      },

      notice_element_text: {
        purpose:
          "We use the Dynamic Shift Allocation Engine to set your daily shift assignment, task load, and shift-differential pay tier based on your availability, seniority, qualifications, and recent throughput.",
        optout:
          "We rely on the § 7221(b)(3) work-allocation/compensation exception: because the Engine is used solely for shift allocation and pay-tier assignment and is tested for unlawful discrimination, we do not offer a separate opt-out right for this use.",
        access:
          "You can ask us for an explanation of how the Engine set your assignment or pay tier. Submit the request through the workforce app or by email to privacy@vantagelogistics.com; we respond within 45 calendar days.",
        antiretaliation:
          "We will not take an adverse action against you because you asked for an explanation of how the Engine set your assignment.",
        howworks_inputs:
          "The Engine reads your certified availability, seniority date, cross-training qualifications, and your trailing-thirty-day logged throughput.",
        howworks_output:
          "It posts your daily shift assignment, task load, and shift-differential pay tier each evening; a shift lead may only correct data errors after the shift starts and cannot revisit the Engine's assignment logic.",
        altprocess: "",
      },
      notice_full_text:
        "PRE-USE NOTICE — AUTOMATED SHIFT ALLOCATION (Vantage Logistics Workforce Solutions LLC, published 2026-01-05, vantagelogistics.com/admt-notice)\n\nWhat we use it for. We use the Dynamic Shift Allocation Engine to set your daily shift assignment, task load, and shift-differential pay tier based on your availability, seniority, qualifications, and recent throughput.\n\nHow it works. The Engine reads your certified availability, seniority date, cross-training qualifications, and your trailing-thirty-day logged throughput, and posts your assignment each evening. A shift lead may only correct data errors after the shift starts and cannot revisit the Engine's assignment logic.\n\nYour rights. We rely on the § 7221(b)(3) work-allocation/compensation exception: because the Engine is used solely for shift allocation and pay-tier assignment and is tested for unlawful discrimination, we do not offer a separate opt-out right for this use. You can ask us for an explanation of how the Engine set your assignment or pay tier by submitting a request through the workforce app or by email to privacy@vantagelogistics.com; we respond within 45 calendar days. We will not take an adverse action against you because you asked for an explanation.\n\nQuestions. Privacy Officer, Vantage Logistics Workforce Solutions LLC, 4400 Freightway Blvd, Memphis, TN 38118 — privacy@vantagelogistics.com.",
    },
  },

  // ── p07 — Parkline Manufacturing Corporation: promotion/demotion domain,
  // advisory human review, full opt-out, in-house system. ────────────────
  {
    id: "cppa-admt-p07-promotion-advisory-review",
    tool: "cppa-admt",
    label: "Plant performance-tier model — promotion/demotion domain, advisory-only review, full opt-out",
    company: "Parkline Manufacturing Corporation",
    sector: "Industrial manufacturing",
    geo: "us",
    summary:
      "Parkline scores hourly production staff on a quarterly performance tier that feeds promotion, demotion, and shift-differential eligibility; a plant supervisor reviews every tier before it is finalized but cannot change the underlying score, so human review is answered 'Partial', and Parkline offers a full opt-out right. Exercises: the promotion/demotion/suspension/termination domain, advisory (non-overriding) human review, a full opt-out pathway with every § 7221 handling duty confirmed, and an in-house system with no third-party vendor.",
    intake: {
      organization_name: "Parkline Manufacturing Corporation",
      system_name: "Quarterly Performance Tier Model (QPTM)",
      system_type: "In-house statistical scoring model",
      system_description:
        "Each quarter, the Quarterly Performance Tier Model scores every hourly production employee at Parkline's Dayton and Greenville plants using logged production-line output against station targets, quality-inspection pass rate, and attendance-point balance. The model assigns a performance tier (Tier 1 Eligible for Promotion, Tier 2 Standard, Tier 3 Improvement Plan) that determines eligibility for promotion consideration, shift-differential assignment, and, at Tier 3, a formal improvement plan that can lead to demotion. A plant supervisor reviews the computed tier and the underlying metrics before it is communicated to the employee, and can flag a data error for correction, but has no authority to change the tier assignment itself once the underlying metrics are confirmed accurate.",
      decision_domains: ["Promotion, demotion, suspension, or termination"],
      human_review: "Partial — reviewer sees the output but cannot override it",
      training_data_use: "Yes",
      profiling_use: "Yes",

      notice_delivery: ["Included in our Notice at Collection", "Separate standalone Pre-use Notice"],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the Quarterly Performance Tier Model to score your production output, quality-inspection pass rate, and attendance against plant targets, and to determine your promotion eligibility, shift-differential assignment, and whether you are placed on a formal improvement plan.",
      notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — included inline in the notice",
      notice_has_alternative_process: "Yes",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception: "No exception — we provide a full opt-out right",
      opt_out_handling_confirmations: [
        "No identity verification is required to submit an opt-out request (§ 7221(f))",
        "One option opts the consumer out of every use of ADMT we make for significant decisions (§ 7221(i))",
        "We accept opt-out requests from an authorized agent with the consumer's signed permission (§ 7221(j))",
        "We do not ask a consumer who opted out to consent again for at least 12 months (§ 7221(k))",
        "An opt-out received before processing begins prevents that processing (§ 7221(m))",
      ],
      opt_out_methods: ["Toll-free phone number", "Designated email address", "In-person form"],
      opt_out_link_title: "Request Manual Performance Review Without QPTM Scoring",
      opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      opt_out_no_account_required: "Confirmed — no account required",
      opt_out_confirmation_mechanism:
        "HR sends a confirmation letter and a copy to the employee's personnel file within three business days of an opt-out request, referencing the employee ID and effective quarter.",
      opt_out_fairness_doc:
        "Parkline's HR Analytics group commissioned an annual disparate-impact review of QPTM tier outcomes from Cornerstone Workforce Analytics; the 2026 review, dated 2026-02-20, tested tier distribution across race, sex, age, and disability-accommodation-status proxies over 1,140 production employees.",
      opt_out_15_day_process:
        "An employee who opts out is scored manually by the plant HR manager using the same production, quality, and attendance data without the model, and the manual tier issues within fifteen business days, escalating to the Plant Director at day ten if still open.",

      access_submission_methods:
        "Requests are accepted through the HR self-service portal, at the plant HR office, and by email to hrprivacy@parklinemfg.com; every route opens a ticket in the HR case system.",
      access_verification_process:
        "The requester confirms their employee ID and the last four digits of their SSN on file; HR calls back the phone number of record to confirm identity before releasing information.",
      access_logic_disclosure:
        "Parkline supplies a plain-language explanation naming the three inputs QPTM uses (production output against station target, quality-inspection pass rate, attendance-point balance), the direction each pushed the tier, and the tier assigned.",
      access_outcome_disclosure:
        "The response states the tier assigned, the date it was communicated, and any resulting promotion eligibility, shift-differential change, or improvement-plan placement.",
      access_response_timeline: "Within 45 calendar days (standard)",
      access_trade_secret_policy: "No trade-secret withholding is applied; all three scoring inputs and their weighting are disclosed to the employee in full.",

      ca_consumer_count: "1,140",
      third_party_admt: "No — the model is built and maintained by Parkline's internal HR analytics team.",
      admt_system_count: "1",
      affected_population_band: "1,000 – 10,000",
      role_roster: [
        "Privacy officer / DPO",
        "Legal counsel",
        "Human reviewer",
        "Consumer-request handler",
      ],

      admt_detail: {
        hosting: "Hosted internally",
        model_types: ["Statistical model"],
        decision_effects: ["Promotion / demotion", "Compensation"],
        decision_cadence: "Repeated",
        sole_factor: "Sole factor — output alone determines the outcome",
        feeds_future_decisions: "Yes",
        solely_advertising: "No",
        decision_domains_other: "",
        hi_reviewer_present: "Yes — on every decision",
        hi_reviewer_role: "Plant Supervisor",
        hi_stage: "Before the decision is issued",
        hi_trained: "Yes",
        hi_reviews_other_info: "Yes",
        hi_authority_override: "No",
        hi_override_rate: "Not applicable — the supervisor may correct underlying data errors but has no authority to change a confirmed tier",
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "Yes — documented testing record",
        access_secure_transmission: "Encrypted self-service portal",
        access_denial_basis: "Not applicable — the outcome disclosure is provided in full; no withholding applies.",
      },

      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process: "The HR case handler inserts the published purpose paragraph from the current notice register entry.",
        b2_logic_ready: "Yes — we can produce this today",
        b2_logic_process: "The handler runs the QPTM explanation report, which lists the three inputs and the direction each pushed the tier.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process: "The HR case system records the tier assigned and the resulting promotion or improvement-plan action.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The personnel file records the final tier, the communication date, and any resulting action.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The personnel file names the plant supervisor who reviewed the tier and confirms whether a data correction was made.",
        b4_rights_ready: "Yes — we can produce this today",
        b4_rights_process: "The response template carries the anti-retaliation statement and a link to the employee handbook's rights section.",
      },

      notice_element_text: {
        purpose:
          "We use the Quarterly Performance Tier Model to score your production output, quality-inspection pass rate, and attendance against plant targets, and to determine your promotion eligibility, shift-differential assignment, and whether you are placed on a formal improvement plan.",
        optout:
          "You can ask us to score your quarter manually instead. Call 1-800-555-0140, email hrprivacy@parklinemfg.com, or ask any plant HR office. We confirm within three business days and issue a manual tier within fifteen business days.",
        access:
          "You can ask us for an explanation of how QPTM set your tier. Submit the request at the HR self-service portal, at the plant HR office, or by email; we respond within 45 calendar days.",
        antiretaliation:
          "We will not demote you, withhold a shift differential, or provide a lower level of service because you asked us to score your quarter manually or asked for an explanation.",
        howworks_inputs:
          "QPTM uses three things: your logged production output against your station target, your quality-inspection pass rate, and your attendance-point balance.",
        howworks_output:
          "It assigns a performance tier — Eligible for Promotion, Standard, or Improvement Plan — and a plant supervisor reviews the tier and the underlying metrics before it is communicated to you.",
        altprocess:
          "If you opt out, the plant HR manager scores your quarter manually from the same production, quality, and attendance data, without the model, and the manual tier issues within fifteen business days.",
      },
      notice_full_text:
        "PRE-USE NOTICE — QUARTERLY PERFORMANCE TIER MODEL (Parkline Manufacturing Corporation, published 2026-01-10, parklinemfg.com/admt-notice)\n\nWhat we use it for. We use the Quarterly Performance Tier Model (QPTM) to score your production output, quality-inspection pass rate, and attendance against plant targets, and to determine your promotion eligibility, shift-differential assignment, and whether you are placed on a formal improvement plan.\n\nHow it works. QPTM uses three things: your logged production output against your station target, your quality-inspection pass rate, and your attendance-point balance. It assigns a performance tier — Eligible for Promotion, Standard, or Improvement Plan — and a plant supervisor reviews the tier and the underlying metrics before it is communicated to you.\n\nYour right to opt out. You can ask us to score your quarter manually instead. Call 1-800-555-0140, email hrprivacy@parklinemfg.com, or ask any plant HR office. You do not need an account to opt out. We confirm within three business days and issue a manual tier within fifteen business days.\n\nWhat happens instead. The plant HR manager scores your quarter manually from the same production, quality, and attendance data, without the model, within fifteen business days.\n\nYour right to an explanation. You can ask us for an explanation of how QPTM set your tier at the HR self-service portal, the plant HR office, or by email. We respond within 45 calendar days.\n\nNo retaliation. We will not demote you, withhold a shift differential, or provide a lower level of service because you opted out or asked for an explanation.\n\nQuestions. HR Privacy Officer, Parkline Manufacturing Corporation, 1250 Foundry Road, Dayton, OH 45402 — hrprivacy@parklinemfg.com.",
    },
  },

  // ── p08 — Golden Gate Mutual Insurance Company: underwriting eligibility
  // (financial/lending domain — insurance has no dedicated domain option),
  // fully automated with human-appeal exception, vendor-supplied model. ──
  {
    id: "cppa-admt-p08-underwriting-human-appeal-exception",
    tool: "cppa-admt",
    label: "Auto-policy underwriting eligibility score — fully automated, § 7221(b)(1) human-appeal exception, vendor model",
    company: "Golden Gate Mutual Insurance Company",
    sector: "Personal-lines insurance underwriting",
    geo: "us",
    summary:
      "Golden Gate Mutual uses a vendor-hosted underwriting model to decide auto-policy acceptance, tier, and premium with no human review before the decision issues, and relies on the § 7221(b)(1) human-appeal exception, offering a trained reviewer with authority to overturn the decision on request. Exercises: an insurance-underwriting decision mapped to the closed 'Financial or lending services' domain option (the contract's domain list has no dedicated insurance category), fully-automated primary review, the human-appeal exception pathway with its full evidence set, and a third-party underwriting-model vendor.",
    intake: {
      organization_name: "Golden Gate Mutual Insurance Company",
      system_name: "Underwriting Eligibility and Tier Model (UETM)",
      system_type: "Vendor-hosted statistical underwriting model",
      system_description:
        "Every personal auto-policy application submitted through Golden Gate Mutual's agent and direct-to-consumer channels is scored by the Underwriting Eligibility and Tier Model, a hosted service from Praxis Underwriting Analytics Inc. The model reads driving-history data from the state DMV feed, prior-carrier lapse history, vehicle-use category, and credit-based insurance score, and returns an accept/decline determination and, if accepted, a rating tier that sets the premium. The determination issues automatically with no underwriter review before the applicant is notified; an applicant who wishes a human to reconsider the determination may request an appeal, which a licensed underwriting reviewer who did not originate the automated determination decides with full authority to overturn it.",
      decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
      human_review: "No — fully automated, no human review",
      training_data_use: "Yes",
      profiling_use: "Yes",

      notice_delivery: ["Included in our Notice at Collection", "Separate standalone Pre-use Notice"],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the Underwriting Eligibility and Tier Model to decide whether to accept your auto-policy application and, if accepted, your rating tier and premium.",
      notice_has_opt_out_desc: "We rely on an exception and describe appeal rights instead",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — included inline in the notice",
      notice_has_alternative_process: "Not applicable — we rely on an opt-out exception",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception:
        "Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision",
      opt_out_appeal_process:
        "An applicant may request reconsideration within thirty days of the underwriting determination by calling 1-800-555-0166 or submitting the appeal form at goldengatemutual.com/appeal. A licensed underwriting reviewer who did not originate the automated determination re-reviews the full application, the DMV and prior-carrier data, and any additional documentation the applicant supplies, and has authority to reverse the decline, adjust the tier, or affirm the original determination. The reviewer's decision issues in writing within thirty calendar days of the request.",
      opt_out_fairness_doc:
        "Praxis Underwriting Analytics Inc. provides Golden Gate Mutual an annual disparate-impact review of UETM outcomes; the 2026 review, dated 2026-04-01, found no statistically significant disparity in accept/decline or tier distribution across race, sex, and age proxies over 58,000 applications.",

      access_submission_methods:
        "Requests are accepted through the policyholder portal privacy-request form, by calling 1-800-555-0177, and by email to privacy@goldengatemutual.com.",
      access_verification_process:
        "The requester confirms the application or policy number and the date of birth on file, then completes a one-time code sent to the phone number of record.",
      access_logic_disclosure:
        "Golden Gate Mutual supplies a plain-language explanation naming the four inputs UETM uses (driving history, prior-carrier lapse history, vehicle-use category, credit-based insurance score), the direction each pushed the determination, and the determination and tier returned.",
      access_outcome_disclosure:
        "The response states the accept/decline determination, the rating tier and premium if accepted, and the date the determination issued.",
      access_response_timeline: "Within 45 days with documented 45-day extension capability",
      access_trade_secret_policy:
        "UETM's scoring weights are withheld as a trade secret of Praxis Underwriting Analytics Inc. under Cal. Civ. Code § 3426.1(d); the plain-language factor explanation above is supplied in full.",

      ca_consumer_count: "58,000",
      third_party_admt:
        "Yes — the underwriting model is a hosted service from Praxis Underwriting Analytics Inc., engaged as a service provider under a CCPA service-provider addendum dated 2025-12-01.",
      admt_system_count: "1",
      affected_population_band: "10,001 – 100,000",
      role_roster: [
        "Executive sponsor",
        "Privacy officer / DPO",
        "Legal counsel",
        "Human reviewer",
        "Consumer-request handler",
        "Vendor manager",
      ],

      admt_detail: {
        vendor_status: "Service provider",
        vendor_docs: ["Model card / datasheet", "Validation report", "Bias-testing report", "SOC 2 / pen test"],
        vendor_makes_available: "Yes",
        v_audit: "Yes",
        v_assist: "Yes",
        v_optout: "No",
        v_appeal: "Yes",
        v_incident: "Yes",
        hosting: "Hosted by the vendor",
        model_types: ["Statistical model"],
        decision_effects: ["Eligibility", "Pricing", "Denial", "Provision"],
        decision_cadence: "One-time",
        sole_factor: "Sole factor — output alone determines the outcome",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        decision_domains_other: "",
        hi_reviewer_present: "No — fully automated",
        vendor_product: "Praxis Underwriting Analytics Inc. — Underwriting Eligibility and Tier Model (UETM v3)",
        vendor_training_rights: "No — the service-provider addendum prohibits Praxis from using Golden Gate Mutual applicant data to train shared models",
        appeal_reviewer_role: "Licensed underwriting reviewer independent of the automated determination",
        appeal_trained: "Yes",
        appeal_authority_overturn: "Yes",
        appeal_step_count: "2",
        appeal_consumer_submit: ["Free-text statement", "Supporting documents"],
        appeal_timeline: "30 calendar days",
        appeal_reversal_rate: "About one appealed determination in eight is reversed or adjusted, based on 2026 year-to-date data",
        appeal_outcomes: ["Uphold", "Reverse", "Modify"],
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "Yes — documented testing record",
        access_secure_transmission: "Encrypted self-service portal",
        access_denial_basis: "Adverse-underwriting reasons are disclosed in full to the applicant; no withholding applies to the outcome disclosure itself.",
      },

      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process: "The consumer-request handler inserts the published purpose paragraph from the current Pre-use Notice register entry.",
        b2_logic_ready: "Yes — we can produce this today",
        b2_logic_process: "The handler runs Praxis's explanation report, which lists the four inputs and the direction each pushed the determination.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process: "The policy administration system records the determination, tier, and premium returned.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The final determination and any appeal outcome are read from the underwriting file and stated in the response.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The underwriting file names the appeal reviewer, where an appeal was requested, and the outcome reached.",
        b4_rights_ready: "Yes — we can produce this today",
        b4_rights_process: "The response template carries the anti-retaliation statement and a link to the policyholder rights section of the privacy policy.",
      },

      notice_element_text: {
        purpose:
          "We use the Underwriting Eligibility and Tier Model to decide whether to accept your auto-policy application and, if accepted, your rating tier and premium.",
        optout:
          "Because this determination is used solely to assess your policy eligibility and is tested for unlawful discrimination, we rely on the § 7221(b)(1) human-appeal exception rather than offering a separate opt-out. You may appeal any determination as described below.",
        access:
          "You can ask us for an explanation of how UETM reached your determination. Submit the request through the policyholder portal, by phone, or by email; we respond within 45 days and will tell you if we need one additional 45-day extension.",
        antiretaliation:
          "We will not deny your application, charge a higher premium, or provide a lower level of service because you requested an appeal or asked for an explanation.",
        howworks_inputs:
          "UETM reads your driving history, prior-carrier lapse history, vehicle-use category, and credit-based insurance score.",
        howworks_output:
          "It returns an accept/decline determination and, if accepted, a rating tier that sets your premium, issued automatically with no underwriter review before you are notified.",
        altprocess:
          "You may request reconsideration within thirty days by calling 1-800-555-0166 or submitting the appeal form at goldengatemutual.com/appeal. A licensed reviewer who did not originate the determination re-reviews your file and has authority to reverse, adjust, or affirm it, issuing a decision in writing within thirty calendar days.",
      },
      notice_full_text:
        "PRE-USE NOTICE — AUTOMATED UNDERWRITING (Golden Gate Mutual Insurance Company, published 2026-01-15, goldengatemutual.com/admt-notice)\n\nWhat we use it for. We use the Underwriting Eligibility and Tier Model (UETM) to decide whether to accept your auto-policy application and, if accepted, your rating tier and premium.\n\nHow it works. UETM reads your driving history, prior-carrier lapse history, vehicle-use category, and credit-based insurance score, and returns an accept/decline determination and, if accepted, a rating tier that sets your premium. The determination issues automatically with no underwriter review before you are notified.\n\nYour right to appeal. Because this determination is used solely to assess your policy eligibility and is tested for unlawful discrimination, we rely on the § 7221(b)(1) human-appeal exception rather than offering a separate opt-out. You may request reconsideration within thirty days by calling 1-800-555-0166 or submitting the appeal form at goldengatemutual.com/appeal. A licensed reviewer who did not originate the determination re-reviews your file and has authority to reverse, adjust, or affirm it, issuing a decision in writing within thirty calendar days.\n\nYour right to an explanation. You can ask us for an explanation of how UETM reached your determination through the policyholder portal, by phone, or by email. We respond within 45 days and will tell you if we need one additional 45-day extension.\n\nNo retaliation. We will not deny your application, charge a higher premium, or provide a lower level of service because you requested an appeal or asked for an explanation.\n\nQuestions. Privacy Officer, Golden Gate Mutual Insurance Company, 1 Ferry Plaza, San Francisco, CA 94111 — privacy@goldengatemutual.com.",
    },
  },

  // ── p09 — Cobalt Regional Utility Cooperative: essential-services
  // continuation decision outside every § 7001(ddd) category. ────────────
  {
    id: "cppa-admt-p09-essential-services-outside-categories",
    tool: "cppa-admt",
    label: "Utility payment-plan eligibility flag — essential-services decision outside every § 7001(ddd) category",
    company: "Cobalt Regional Utility Cooperative",
    sector: "Electric and water utility services",
    geo: "us",
    summary:
      "Cobalt's fully automated tool flags member accounts for a deferred-payment plan ahead of a service-continuation decision; because CPPA's decision-domain list has no essential-services or utility category, and the flag does not itself decide whether service continues, the record answers 'None of these categories', which the engine resolves as a determined non-application rather than 'unable to assess'. Exercises: the categorical-negative domain branch and a fully-automated tool for a real-world essential-services scenario the closed domain list does not name.",
    intake: {
      organization_name: "Cobalt Regional Utility Cooperative",
      system_name: "Payment Plan Eligibility Flag (PPEF)",
      system_type: "In-house rules engine",
      system_description:
        "The Payment Plan Eligibility Flag reviews a member account's payment history, current balance, and prior deferred-payment-plan usage each billing cycle and flags accounts that qualify for an offered deferred-payment plan before any past-due balance reaches the disconnection-notice stage. The flag only determines whether the deferred-payment-plan offer appears on the member's bill and portal; it does not itself authorize, schedule, or execute a service disconnection, which under Cobalt's tariff and state utility-commission rules always requires a billing specialist's independent review and a separate mailed notice.",
      decision_domains: ["None of these categories — the decision is outside every § 7001(ddd) category"],
      human_review: "No — fully automated, no human review",
      training_data_use: "No",
      profiling_use: "No",

      notice_delivery: ["Included in our Notice at Collection"],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the Payment Plan Eligibility Flag to identify accounts that may qualify for a deferred-payment plan based on payment history and current balance. It does not authorize or schedule a service disconnection.",
      notice_has_opt_out_desc: "No",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — included inline in the notice",
      notice_has_alternative_process: "No",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception: "No exception — we provide a full opt-out right",
      opt_out_handling_confirmations: [
        "No identity verification is required to submit an opt-out request (§ 7221(f))",
        "One option opts the consumer out of every use of ADMT we make for significant decisions (§ 7221(i))",
        "An opt-out received before processing begins prevents that processing (§ 7221(m))",
      ],
      opt_out_methods: ["Toll-free phone number", "Designated email address"],
      opt_out_link_title: "Opt Out of Automated Payment Plan Flagging",
      opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      opt_out_no_account_required: "Confirmed — no account required",
      opt_out_confirmation_mechanism:
        "Member Services confirms the opt-out by mail within five business days and notes the account so the flag no longer runs for that member.",
      opt_out_fairness_doc:
        "No fairness or disparate-impact review of the flag has been commissioned; the flag only surfaces a payment-plan offer and does not itself determine any adverse outcome, so Cobalt's compliance committee has not prioritized a review to date.",
      opt_out_15_day_process:
        "An opted-out account is instead reviewed manually by a billing specialist each cycle using the same payment-history data, using Cobalt's standard hardship-assistance criteria.",

      access_submission_methods:
        "Requests are accepted by calling Member Services at 1-800-555-0188, at any cooperative service center, and by mail to the address on the monthly bill.",
      access_verification_process:
        "The requester confirms the account number and the service address, and Member Services verifies the last payment amount before releasing information.",
      access_logic_disclosure:
        "Cobalt supplies a plain-language explanation naming the three inputs the flag uses (payment history, current balance, prior deferred-payment-plan usage) and whether the account was flagged for the current cycle.",
      access_outcome_disclosure:
        "The response states whether the account was flagged for the deferred-payment-plan offer in the requested billing cycle and the date the flag ran.",
      access_response_timeline: "Within 45 calendar days (standard)",
      access_trade_secret_policy: "No trade-secret withholding is applied; the three inputs the flag uses are disclosed to the member in full.",

      ca_consumer_count: "34,000",
      third_party_admt: "No — the flag runs on the cooperative's own billing system.",
      admt_system_count: "1",
      affected_population_band: "10,001 – 100,000",
      role_roster: [
        "Privacy officer / DPO",
        "Legal counsel",
        "Consumer-request handler",
      ],

      admt_detail: {
        hosting: "Hosted internally",
        model_types: ["Rules engine"],
        decision_effects: ["Eligibility"],
        decision_cadence: "Repeated",
        sole_factor: "One of many factors",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        decision_domains_other:
          "The flag only surfaces a deferred-payment-plan offer; the disconnection decision it precedes always requires a billing specialist's independent review under the cooperative's tariff, so no § 7001(ddd) significant-decision category applies to the flag itself.",
        hi_reviewer_present: "No — fully automated",
        other_factors: "Current account balance and whether a hardship exemption is already on file",
        sole_use_attestation: "Unsure",
        nondiscrimination_testing: "No testing performed",
        access_secure_transmission: "Postal mail",
        access_denial_basis: "Not applicable — the response discloses whether the flag fired in full; no withholding applies.",
      },

      access_readiness: {
        b1_purpose_ready: "Unsure",
        b1_purpose_process: "Member Services has not yet confirmed whether the published purpose paragraph can be produced on demand for a specific account.",
        b2_logic_ready: "Partially — we can produce some of it",
        b2_logic_process: "Member Services can describe the three inputs in general terms but has no per-account explanation report yet.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process: "The billing system logs whether the flag fired for the cycle and whether the offer was accepted.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The billing system records whether the member enrolled in the deferred-payment plan.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The account record confirms no billing specialist review occurred for the flag itself.",
        b4_rights_ready: "Unsure",
        b4_rights_process: "Member Services has not yet confirmed whether the anti-retaliation statement and rights links can be produced on demand for a specific account.",
      },

      notice_element_text: {
        purpose:
          "We use the Payment Plan Eligibility Flag to identify accounts that may qualify for a deferred-payment plan based on payment history and current balance. It does not authorize or schedule a service disconnection.",
        optout:
          "You can ask us to stop flagging your account for the deferred-payment-plan offer. Call 1-800-555-0188, email Member Services, or write to the address on your bill. We confirm by mail within five business days.",
        access:
          "You can ask us for an explanation of whether your account was flagged for a cycle. Call Member Services, visit a service center, or write to the address on your bill; we respond within 45 calendar days.",
        antiretaliation:
          "We will not disconnect your service, deny you assistance, or provide a lower level of service because you asked for an explanation of the flag.",
        howworks_inputs: "The flag reads your payment history, current balance, and prior deferred-payment-plan usage.",
        howworks_output:
          "It determines whether the deferred-payment-plan offer appears on your bill and portal; it does not itself authorize, schedule, or execute a service disconnection, which always requires a billing specialist's independent review and a separate mailed notice.",
        altprocess: "",
      },
      notice_full_text:
        "PRE-USE NOTICE — PAYMENT PLAN ELIGIBILITY FLAG (Cobalt Regional Utility Cooperative, published 2026-02-01, cobaltutility.coop/admt-notice)\n\nWhat we use it for. We use the Payment Plan Eligibility Flag to identify accounts that may qualify for a deferred-payment plan based on payment history and current balance. It does not authorize or schedule a service disconnection.\n\nHow it works. The flag reads your payment history, current balance, and prior deferred-payment-plan usage. It determines whether the deferred-payment-plan offer appears on your bill and portal; it does not itself authorize, schedule, or execute a service disconnection, which always requires a billing specialist's independent review and a separate mailed notice.\n\nYour right to opt out. You can ask us to stop flagging your account. Call 1-800-555-0188, email, or write to the address on your bill. You do not need an account to opt out. We confirm by mail within five business days.\n\nYour right to an explanation. You can ask us for an explanation of whether your account was flagged for a cycle. Call Member Services, visit a service center, or write to the address on your bill. We respond within 45 calendar days.\n\nNo retaliation. We will not disconnect your service, deny you assistance, or provide a lower level of service because you opted out or asked for an explanation.\n\nQuestions. Member Services, Cobalt Regional Utility Cooperative, 200 Cobalt Way, Fresno, CA 93721 — memberservices@cobaltutility.coop.",
    },
  },

  // ── p10 — Fairmont Community Credit Union: lending, reviewer with
  // authority, in-house scoring, immature access-readiness program. ──────
  {
    id: "cppa-admt-p10-lending-authority-inhouse",
    tool: "cppa-admt",
    label: "Credit union member-loan scoring — lending domain, reviewer with override authority, in-house model",
    company: "Fairmont Community Credit Union",
    sector: "Credit union lending",
    geo: "us",
    summary:
      "Fairmont built an in-house loan-scoring model; a loan officer reviews every score and has authority to override it, so the record is out of scope on the reviewer's qualifying involvement, but Fairmont's access-explanation readiness program is still maturing. Exercises: the lending domain with reviewer-with-authority human review (a second, in-house-model instance of the out-of-scope determination), no third-party vendor, and readiness answers spanning 'Partially' and 'No' rather than a uniformly complete program.",
    intake: {
      organization_name: "Fairmont Community Credit Union",
      system_name: "Member Loan Scoring Tool (MLST)",
      system_type: "In-house statistical scoring model",
      system_description:
        "Every consumer loan application submitted by a Fairmont member is scored by the Member Loan Scoring Tool, which reads share-account history, verified income, existing Fairmont loan performance, and a bureau tradeline summary. It returns a recommended approval band and rate tier. A loan officer reviews the recommendation together with the member's full file and relationship history and has authority to approve, adjust the rate, or decline regardless of the tool's recommendation.",
      decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
      human_review:
        "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
      training_data_use: "Yes",
      profiling_use: "Yes",

      notice_delivery: ["Account-creation or onboarding flow"],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the Member Loan Scoring Tool to recommend an approval band and rate tier for your loan application based on your account history, income, and credit profile.",
      notice_has_opt_out_desc: "Mentions opt-out but without clear instructions",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Partial — some elements missing",
      notice_has_alternative_process: "No",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception: "No exception — we provide a full opt-out right",
      opt_out_handling_confirmations: [
        "No identity verification is required to submit an opt-out request (§ 7221(f))",
      ],
      opt_out_methods: ["Designated email address"],
      opt_out_link_title: "Questions About Your Loan Decision",
      opt_out_no_cookie_banner: "Cookie banner is currently our only method (gap)",
      opt_out_no_account_required: "Account is currently required (gap)",
      opt_out_confirmation_mechanism: "A loan officer calls the member back within two business days to confirm the request.",
      opt_out_fairness_doc: "No fairness or disparate-impact review of the Member Loan Scoring Tool has been conducted; none is currently scheduled.",
      opt_out_15_day_process:
        "A member who opts out has their application reviewed manually by a loan officer using the same underlying data, with a decision targeted within fifteen business days.",

      access_submission_methods:
        "Requests are accepted by visiting any branch or by calling Member Services at 1-800-555-0122.",
      access_verification_process:
        "The requester confirms their member number and government-issued ID in person, or the last four digits of their SSN and date of birth by phone.",
      access_logic_disclosure:
        "Fairmont can describe, in general terms, that the tool considers share-account history, income, existing loan performance, and bureau tradelines, but has not yet built a per-applicant explanation showing which inputs moved a given recommendation.",
      access_outcome_disclosure:
        "The response states the approval band and rate tier the tool recommended and the loan officer's final decision.",
      access_response_timeline: "Our process is not yet defined",
      access_trade_secret_policy: "Not yet defined; Fairmont has not established a trade-secret withholding policy for the scoring tool.",

      ca_consumer_count: "9,600",
      third_party_admt: "No — the scoring tool is built and maintained by Fairmont's internal analytics team.",
      admt_system_count: "1",
      affected_population_band: "1,000 – 10,000",
      role_roster: [
        "Privacy officer / DPO",
        "Legal counsel",
        "Human reviewer",
      ],

      admt_detail: {
        hosting: "Hosted internally",
        model_types: ["Statistical model"],
        decision_effects: ["Eligibility", "Pricing"],
        decision_cadence: "Repeated",
        sole_factor: "Material factor — heavily weighted alongside others",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        decision_domains_other: "",
        hi_reviewer_present: "Yes — on every decision",
        hi_reviewer_role: "Loan Officer",
        hi_stage: "Before the decision is issued",
        hi_trained: "Yes",
        hi_reviews_other_info: "Yes",
        hi_authority_override: "Yes",
        hi_override_rate: "About one recommendation in ten over the trailing twelve months",
        other_factors: "Member relationship tenure and share-account balance trend",
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "No testing performed",
        access_secure_transmission: "Not yet defined",
        access_denial_basis: "Not yet defined; Fairmont has not established a denial-basis disclosure process.",
      },

      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process: "A loan officer restates the published purpose paragraph from the onboarding notice text.",
        b2_logic_ready: "Partially — we can produce some of it",
        b2_logic_process: "Fairmont can name the four general inputs but has no per-applicant weighting report yet.",
        b3_output_use_ready: "Partially — we can produce some of it",
        b3_output_use_process: "The loan file records the recommended band, but the officer's rationale for any override is not consistently logged.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The final loan decision and terms are recorded in the core banking system.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The loan file names the reviewing loan officer.",
        b4_rights_ready: "No — we cannot produce this today",
        b4_rights_process: "No anti-retaliation statement or rights-links template has been drafted yet.",
      },

      notice_element_text: {
        purpose:
          "We use the Member Loan Scoring Tool to recommend an approval band and rate tier for your loan application based on your account history, income, and credit profile.",
        optout:
          "You can ask us questions about how your loan decision was made by calling or visiting a branch; the current onboarding notice does not yet give a dedicated opt-out link or clear step-by-step instructions.",
        access:
          "You can ask us for an explanation of your loan recommendation by visiting any branch or calling Member Services at 1-800-555-0122.",
        antiretaliation:
          "We will not deny your application, offer worse terms, or provide a lower level of service because you asked about your loan decision or asked for an explanation.",
        howworks_inputs: "",
        howworks_output:
          "The tool returns a recommended approval band and rate tier; a loan officer reviews it with your full file and relationship history.",
        altprocess: "",
      },
      notice_full_text:
        "MEMBER LOAN NOTICE (Fairmont Community Credit Union, published as part of the account-opening flow, undated)\n\nWhat we use it for. We use the Member Loan Scoring Tool to recommend an approval band and rate tier for your loan application based on your account history, income, and credit profile. The tool returns a recommended approval band and rate tier; a loan officer reviews it with your full file and relationship history.\n\nQuestions about your decision. You can ask us questions about how your loan decision was made by calling or visiting a branch, or ask for an explanation by visiting any branch or calling Member Services at 1-800-555-0122.\n\nNo retaliation. We will not deny your application, offer worse terms, or provide a lower level of service because you asked about your loan decision or asked for an explanation.",
    },
  },

  // ── p11 — Ridgeline Property Management Trust: housing, advisory
  // review, vendor-supplied screening data, out of scope on the
  // reviewer's authority... note: this fixture uses "Yes" authority. ─────
  {
    id: "cppa-admt-p11-housing-authority-vendor",
    tool: "cppa-admt",
    label: "Multi-site landlord tenant score — housing domain, reviewer with override authority, vendor screening data",
    company: "Ridgeline Property Management Trust",
    sector: "Multi-family residential property management",
    geo: "us",
    summary:
      "Ridgeline scores rental applications across its multi-site portfolio using a vendor-supplied credit and rental-history feed folded into an in-house model; a regional leasing director reviews every score and can override it, so the decision is out of scope on qualifying human review. Exercises: the housing domain with the § 7001(ddd)(2) basis answered 'other factors are considered', reviewer-with-authority human review, and a named data vendor whose documentation is only partially on file.",
    intake: {
      organization_name: "Ridgeline Property Management Trust",
      system_name: "Portfolio Tenant Score (PTS 2.0)",
      system_type: "In-house statistical scoring model",
      system_description:
        "Every rental application across Ridgeline's 14-site portfolio is scored by the Portfolio Tenant Score model, which reads a credit-based rental-risk score purchased from Meadowlark Tenant Data Services, verified income against posted rent, and application-packet completeness. It returns a placement recommendation (Approve, Approve with Higher Deposit, Refer to Regional Director) and the inputs behind it. A regional leasing director reviews every recommendation, the applicant packet, and any written explanation supplied, and has authority to approve, adjust the deposit, or decline regardless of the recommendation.",
      decision_domains: ["Housing (rental or purchase eligibility)"],
      human_review:
        "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
      training_data_use: "Yes",
      profiling_use: "Yes",

      notice_delivery: ["Included in our Notice at Collection", "Separate standalone Pre-use Notice"],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the Portfolio Tenant Score to decide whether to approve your rental application, whether to require a higher security deposit, or whether to refer your application to a regional director.",
      notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — via hyperlink or layered notice",
      notice_has_alternative_process: "Yes",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception: "No exception — we provide a full opt-out right",
      opt_out_handling_confirmations: [
        "No identity verification is required to submit an opt-out request (§ 7221(f))",
        "One option opts the consumer out of every use of ADMT we make for significant decisions (§ 7221(i))",
        "We accept opt-out requests from an authorized agent with the consumer's signed permission (§ 7221(j))",
        "We do not ask a consumer who opted out to consent again for at least 12 months (§ 7221(k))",
        "An opt-out received before processing begins prevents that processing (§ 7221(m))",
      ],
      opt_out_methods: ["Interactive online form linked from the Pre-use Notice", "Designated email address"],
      opt_out_link_title: "Apply Without Automated Tenant Scoring",
      opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      opt_out_no_account_required: "Confirmed — no account required",
      opt_out_confirmation_mechanism:
        "An automated email confirms the opt-out within one business day from leasing@ridgelinepm.com, referencing the application ID.",
      opt_out_fairness_doc:
        "Ridgeline's compliance team commissioned a portfolio-wide disparate-impact review of PTS outcomes from Cedarline Housing Analytics, dated 2026-04-18, covering all 14 sites.",
      opt_out_15_day_process:
        "Opt-out requests route to the regional director for manual review, with a leasing decision issued within fifteen business days.",

      access_submission_methods:
        "Requests are accepted through the resident portal privacy-request form and by email to privacy@ridgelinepm.com.",
      access_verification_process:
        "The requester confirms the application ID and the property applied for, then completes a one-time code sent to the application email.",
      access_logic_disclosure:
        "Ridgeline can describe the three inputs PTS uses (credit-based rental-risk score, income-to-rent ratio, packet completeness) and the recommendation returned; the vendor's underlying risk-score methodology is described only at a summary level.",
      access_outcome_disclosure:
        "The response states the recommendation returned, the date, and the leasing decision the regional director issued.",
      access_response_timeline: "Within 45 calendar days (standard)",
      access_trade_secret_policy:
        "Meadowlark's risk-score methodology is withheld as the vendor's trade secret; Ridgeline supplies the summary-level explanation above.",

      ca_consumer_count: "11,400",
      third_party_admt:
        "Yes — the credit-based rental-risk score is purchased from Meadowlark Tenant Data Services, a consumer reporting agency, under a standard data-license agreement dated 2025-10-01.",
      admt_system_count: "1",
      affected_population_band: "10,001 – 100,000",
      role_roster: [
        "Privacy officer / DPO",
        "Legal counsel",
        "Human reviewer",
        "Vendor manager",
      ],

      admt_detail: {
        vendor_status: "Third party",
        vendor_docs: ["SOC 2 / pen test"],
        vendor_makes_available: "Unsure",
        v_audit: "No",
        v_assist: "No",
        v_optout: "No",
        v_appeal: "No",
        v_incident: "No",
        hosting: "Hybrid",
        model_types: ["Statistical model"],
        decision_effects: ["Eligibility", "Provision"],
        decision_cadence: "Repeated",
        sole_factor: "Material factor — heavily weighted alongside others",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        housing_decision_basis: "No — other factors are considered",
        decision_domains_other: "",
        hi_reviewer_present: "Yes — on every decision",
        hi_reviewer_role: "Regional Leasing Director",
        hi_stage: "Before the decision is issued",
        hi_trained: "Yes",
        hi_reviews_other_info: "Yes",
        hi_authority_override: "Yes",
        hi_override_rate: "About one recommendation in twelve across the portfolio",
        other_factors: "Verified income-to-rent ratio and the applicant's written explanation",
        vendor_product: "Meadowlark Tenant Data Services — Rental Risk Score",
        vendor_training_rights: "Unsure — the standard data-license agreement does not address model-training rights",
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "Yes — documented testing record",
        access_secure_transmission: "Encrypted self-service portal",
        access_denial_basis: "Adverse leasing-decision reasons are disclosed in full to the applicant; no withholding applies to the outcome disclosure.",
      },

      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process: "The leasing office restates the published purpose paragraph from the current notice.",
        b2_logic_ready: "Partially — we can produce some of it",
        b2_logic_process: "Ridgeline can name the three inputs at a summary level; Meadowlark's underlying score methodology is not disclosed to Ridgeline.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process: "The application file records the recommendation and the director's decision.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The leasing decision and any deposit adjustment are recorded in the application file.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The file names the regional director who reviewed the recommendation.",
        b4_rights_ready: "Yes — we can produce this today",
        b4_rights_process: "The response template carries the anti-retaliation statement and a link to the resident privacy notice.",
      },

      notice_element_text: {
        purpose:
          "We use the Portfolio Tenant Score to decide whether to approve your rental application, whether to require a higher security deposit, or whether to refer your application to a regional director.",
        optout:
          "You can ask us to review your application without the Score. Use the link 'Apply Without Automated Tenant Scoring' or email leasing@ridgelinepm.com. We confirm within one business day and issue a manual-review decision within fifteen business days.",
        access:
          "You can ask us for an explanation of your recommendation through the resident portal or by email; we respond within 45 calendar days.",
        antiretaliation:
          "We will not deny your application, charge a higher deposit, or provide a lower level of service because you asked us to review your application without the Score or asked for an explanation.",
        howworks_inputs:
          "The Score uses a credit-based rental-risk score from Meadowlark Tenant Data Services, your income compared with the rent, and whether your application packet is complete.",
        howworks_output:
          "It returns a recommendation — Approve, Approve with Higher Deposit, or Refer to Regional Director; a regional leasing director reviews every recommendation and can override it.",
        altprocess:
          "If you opt out, a regional leasing director assesses your application manually from your packet and income documentation, without the Score, and issues the leasing decision within fifteen business days.",
      },
      notice_full_text:
        "PRE-USE NOTICE — AUTOMATED TENANT SCORING (Ridgeline Property Management Trust, published 2026-01-25, ridgelinepm.com/admt-notice)\n\nWhat we use it for. We use the Portfolio Tenant Score to decide whether to approve your rental application, whether to require a higher security deposit, or whether to refer your application to a regional director.\n\nHow it works. The Score uses a credit-based rental-risk score from Meadowlark Tenant Data Services, your income compared with the rent, and whether your application packet is complete. It returns a recommendation that a regional leasing director reviews and can override.\n\nYour right to opt out. You can ask us to review your application without the Score. Use the link 'Apply Without Automated Tenant Scoring' or email leasing@ridgelinepm.com. We confirm within one business day and issue a decision within fifteen business days.\n\nWhat happens instead. A regional leasing director assesses your application manually from your packet and income documentation, without the Score, within fifteen business days.\n\nYour right to an explanation. You can ask us for an explanation of your recommendation through the resident portal or by email. We respond within 45 calendar days.\n\nNo retaliation. We will not deny your application, charge a higher deposit, or provide a lower level of service because you opted out or asked for an explanation.\n\nQuestions. Privacy Officer, Ridgeline Property Management Trust, 700 Portfolio Lane, Suite 500, Denver, CO 80202 — privacy@ridgelinepm.com.",
    },
  },

  // ── p12 — Beacon Hill Preparatory Academy: education admission,
  // reviewer with authority, vendor admissions-scoring SaaS. ─────────────
  {
    id: "cppa-admt-p12-education-authority-vendor",
    tool: "cppa-admt",
    label: "Private-school admissions fit score — education domain, reviewer with override authority, vendor SaaS",
    company: "Beacon Hill Preparatory Academy",
    sector: "Independent K-12 education",
    geo: "us",
    summary:
      "Beacon Hill uses a vendor admissions-scoring SaaS platform to produce a fit score for prospective students; the Director of Admissions reviews every score alongside the full application file and can override it, placing the decision out of scope on qualifying human review. Exercises: the education-admission domain, reviewer-with-authority human review, a fully-documented third-party admissions SaaS vendor, and mostly-complete access-readiness answers with one honest gap.",
    intake: {
      organization_name: "Beacon Hill Preparatory Academy",
      system_name: "Admissions Fit Score (via Scholaris Admissions Platform)",
      system_type: "Vendor-hosted statistical scoring model",
      system_description:
        "Every completed application to Beacon Hill Preparatory Academy is scored by the Admissions Fit Score, generated by the Scholaris Admissions Platform, a hosted service from Scholaris EdTech Inc. The model reads standardized-test percentiles where submitted, prior-school GPA, and the number of enrichment activities listed, and returns a fit score used only to sequence which files the admissions committee reads first. The Director of Admissions and the admissions committee review the complete file — including the personal essay, interview notes, and teacher recommendations — for every applicant regardless of fit score, and the Director has final authority over every admission decision.",
      decision_domains: ["Education enrollment or opportunities (admission, credentials, suspension)"],
      human_review:
        "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
      training_data_use: "Yes",
      profiling_use: "Yes",

      notice_delivery: ["Separate standalone Pre-use Notice", "In-app just-in-time notice before data collection"],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the Admissions Fit Score to help sequence which completed applications our admissions committee reads first. It does not decide whether an applicant is admitted.",
      notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — included inline in the notice",
      notice_has_alternative_process: "Yes",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception: "No exception — we provide a full opt-out right",
      opt_out_handling_confirmations: [
        "No identity verification is required to submit an opt-out request (§ 7221(f))",
        "One option opts the consumer out of every use of ADMT we make for significant decisions (§ 7221(i))",
        "We accept opt-out requests from an authorized agent with the consumer's signed permission (§ 7221(j))",
        "We do not ask a consumer who opted out to consent again for at least 12 months (§ 7221(k))",
        "An opt-out received before processing begins prevents that processing (§ 7221(m))",
      ],
      opt_out_methods: ["Designated email address", "Mail-based form"],
      opt_out_link_title: "Request Reading Without Automated Fit Scoring",
      opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      opt_out_no_account_required: "Confirmed — no account required",
      opt_out_confirmation_mechanism:
        "The admissions office confirms the opt-out by email within two business days and flags the applicant file in Scholaris so no fit score is generated.",
      opt_out_fairness_doc:
        "Scholaris EdTech Inc. provides Beacon Hill an annual bias-testing summary; the 2026 summary, dated 2026-03-01, found no statistically significant disparity in fit-score distribution across race, sex, or socioeconomic-aid-status proxies.",
      opt_out_15_day_process:
        "An opted-out applicant's file is placed directly in the standard committee reading queue with no differential timeline.",

      access_submission_methods:
        "Requests are accepted through the admissions portal privacy-request form and by email to admissions-privacy@beaconhillprep.edu.",
      access_verification_process:
        "The requester confirms the application ID and the email address used to apply, then completes a one-time code sent to that email.",
      access_logic_disclosure:
        "Beacon Hill supplies a plain-language explanation naming the three inputs the Fit Score uses (standardized-test percentile where submitted, prior-school GPA, enrichment-activity count) and the fit score returned.",
      access_outcome_disclosure:
        "The response states the fit score returned and the final admission decision issued by the Director of Admissions.",
      access_response_timeline: "Within 45 calendar days (standard)",
      access_trade_secret_policy:
        "Scholaris's scoring weights are withheld as the vendor's trade secret; the general input list above is supplied in full.",

      ca_consumer_count: "1,850",
      third_party_admt:
        "Yes — the Admissions Fit Score is generated by the Scholaris Admissions Platform, a hosted service from Scholaris EdTech Inc., engaged as a service provider under an agreement dated 2025-08-15.",
      admt_system_count: "1",
      affected_population_band: "1,000 – 10,000",
      role_roster: [
        "Privacy officer / DPO",
        "Legal counsel",
        "Human reviewer",
        "Vendor manager",
        "Consumer-request handler",
      ],

      admt_detail: {
        vendor_status: "Service provider",
        vendor_docs: ["Model card / datasheet", "Bias-testing report", "SOC 2 / pen test"],
        vendor_makes_available: "Yes",
        v_audit: "Yes",
        v_assist: "Yes",
        v_optout: "Yes",
        v_appeal: "No",
        v_incident: "Yes",
        hosting: "Hosted by the vendor",
        model_types: ["Statistical model"],
        decision_effects: ["Ranking"],
        decision_cadence: "One-time",
        sole_factor: "One of many factors",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        decision_domains_other: "",
        hi_reviewer_present: "Yes — on every decision",
        hi_reviewer_role: "Director of Admissions and the admissions committee",
        hi_stage: "Before the decision is issued",
        hi_trained: "Yes",
        hi_reviews_other_info: "Yes",
        hi_authority_override: "Yes",
        hi_override_rate: "Not meaningfully measured — every file is read in full regardless of the score, which only sets reading order",
        other_factors: "Personal essay, interview notes, and teacher recommendations",
        vendor_product: "Scholaris EdTech Inc. — Scholaris Admissions Platform",
        vendor_training_rights: "No — the agreement prohibits Scholaris from using Beacon Hill applicant data to train shared models",
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "Yes — documented testing record",
        access_secure_transmission: "Encrypted self-service portal",
        access_denial_basis: "Not applicable — the outcome disclosure is provided in full; no withholding applies.",
      },

      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process: "The admissions office inserts the published purpose paragraph from the current notice.",
        b2_logic_ready: "Yes — we can produce this today",
        b2_logic_process: "The office runs the Scholaris explanation report, which lists the three inputs and the fit score.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process: "The applicant file records the fit score and confirms full-file committee review occurred.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The final admission decision and date are recorded in the applicant file.",
        b3_human_role_ready: "Partially — we can produce some of it",
        b3_human_role_process: "The file names the Director of Admissions but does not separately log each committee member who read the file.",
        b4_rights_ready: "Yes — we can produce this today",
        b4_rights_process: "The response template carries the anti-retaliation statement and a link to the admissions privacy notice.",
      },

      notice_element_text: {
        purpose:
          "We use the Admissions Fit Score to help sequence which completed applications our admissions committee reads first. It does not decide whether an applicant is admitted.",
        optout:
          "You can ask us to read your application without a fit score. Use the link 'Request Reading Without Automated Fit Scoring' or email admissions-privacy@beaconhillprep.edu. We confirm within two business days.",
        access:
          "You can ask us for an explanation of your fit score through the admissions portal or by email; we respond within 45 calendar days.",
        antiretaliation:
          "We will not deny your application or provide a lower level of service because you asked us to read your application without a fit score or asked for an explanation.",
        howworks_inputs:
          "The Fit Score uses your standardized-test percentile where submitted, your prior-school GPA, and your enrichment-activity count.",
        howworks_output:
          "It returns a fit score used only to sequence which files the committee reads first; the Director of Admissions and the committee review every file in full regardless of the score.",
        altprocess:
          "If you opt out, your file is placed directly in the standard committee reading queue with no differential timeline.",
      },
      notice_full_text:
        "PRE-USE NOTICE — ADMISSIONS FIT SCORE (Beacon Hill Preparatory Academy, published 2026-01-30, beaconhillprep.edu/admt-notice)\n\nWhat we use it for. We use the Admissions Fit Score to help sequence which completed applications our admissions committee reads first. It does not decide whether an applicant is admitted.\n\nHow it works. The Fit Score uses your standardized-test percentile where submitted, your prior-school GPA, and your enrichment-activity count. The Director of Admissions and the committee review every file in full regardless of the score.\n\nYour right to opt out. You can ask us to read your application without a fit score. Use the link 'Request Reading Without Automated Fit Scoring' or email admissions-privacy@beaconhillprep.edu. You do not need an account to opt out. We confirm within two business days.\n\nWhat happens instead. Your file is placed directly in the standard committee reading queue with no differential timeline.\n\nYour right to an explanation. You can ask us for an explanation of your fit score through the admissions portal or by email. We respond within 45 calendar days.\n\nNo retaliation. We will not deny your application or provide a lower level of service because you opted out or asked for an explanation.\n\nQuestions. Director of Admissions, Beacon Hill Preparatory Academy, 55 Overlook Terrace, Providence, RI 02906 — admissions-privacy@beaconhillprep.edu.",
    },
  },

  // ── p13 — Compass Point Recruiting Group, Inc.: hiring, reviewer with
  // authority, vendor assessment tool, full opt-out (no exception). ──────
  {
    id: "cppa-admt-p13-hiring-authority-full-optout",
    tool: "cppa-admt",
    label: "Recruiting-firm skills assessment score — hiring domain, reviewer with override authority, full opt-out offered",
    company: "Compass Point Recruiting Group, Inc.",
    sector: "Executive search and recruiting services",
    geo: "us",
    summary:
      "Compass Point uses a vendor skills-assessment tool to score candidates it places with client employers; a senior recruiter reviews every score with full authority to override it before presenting a candidate, and the firm chooses to offer a full opt-out right rather than rely on the § 7221(b)(2) exception. Exercises: the hiring domain with reviewer-with-authority human review, a third-party assessment vendor, and the full-opt-out pathway chosen in a domain where an exception would also have been available.",
    intake: {
      organization_name: "Compass Point Recruiting Group, Inc.",
      system_name: "Candidate Skills Assessment Score (via SkillProof)",
      system_type: "Vendor-hosted psychometric assessment model",
      system_description:
        "Every candidate who completes a Compass Point placement assessment is scored by SkillProof, a hosted psychometric assessment service from Insight Talent Systems LLC, which reads structured test responses covering role-relevant skills and returns a percentile score against the role's benchmark group. A senior recruiter reviews the score together with the candidate's resume, reference checks, and interview notes, and has full authority to present, hold, or decline to present a candidate to a client employer regardless of the SkillProof score.",
      decision_domains: ["Hiring or admission decisions"],
      human_review:
        "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
      training_data_use: "Yes",
      profiling_use: "Yes",

      notice_delivery: ["Included in our Notice at Collection", "Account-creation or onboarding flow"],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the SkillProof assessment score to help our recruiters evaluate your role-relevant skills alongside your resume, references, and interview. It does not itself decide whether you are presented to a client employer.",
      notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — included inline in the notice",
      notice_has_alternative_process: "Yes",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception: "No exception — we provide a full opt-out right",
      opt_out_handling_confirmations: [
        "No identity verification is required to submit an opt-out request (§ 7221(f))",
        "One option opts the consumer out of every use of ADMT we make for significant decisions (§ 7221(i))",
        "We accept opt-out requests from an authorized agent with the consumer's signed permission (§ 7221(j))",
        "We do not ask a consumer who opted out to consent again for at least 12 months (§ 7221(k))",
        "An opt-out received before processing begins prevents that processing (§ 7221(m))",
      ],
      opt_out_methods: ["Designated email address", "Toll-free phone number"],
      opt_out_link_title: "Skip the Skills Assessment Score",
      opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      opt_out_no_account_required: "Confirmed — no account required",
      opt_out_confirmation_mechanism:
        "The assigned recruiter confirms the opt-out by email within one business day and notes the candidate file so no SkillProof invitation is sent.",
      opt_out_fairness_doc:
        "Insight Talent Systems LLC provides Compass Point an annual adverse-impact analysis of SkillProof outcomes; the 2026 analysis, dated 2026-05-12, found no statistically significant disparity across race, sex, or age proxies for the role-benchmark groups Compass Point uses.",
      opt_out_15_day_process:
        "An opted-out candidate is evaluated by the recruiter from resume, references, and interview alone, with the same placement timeline as assessed candidates.",

      access_submission_methods:
        "Requests are accepted through the candidate portal privacy-request form and by email to privacy@compasspointrecruiting.com.",
      access_verification_process:
        "The requester confirms the candidate ID and the email address used to apply, then completes a one-time code sent to that email.",
      access_logic_disclosure:
        "Compass Point supplies a plain-language explanation naming the assessment's general skill categories and the percentile score returned against the role's benchmark group; individual item-level scoring is withheld under the trade-secret policy below.",
      access_outcome_disclosure:
        "The response states the percentile score returned and whether the recruiter presented the candidate to a client employer.",
      access_response_timeline: "Within 45 calendar days (standard)",
      access_trade_secret_policy:
        "SkillProof's item-level scoring weights are withheld as a trade secret of Insight Talent Systems LLC under Cal. Civ. Code § 3426.1(d); the general category and percentile explanation above is supplied in full.",

      ca_consumer_count: "4,300",
      third_party_admt:
        "Yes — the assessment is a hosted service from Insight Talent Systems LLC, engaged as a service provider under a master services agreement dated 2025-09-10.",
      admt_system_count: "1",
      affected_population_band: "1,000 – 10,000",
      role_roster: [
        "Privacy officer / DPO",
        "Legal counsel",
        "Human reviewer",
        "Vendor manager",
        "Consumer-request handler",
      ],

      admt_detail: {
        vendor_status: "Service provider",
        vendor_docs: ["Model card / datasheet", "Bias-testing report", "SOC 2 / pen test"],
        vendor_makes_available: "Yes",
        v_audit: "Yes",
        v_assist: "Yes",
        v_optout: "Yes",
        v_appeal: "No",
        v_incident: "Yes",
        hosting: "Hosted by the vendor",
        model_types: ["Statistical model"],
        decision_effects: ["Ranking", "Eligibility"],
        decision_cadence: "One-time",
        sole_factor: "One of many factors",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        decision_domains_other: "",
        hi_reviewer_present: "Yes — on every decision",
        hi_reviewer_role: "Senior Recruiter",
        hi_stage: "Before the decision is issued",
        hi_trained: "Yes",
        hi_reviews_other_info: "Yes",
        hi_authority_override: "Yes",
        hi_override_rate: "About one candidate in six is presented despite a below-benchmark score, based on strong references and interview performance",
        other_factors: "Reference-check results and structured interview notes",
        vendor_product: "Insight Talent Systems LLC — SkillProof Assessment Platform",
        vendor_training_rights: "No — the agreement prohibits Insight Talent Systems from using Compass Point candidate data to train shared models",
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "Yes — documented testing record",
        access_secure_transmission: "Encrypted self-service portal",
        access_denial_basis: "Not applicable — the outcome disclosure is provided in full; no withholding applies.",
      },

      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process: "The recruiter restates the published purpose paragraph from the onboarding notice text.",
        b2_logic_ready: "Yes — we can produce this today",
        b2_logic_process: "The handler runs the SkillProof summary report, which lists the general skill categories and the percentile score.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process: "The candidate file records the percentile score and whether the candidate was presented to a client.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The placement outcome is recorded in the candidate file.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The file names the recruiter who reviewed the score and the decision made.",
        b4_rights_ready: "Yes — we can produce this today",
        b4_rights_process: "The response template carries the anti-retaliation statement and a link to the candidate privacy notice.",
      },

      notice_element_text: {
        purpose:
          "We use the SkillProof assessment score to help our recruiters evaluate your role-relevant skills alongside your resume, references, and interview. It does not itself decide whether you are presented to a client employer.",
        optout:
          "You can ask us to skip the assessment score. Use the link 'Skip the Skills Assessment Score' or email privacy@compasspointrecruiting.com. We confirm within one business day.",
        access:
          "You can ask us for an explanation of your assessment score through the candidate portal or by email; we respond within 45 calendar days.",
        antiretaliation:
          "We will not decline to present you to a client employer or provide a lower level of service because you asked us to skip the score or asked for an explanation.",
        howworks_inputs: "SkillProof reads your structured test responses covering role-relevant skills.",
        howworks_output:
          "It returns a percentile score against the role's benchmark group; a senior recruiter reviews the score with your resume, references, and interview and decides whether to present you to a client.",
        altprocess:
          "If you opt out, the recruiter evaluates you from your resume, references, and interview alone, with the same placement timeline as assessed candidates.",
      },
      notice_full_text:
        "PRE-USE NOTICE — CANDIDATE SKILLS ASSESSMENT (Compass Point Recruiting Group, Inc., published 2026-01-18, compasspointrecruiting.com/admt-notice)\n\nWhat we use it for. We use the SkillProof assessment score to help our recruiters evaluate your role-relevant skills alongside your resume, references, and interview. It does not itself decide whether you are presented to a client employer.\n\nHow it works. SkillProof reads your structured test responses covering role-relevant skills and returns a percentile score against the role's benchmark group. A senior recruiter reviews the score with your resume, references, and interview and decides whether to present you to a client.\n\nYour right to opt out. You can ask us to skip the assessment score. Use the link 'Skip the Skills Assessment Score' or email privacy@compasspointrecruiting.com. You do not need an account to opt out. We confirm within one business day.\n\nWhat happens instead. The recruiter evaluates you from your resume, references, and interview alone, with the same placement timeline as assessed candidates.\n\nYour right to an explanation. You can ask us for an explanation of your assessment score through the candidate portal or by email. We respond within 45 calendar days.\n\nNo retaliation. We will not decline to present you to a client employer or provide a lower level of service because you opted out or asked for an explanation.\n\nQuestions. Privacy Officer, Compass Point Recruiting Group, Inc., 88 Talent Square, Suite 900, Boston, MA 02110 — privacy@compasspointrecruiting.com.",
    },
  },

  // ── p14 — Willowmere Behavioral Health Partners: healthcare access,
  // fully automated, full opt-out, vendor triage model. ──────────────────
  {
    id: "cppa-admt-p14-healthcare-fully-automated",
    tool: "cppa-admt",
    label: "Behavioral-health intake triage flag — fully automated, full opt-out, vendor model",
    company: "Willowmere Behavioral Health Partners",
    sector: "Outpatient behavioral health services",
    geo: "us",
    summary:
      "Willowmere uses a vendor-hosted triage model to set the initial appointment-priority tier for new behavioral-health intake requests, with no clinician review before the tier is assigned, and offers callers a full opt-out to a standard triage process. Exercises: the healthcare-access domain, fully-automated (no) human review with the full Article 11 duty set in play, a third-party clinical vendor whose access-assistance and opt-out-propagation duties are both confirmed, and a completely answered access-explanation readiness set.",
    intake: {
      organization_name: "Willowmere Behavioral Health Partners",
      system_name: "Intake Priority Triage Model (IPTM)",
      system_type: "Vendor-hosted clinical triage model",
      system_description:
        "Every new-patient intake request submitted through Willowmere's scheduling line or online form is scored by the Intake Priority Triage Model, a hosted service from Meridix Clinical AI Inc., which reads the intake questionnaire's symptom-severity responses, self-reported risk indicators, and time since last care episode. It returns a priority tier (Same-Day, Within-Week, Standard) that sets the caller's initial appointment-scheduling window. No clinician reviews the tier before it is assigned and communicated to the caller; a clinician reviews the full intake at the first appointment regardless of the tier assigned.",
      decision_domains: ["Healthcare services (diagnosis, treatment, care eligibility)"],
      human_review: "No — fully automated, no human review",
      training_data_use: "Yes",
      profiling_use: "Yes",

      notice_delivery: ["Included in our Notice at Collection", "In-app just-in-time notice before data collection"],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the Intake Priority Triage Model to set the initial scheduling window for your first appointment based on your intake questionnaire responses.",
      notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — included inline in the notice",
      notice_has_alternative_process: "Yes",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception: "No exception — we provide a full opt-out right",
      opt_out_handling_confirmations: [
        "No identity verification is required to submit an opt-out request (§ 7221(f))",
        "One option opts the consumer out of every use of ADMT we make for significant decisions (§ 7221(i))",
        "We accept opt-out requests from an authorized agent with the consumer's signed permission (§ 7221(j))",
        "We do not ask a consumer who opted out to consent again for at least 12 months (§ 7221(k))",
        "An opt-out received before processing begins prevents that processing (§ 7221(m))",
      ],
      opt_out_methods: ["Interactive online form linked from the Pre-use Notice", "Toll-free phone number", "Designated email address"],
      opt_out_link_title: "Schedule Without Automated Triage Scoring",
      opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      opt_out_no_account_required: "Confirmed — no account required",
      opt_out_confirmation_mechanism:
        "The scheduling line confirms the opt-out verbally at the time of the call and sends a written confirmation to the patient portal within one business day.",
      opt_out_fairness_doc:
        "Meridix Clinical AI Inc. provides Willowmere an annual bias-testing report; the 2026 report, dated 2026-04-15, found no statistically significant disparity in tier assignment across race, ethnicity, sex, age, or insurance-type proxies over 13,700 intake requests.",
      opt_out_15_day_process:
        "An opted-out caller is scheduled by a triage nurse using the standard symptom-severity protocol without the model, within the same scheduling windows offered to scored callers.",

      access_submission_methods:
        "Requests are accepted through the patient portal privacy-request form and by calling Health Information Management at 1-855-555-0199.",
      access_verification_process:
        "The requester confirms the medical record number and date of birth, consistent with Willowmere's HIPAA-aligned release-of-information procedure.",
      access_logic_disclosure:
        "Willowmere supplies a plain-language explanation naming the three inputs IPTM uses (symptom-severity responses, self-reported risk indicators, time since last care episode) and the priority tier returned.",
      access_outcome_disclosure:
        "The response states the priority tier assigned, the date it was returned, and the appointment date scheduled.",
      access_response_timeline: "Within 45 days with documented 45-day extension capability",
      access_trade_secret_policy:
        "Underlying model coefficients are withheld as a trade secret of Meridix Clinical AI Inc. under Cal. Civ. Code § 3426.1(d); the input and tier explanation above is supplied in full.",

      ca_consumer_count: "13,700",
      third_party_admt:
        "Yes — the model is a hosted clinical triage service from Meridix Clinical AI Inc., engaged as a service provider under a business-associate and CCPA service-provider agreement dated 2025-11-05.",
      admt_system_count: "1",
      affected_population_band: "10,001 – 100,000",
      role_roster: [
        "Privacy officer / DPO",
        "Legal counsel",
        "Consumer-request handler",
        "Vendor manager",
      ],

      admt_detail: {
        vendor_status: "Service provider",
        vendor_docs: ["Model card / datasheet", "Validation report", "SOC 2 / pen test"],
        vendor_makes_available: "Yes",
        v_audit: "Yes",
        v_assist: "Yes",
        v_optout: "Yes",
        v_appeal: "Yes",
        v_incident: "Yes",
        hosting: "Hosted by the vendor",
        model_types: ["ML classifier"],
        decision_effects: ["Ranking"],
        decision_cadence: "Repeated",
        sole_factor: "Sole factor — output alone determines the outcome",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        decision_domains_other: "",
        hi_reviewer_present: "No — fully automated",
        vendor_product: "Meridix Clinical AI Inc. — Intake Priority Triage Model",
        vendor_training_rights: "No — the business-associate agreement prohibits Meridix from using Willowmere patient data to train shared models",
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "Yes — documented testing record",
        access_secure_transmission: "Encrypted self-service portal",
        access_denial_basis: "Not applicable — the outcome disclosure is provided in full; no withholding applies.",
      },

      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process: "Health Information Management inserts the published purpose paragraph from the current notice.",
        b2_logic_ready: "Yes — we can produce this today",
        b2_logic_process: "The team runs the Meridix explanation report, which lists the three inputs and the tier returned.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process: "The electronic health record logs the tier assigned and the appointment scheduled from it.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The scheduling record confirms the appointment date and window offered.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The record confirms no clinician review occurred before the tier was communicated, consistent with the fully-automated process.",
        b4_rights_ready: "Yes — we can produce this today",
        b4_rights_process: "The response template carries the anti-retaliation statement and a link to the Notice of Privacy Practices.",
      },

      notice_element_text: {
        purpose:
          "We use the Intake Priority Triage Model to set the initial scheduling window for your first appointment based on your intake questionnaire responses.",
        optout:
          "You can ask us to schedule you without the Model. Use the link 'Schedule Without Automated Triage Scoring', call 1-855-555-0199, or ask at the time of your call. We confirm verbally at the time of the call.",
        access:
          "You can ask us for an explanation of your priority tier through the patient portal or by calling Health Information Management; we respond within 45 days and will tell you if we need one additional 45-day extension.",
        antiretaliation:
          "We will not deny you care, delay your appointment, or provide a lower level of service because you opted out of the Model or asked for an explanation.",
        howworks_inputs:
          "The Model reads your intake questionnaire's symptom-severity responses, self-reported risk indicators, and time since your last care episode.",
        howworks_output:
          "It returns a priority tier — Same-Day, Within-Week, or Standard — that sets your initial appointment-scheduling window; a clinician reviews your full intake at the first appointment regardless of the tier assigned.",
        altprocess:
          "If you opt out, a triage nurse schedules you using the standard symptom-severity protocol without the Model, within the same scheduling windows offered to scored callers.",
      },
      notice_full_text:
        "PRE-USE NOTICE — INTAKE PRIORITY TRIAGE (Willowmere Behavioral Health Partners, published 2026-01-22, willowmerebhp.com/admt-notice)\n\nWhat we use it for. We use the Intake Priority Triage Model to set the initial scheduling window for your first appointment based on your intake questionnaire responses.\n\nHow it works. The Model reads your intake questionnaire's symptom-severity responses, self-reported risk indicators, and time since your last care episode, and returns a priority tier — Same-Day, Within-Week, or Standard. A clinician reviews your full intake at the first appointment regardless of the tier assigned.\n\nYour right to opt out. You can ask us to schedule you without the Model. Use the link 'Schedule Without Automated Triage Scoring', call 1-855-555-0199, or ask at the time of your call. You do not need an account to opt out. We confirm verbally at the time of the call.\n\nWhat happens instead. A triage nurse schedules you using the standard symptom-severity protocol without the Model, within the same scheduling windows offered to scored callers.\n\nYour right to an explanation. You can ask us for an explanation of your priority tier through the patient portal or by calling Health Information Management. We respond within 45 days and will tell you if we need one additional 45-day extension.\n\nNo retaliation. We will not deny you care, delay your appointment, or provide a lower level of service because you opted out or asked for an explanation.\n\nQuestions. Privacy Officer, Willowmere Behavioral Health Partners, 2200 Serenity Lane, Austin, TX 78745 — privacy@willowmerebhp.com.",
    },
  },

  // ── p15 — Ironclad Warehouse Solutions Corp.: work allocation, advisory
  // review, full opt-out (no exception), in-house system. ────────────────
  {
    id: "cppa-admt-p15-work-allocation-advisory-full-optout",
    tool: "cppa-admt",
    label: "Warehouse task-assignment score — work-allocation domain, advisory-only review, full opt-out offered",
    company: "Ironclad Warehouse Solutions Corp.",
    sector: "Third-party logistics and warehouse operations",
    geo: "us",
    summary:
      "Ironclad's in-house model recommends daily task assignments and overtime-eligibility flags for warehouse associates; a shift supervisor sees every recommendation but cannot override it before assignments post, so human review is answered 'Partial', and Ironclad offers a full opt-out rather than claiming the § 7221(b)(3) exception. Exercises: the work-allocation domain a second time with the full-opt-out pathway instead of the exception, advisory (non-overriding) human review, and an in-house system with no third-party vendor.",
    intake: {
      organization_name: "Ironclad Warehouse Solutions Corp.",
      system_name: "Task Assignment Recommendation Engine (TARE)",
      system_type: "In-house statistical scoring model",
      system_description:
        "Each morning, the Task Assignment Recommendation Engine reads certified availability, cross-training qualifications, and the prior week's logged pick-rate performance to recommend a task assignment and overtime-eligibility flag for every warehouse associate. A shift supervisor reviews the full slate of recommendations before the shift begins and can flag a data error for correction, but has no authority to reassign a task or change an overtime flag once the underlying data is confirmed accurate; the posted assignment is the engine's recommendation as reviewed.",
      decision_domains: ["Work allocation, scheduling, or compensation"],
      human_review: "Partial — reviewer sees the output but cannot override it",
      training_data_use: "Yes",
      profiling_use: "Yes",

      notice_delivery: ["Separate standalone Pre-use Notice", "Account-creation or onboarding flow"],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use the Task Assignment Recommendation Engine to set your daily task assignment and overtime eligibility based on your availability, qualifications, and recent pick-rate performance.",
      notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — included inline in the notice",
      notice_has_alternative_process: "Yes",
      notice_timing: "At or before the point where we collect the personal information the ADMT processes",

      opt_out_exception: "No exception — we provide a full opt-out right",
      opt_out_handling_confirmations: [
        "No identity verification is required to submit an opt-out request (§ 7221(f))",
        "One option opts the consumer out of every use of ADMT we make for significant decisions (§ 7221(i))",
        "We accept opt-out requests from an authorized agent with the consumer's signed permission (§ 7221(j))",
        "We do not ask a consumer who opted out to consent again for at least 12 months (§ 7221(k))",
        "An opt-out received before processing begins prevents that processing (§ 7221(m))",
      ],
      opt_out_methods: ["Interactive online form linked from the Pre-use Notice", "Toll-free phone number", "Designated email address"],
      opt_out_link_title: "Request Manual Task Assignment Without TARE Scoring",
      opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      opt_out_no_account_required: "Confirmed — no account required",
      opt_out_confirmation_mechanism:
        "HR sends a confirmation email within one business day of an opt-out request, referencing the employee ID and effective date.",
      opt_out_fairness_doc:
        "Ironclad's HR Analytics group commissioned a quarterly disparate-impact review of TARE assignment outcomes from Northbeam Labor Analytics; the 2026-Q2 review, dated 2026-07-15, found no statistically significant disparity across race, sex, age, or disability-accommodation-status proxies over 980 associates.",
      opt_out_15_day_process:
        "An associate who opts out has their daily assignment set manually by the shift supervisor using the same availability and qualification data, effective within fifteen business days of the request.",

      access_submission_methods:
        "Requests are accepted through the workforce app's privacy-request tile and by email to privacy@ironcladwarehouse.com.",
      access_verification_process:
        "The requester confirms their employee ID and the email address on file, then completes a one-time code sent to that email.",
      access_logic_disclosure:
        "Ironclad supplies a plain-language explanation naming the three inputs TARE uses (availability, cross-training qualifications, trailing-week pick-rate performance) and the assignment and overtime flag returned.",
      access_outcome_disclosure:
        "The response states the task assignment and overtime-eligibility flag for the date requested and the date the assignment posted.",
      access_response_timeline: "Within 45 calendar days (standard)",
      access_trade_secret_policy: "No trade-secret withholding is applied; all three inputs the Engine uses are disclosed to the associate in full.",

      ca_consumer_count: "980",
      third_party_admt: "No — the engine is designed, trained, and hosted entirely by Ironclad's internal operations-analytics team.",
      admt_system_count: "1",
      affected_population_band: "1,000 – 10,000",
      role_roster: [
        "Privacy officer / DPO",
        "Legal counsel",
        "Human reviewer",
        "Consumer-request handler",
      ],

      admt_detail: {
        hosting: "Hosted internally",
        model_types: ["Statistical model"],
        decision_effects: ["Assignment", "Compensation"],
        decision_cadence: "Continuous",
        sole_factor: "Sole factor — output alone determines the outcome",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        decision_domains_other: "",
        hi_reviewer_present: "Yes — on every decision",
        hi_reviewer_role: "Shift Supervisor",
        hi_stage: "Before the decision is issued",
        hi_trained: "Yes",
        hi_reviews_other_info: "Yes",
        hi_authority_override: "No",
        hi_override_rate: "Not applicable — the supervisor may correct underlying data errors but has no authority to reassign a confirmed recommendation",
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "Yes — documented testing record",
        access_secure_transmission: "Encrypted self-service portal",
        access_denial_basis: "Not applicable — the outcome disclosure is provided in full; no withholding applies.",
      },

      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process: "The HR compliance handler inserts the published purpose paragraph from the onboarding-flow notice text.",
        b2_logic_ready: "Yes — we can produce this today",
        b2_logic_process: "The handler runs the TARE explanation report, which lists the three inputs and the assignment returned.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process: "The workforce app's assignment log records the task and overtime flag posted for each date.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process: "The assignment log is queried by employee ID and date range to confirm the posted outcome.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process: "The log names the shift supervisor who reviewed the slate and confirms whether a data correction was made.",
        b4_rights_ready: "Yes — we can produce this today",
        b4_rights_process: "The response template carries the anti-retaliation statement and a link to the employee privacy notice.",
      },

      notice_element_text: {
        purpose:
          "We use the Task Assignment Recommendation Engine to set your daily task assignment and overtime eligibility based on your availability, qualifications, and recent pick-rate performance.",
        optout:
          "You can ask us to assign your tasks manually instead. Use the link 'Request Manual Task Assignment Without TARE Scoring', call, or email privacy@ironcladwarehouse.com. We confirm within one business day.",
        access:
          "You can ask us for an explanation of your assignment through the workforce app or by email; we respond within 45 calendar days.",
        antiretaliation:
          "We will not reduce your hours, deny you overtime, or provide a lower level of service because you asked us to assign your tasks manually or asked for an explanation.",
        howworks_inputs:
          "The Engine reads your certified availability, cross-training qualifications, and your trailing-week logged pick-rate performance.",
        howworks_output:
          "It recommends your daily task assignment and overtime-eligibility flag; a shift supervisor reviews the full slate before the shift begins and can correct data errors, though not reassign a confirmed recommendation.",
        altprocess:
          "If you opt out, your daily assignment is set manually by the shift supervisor using the same availability and qualification data, effective within fifteen business days.",
      },
      notice_full_text:
        "PRE-USE NOTICE — AUTOMATED TASK ASSIGNMENT (Ironclad Warehouse Solutions Corp., published 2026-01-28, ironcladwarehouse.com/admt-notice)\n\nWhat we use it for. We use the Task Assignment Recommendation Engine to set your daily task assignment and overtime eligibility based on your availability, qualifications, and recent pick-rate performance.\n\nHow it works. The Engine reads your certified availability, cross-training qualifications, and your trailing-week logged pick-rate performance. It recommends your daily task assignment and overtime-eligibility flag; a shift supervisor reviews the full slate before the shift begins and can correct data errors, though not reassign a confirmed recommendation.\n\nYour right to opt out. You can ask us to assign your tasks manually instead. Use the link 'Request Manual Task Assignment Without TARE Scoring', call, or email privacy@ironcladwarehouse.com. You do not need an account to opt out. We confirm within one business day.\n\nWhat happens instead. Your daily assignment is set manually by the shift supervisor using the same availability and qualification data, effective within fifteen business days.\n\nYour right to an explanation. You can ask us for an explanation of your assignment through the workforce app or by email. We respond within 45 calendar days.\n\nNo retaliation. We will not reduce your hours, deny you overtime, or provide a lower level of service because you opted out or asked for an explanation.\n\nQuestions. Privacy Officer, Ironclad Warehouse Solutions Corp., 3300 Distribution Drive, Reno, NV 89506 — privacy@ironcladwarehouse.com.",
    },
  },
];
