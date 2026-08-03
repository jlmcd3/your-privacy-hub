// RC-C1 C1.4 — CPPA Risk revision-contract fixtures.
//
// RC-D.5 FIX-CPPA-1 (2026-07-13): rewritten in LEGACY-FLAT shape so
// `normaliseIntake` routes them through `shimLegacyIntake` (the branch that
// maps entity_name → org_context.company_name and applies lenient
// validation). The prior authoring carried native discriminator keys
// (`triggers: {}`, `org_context: ""`, `impact: {...}`, `exceptions: []`) which
// forced the native branch, where org_context.company_name was undefined and
// pre-generation validation failed (VALIDATION_FAILED / org_context.company_name).
//
// SHAPE CHOICE — Option A (legacy flat) per courier RC-D.5:
//   • NO `triggers` key (top-level absence is the shim discriminator).
//   • NO `org_context` / `exceptions` / `impact` object literals — impact
//     inputs move into `impact_intake` (the shape shimLegacyIntake reads).
//   • entity_name is the sole company-name source; the shim maps it to
//     org_context.company_name.
//   • lenient=true applies (wasLegacyShimmed=true), so the ≥50-char purpose
//     and ≥100-char rationale strict-mode rules are bypassed and the
//     deliberate thin spots survive to produce the contract scenarios.
//
// Field literals remain content-anchored to
// src/pages/CPPARiskAssessment.tsx (REVENUE_OPTS / CONSUMER_OPTS / …).

export interface CppaRiskContractFixture {
  fixture_id: string;
  contract_scenario: "yield_k3" | "partial_j_lt_k" | "full_close";
  intake: Record<string, unknown>;
  // Guidance for the revision harness — which pre-freeze open_items to answer.
  // Kept as target.path prefixes so it survives id slug changes.
  answer_targets?: string[];
}

// (a) yields k≥3 open items after first pass. Expected ask sources:
//   1. q15c_spi_volume "" while q15_sensitive_pi="Yes" — SPI-volume figure
//      is required to resolve § 7120(b)(2)(B) and to size SPI processing;
//      the empty field routes to an information_needed anchored to
//      q15c_spi_volume.
//   2. q18_admt_use "In evaluation" with q19_admt_description /
//      q20_admt_opt_out both empty — the ADMT branch (§ 7150(b)(6),
//      § 7220 opt-out mechanics) is engaged by the shim's regex but the
//      logic/opt-out record is empty; the generator raises ask(s) for
//      admt_description and admt_opt_out.
//   3. impact_intake carries likelihood only; severity, benefitsOutweigh,
//      benefits/consumer/stakeholder benefits, and rationale are absent —
//      the shim defaults keep validation green under lenient mode, but the
//      empty benefits text and blank rationale surface as
//      information_needed entries (§ 7152(a)(4) benefits + § 7154 balancing).
// Total floor of asks is comfortably ≥3.
// RC-REM-P1-B: fixtures expanded with all form-gated required-always
// fields so validateIntake(cppaRiskContract, fixture.intake) passes with
// zero violations. Thin-spot fields (q15c, q19/q20 where q18-conditional,
// impact_intake benefits/rationale) are intentionally left blank/omitted
// because the contract marks those conditional or optional — the revision
// harness still surfaces them as asks.
// RC-REM-P1-B (re-courier 2026-07-14): q4_pi_categories, q6_right_know_multi,
// and q3_sector are now closed enums per the contract — fixture values
// below are verbatim members of PI_CATEGORIES / Q6_ACCESS_OPTS / SECTORS
// respectively (source: src/pages/CPPARiskAssessment.tsx L96-116, L857).
// ── ITEM 337 (§ OPEN-3 of Item 324) — THIS LIST IS VALUES, NOT COVERAGE ────
// `REQUIRED_ALWAYS_FILLERS` is a shared block of AUTHORED answers for the
// non-activity-specific required-always fields of these three revision-
// contract fixtures. It is NOT the coverage contract and must never be read
// as one. Coverage is DERIVED from `cppaRiskContract` itself by
// `src/registry/__tests__/cppa-risk-fixture-contract-parity.test.ts`, which
// enumerates every `required: "always"` key and asserts each pinned intake —
// golden, revision-contract and messy — answers it non-empty, naming any
// missing key. Adding a key here does not make it covered; answering it in
// every fixture does. Activity-specific operands (§ 7152 a2/a4/a5/a9) stay
// authored per fixture and are deliberately absent from this block.
const REQUIRED_ALWAYS_FILLERS = {
  q5b_profiling_observation: "No",
  q6_right_know: "Online form with identity verification",
  q6_right_know_multi: ["Online form with identity verification"],
  q7_right_delete: "Manual process, documented",
  q8_right_correct: "Handled via support",
  q9_opt_out: "Yes, prominently on homepage",
  q10_id_verification: "Documented verification process matching CPPA guidance",
  q11_policy_review: "Within 12 months",
  q12_notice_at_collection: "Yes, covers all collection points",
  q13_notice_content: "Yes, all three",
  q14_employee_notice: "Not applicable (no CA employees)",
  q15b_under16_knowledge: "No — we do not knowingly process under-16 data",
  q18b_admt_training: "No",
  i1b_min_pi: "Identifiers and processing-related fields; no ancillary categories.",
  i2_retention_period: "24 months",
  i2_retention_criteria: "Until purpose is fulfilled, then deletion",
  i3_ca_consumer_band: "100,000–1,000,000",
  i4_disclosure_mechanisms: ["Privacy policy"],
  i4b_sources: "Directly from consumers via the product",
  i6_vendors: "None",
  i7_internal_contributors: "Privacy Office; Product Engineering",
  i8_certifying_exec_name: "Alex Certifier",
  i8_certifying_exec_title: "Chief Privacy Officer",
  i9_has_existing_dpia: "No",
} as const;

// ── ITEM 324 — § 7152 ANALYTIC-DELIVERABLE OPERANDS ──────────────────────
// Item 305 made `a2_necessity_set`, the four `a4_benefit_*` narratives,
// `a5_harm_pathways` and the `a9_approver_*` pair `required: "always"` in
// `cppaRiskContract`, but only `_shared/golden/cppa-risk.ts` was refreshed
// (Item 306). These three revision-contract fixtures were left stale, so
// `validateIntake(cppaRiskContract, fixture.intake)` returned eight
// required-always violations apiece. Each fixture below now carries its OWN
// operand block — authored to the "Perfect Data" standard (specific to that
// entity's activity, non-generic, source-and-cause traced), never a shared
// filler, because the harm pathways of a triage service, a credit scorer and
// a loyalty engine are not interchangeable.
// Enum values are VERBATIM from
// supabase/functions/_shared/ltp/analytic-deliverables/enums.ts.

export const FIXTURE_YIELD_K3: CppaRiskContractFixture = {
  fixture_id: "cppa-risk-rcC1-yield-k3",
  contract_scenario: "yield_k3",
  intake: {
    entity_name: "Meridian Health, Inc.",
    subject_anchor: "Mental-health triage service",
    primary_activity_name: "Mental-health triage intake",
    primary_activity_purpose: "We screen triage intake responses to route patients to a care pathway.",
    has_secondary_uses: "No — this data is used for this activity only",
    secondary_activities: [],
    q1_revenue: "Over $100M",
    q2_consumers: "1,000,000 or more",
    q3_sector: "Healthcare/Life Sciences",
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Health or medical information",
      "Other",
    ],
    q5_sell_share: "No",
    q15_sensitive_pi: "Yes",
    q15c_spi_volume: "", // <-- ask
    q18_admt_use: "In evaluation", // <-- ADMT clarifier ask
    q19_admt_description: "",
    q20_admt_opt_out: "",
    i1_processing_purpose: "AI-driven mental-health triage with mood-diary intake",
    // TURN 1b — new intake fields.
    public_privacy_policy_url: "https://meridian.example/privacy",
    sensitive_location_basis: "Healthcare facility or medical office",
    impact_intake: {
      likelihood: "Possible",
      // severity intentionally omitted — shim defaults to "Moderate"
      // benefits + rationale intentionally omitted — surface as asks
    },
    exceptions_intake: {},
    // ITEM 324 — § 7152 analytic-deliverable operands (see header note).
    a2_necessity_set: [
      {
        element: "Triage questionnaire responses",
        necessity: "Necessary to the stated purpose",
        justification:
          "The responses are the sole input to the care-pathway routing decision; without them no pathway can be selected.",
      },
      {
        element: "Patient name and contact telephone number",
        necessity: "Necessary to the stated purpose",
        justification:
          "The routed pathway is delivered by a clinician calling the patient back, so a reachable contact point is part of the routing outcome itself.",
      },
      {
        element: "Free-text mood-diary entries carried over from the companion app",
        necessity: "Collected but not necessary to the stated purpose",
        justification:
          "The diary text is imported by the shared account sync and is not read by the routing logic, which uses only the structured questionnaire scores.",
      },
    ],
    a4_benefit_business:
      "Structured triage routing lets Meridian staff its two clinical queues to measured demand instead of to estimates, which is the input to the monthly clinician-rostering decision.",
    a4_benefit_consumer:
      "A patient who screens as higher acuity reaches a clinician on the urgent pathway the same day rather than waiting in a single undifferentiated queue.",
    a4_benefit_other_stakeholders:
      "Referring primary-care practices receive a routing outcome for each patient they refer, so they know which pathway their patient entered without telephoning the service.",
    a4_benefit_public:
      "No public benefit is claimed for this activity beyond the patient benefit stated above.",
    a4_benefit_business_fact:
      "The rostering decision record for each month cites the queue-volume figures produced by this routing, and clinician shifts were re-allocated on that basis in the last two cycles.",
    a4_benefit_consumer_fact:
      "Urgent-pathway patients were contacted the same day in 94% of cases last quarter, against a single-queue median wait of three days before routing was introduced.",
    a4_benefit_other_stakeholders_fact:
      "Each referring practice receives the routing outcome through the referral portal; practices logged 41% fewer status telephone calls after that feed was enabled.",
    a4_benefit_public_fact:
      "The service is not publicly funded and its routing outputs are not published, so no public-facing outcome is recorded.",
    a5_harm_pathways: [
      {
        harm: "(A) Unauthorized access, destruction, use, modification, or disclosure",
        data_involved:
          "Questionnaire answers about mental-health symptoms joined to patient names in the triage response store.",
        actor:
          "Any holder of the routing service credential, including staff outside the triage pipeline who inherit it.",
        source:
          "The triage response store holds questionnaire answers about mental-health symptoms joined to patient names, and is readable by the routing service account.",
        cause:
          "A routing service credential scoped more broadly than the routing views could export the joined table outside the triage pipeline.",
        likelihood: "Unlikely",
        severity: "Severe",
      },
      {
        harm: "(G) Reputational harms",
        data_involved:
          "The routing outcome naming the clinical pathway, together with the patient's callback telephone number.",
        actor:
          "The triage callback agent, speaking to whoever answers the shared household line.",
        source:
          "The routing outcome names the clinical pathway a patient entered, and the callback is placed to a telephone number the patient may share with a household.",
        cause:
          "A callback that identifies the mental-health pathway to whoever answers discloses the patient's use of the service to a third party.",
        likelihood: "Possible",
        severity: "Significant",
      },
      {
        harm: "(H) Psychological harms",
        data_involved:
          "Imported mood-diary free text stored alongside the triage responses.",
        actor:
          "Clinical reviewers who open the triage record for an unrelated routing decision.",
        source:
          "The imported mood-diary free text sits in the same record as the triage responses and is visible to reviewers who open the record.",
        cause:
          "A patient who wrote the diary for the companion app did not expect it to be read during triage, and its appearance there causes distress on disclosure.",
        likelihood: "Possible",
        severity: "Moderate",
      },
    ],
    a6_safeguards: [
      {
        harm: "(A) Unauthorized access, destruction, use, modification, or disclosure",
        safeguard:
          "The routing service account is scoped to the routing views only, credentials rotate every 30 days, and every export from the response store is logged and reviewed weekly.",
        residual:
          "Scoping and rotation narrow the exposure to the routing views; a credential compromised inside its 30-day window still reaches the symptom-to-name join.",
        safeguard_status: "Implemented and tested",
      },
      {
        harm: "(G) Reputational harms",
        safeguard:
          "Callback scripts identify the caller by the practice name only and confirm the patient's identity before any clinical content is discussed.",
        residual:
          "Practice-name-only scripts remove the pathway disclosure at the point of answer; a household member who overhears the identity confirmation still learns the patient is engaged with the service.",
        safeguard_status: "Implemented, not tested",
      },
      {
        harm: "(H) Psychological harms",
        safeguard:
          "The mood-diary field is being removed from the triage record view and excluded from the account sync.",
        residual:
          "Until the reviewer view is partitioned, the diary text remains visible on every triage record a reviewer opens.",
        safeguard_status: "Planned, not yet implemented",
      },
    ],
    a8_information_providers:
      "Dr. Amara Sethi, Clinical Operations Lead — triage routing workflow and callback practice; Jonas Reilly, Platform Engineer — response-store access and export controls; Kim Hara, Patient Experience Manager — mood-diary import scope.",
    a9_approver_name: "Dr. Helena Voss",
    a9_approver_position: "Chief Medical Officer",
    a9_approval_date: "2026-07-30",
    ...REQUIRED_ALWAYS_FILLERS,
  },
  answer_targets: [
    "q15c_spi_volume", "q18_admt_use", "impact",
  ],
};

// (b) partial — first pass yields ~3 asks, revision answers only 2 of them.
// Expected ask sources after shim:
//   1. q5c_share_revenue_50pct "" while q5_sell_share is a "Yes — share..."
//      value — § 7121 revenue-prong indeterminate → ask anchored to
//      q5c_share_revenue_50pct.
//   2. q15c_spi_volume "" while q15_sensitive_pi="Yes" — as in (a).
//   3. q20_admt_opt_out "" while q18_admt_use="Yes" — § 7220 opt-out
//      record missing → ask.
// answer_targets deliberately covers 2 of 3 to force j<k.
export const FIXTURE_PARTIAL_J_LT_K: CppaRiskContractFixture = {
  fixture_id: "cppa-risk-rcC1-partial-j-lt-k",
  contract_scenario: "partial_j_lt_k",
  intake: {
    entity_name: "Solstice FinPay, Inc.",
    subject_anchor: "Consumer credit-scoring product",
    primary_activity_name: "Consumer credit scoring",
    primary_activity_purpose: "We score applicant financial data to produce a creditworthiness decision.",
    has_secondary_uses: "No — this data is used for this activity only",
    secondary_activities: [],
    q1_revenue: "$50M to $100M",
    q2_consumers: "250,000 to under 1,000,000",
    q3_sector: "Financial services",
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Financial information",
      "Precise geolocation (GPS-level / specific address)",
    ],
    q5_sell_share: "Yes — share for advertising only",
    q5c_share_revenue_50pct: "", // ask
    q15_sensitive_pi: "Yes",
    q15c_spi_volume: "", // ask
    q18_admt_use: "Yes",
    q19_admt_description: "Real-time credit scoring using behavioural signals",
    q20_admt_opt_out: "", // ask
    i1_processing_purpose: "Real-time credit scoring using behavioural signals",
    // TURN 1b — new intake fields.
    public_privacy_policy_url: "https://solstice.example/privacy",
    sensitive_location_basis: "Not applicable — no sensitive-location processing",
    impact_intake: {
      likelihood: "Likely",
      severity: "Significant",
    },
    exceptions_intake: {},
    // ITEM 324 — § 7152 analytic-deliverable operands (see header note).
    a2_necessity_set: [
      {
        element: "Applicant income and existing-obligation figures",
        necessity: "Necessary to the stated purpose",
        justification:
          "These figures are the affordability inputs the creditworthiness decision is computed from; the score cannot be produced without them.",
      },
      {
        element: "Applicant name and date of birth",
        necessity: "Necessary to the stated purpose",
        justification:
          "Both are required to match the applicant to the bureau record the score is drawn against, and a mismatch produces the wrong decision.",
      },
      {
        element: "Precise device geolocation captured at application",
        necessity: "Collected but not necessary to the stated purpose",
        justification:
          "Geolocation is captured by the mobile SDK's fraud defaults and is not an input to the scoring model or to the decision it supports.",
      },
    ],
    a4_benefit_business:
      "Scoring applicants against measured affordability rather than a manual review queue is what allows Solstice to price its consumer credit book to observed default rates.",
    a4_benefit_consumer:
      "An applicant receives a decision within the application session instead of waiting for a manual underwriting pass, and a declined applicant is told which affordability input drove the decline.",
    a4_benefit_other_stakeholders:
      "The sponsoring bank that funds the credit line receives a consistent, documented basis for each decision when it audits the portfolio.",
    a4_benefit_public:
      "No public benefit is claimed for this activity beyond the applicant benefit stated above.",
    a4_benefit_business_fact:
      "The portfolio pricing model is rebuilt each quarter from the observed default rates of scored cohorts, and that rebuild record is the pricing basis of record.",
    a4_benefit_consumer_fact:
      "Median time to decision is under two minutes in the application session, and every decline notice names the affordability input that drove it.",
    a4_benefit_other_stakeholders_fact:
      "The sponsoring bank's quarterly portfolio audit draws its decision sample from the stored score and reason codes for each application.",
    a4_benefit_public_fact:
      "The credit line is privately funded and no decision output is published or shared with any public body, so no public-facing outcome is recorded.",
    a5_harm_pathways: [
      {
        harm: "(B) Unlawful discrimination on protected characteristics",
        data_involved:
          "Application-time device and location features used as model inputs, and the resulting decline decision.",
        actor:
          "The scoring model itself, applied automatically at application time.",
        source:
          "The model's behavioural signals include application-time device and location features that correlate with residential area.",
        cause:
          "A feature that proxies for residential area can shift decline rates across protected groups even though no protected characteristic is an input.",
        likelihood: "Possible",
        severity: "Severe",
      },
      {
        harm: "(E) Economic harms",
        data_involved:
          "The applicant's bureau match, affordability figures, and the score derived from them.",
        actor:
          "The automated decisioning service that sets the outcome and the priced rate.",
        source:
          "The score sets both the accept/decline outcome and the interest rate offered to an accepted applicant.",
        cause:
          "An applicant scored on an incorrect or stale bureau match is declined credit or charged a higher rate than their circumstances warrant.",
        likelihood: "Possible",
        severity: "Significant",
      },
      {
        harm: "(A) Unauthorized access, destruction, use, modification, or disclosure",
        data_involved:
          "Applicant financial figures joined to identity fields and precise geolocation in the feature store.",
        actor:
          "Any holder of the analytics credential with read access beyond the scoring pipeline.",
        source:
          "The scoring feature store holds applicant financial figures joined to identity fields and precise geolocation.",
        cause:
          "An over-broad analytics credential could export the joined feature table outside the scoring pipeline.",
        likelihood: "Unlikely",
        severity: "Significant",
      },
    ],
    a6_safeguards: [
      {
        harm: "(B) Unlawful discrimination on protected characteristics",
        safeguard:
          "Decline rates are tested quarterly across proxy cohorts and the model is blocked from release when a cohort disparity exceeds the documented tolerance.",
        residual:
          "Quarterly proxy testing catches cohort disparity between releases; disparity arising inside a release window persists until the next test.",
        safeguard_status: "Implemented, not tested",
      },
      {
        harm: "(E) Economic harms",
        safeguard:
          "Every decline is reviewable by an underwriter on request, and an applicant may submit corrected affordability figures for a re-score.",
        residual:
          "Underwriter review corrects individual errors on request; applicants who do not contest a decline remain priced on the original score.",
        safeguard_status: "Implemented and tested",
      },
      {
        harm: "(A) Unauthorized access, destruction, use, modification, or disclosure",
        safeguard:
          "The feature store is segmented from the analytics estate, access is granted per-role with 30-day rotation, and exports are logged.",
        residual:
          "Credential scoping limits routine access to the scoring pipeline; a compromised credential still reaches the joined financial and geolocation table.",
        safeguard_status: "Implemented and tested",
      },
    ],
    a8_information_providers:
      "Marcus Adeyemi is recorded separately as approver. Information was provided by: Lena Fusco, Head of Credit Risk — score use and pricing; Owen Tran, Model Engineer — feature construction and bureau matching; Rita Bassey, Fair Lending Analyst — proxy-cohort testing.",
    a9_approver_name: "Marcus Adeyemi",
    a9_approver_position: "General Counsel",
    a9_approval_date: "2026-07-30",
    ...REQUIRED_ALWAYS_FILLERS,
  },
  // Answer only 2 of the ~3+ items on the first revision.
  answer_targets: ["q5c_share_revenue_50pct", "q15c_spi_volume"],
};

// (c) full close — remaining items are answered on the second revision.
// Same intake pattern as (b) with the deliberate thin spots filled so the
// first pass yields fewer asks, and the harness treats the second dispatch
// as full-close.
export const FIXTURE_FULL_CLOSE: CppaRiskContractFixture = {
  fixture_id: "cppa-risk-rcC1-full-close",
  contract_scenario: "full_close",
  intake: {
    entity_name: "Aurora RetailWorks, LLC",
    subject_anchor: "Loyalty-program personalization engine",
    primary_activity_name: "Loyalty personalisation",
    primary_activity_purpose: "We match purchase history to member records to select which offers each member sees.",
    has_secondary_uses: "No — this data is used for this activity only",
    secondary_activities: [],
    q1_revenue: "$25M to under $50M",
    q2_consumers: "100,000 to under 250,000",
    q3_sector: "Retail/ecommerce",
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Internet or network activity",
      "Precise geolocation (GPS-level / specific address)",
    ],
    q5_sell_share: "Yes — share for advertising only",
    q5c_share_revenue_50pct: "No",
    q15_sensitive_pi: "No",
    q18_admt_use: "Yes",
    q19_admt_description: "Loyalty-tier personalization from purchase and location signals",
    q20_admt_opt_out: "Planned for implementation",
    i1_processing_purpose: "Loyalty-tier personalization from purchase and location signals",
    // TURN 1b — new intake fields (retail store visits ≠ § 7150(b)(5) sensitive location).
    public_privacy_policy_url: "https://aurora.example/privacy",
    sensitive_location_basis: "Not applicable — no sensitive-location processing",
    impact_intake: {
      likelihood: "Possible",
      severity: "Moderate",
      benefitsOutweigh: "Yes",
    },
    exceptions_intake: {},
    // ITEM 324 — § 7152 analytic-deliverable operands (see header note).
    a2_necessity_set: [
      {
        element: "Loyalty member number and purchase history",
        necessity: "Necessary to the stated purpose",
        justification:
          "Offer selection is computed from what a member has previously bought, so the member-to-purchase join is the activity itself.",
      },
      {
        element: "Member email address",
        necessity: "Necessary to the stated purpose",
        justification:
          "The selected offer is delivered by email, so the address is part of the outcome and not an ancillary field.",
      },
      {
        element: "Precise in-store geolocation from the loyalty app",
        necessity: "Collected but not necessary to the stated purpose",
        justification:
          "Store-visit precision beyond the store identifier is not used by offer selection, which resolves to the nearest store, not to a position within it.",
      },
    ],
    a4_benefit_business:
      "Selecting offers from actual purchase history rather than sending the same circular to every member is what lets Aurora fund the loyalty discount from measured incremental margin.",
    a4_benefit_consumer:
      "A member receives discounts on the categories they actually buy instead of a general circular, and can see in the app which purchases drove each offer.",
    a4_benefit_other_stakeholders:
      "Participating brand suppliers receive category-level redemption reporting for the promotions they fund, without receiving member-level data.",
    a4_benefit_public:
      "No public benefit is claimed for this activity beyond the member benefit stated above.",
    a4_benefit_business_fact:
      "Incremental margin from personalised offers is reported monthly and is the line item the loyalty discount budget is drawn from.",
    a4_benefit_consumer_fact:
      "Members can open each offer in the app and see the purchase categories that generated it; redemption on personalised offers runs materially above the general circular.",
    a4_benefit_other_stakeholders_fact:
      "Suppliers receive category-level redemption reports only; the reporting pipeline carries no member identifier, as recorded in the supplier reporting specification.",
    a4_benefit_public_fact:
      "The programme is a private retail loyalty scheme and none of its outputs are published, so no public-facing outcome is recorded.",
    a5_harm_pathways: [
      {
        harm: "(C) Impairment of consumer control over personal information",
        data_involved:
          "Precise in-store geolocation collected by the app and retained against the member record.",
        actor:
          "The business itself, through the enrolment notice it publishes to members.",
        source:
          "The loyalty enrolment notice describes purchase-history personalisation but does not name the precise in-store geolocation the app collects.",
        cause:
          "A member reading the notice cannot tell that in-store position is retained, so the enrolment choice is made on an incomplete description.",
        likelihood: "Likely",
        severity: "Moderate",
      },
      {
        harm: "(E) Economic harms",
        data_involved:
          "Itemised purchase history and the offer-depth score derived from it.",
        actor:
          "The offer-selection engine that assigns discount depth automatically.",
        source:
          "Offer selection sets which members see a discount and at what depth.",
        cause:
          "A member whose purchase history is thin is systematically shown shallower discounts than a comparable member, paying more for the same basket.",
        likelihood: "Possible",
        severity: "Minimal",
      },
      {
        harm: "(A) Unauthorized access, destruction, use, modification, or disclosure",
        data_involved:
          "Member identity joined to itemised purchase history and store-visit records in the personalisation store.",
        actor:
          "Any holder of the shared reporting credential operating outside the personalisation pipeline.",
        source:
          "The personalisation store holds member identity joined to itemised purchase history and store-visit records.",
        cause:
          "A shared reporting credential used outside the personalisation pipeline could export the joined member table.",
        likelihood: "Unlikely",
        severity: "Moderate",
      },
    ],
    a6_safeguards: [
      {
        harm: "(C) Impairment of consumer control over personal information",
        safeguard:
          "The enrolment notice is being amended to name in-store geolocation, and the app's location permission is being reduced to coarse store-level resolution.",
        residual:
          "Until the amended notice publishes and the permission is reduced, members continue to enrol without knowing precise in-store position is retained.",
        safeguard_status: "Planned, not yet implemented",
      },
      {
        harm: "(E) Economic harms",
        safeguard:
          "A floor discount is applied to every enrolled member regardless of score, and offer depth distribution is reviewed monthly.",
        residual:
          "The floor discount removes the worst outcome for thin-history members; a depth difference between thick- and thin-history members remains.",
        safeguard_status: "Implemented and tested",
      },
      {
        harm: "(A) Unauthorized access, destruction, use, modification, or disclosure",
        safeguard:
          "Reporting reads from an aggregated view with no member identifiers; the member-level store is reachable only by the personalisation service account.",
        residual:
          "Reporting-credential scoping limits routine access; an export by a credential holder acting within scope is not prevented, only logged.",
        safeguard_status: "Implemented and tested",
      },
    ],
    a8_information_providers:
      "Tomas Beck, Loyalty Product Lead — enrolment notice and offer selection; Yuki Sano, Mobile Engineer — location permission and collection scope; Aisha Bello, Retail Analytics Manager — personalisation store access.",
    a9_approver_name: "Denise Okafor",
    a9_approver_position: "SVP, Legal and Compliance",
    a9_approval_date: "2026-07-30",
    ...REQUIRED_ALWAYS_FILLERS,
  },
  answer_targets: [], // answer every open_item on the second revision
};

export const CPPA_RISK_CONTRACT_FIXTURES: CppaRiskContractFixture[] = [
  FIXTURE_YIELD_K3,
  FIXTURE_PARTIAL_J_LT_K,
  FIXTURE_FULL_CLOSE,
];
