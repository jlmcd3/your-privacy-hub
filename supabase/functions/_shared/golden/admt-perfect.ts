// ITEM 393 LEG B — ADMT PERFECT FIXTURE (×1).
//
// One truly-complete CPPA ADMT record under the item380r5 `emptyAskedKeys`
// semantics: every field `cppaAdmtContract` presents is non-empty (SYSTEM_KEYS
// and `emptyIsAnswer` controls respected; no conditional in this contract has a
// machine-readable trigger, so nothing is skipped by skip-logic).
//
// SUFFICIENCY, NOT PRESENCE. Every answer names a system, a mechanism, a role,
// a channel or a date. The ADMT self-test detail fields — the exact surface
// whose emptiness produced the archived render's degradation — are ANSWERED
// here: vendor posture, hosting, model types, decision effects and cadence,
// sole-factor weight, downstream feed, advertising-only status, the § 7221(b)(1)
// appeal-condition evidence and the § 7221(b)(2) evidence pair.
//
// FACT-EXEMPT REFERENCE RENDER (item 392 hard rule). This scenario is entirely
// new — California residential tenant screening, not the reference render's
// hiring scenario. No token from `REFERENCE_RENDER_TOKENS` appears anywhere
// below; the item-393 battery asserts that mechanically.
//
// LEGACY DEGRADED SETS (named, not extended): `GOLDEN_BY_TOOL["cppa-admt"]`
// carries five pilot cases (admt-hr-significant-tuning,
// admt-credit-significant-tuning, admt-advertising-adversarial,
// admt-service-eligibility-conservative, admt-hr-perfect-record) and
// `MESSY_BY_TOOL["cppa-admt"]` carries one thinned case
// (admt-messy-thin-notice-and-appeal-record, thinned from
// admt-hr-perfect-record). Those remain the degraded/pilot sources and are
// untouched by this leg; nothing degraded is authored here.
//
// Jurisdiction anchor: United States / California (11 CCR §§ 7200–7222).

import type { GoldenCase } from "./types.ts";

export const ADMT_PERFECT: GoldenCase[] = [
  {
    id: "admt-ca-tenant-screening-perfect",
    tool: "cppa-admt",
    set: "tuning",
    intake: {
      // Identity of the business submitting the record.
      organization_name: "Alderwood Residential Services, Inc.",
      // The named system under assessment.
      system_name: "Tenancy Fit Index (TFI 2.4)",
      // What kind of technology it is, in the business's own words.
      system_type: "Rules-plus-statistical tenant screening and deposit-tiering engine",
      // Full operational description: inputs, output, and how the output is used.
      system_description:
        "Every completed rental application submitted through the Alderwood leasing portal is scored by the Tenancy Fit Index before a leasing agent issues a decision. The engine reads five inputs held in the Alderwood leasing system: verified monthly income against the posted rent, twenty-four months of payment history supplied by the applicant's prior landlords, an eviction-record search returned by the consumer reporting agency Cascade Verify LLC, the completeness of the application packet, and the requested move-in date against unit availability. It returns a three-band output (Band A qualified, Band B qualified with a higher security deposit, Band C referred for manual underwriting) plus the two inputs that moved the band furthest. A leasing agent reviews the band, the applicant packet and any written explanation the applicant supplies, and issues the tenancy decision; the engine never issues a decision by itself.",
      // Significant-decision domain(s) — verbatim option strings.
      decision_domains: ["Housing (rental or purchase eligibility)"],
      // Human-review qualification, with the concrete facts stated in the detail block.
      human_review:
        "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
      // Whether applicant data trains the model.
      training_data_use: "Yes",
      // Whether the system profiles.
      profiling_use: "Yes",

      // ── Pre-use notice ─────────────────────────────────────────────────
      // How the Pre-use Notice reaches the applicant — two named channels.
      notice_delivery: [
        "Separate standalone Pre-use Notice",
        "In-app just-in-time notice before data collection",
      ],
      // Whether the notice states the specific purpose.
      notice_has_specific_purpose: "Yes",
      // The purpose as published, verbatim.
      notice_purpose_text:
        "We use the Tenancy Fit Index to decide whether to approve your rental application, whether to require a higher security deposit, and whether to send your application for manual underwriting. We do not use it for advertising, and we do not use it to set rent.",
      // Whether the notice describes the opt-out and how to use it.
      notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
      // Whether the notice describes the access right.
      notice_has_access_desc: "Yes",
      // Whether the notice states the anti-retaliation commitment.
      notice_has_anti_retaliation: "Yes",
      // Whether the notice explains how the technology works.
      notice_has_how_it_works: "Yes — included inline in the notice",
      // Whether the notice describes the alternative (non-ADMT) process.
      notice_has_alternative_process: "Yes",

      // ── Opt-out ────────────────────────────────────────────────────────
      // No exception is claimed: a full opt-out right is offered.
      opt_out_exception: "No exception — we provide a full opt-out right",
      // Three named opt-out channels.
      opt_out_methods: [
        "Interactive online form linked from the Pre-use Notice",
        "Toll-free phone number",
        "Designated email address",
      ],
      // The published link title, verbatim.
      opt_out_link_title: "Decide My Application Without Automated Scoring",
      // Confirms an ADMT-specific method exists beyond any cookie banner.
      opt_out_no_cookie_banner:
        "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      // Confirms no account is required to opt out.
      opt_out_no_account_required: "Confirmed — no account required",
      // The named confirmation mechanism and its timing.
      opt_out_confirmation_mechanism:
        "An automated confirmation email is sent from optout@alderwoodresidential.com within one business hour, quoting the application reference and the date the manual-underwriting path was opened; the same confirmation is logged against the application record in the Alderwood leasing system.",
      // The voluntary human-appeal path offered alongside the full opt-out.
      opt_out_appeal_process:
        "An applicant placed in Band B or Band C may request human reconsideration through the leasing portal or by phone within ten business days. A regional underwriting manager who did not handle the original application re-reviews the packet, the applicant's written explanation and any documents supplied, and has authority to overturn the band, waive the higher deposit and approve the tenancy. The outcome is issued in writing within five business days of the request.",
      // Documented non-discrimination and fairness evidence.
      opt_out_fairness_doc:
        "Alderwood commissioned an annual disparate-impact review of Tenancy Fit Index outcomes from Beltane Analytics LLP; the 2026 review, dated 12 February 2026, tested approval-band distribution across race, familial status, source of income and disability proxies over 41,300 California applications and is held in the compliance library as TFI-DIR-2026.",
      // The 15-day handling commitment, described as a process.
      opt_out_15_day_process:
        "Opt-out requests are routed by the leasing-operations queue to the manual-underwriting team on receipt; the team must complete the non-automated assessment and issue the tenancy decision no later than fifteen business days from the request, and the queue escalates to the Director of Leasing Operations at day ten if the assessment is still open.",

      // ── Access ─────────────────────────────────────────────────────────
      // Named submission channels.
      access_submission_methods:
        "Requests are accepted through the privacy request form at alderwoodresidential.com/privacy-request, by the toll-free line 1-888-555-0142, and by email to privacy@alderwoodresidential.com; every route creates a ticket in the Alderwood privacy request register.",
      // Named verification steps.
      access_verification_process:
        "The requester confirms the application reference number, the property address applied for, and the email address on the application, then completes a one-time code sent to that email; authorised agents must additionally supply written authorisation and the applicant's confirmation of that authorisation.",
      // The logic explanation actually supplied.
      access_logic_disclosure:
        "Alderwood supplies a plain-language explanation naming the five inputs (income-to-rent ratio, twenty-four-month payment history, eviction-record search result, packet completeness, requested move-in date against availability), the direction each input pushes the band, the three output bands and what each band means for the application, and the two inputs that moved this applicant's band furthest. Model coefficients are withheld under the trade-secret policy below.",
      // The outcome explanation actually supplied.
      access_outcome_disclosure:
        "The response states the band the Tenancy Fit Index returned for the application, the date it was returned, the tenancy decision the leasing agent issued, whether a higher security deposit was required and in what amount, and whether the application was referred to manual underwriting.",
      // The committed response timeline.
      access_response_timeline: "Within 45 days with documented 45-day extension capability",
      // The trade-secret withholding policy and its legal basis.
      access_trade_secret_policy:
        "Model coefficients and the band-threshold table are withheld as trade secrets under Cal. Civ. Code § 3426.1(d); the withholding is recorded on the response, and the plain-language logic explanation above is supplied in full so the applicant still receives a meaningful explanation.",

      // ── Scale and inventory ────────────────────────────────────────────
      // California consumers whose data the system processes annually.
      ca_consumer_count: "41300",
      // Whether third-party ADMT is used, stated with the named vendor.
      third_party_admt:
        "Yes — the eviction-record search input is returned by Cascade Verify LLC, a consumer reporting agency engaged as a service provider under a CCPA service-provider addendum dated 3 January 2026.",
      // Count of ADMT systems in scope.
      admt_system_count: "1",
      // Affected-population band.
      affected_population_band: "10,001 – 100,000",
      // The named roles standing behind the record.
      role_roster: [
        "Executive sponsor",
        "Privacy officer / DPO",
        "Legal counsel",
        "Product owner",
        "Data scientist / ML engineer",
        "Security officer",
        "Human reviewer",
        "Consumer-request handler",
        "Vendor manager",
      ],

      // ── ADMT self-test detail (the surface whose emptiness degraded the
      //    archived render — answered in full here) ────────────────────────
      admt_detail: {
        // Vendor's CCPA status.
        vendor_status: "Service provider",
        // Documentation actually held on file for the vendor.
        vendor_docs: ["Model card / datasheet", "Validation report", "Bias-testing report", "SOC 2 / pen test"],
        // Whether the vendor makes the required information available.
        vendor_makes_available: "Yes",
        // Contractual audit right.
        v_audit: "Yes",
        // Vendor cooperation on consumer requests.
        v_assist: "Yes",
        // Vendor honours opt-outs.
        v_optout: "Yes",
        // Vendor supports the appeal path.
        v_appeal: "Yes",
        // Vendor incident-notification duty.
        v_incident: "Yes",
        // Where the system runs.
        hosting: "Hybrid",
        // What kind of models it uses.
        model_types: ["Rules engine", "Statistical model"],
        // What the decision does to the applicant.
        decision_effects: ["Eligibility", "Denial", "Provision"],
        // How often it decides.
        decision_cadence: "Repeated",
        // The weight the output carries in the decision.
        sole_factor: "Material factor — heavily weighted alongside others",
        // Whether outputs feed later decisions.
        feeds_future_decisions: "Yes",
        // Advertising-only status.
        solely_advertising: "No",
        // § 7221(b)(1) evidence — the reviewer's role, named.
        appeal_reviewer_role:
          "Regional underwriting manager (Alderwood Leasing Operations), independent of the leasing agent who handled the application",
        // Reviewer training.
        appeal_trained: "Yes",
        // Reviewer authority.
        appeal_authority_overturn: "Yes",
        // Steps in the appeal path.
        appeal_step_count: "3",
        // § 7221(b)(2) evidence pair.
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "Yes — documented testing record",
      },

      // ── Published pre-use notice, transcribed element by element ────────
      notice_element_text: {
        // Purpose element as published.
        purpose:
          "We use automated decisionmaking technology called the Tenancy Fit Index to decide whether to approve your rental application, whether to require a higher security deposit, and whether to refer your application to manual underwriting.",
        // Opt-out element as published.
        optout:
          "You can ask us to decide your application without the Tenancy Fit Index. Use the link 'Decide My Application Without Automated Scoring' in the leasing portal, call 1-888-555-0142, or email optout@alderwoodresidential.com. We will confirm within one business hour and issue the decision within fifteen business days.",
        // Access element as published.
        access:
          "You can ask us for an explanation of how the Tenancy Fit Index reached the result for your application, what it used, and what the result was. Submit the request at alderwoodresidential.com/privacy-request, by phone, or by email; we respond within 45 calendar days and will tell you if we need one 45-day extension.",
        // Anti-retaliation element as published.
        antiretaliation:
          "We will not deny your application, charge you a higher rent or deposit, or give you a lower level of service because you asked us to decide your application without the Tenancy Fit Index or because you asked for an explanation.",
        // How-it-works: inputs, as published.
        howworks_inputs:
          "The Tenancy Fit Index uses five things: your verified monthly income compared with the rent, twenty-four months of payment history from your prior landlords, an eviction-record search from Cascade Verify LLC, whether your application packet is complete, and your requested move-in date compared with unit availability.",
        // How-it-works: output, as published.
        howworks_output:
          "It returns one of three bands — Band A (qualified), Band B (qualified with a higher security deposit), or Band C (referred for manual underwriting) — together with the two inputs that moved your band the most. A leasing agent then reviews the band with your packet and issues the decision.",
        // Alternative-process element as published.
        altprocess:
          "If you opt out, a member of our manual-underwriting team assesses your application from your packet, your income verification and your landlord references, without the Tenancy Fit Index, and issues the tenancy decision within fifteen business days.",
      },

      // The whole published notice, verbatim, so § 7220(c) adequacy is
      // performed against the business's own words rather than asserted.
      notice_full_text:
        "PRE-USE NOTICE — AUTOMATED DECISIONMAKING TECHNOLOGY IN RENTAL APPLICATIONS (Alderwood Residential Services, Inc., published 5 January 2026, alderwoodresidential.com/admt-notice)\n\nWhat we use it for. We use automated decisionmaking technology called the Tenancy Fit Index to decide whether to approve your rental application, whether to require a higher security deposit, and whether to refer your application to manual underwriting. We do not use it for advertising and we do not use it to set rent.\n\nHow it works. The Tenancy Fit Index uses five things: your verified monthly income compared with the rent, twenty-four months of payment history from your prior landlords, an eviction-record search from Cascade Verify LLC, whether your application packet is complete, and your requested move-in date compared with unit availability. It returns one of three bands — Band A (qualified), Band B (qualified with a higher security deposit), or Band C (referred for manual underwriting) — together with the two inputs that moved your band the most. A leasing agent then reviews the band with your packet and issues the decision. The technology never issues the decision by itself.\n\nYour right to opt out. You can ask us to decide your application without the Tenancy Fit Index. Use the link 'Decide My Application Without Automated Scoring' in the leasing portal, call 1-888-555-0142, or email optout@alderwoodresidential.com. You do not need an account to opt out. We will confirm within one business hour and issue the decision within fifteen business days.\n\nWhat happens instead. If you opt out, a member of our manual-underwriting team assesses your application from your packet, your income verification and your landlord references, without the Tenancy Fit Index, and issues the tenancy decision within fifteen business days.\n\nYour right to an explanation. You can ask us for an explanation of how the Tenancy Fit Index reached the result for your application, what it used, and what the result was. Submit the request at alderwoodresidential.com/privacy-request, by phone on 1-888-555-0142, or by email to privacy@alderwoodresidential.com. We respond within 45 calendar days and will tell you if we need one 45-day extension. Model coefficients and band thresholds are withheld as trade secrets, and we will say so on the response.\n\nNo retaliation. We will not deny your application, charge you a higher rent or deposit, or give you a lower level of service because you asked us to decide your application without the Tenancy Fit Index or because you asked for an explanation.\n\nQuestions. Privacy Officer, Alderwood Residential Services, Inc., 1400 Chandler Way, Suite 300, Sacramento, CA 95814 — privacy@alderwoodresidential.com.",

      // ── § 7222(b) explanation readiness, element by element ─────────────
      access_readiness: {
        // (b)(1) purpose.
        b1_purpose_ready: "Yes \u2014 we can produce this today",
        b1_purpose_process:
          "The published purpose paragraph is inserted into the response template by the consumer-request handler from the notice register entry TFI-NOTICE-2026-01, which records the purpose text in force on the application date.",
        // (b)(2) logic.
        b2_logic_ready: "Yes \u2014 we can produce this today",
        b2_logic_process:
          "The handler runs the TFI explanation report in the Alderwood leasing system, which returns the five inputs, the direction each pushes the band, and the two inputs that moved this application furthest; the report is pasted into the response and reviewed by the privacy officer before release.",
        // (b)(3) how the output was used.
        b3_output_use_ready: "Yes \u2014 we can produce this today",
        b3_output_use_process:
          "The application audit trail records the band the engine returned, the leasing agent who reviewed it, and the decision issued; the handler quotes those three entries in the response.",
        // (b)(3) outcome.
        b3_outcome_ready: "Yes \u2014 we can produce this today",
        b3_outcome_process:
          "The tenancy decision, any deposit uplift and any referral to manual underwriting are read from the application record and stated in the response with their dates.",
        // (b)(3) human role.
        b3_human_role_ready: "Yes \u2014 we can produce this today",
        b3_human_role_process:
          "The audit trail names the leasing agent who reviewed the band and, where reconsideration was requested, the regional underwriting manager who re-reviewed it; the response names the role, the review date and the authority each held over the decision.",
      },
    },
    assertions: [
      { kind: "must_include", pattern: "7220|7221|7222", flags: "i", label: "ADMT rights sections cited" },
      { kind: "must_include", pattern: "significant decision", flags: "i", label: "significant-decision analysis present" },
    ],
  },
];
