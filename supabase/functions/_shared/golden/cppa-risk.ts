// QB-P20 — CPPA Risk Assessment golden set. 3 fixtures.
// Adversarial: consumer volume at enum boundary ("100,000–249,999") — tests
// cohort determinism at the trigger edge.
import type { GoldenCase } from "./types.ts";

const base = {
  entity_name: "Meridian SaaS Inc.",
  subject_anchor: "California consumers using the free tier",
  // ITEM 275 — primary-activity trio (contract fields added this turn).
  primary_activity_name: "Free-tier account analytics",
  primary_activity_purpose: "We analyse free-tier account and device identifiers to measure product usage.",
  has_secondary_uses: "No — this data is used for this activity only",
  secondary_activities: [],
  q1_revenue: "$25M to under $50M",
  q2_consumers: "250,000 to under 1,000,000",
  q3_sector: "Technology/SaaS",
  q4_pi_categories: ["Contact identifiers (name, email, phone)", "Device identifiers (IP, cookies, device IDs)"],
  q5_sell_share: "No",
  q5b_profiling_observation: "No",
  q6_right_know: "Online form with identity verification",
  q6_right_know_multi: ["Online form with identity verification"],
  q7_right_delete: "Automated deletion with confirmation",
  q8_right_correct: "Online self-service",
  q9_opt_out: "Yes, prominently on homepage",
  q10_id_verification: "Documented verification process matching CPPA guidance",
  q11_policy_review: "Within 12 months",
  q12_notice_at_collection: "Yes, covers all collection points",
  q13_notice_content: "Yes, all three",
  q14_employee_notice: "Yes",
  q15_sensitive_pi: "No",
  q15b_under16_knowledge: "No — we do not knowingly process under-16 data",
  q18_admt_use: "No",
  q18b_admt_training: "No",
  i1_processing_purpose: "Deliver core SaaS analytics functionality to enterprise customers with role-based access controls in place.",
  i1b_min_pi: "We collect only identifiers necessary to provision accounts and bill customers.",
  i2_retention_period: "24 months rolling",
  i2_retention_criteria: "Fixed period from collection",
  i3_ca_consumer_band: "100,000–1,000,000",
  i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy"],
  i4b_sources: "Directly from account signup and product telemetry.",
  i6_vendors: "AWS (hosting), Stripe (billing), SendGrid (email).",
  i7_internal_contributors: "Privacy Officer; Head of Engineering; Data Platform Lead.",
  i8_certifying_exec_name: "Jane Doe",
  i8_certifying_exec_title: "Chief Privacy Officer",
  i9_has_existing_dpia: "No",
  // TURN 1b — new optional intake fields; base fixture uses safe defaults so
  // no fixture accidentally engages § 7150(b)(5) unless it opts in.
  public_privacy_policy_url: "https://meridian.example/privacy",
  sensitive_location_basis: "No",

  // ── ITEM 306 — § 7152 ANALYTIC-DELIVERABLE OPERANDS ──────────────────
  // Item 305 made these `required: "always"` in `cppaRiskContract`; without
  // them every cppa-risk batch aborts at pin-validation. Authored to the
  // "Perfect Data" standard (specific, non-generic, fully-sourced) so this
  // block can seed the deferred quality-batch "Perfect Data" variant.
  // Enum values are VERBATIM from
  // supabase/functions/_shared/ltp/analytic-deliverables/enums.ts.
  a2_necessity_set: [
    {
      element: "Account email address",
      necessity: "Necessary to the stated purpose",
      justification:
        "The email address is the account identifier used to authenticate the free-tier session that the usage measurement is attributed to; without it no measurement can be tied to an account.",
    },
    {
      element: "Device identifier (cookie ID)",
      necessity: "Necessary to the stated purpose",
      justification:
        "The cookie ID distinguishes repeat sessions from first sessions, which is the measurement the activity exists to produce.",
    },
    {
      element: "Approximate location derived from IP address",
      necessity: "Collected but not necessary to the stated purpose",
      justification:
        "Location is captured by the telemetry SDK's defaults and is not used in any usage-measurement output.",
    },
  ],
  a4_benefit_business:
    "Free-tier usage measurement tells the engineering team which onboarding step free-tier accounts abandon, which is the input to the quarterly onboarding rework decision.",
  a4_benefit_consumer:
    "Consumers reach a working configuration faster because the abandoned onboarding steps identified by this measurement are the ones rewritten first.",
  a4_benefit_other_stakeholders:
    "Enterprise administrators who sponsor free-tier trials receive accurate seat-activation reporting instead of estimates when deciding whether to convert a trial.",
  a4_benefit_public:
    "No public benefit is claimed for this activity beyond the consumer benefit stated above.",
  a4_benefit_business_fact:
    "The quarterly onboarding rework decision record cites the step-abandonment figures produced by this measurement, and two steps were rewritten on that basis last quarter.",
  a4_benefit_consumer_fact:
    "The two onboarding steps rewritten after the last measurement cycle are the two with the highest recorded abandonment, and completion on both rose afterwards.",
  a4_benefit_other_stakeholders_fact:
    "Enterprise administrators receive seat-activation counts drawn from measured free-tier activity rather than sampled estimates, as recorded in the trial reporting specification.",
  a4_benefit_public_fact:
    "The measurement outputs are internal and are not published, so no public-facing outcome is recorded.",
  a5_harm_pathways: [
    {
      harm: "(A) Unauthorized access, destruction, use, modification, or disclosure; loss of availability",
      data_involved:
        "Account email addresses joined to device cookie identifiers and IP-derived approximate location in the telemetry event store.",
      actor:
        "Any holder of the analytics service-account credential, including an engineer outside the measurement team who inherits it.",
      source:
        "The telemetry event store, which holds account email addresses joined to device identifiers, is readable by the analytics service account.",
      cause:
        "An over-broad analytics service-account credential could be reused outside the measurement pipeline and export the joined table.",
      likelihood: "Unlikely",
      severity: "Moderate",
    },
    {
      harm: "(C) Impairment of consumer control over personal information",
      data_involved:
        "IP-derived approximate location retained against the free-tier account record.",
      actor:
        "The business itself, through the signup notice it publishes to free-tier consumers.",
      source:
        "The free-tier signup notice describes telemetry collection but does not name the derived approximate-location field.",
      cause:
        "A consumer reading the notice cannot tell that IP-derived location is retained, so the opt-out choice is made on an incomplete description.",
      likelihood: "Possible",
      severity: "Minimal",
    },
  ],
  a6_safeguards: [
    {
      harm: "(A) Unauthorized access, destruction, use, modification, or disclosure; loss of availability",
      safeguard:
        "The analytics service account is scoped to the measurement views only, credentials rotate every 30 days, and exports are logged and reviewed weekly.",
      safeguard_status: "Implemented and tested",
      residual:
        "Scoping narrows the exposure to the measurement views, but a compromise of the rotated credential inside its 30-day window still reaches the joined email-to-device table.",
    },
    {
      harm: "(C) Impairment of consumer control over personal information",
      safeguard:
        "The notice at collection is being amended to name IP-derived approximate location and the telemetry SDK default is being disabled.",
      safeguard_status: "Implemented and tested",
      residual:
        "Consumers who enrolled before the amended notice published made their opt-out choice on the earlier description, and that cohort remains affected until the retained location field is purged.",
    },
  ],
  a8_information_providers:
    "Devin Cho, Staff Analytics Engineer — telemetry pipeline scope and retention; Marta Lindqvist, Free-Tier Product Manager — purpose and onboarding decision use; Sam Ovitt, Security Engineer — service-account controls.",
  a9_approver_name: "Priya Raman",
  a9_approver_position: "General Counsel",
  a9_approval_date: "2026-07-30",
};


export const CPPA_RISK_GOLDEN: GoldenCase[] = [
  {
    id: "risk-saas-clean-tuning",
    tool: "cppa-risk",
    set: "tuning",
    // QB-P25 boundary-batch fix: the pristine "no trigger" base failed the
    // § 7150(b) pre-generation validator (VALIDATION_FAILED). Enable a
    // single trigger (profiling with significant effects) so the fixture
    // reaches generation while preserving its "clean posture" character.
    intake: { ...base, q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants" },
    assertions: [
      { kind: "must_include", pattern: "risk assessment|Article", flags: "i", label: "risk framing present" },
      // T7-RISK-OPENING-PILOT (2026-07-25): deterministic opening_summary slot,
      // built by supabase/functions/_shared/openings/risk-opening.ts and
      // overwritten by the emit-gate hook (see run-cppa-risk-assessment/index.ts).
      { kind: "must_include", pattern: "\\u00A7 7152", flags: "", label: "S5 § 7152 content frame present" },
      { kind: "must_include", pattern: "As of \\d{4}-\\d{2}-\\d{2}\\.", flags: "", label: "S6 as-of date present" },
    ],
  },
  {
    id: "risk-adtech-sell-tuning",
    tool: "cppa-risk",
    set: "tuning",
    intake: {
      ...base,
      entity_name: "Bright Ads Co",
      q3_sector: "Media/advertising",
      q5_sell_share: "Both",
      q5c_share_revenue_50pct: "Yes",
      q15_sensitive_pi: "Yes",
      q15c_spi_volume: "50,000 or more",
      q16_sensitive_limit: "Yes, with a separate \"Limit the Use of My Sensitive PI\" link",
      q17_sensitive_basis: "Consent",
      // PN-CORPUS-L-RISK-1 — consumer adtech SPI is not personnel data.
      q15d_hr_carveout: "No — processed for other purposes as well",
    },
    assertions: [
      { kind: "must_include", pattern: "sensitive", flags: "i", label: "SPI addressed" },
      // T7-RISK-OPENING-PILOT: adtech fixture engages § 1798.140(d)(1)(B) (sell/share
      // "Both" + q2_consumers "250,000 to under 1,000,000") — deterministic S0 must render
      // the (B) verbatim corpus quote fragment.
      { kind: "must_include", pattern: "buys, sells, or shares", flags: "", label: "S0 (B) corpus quote present" },
      { kind: "must_include", pattern: "\\u00A7 7152", flags: "", label: "S5 § 7152 content frame present" },
    ],
  },
  {
    id: "risk-consumer-boundary-adversarial",
    tool: "cppa-risk",
    set: "adversarial",
    intake: {
      ...base,
      entity_name: "Cascade Data Ltd",
      // Right on the trigger boundary (V2 label for § 1798.140(d)(1)(B) edge):
      q2_consumers: "100,000 to under 250,000",
      i3_ca_consumer_band: "100,000–1,000,000",
      // QB-P25 boundary-batch fix: enable ADMT trigger so the fixture
      // clears the § 7150(b) pre-generation validator; the boundary
      // character (consumer-volume enum edge) is unchanged.
      q18_admt_use: "Yes",
      // ITEM 324 — the ADMT companions the contract marks `conditional` on
      // `q18_admt_use === "Yes"` (q19_admt_description, q20_admt_opt_out,
      // i5_admt_logic, i5_admt_human_review) were absent, leaving this case
      // silently dependent on the fact that `validateIntake` does not
      // mechanically evaluate `requiredWhen`. This case tests a CONSUMER-
      // VOLUME boundary, not the conditional-requirement rejection path, so
      // the correct resolution is to supply the companions — the boundary
      // character is untouched. Authored to the "Perfect Data" standard.
      q19_admt_description:
        "A scoring model ranks free-tier accounts for proactive outreach; a ranking above the outreach threshold determines whether an account is offered a paid-conversion discount.",
      q20_admt_opt_out: "Yes, with documented opt-out",
      i5_admt_logic:
        "The model takes three inputs — sessions in the trailing 30 days, count of completed onboarding steps, and seat count — and returns a 0–100 propensity score. Accounts scoring above 70 are queued for outreach; the score is not used for any other decision and no inference about a protected characteristic is an input or an output.",
      i5_admt_human_review:
        "Every queued account is reviewed by a named account manager before any offer is sent; the manager can remove an account from the queue and records the reason, and no offer is issued on the score alone.",
    },

    assertions: [
      { kind: "must_include", pattern: "100,000", flags: "i", label: "boundary threshold surfaced" },
      // T7-RISK-OPENING-PILOT: q2_consumers "100,000 to under 250,000" straddles from below
      // on § 1798.140(d)(1)(B), q5_sell_share "No" — opening must NOT assert (B).
      // Boundary-band handling stays in the body, not the opening (per spec rule 6).
      { kind: "must_include", pattern: "\\u00A7 7152", flags: "", label: "S5 § 7152 content frame present" },
    ],
  },
];

// QB-P25 B3 — structural guards for the risk v2 pointer/enum/rank contract.
// Purpose: allow the grader to verify shape without re-scoring substance.
// Applied by consumers that run structural checks over report_data (see
// run-quality-batch RUBRIC_RISK note). Each guard returns null on pass or a
// short failure label on violation. Pure functions; no I/O.

export const RISK_LIKELIHOOD_ENUM = ["Unlikely", "Possible", "Likely", "Highly likely"];
export const RISK_SEVERITY_ENUM = ["Minimal", "Moderate", "Significant", "Severe"];

export const RISK_V2_STRUCTURAL_GUARDS: {
  id: string;
  label: string;
  check: (report: any) => string | null;
}[] = [
  {
    id: "risk_strengthen_item_ids_resolve",
    label: "exception_analysis[].strengthen_item_ids and record_sufficiency.strengthen_item_ids must resolve to a strengthen_items[].item_id",
    check(report) {
      const valid = new Set<string>();
      for (const it of (report?.strengthen_items ?? [])) {
        if (typeof it?.item_id === "string") valid.add(it.item_id);
      }
      const bad: string[] = [];
      for (const ex of (report?.exception_analysis ?? [])) {
        for (const id of (ex?.strengthen_item_ids ?? [])) {
          if (typeof id !== "string" || !valid.has(id)) bad.push(String(id));
        }
      }
      for (const id of (report?.record_sufficiency?.strengthen_item_ids ?? [])) {
        if (typeof id !== "string" || !valid.has(id)) bad.push(String(id));
      }
      return bad.length ? `unresolved strengthen_item_ids: ${bad.join(", ")}` : null;
    },
  },
  {
    id: "risk_adverse_effects_enums",
    label: "adverse_effects[].likelihood and .severity must be enum values (QB-P25 B3)",
    check(report) {
      const bad: string[] = [];
      for (const act of (report?.risk_assessment_by_activity ?? [])) {
        for (const ae of (act?.adverse_effects ?? [])) {
          if (ae?.likelihood && !RISK_LIKELIHOOD_ENUM.includes(ae.likelihood)) bad.push(`likelihood=${ae.likelihood}`);
          if (ae?.severity && !RISK_SEVERITY_ENUM.includes(ae.severity)) bad.push(`severity=${ae.severity}`);
        }
      }
      return bad.length ? bad.join("; ") : null;
    },
  },
  {
    id: "risk_priority_actions_unique_rank",
    label: "priority_actions[].rank must be unique 1..N",
    check(report) {
      const items = Array.isArray(report?.priority_actions) ? report.priority_actions : [];
      if (items.length === 0) return null;
      const ranks = items.map((a: any) => a?.rank);
      const nums = ranks.filter((r: any) => typeof r === "number" && Number.isFinite(r));
      if (nums.length !== items.length) return "one or more priority_actions missing numeric rank";
      if (new Set(nums).size !== nums.length) return `duplicate ranks: ${nums.join(",")}`;
      const sorted = [...nums].sort((a: number, b: number) => a - b);
      for (let i = 0; i < sorted.length; i++) if (sorted[i] !== i + 1) return `ranks are not 1..N (got ${sorted.join(",")})`;
      return null;
    },
  },
];

// ── ITEM 378 — TRULY-COMPLETE-RECORD FIXTURE ────────────────────────────────
// CPPA_RISK_PERFECT holds complete-record cases: every contract key a real
// organisation could supply is filled, every triggered conditional is
// answered, and every untriggered conditional is absent. Wired into
// PERFECT_BY_TOOL["cppa-risk"] so an A/B batch labelled "perfect" grades
// perfect-record WRITING rather than degraded-record behaviour. Additive —
// CPPA_RISK_GOLDEN above is unchanged and remains the legacy set.
export const CPPA_RISK_PERFECT: GoldenCase[] = [
  {
    id: "risk-perfect-complete",
    tool: "cppa-risk",
    set: "tuning",
    intake: {
      entity_name: "Sierra Outfitters, Inc.",
      subject_anchor: "store-financing applicants (California consumers)",
      primary_activity_name: "Store-financing eligibility screening",
      primary_activity_purpose:
        "Decide store-financing applications within minutes at point of sale while screening for identity fraud.",
      has_secondary_uses: "No — this data is used for this activity only",
      secondary_activities: [],

      q1_revenue: "Over $100M",
      q2_consumers: "100,000 to under 250,000",
      q3_sector: "Retail/ecommerce",
      q4_pi_categories: [
        "Contact identifiers (name, email, phone)",
        "Financial information",
        "Employment information",
        "Other",
      ],
      q5_sell_share: "No",
      // No observation-based profiling: the significant-decision profiling in
      // this record is the ADMT screening captured at q18–q20.
      q5b_profiling_observation: "No",
      // q5c_share_revenue_50pct — NOT TRIGGERED (q5_sell_share is "No").
      sensitive_location_basis: "No",
      bought_sold_shared_count: "Under 100,000",
      public_privacy_policy_url: "https://www.sierraoutfitters.example/privacy",

      q6_right_know:
        "Web form, toll-free number, and in-store request desk; identity verified before disclosure.",
      q6_right_know_multi: [
        "Online form with identity verification",
        "Email or written request process",
        "In-app account settings",
      ],
      q7_right_delete: "Automated deletion with confirmation",
      q8_right_correct: "Online self-service",
      q9_opt_out: "Yes, prominently on homepage",
      q10_id_verification: "Documented verification process matching CPPA guidance",
      q11_policy_review: "Within 12 months",
      q12_notice_at_collection: "Yes, covers all collection points",
      q13_notice_content: "Yes, all three",
      q14_employee_notice: "Yes",

      q15_sensitive_pi: "Yes",
      q15b_under16_knowledge: "No — we do not knowingly process under-16 data",
      q15c_spi_volume: "50,000 or more",
      q16_sensitive_limit: "Yes, with a separate \"Limit the Use of My Sensitive PI\" link",
      q17_sensitive_basis: "Necessary for the service",
      // PN-CORPUS-L-RISK-1 — consumer-facing SPI, not solely-personnel.
      q15d_hr_carveout: "No — processed for other purposes as well",

      q18_admt_use: "Yes",
      q19_admt_description:
        "A gradient-boosted eligibility model scores each application 0–100 from applicant-supplied income, tenure, and credit-bureau data; scores above 70 auto-approve, below 40 decline with human review on request, 40–70 route to a credit analyst. A separate rules layer flags identity-fraud signals for manual verification.",
      q20_admt_opt_out: "Yes, with documented opt-out",
      q18b_admt_training: "No",

      i1_processing_purpose:
        "Assess creditworthiness and verify identity for store-financing applications so qualified customers can finance purchases at the point of sale.",
      i1b_min_pi:
        "Only the fields on the credit application and the bureau report are processed: identity, income, tenure, and account references. Browsing history, purchase history outside the financed order, and marketing profiles are excluded by design.",
      i2_retention_period: "25 months from decision",
      i2_retention_criteria: "Fixed period from collection",
      i2_retention_detail:
        "25 months aligns to ECOA adverse-action record requirements; declined applications purge automatically at 25 months, approved accounts convert to servicing records under the servicing schedule.",
      i3_ca_consumer_band: "10,000–100,000",
      i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy"],
      i4b_sources:
        "Directly from the applicant, from Experian under a reseller agreement, and from the fraud-consortium database operated by Sentinel Risk LLC.",
      i5_admt_logic:
        "Sixty-two scored features across income, obligations, tenure, and bureau attributes; feature weights reviewed quarterly; no protected-class features or proxies (validated by annual disparate-impact testing).",
      i5_admt_training_source:
        "Trained on Sierra's own seven-year financing-outcome history; no consumer data is contributed to any vendor's training corpus.",
      i5_admt_fairness_testing:
        "Annual disparate-impact analysis by Fairlend Analytics; last run March 2026; adverse-impact ratios within the 0.8 band on all protected classes; remediation SLA 60 days.",
      i5_admt_human_review:
        "Any declined applicant may request review by a credit analyst with authority to overturn; 40–70 scores are always human-decided; fraud flags always require manual verification before denial.",
      i6_vendors:
        "Experian (credit bureau, reseller agreement); Sentinel Risk LLC (fraud consortium, service-provider addendum); CoreLedger Inc. (loan-servicing platform, service-provider addendum). All three under CCPA service-provider contracts prohibiting secondary use.",
      i7_internal_contributors:
        "M. Delgado, VP Consumer Credit; R. Okafor, CISO; T. Nguyen, Privacy Counsel; the store-operations director for POS workflow facts.",
      i7_external_consultees:
        "Fairlend Analytics (fairness methodology); outside privacy counsel at Marston LLP reviewed the assessment approach.",
      i8_certifying_exec_name: "L. Whitcomb",
      i8_certifying_exec_title: "Chief Compliance Officer",
      i8_contact_phone: "+1 415 555 0180",
      i8_contact_email: "privacy@sierraoutfitters.example",
      i9_has_existing_dpia: "No",
      // i9_existing_dpia_summary — NOT TRIGGERED (i9_has_existing_dpia is "No").
      // INTAKE-4a addition (CEO-approved 2026-08-09): asked field, answered
      // like every other asked field on the truly-complete-record fixture.
      material_change_since_prior: "No",


      // exceptions_intake — none claimed (truthful; the key is omitted).

      impact_intake: {
        likelihood: "Possible",
        severity: "Moderate",
        benefitsOutweigh: "Yes",
        cyberGaps: "No",
        harmTypes: ["Economic harm", "Unlawful discrimination"],
      },

      a2_necessity_set: [
        {
          element: "Social Security number",
          necessity: "Necessary to the stated purpose",
          justification:
            "Bureau match and fraud verification cannot proceed without it.",
        },
        {
          element: "Applicant income",
          necessity: "Necessary to the stated purpose",
          justification: "Income is the eligibility decision's core input.",
        },
        {
          element: "Bank account reference",
          necessity: "Necessary to the stated purpose",
          justification: "Funding and servicing of approved financing.",
        },
        {
          element: "Government-issued ID number",
          necessity: "Necessary to the stated purpose",
          justification: "In-person identity proofing at the point of sale.",
        },
        {
          element: "Contact details",
          necessity: "Necessary to the stated purpose",
          justification: "Adverse-action notices and servicing communications.",
        },
        {
          element: "Credit-bureau report",
          necessity: "Necessary to the stated purpose",
          justification:
            "Creditworthiness cannot be assessed from application data alone.",
        },
      ],

      a4_benefit_business:
        "Converts ~30% of large-basket purchases that would otherwise abandon; fraud losses down 41% since the model launched.",
      a4_benefit_business_fact:
        "FY2025: $18.4M financed volume; fraud loss rate 0.6% vs 1.1% pre-model.",
      a4_benefit_consumer:
        "Point-of-sale financing decisions in under five minutes with a human-review path; qualified customers access 0% promotional terms.",
      a4_benefit_consumer_fact: "Median decision time 3.2 minutes; 78% approval rate.",
      a4_benefit_other_stakeholders:
        "Store associates avoid handling paper applications containing SPI; bureau data stays inside the decision system.",
      a4_benefit_other_stakeholders_fact:
        "Zero associate-facing SPI screens since 2024 redesign.",
      a4_benefit_public:
        "Fewer identity-fraud losses passed through to prices; annual fairness testing published in summary to the store credit council.",
      a4_benefit_public_fact:
        "Two consortium fraud rings identified and reported in 2025.",

      a5_harm_pathways: [
        {
          harm: "(A) Unauthorized access, destruction, use, modification, or disclosure; loss of availability",
          data_involved: "Sensitive personal information on financing applications",
          actor: "External attacker",
          source: "Breach of the decision system",
          cause: "Credential compromise",
          likelihood: "Possible",
          severity: "Significant",
        },
        {
          harm: "(B) Unlawful discrimination on protected characteristics",
          data_involved: "Scored application and bureau features",
          actor: "The eligibility model itself",
          source: "Algorithmic bias in scoring",
          cause: "Proxy correlation despite annual testing",
          likelihood: "Unlikely",
          severity: "Significant",
        },
        {
          harm: "(E) Economic harms",
          data_involved: "Eligibility scores",
          actor: "The controller",
          source: "Wrongful decline of a qualified applicant",
          cause: "Model error on thin-file applicants",
          likelihood: "Possible",
          severity: "Moderate",
        },
        {
          harm: "(G) Reputational harms",
          data_involved: "Social Security and government-ID numbers",
          actor: "Data thief",
          source: "Misuse of exfiltrated sensitive personal information",
          cause: "Breach or insider exfiltration",
          likelihood: "Unlikely",
          severity: "Severe",
        },
      ],

      a6_safeguards: [
        {
          harm: "(A) Unauthorized access, destruction, use, modification, or disclosure; loss of availability",
          safeguard:
            "Encryption at rest and in transit, MFA on all decision-system accounts, and quarterly access review.",
          safeguard_status: "Implemented and tested",
          residual: "Low — monitored via SOC alerts",
          effectiveness_basis: "Validated by testing against the linked risk",
        },
        {
          harm: "(B) Unlawful discrimination on protected characteristics",
          safeguard:
            "Annual disparate-impact testing with a 60-day remediation SLA.",
          safeguard_status: "Implemented and tested",
          residual: "Low — last three cycles within band",
          effectiveness_basis: "Validated by testing against the linked risk",
        },
        {
          harm: "(E) Economic harms",
          safeguard:
            "Human-review path on request and mandatory analyst routing for thin-file applications.",
          safeguard_status: "Implemented and tested",
          residual: "Low — overturn rate tracked monthly",
          effectiveness_basis: "Validated by testing against the linked risk",
        },
        {
          harm: "(G) Reputational harms",
          safeguard: "Tokenised storage of Social Security numbers and a 25-month purge job.",
          safeguard_status: "Implemented and tested",
          residual: "Low — purge job audited quarterly",
          effectiveness_basis: "Validated by testing against the linked risk",
        },
      ],

      a8_information_providers:
        "Application data from the consumer; bureau attributes from Experian; fraud signals from Sentinel Risk; outcome history from CoreLedger servicing records.",
      a9_approver_name: "L. Whitcomb",
      a9_approver_position: "Chief Compliance Officer",
      a9_approval_date: "2026-06-12",
      // Finalization-stage fields (§ 7152(a)(9)) — a "perfect" fixture
      // represents a fully completed customer journey, intake AND
      // finalization, not just a pre-finalization draft. Added 2026-08-21
      // after a quality-batch run correctly flagged the approval record as
      // outstanding on a fixture that never actually finalized it.
      assessment_reviewers_approvers: [
        { name: "L. Whitcomb", position: "Chief Compliance Officer", role: "Both" },
      ],
      approver_authority_confirmed: "Yes",
      approver_authority_basis:
        "Chief Compliance Officer with delegated authority under the Company's privacy governance charter to approve or halt covered processing.",

      // ── RK3-A1 Priority-1 fields (Intake Contract v2.0 §§ 1–6, 9) ──────────
      // Every asked field is answered to the "Perfect Data" standard so the
      // truly-complete-record invariant (zero contract_incomplete) is maintained
      // after each A1 group is committed.
      processing_entry_point:
        "Financing applications submitted at the point of sale via Sierra Outfitters in-store credit terminals linked to the CoreLedger decision system.",
      processing_methods: {
        collection_method:
          "Applicants submit a paper or digital credit application at the point of sale; identity, income, tenure, and government-ID fields are transmitted to CoreLedger over an encrypted TLS 1.3 connection.",
        use_method:
          "The gradient-boosted eligibility model scores the application (0–100) and returns an approve, decline, or analyst-review decision within five minutes; parallel fraud-signal rules route flagged applications for manual verification before any decision is issued.",
        disclosure_method:
          "Approved-application data shared with CoreLedger (loan servicing), Experian (bureau reseller under a service-provider addendum), and Sentinel Risk (fraud consortium under a service-provider addendum); adverse-action notices sent directly to applicants as required by ECOA.",
        retention_method:
          "Decision records retained for 25 months in CoreLedger's servicing platform; SPI fields (Social Security and government-ID numbers) are tokenised at rest and purged automatically at 25 months via a quarterly-audited deletion job.",
        other_processing_method:
          "Annual disparate-impact testing by Fairlend Analytics; adverse-action notice generation; fraud-flag verification by the credit-operations team; opt-out request processing via the Sierra Outfitters privacy portal.",
      },
      processing_result:
        "An approve, decline, or analyst-review decision produced within five minutes; an adverse-action notice where required by ECOA and CCPA; a fraud-consortium report where a fraud flag is confirmed.",

      consumer_interaction_method: "In person",
      consumer_interaction_purpose:
        "To allow qualified California consumers to finance large-basket purchases at the point of sale with a near-instant credit decision.",
      approximate_ca_consumers:
        "Approximately 18,000 financing applications per year from California consumers at Sierra Outfitters store locations.",

      // pi_category / retention_criteria are contract enums (PI_CATEGORIES /
      // RETENTION_CRITERIA) — values below byte-match the option lists.
      retention_by_pi_category: [
        {
          pi_category: "Contact identifiers (name, email, phone)",
          retention_period: "25 months from decision date",
          retention_criteria: "",
        },
        {
          pi_category: "Financial information",
          retention_period: "",
          retention_criteria: "Statutory or regulatory retention requirement",
        },
        {
          pi_category: "Employment information",
          retention_period: "25 months from decision date",
          retention_criteria: "",
        },
        {
          pi_category: "Other",
          retention_period: "25 months from decision date",
          retention_criteria: "",
        },
      ],

      activity_disclosures: [
        {
          disclosure_content:
            "Notice at Collection disclosing the collection of contact, financial, employment, and government-ID information for financing eligibility and fraud-screening purposes.",
          disclosure_method:
            "Provided on the paper credit application and on the in-store kiosk screen before application data is submitted.",
          status: "Made",
          timing_or_location:
            "At the point of sale, before application data is submitted.",
        },
        {
          disclosure_content:
            "Privacy policy covering all personal information collected, used, disclosed, and retained as part of the store-financing activity.",
          disclosure_method:
            "Posted at https://www.sierraoutfitters.example/privacy and linked from the credit-application form.",
          status: "Made",
          timing_or_location:
            "Online; physical link printed on adverse-action notices.",
        },
      ],

      // § 7152(a)(3)(F) recipient record (A1 g5): one row per service
      // provider named in i6_vendors; enum values byte-match the contract.
      recipients: [
        {
          recipient_name_or_category: "Experian (credit bureau, reseller agreement)",
          recipient_type: "Service provider",
          pi_categories_made_available: [
            "Contact identifiers (name, email, phone)",
            "Financial information",
            "Employment information",
          ],
          disclosure_purpose:
            "Bureau match returning the creditworthiness attributes the eligibility model requires.",
          contractual_protections:
            "Written contract with the CCPA-required restrictions in place",
        },
        {
          recipient_name_or_category: "Sentinel Risk LLC (fraud consortium)",
          recipient_type: "Service provider",
          pi_categories_made_available: [
            "Contact identifiers (name, email, phone)",
            "Other",
          ],
          disclosure_purpose:
            "Identity-fraud signal verification on applications the rules layer flags.",
          contractual_protections:
            "Written contract with the CCPA-required restrictions in place",
        },
        {
          recipient_name_or_category: "CoreLedger Inc. (loan-servicing platform)",
          recipient_type: "Service provider",
          pi_categories_made_available: [
            "Contact identifiers (name, email, phone)",
            "Financial information",
          ],
          disclosure_purpose:
            "Decisioning infrastructure and servicing of approved financing accounts.",
          contractual_protections:
            "Written contract with the CCPA-required restrictions in place",
        },
      ],

      // Benefit gates (A1 g6): all four classes identified; gate set to "Yes"
      // because a4_benefit_* narratives and facts are already present above.
      benefit_business_identified: "Yes",
      benefit_consumer_identified: "Yes",
      benefit_other_stakeholders_identified: "Yes",
      benefit_public_identified: "Yes",

      // § 7151(a) participation record (A1 g6): employees whose functions are
      // materially involved in the financing-eligibility processing activity.
      section_7151_operational_participants: [
        {
          name: "M. Delgado",
          role: "VP Consumer Credit",
          processing_responsibility:
            "Owns the financing eligibility policy and the model deployment decision; accountable for the credit-operations team that handles analyst reviews and fraud flags.",
          participation_confirmed: true,
        },
        {
          name: "T. Nguyen",
          role: "Privacy Counsel",
          processing_responsibility:
            "Reviewed the assessment for legal compliance; confirmed the § 7150 trigger analysis and the notice-at-collection content.",
          participation_confirmed: true,
        },
      ],

      // ── RK3-A2 — Assessment timing and ADMT extension fields ──────────────
      // RK3-A2 g1 timing: processing is ongoing (not planned); no prior formal
      // risk assessment on record; no material change since the last review.
      // Fields with emptyIsAnswer that are N/A on this record are documented in
      // the EXEMPT set in risk-perfect-fixtures.test.ts.
      processing_status: "Ongoing",

      // RK3-A2 g2 ADMT operational narrative: q18_admt_use is "Yes"; these five
      // fields deepen the existing i5 block with the operational-role, assumption/
      // limitation, output, output-use, and consumer-effect details required for
      // the Spine 4.3 §II.D ADMT narrative.
      admt_operational_role:
        "The eligibility model takes the approve or decline or analyst-review decision autonomously for scores above 70 and below 40; scores in the 40–70 band and any fraud-flagged application route to a named credit analyst for a human decision.",
      admt_assumptions_limitations:
        "The model assumes that bureau attributes and self-reported income and tenure are accurate; thin-file applicants (fewer than three bureau tradelines) are more likely to receive an analyst-review routing tag rather than an automated decision.",
      admt_output:
        "A numerical eligibility score from 0 to 100 and a routing tag: auto-approve (score above 70), auto-decline (below 40), or analyst-review (score in the 40–70 band or a fraud flag).",
      admt_output_use:
        "The routing tag determines whether the applicant is immediately approved, declined with a required adverse-action notice, or queued for a credit-analyst decision; the score is not used for any other purpose.",
      admt_consumer_effect:
        "A consumer may be approved or declined for store financing on the basis of the automated score without a human decision maker being involved, unless the score falls in the 40–70 band, a fraud flag is raised, or the consumer requests human review.",

      // RK3-A2 g3: Sierra uses CoreLedger's third-party model; Sierra does not
      // provide its own ADMT to other businesses.
      admt_made_available_to_other_business: "No",

      // ── RK3-D (doc 33 D-L3) — Class C→B conversion operands, answered to
      // the Perfect Data standard and honest to this record's own facts.
      // The stated purpose names the operation, the affected consumers, and
      // the intended outcome; it does not itself enumerate PI categories
      // (those live in i1b_min_pi), so that facet is honestly unchecked.
      purpose_specificity_facts: [
        "The specific product, service, or operation the processing supports",
        "The categories of consumers affected",
        "The intended outcome or result of the processing",
      ],
      out_of_scope_confirmation:
        "The affected information is processed only for the stated purpose and any listed secondary uses",
      comparable_processing_status: "This assessment covers a single processing activity",
      consumer_relationship_context: "Existing customers or account holders",
      source_categories: [
        "Directly from the consumer",
        "From service providers or contractors",
        "From third-party data providers or brokers",
      ],
      vendor_dependency:
        "One or more vendors are essential — the processing could not continue without them",
      essential_vendors:
        "Experian (bureau attributes) and CoreLedger Inc. (decisioning and servicing platform).",
      // Honest divergence markers: retention continues after the point-of-sale
      // interaction; bureau data is combined; Sentinel is a party the consumer
      // does not directly interact with. Notice coverage (q12/q13) is full.
      expectation_check: [
        "The processing occurs during and as part of the consumer's interaction with the Company",
        "The processing continues after the interaction ends",
        "Information is combined with information from other sources",
        "Information is disclosed to parties the consumer does not directly interact with",
      ],
      choice_architecture_check: [
        "Consent or permission requests are presented symmetrically — declining is as easy as accepting",
        "Declining the processing does not degrade the core service the consumer seeks",
        "The Company does not use design elements that steer consumers toward permitting the processing",
      ],
      admt_role_type: "The ADMT makes the decision without human involvement",
      admt_logic_documented: "The logic is documented and reviewed internally",
      human_review_facts: [
        "Reviewers know how to interpret and use the ADMT's output",
        "Reviewers consider information beyond the ADMT's output",
        "Reviewers have authority to change or overrule the decision",
      ],
      admt_testing_facts: [
        "Tested for accuracy or validity",
        "Tested for discriminatory impact or bias",
        "Testing performed or reviewed within the last 12 months",
      ],
      // Honest compounding: pathway (G) is misuse of SPI exfiltrated through
      // pathway (A)'s breach — the record's own causation links them.
      risk_interdependency_check: "Two or more identified pathways could compound each other",
      compounding_pathways: [
        "(A) Unauthorized access, destruction, use, modification, or disclosure; loss of availability",
        "(G) Reputational harms",
      ],
      benefit_business_magnitude_basis: "Quantified or measurable basis stated",
      benefit_consumer_magnitude_basis: "Quantified or measurable basis stated",
      benefit_other_stakeholders_magnitude_basis: "Quantified or measurable basis stated",
      benefit_public_magnitude_basis: "Quantified or measurable basis stated",
    },
    assertions: [
      {
        kind: "must_include",
        pattern: "Sierra Outfitters",
        label: "names the assessed entity",
      },
      {
        kind: "must_not_include",
        pattern: "TO BE COMPLETED",
        label: "no completion placeholders on a complete record",
      },
      { kind: "jurisdiction_resolved", label: "resolves the CPPA jurisdiction" },
    ],
  },

  // ── ITEM 378 / RK0.5 D1 — SECOND PERFECT FIXTURE ───────────────────────────
  // Trigger profile: (b)(1) sell/share + (b)(2) precise-geolocation sensitive PI.
  // NO ADMT (q18_admt_use: "No", q18b_admt_training: "No").
  // Differentiates from risk-perfect-complete (Sierra Outfitters — (b)(3)+(b)(6)
  // ADMT + SPI) on: sell/share trigger active; no ADMT trigger; no SPI basis
  // "Necessary for the service" (replaced by "Consent" for location data).
  // Proved against checkPerfectCppaRiskIntake at RK0.5 D1 (all four gate
  // conditions: contract complete, coverage clean, CSC clean, missing_data = 0).
  {
    id: "risk-perfect-seller-geolocation",
    tool: "cppa-risk",
    set: "tuning",
    intake: {
      entity_name: "Locus Technologies, Inc.",
      subject_anchor: "California consumers whose mobile location data is collected and sold",
      primary_activity_name: "Geobehavioral audience segmentation",
      primary_activity_purpose:
        "Collect precise GPS location signals from publisher-app users (with in-app consent) and build geobehavioral audience segments sold to retail, real-estate, and healthcare-marketing advertisers.",
      has_secondary_uses: "No — this data is used for this activity only",
      secondary_activities: [],

      q1_revenue: "Over $100M",
      q2_consumers: "1,000,000 or more",
      q3_sector: "Media/advertising",
      q4_pi_categories: [
        "Device identifiers (IP, cookies, device IDs)",
        "Precise geolocation (GPS-level / specific address)",
      ],
      q5_sell_share: "Both",
      q5b_profiling_observation: "No",
      q5c_share_revenue_50pct: "Yes",
      bought_sold_shared_count: "1,000,000 or more",
      sensitive_location_basis: "No",
      public_privacy_policy_url: "https://www.locustechnologies.example/privacy",

      q6_right_know:
        "Online privacy portal with verified-identity access; toll-free number; email request pathway.",
      q6_right_know_multi: [
        "Online form with identity verification",
        "Email or written request process",
      ],
      q7_right_delete: "Automated deletion with confirmation",
      q8_right_correct: "Online self-service",
      q9_opt_out: "Yes, prominently on homepage",
      q10_id_verification: "Documented verification process matching CPPA guidance",
      q11_policy_review: "Within 12 months",
      q12_notice_at_collection: "Yes, covers all collection points",
      q13_notice_content: "Yes, all three",
      q14_employee_notice: "Yes",

      q15_sensitive_pi: "Yes",
      q15b_under16_knowledge: "No — we do not knowingly process under-16 data",
      q15c_spi_volume: "50,000 or more",
      q16_sensitive_limit: "Yes, with a separate \"Limit the Use of My Sensitive PI\" link",
      q17_sensitive_basis: "Consent",
      // PN-CORPUS-L-RISK-1 — consumer-facing SPI, not solely-personnel.
      q15d_hr_carveout: "No — processed for other purposes as well",

      q18_admt_use: "No",
      q18b_admt_training: "No",

      i1_processing_purpose:
        "Aggregate consented mobile GPS location signals into pseudonymous geobehavioral segments that are licensed to advertisers for programmatic campaign targeting.",
      i1b_min_pi:
        "Only the device identifier (IDFA/GAID), GPS coordinate pair, and timestamp are ingested from publisher apps; names, emails, browsing history, and demographic inferences are excluded by SDK design.",
      i2_retention_period: "13 months",
      i2_retention_criteria: "Fixed period from collection",
      i2_retention_detail:
        "13 months is the minimum period needed to build year-over-year seasonality features; all raw location pings are purged at 13 months via an automated deletion job audited quarterly.",
      i3_ca_consumer_band: "More than 1,000,000",
      i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy"],
      i4b_sources:
        "Directly from consumer devices via SDK embedded in partner publisher apps; each publisher app collects in-app consent under its own privacy notice before the SDK fires.",
      i5_admt_training_source:
        "Not applicable — Locus does not train or deploy ADMT systems as part of the geobehavioral segmentation activity.",
      i5_admt_fairness_testing:
        "Not applicable — no ADMT is used in this activity; the segmentation pipeline applies deterministic place-category rules, not a scored model.",
      i6_vendors:
        "AWS (cloud infrastructure, service-provider addendum); Snowflake (data warehouse, service-provider addendum); LiveRamp (segment distribution, service-provider addendum); all three under CCPA service-provider contracts prohibiting secondary use.",
      i7_internal_contributors:
        "E. Marín, Chief Privacy Officer; K. Singh, Head of Data Engineering; R. Osei, Senior Legal Counsel; D. Tanaka, Information Security Lead.",
      i7_external_consultees:
        "Outside privacy counsel at Hartley & Vance LLP reviewed the assessment approach and the publisher SDK consent architecture.",
      i8_certifying_exec_name: "E. Marín",
      i8_certifying_exec_title: "Chief Privacy Officer",
      i8_contact_phone: "+1 628 555 0195",
      i8_contact_email: "privacy@locustechnologies.example",
      i9_has_existing_dpia: "No",
      material_change_since_prior: "No",

      impact_intake: {
        likelihood: "Possible",
        severity: "Moderate",
        benefitsOutweigh: "Yes",
        cyberGaps: "No",
        harmTypes: [
          "Unauthorised access, destruction, use, modification, or disclosure",
          "Impairment of consumer control over personal information",
          "Reputational harm",
        ],
      },

      a2_necessity_set: [
        {
          element: "Mobile device identifier (IDFA / GAID)",
          necessity: "Necessary to the stated purpose",
          justification:
            "The device identifier is the unit of observation that links location pings into a persistent pseudonymous profile; without it, no durable behavioral segment can be built or licensed.",
        },
        {
          element: "Precise GPS coordinate pair and timestamp",
          necessity: "Necessary to the stated purpose",
          justification:
            "The coordinate pair and timestamp are the raw inputs for place-category attribution; coarser location (ZIP or IP-derived city) cannot support place-level visit counting.",
        },
        {
          element: "Publisher app category",
          necessity: "Collected but not necessary to the stated purpose",
          justification:
            "App-category metadata arrives in the bid-stream as a by-product of the SDK call but is not used in segment construction; it is filtered out at ingestion.",
        },
      ],

      a4_benefit_business:
        "Sells geobehavioral audience segments to over 400 advertiser clients; precise location targeting generates the revenue that sustains the platform and subsidises free publisher apps.",
      a4_benefit_business_fact:
        "FY2025: 412 active advertiser clients; median campaign click-through rate 3.1× above contextual-only baseline across 2,800 measured campaigns (internal performance report, Q4 2025).",
      a4_benefit_consumer:
        "Consenting consumers receive advertising relevant to their demonstrated location patterns rather than broadly targeted ads; publisher apps they use remain free of charge.",
      a4_benefit_consumer_fact:
        "In-app surveys by three publisher partners found that 67% of consenting users rated location-relevant ads as more useful than generic alternatives (sample: 4,200 consenting users, 2025).",
      a4_benefit_other_stakeholders:
        "Small and mid-size retailers use geobehavioral segments to compete with larger chains in local advertising without requiring brand-awareness budgets.",
      a4_benefit_other_stakeholders_fact:
        "38% of advertiser clients are SMBs; average SMB client reports a 2.4× revenue uplift attributable to location-targeted campaigns versus prior general-display spend (client survey, 2025).",
      a4_benefit_public:
        "Revenue from the platform subsidises fourteen free-tier publisher apps used by over 500,000 consumers each; the targeting model reduces the number of irrelevant ad impressions consumers receive.",
      a4_benefit_public_fact:
        "Fourteen publisher partners operate free mobile apps with no subscription fee; Locus revenue offsets their hosting and content-delivery costs per partnership agreements on file.",

      a5_harm_pathways: [
        {
          harm: "(A) Unauthorized access, destruction, use, modification, or disclosure; loss of availability",
          data_involved:
            "Precise GPS coordinates linked to pseudonymous device identifiers across up to 13 months of location history",
          actor: "External attacker or malicious insider",
          source: "Breach of the Snowflake data warehouse holding the raw location log",
          cause:
            "Credential compromise or misconfigured warehouse-sharing policy exposes the pseudonymous coordinate history at scale",
          likelihood: "Unlikely",
          severity: "Significant",
        },
        {
          harm: "(C) Impairment of consumer control over personal information",
          data_involved:
            "Location pings collected from publisher-app sessions where consent notice was inadequate or pre-checked",
          actor: "Publisher app operators whose SDK consent implementation does not meet the notice standard",
          source:
            "Locus relies on publisher consent notices; a publisher that presents a pre-checked or vague consent screen passes non-consensual location data into the Locus pipeline",
          cause:
            "Locus's ingestion pipeline cannot distinguish a properly consented ping from a technically compliant but substantively deficient consent at the publisher level",
          likelihood: "Possible",
          severity: "Moderate",
        },
        {
          harm: "(G) Reputational harms",
          data_involved:
            "Location history that reveals repeated visits to sensitive venues (medical offices, places of worship, legal aid offices)",
          actor: "Advertiser clients or downstream data recipients",
          source:
            "A segment taxonomy that includes place-category labels derived from sensitive-venue visits",
          cause:
            "A downstream recipient uses or resells the segment in a context that identifies or exposes a consumer's sensitive location pattern",
          likelihood: "Unlikely",
          severity: "Significant",
        },
      ],

      a6_safeguards: [
        {
          harm: "(A) Unauthorized access, destruction, use, modification, or disclosure; loss of availability",
          safeguard:
            "Snowflake warehouse access governed by row-level security and role-based permissions; credential rotation every 60 days; warehouse-access logs reviewed weekly by the security team; annual third-party penetration test.",
          safeguard_status: "Implemented and tested",
          residual:
            "A short-window credential compromise before rotation could reach the location log for the active credential window.",
          effectiveness_basis: "Validated by testing against the linked risk",
        },
        {
          harm: "(C) Impairment of consumer control over personal information",
          safeguard:
            "Publisher SDK integration agreement requires CPPA-compliant consent language and opt-out mechanisms; Locus audits a sample of publisher consent implementations annually and terminates non-compliant integrations.",
          safeguard_status: "Implemented and tested",
          residual:
            "Annual spot-checks cannot guarantee real-time compliance across all publisher integrations; a non-compliant consent screen between audit cycles would still reach the pipeline.",
          effectiveness_basis: "Validated by testing against the linked risk",
        },
        {
          harm: "(G) Reputational harms",
          safeguard:
            "Sensitive-venue place categories (health, religious, legal, financial-distress proxy) are contractually prohibited advertiser use cases in every client MSA; prohibition compliance is audited annually by a third-party data-ethics firm.",
          safeguard_status: "Implemented and tested",
          residual:
            "Contractual prohibition and annual audit reduce but do not eliminate the risk that a client misuses a non-prohibited segment that partially correlates with a sensitive-venue pattern.",
          effectiveness_basis: "Validated by testing against the linked risk",
        },
      ],

      a8_information_providers:
        "Location ping data from publisher SDK integrations; publisher consent records from publisher CMP logs; segment-distribution usage logs from LiveRamp; client-campaign-use attestations collected annually.",
      a9_approver_name: "E. Marín",
      a9_approver_position: "Chief Privacy Officer",
      a9_approval_date: "2026-07-15",
      // Finalization-stage fields (§ 7152(a)(9)) — see risk-perfect-complete
      // above for why these were added 2026-08-21.
      assessment_reviewers_approvers: [
        { name: "E. Marín", position: "Chief Privacy Officer", role: "Both" },
      ],
      approver_authority_confirmed: "Yes",
      approver_authority_basis:
        "Chief Privacy Officer with delegated authority under the Company's privacy governance charter to approve or halt covered processing.",

      // ── RK3-A1 Priority-1 fields (Intake Contract v2.0 §§ 1–6, 9) ──────────
      processing_entry_point:
        "GPS location pings transmitted by the Locus SDK embedded in partner publisher mobile apps, after each publisher's in-app consent screen is accepted.",
      processing_methods: {
        collection_method:
          "The Locus SDK collects the device identifier (IDFA/GAID), GPS coordinate pair, and timestamp from consenting publisher-app sessions and transmits them to the Locus ingestion pipeline over TLS.",
        use_method:
          "Deterministic place-category rules attribute each coordinate pair to a commercial place category; visit patterns are aggregated per pseudonymous device identifier into geobehavioral audience segments.",
        disclosure_method:
          "Finished segments are licensed to advertiser clients and distributed through LiveRamp under a service-provider addendum; raw location pings are never disclosed and sensitive-venue categories are contractually prohibited advertiser use cases.",
        retention_method:
          "Raw location pings retained 13 months in the Snowflake warehouse under row-level security, then purged by an automated quarterly-audited deletion job; derived segments carry no raw coordinates.",
        other_processing_method:
          "Annual publisher-consent spot audits; opt-out and deletion request processing via the Locus privacy portal; segment-taxonomy review excluding sensitive-venue place categories.",
      },
      processing_result:
        "Pseudonymous geobehavioral audience segments licensed to advertiser clients for programmatic campaign targeting; no raw location data leaves the pipeline.",

      consumer_interaction_method: "No direct interaction (obtained from another source)",
      consumer_interaction_purpose:
        "Consumers interact with partner publisher apps, not with Locus directly; the publisher app presents the consent screen under which location data is collected for advertising personalisation.",
      approximate_ca_consumers:
        "More than 1,000,000 California consumers' devices contribute consented location signals annually across the fourteen publisher-app integrations.",

      // pi_category / retention_criteria are contract enums (PI_CATEGORIES /
      // RETENTION_CRITERIA) — values below byte-match the option lists.
      retention_by_pi_category: [
        {
          pi_category: "Precise geolocation (GPS-level / specific address)",
          retention_period: "13 months from collection",
          retention_criteria: "",
        },
        {
          pi_category: "Device identifiers (IP, cookies, device IDs)",
          retention_period: "13 months from collection",
          retention_criteria: "",
        },
        {
          // Derived geobehavioral segment memberships.
          pi_category: "Other",
          retention_period: "",
          retention_criteria: "Until purpose is fulfilled, then deletion",
        },
      ],

      activity_disclosures: [
        {
          disclosure_content:
            "Publisher in-app consent notice describing the collection of precise location data for advertising personalisation, presented before the SDK transmits any ping.",
          disclosure_method:
            "In-app consent screen presented by each partner publisher app under the SDK integration agreement's CPPA-compliant consent-language requirement.",
          status: "Made",
          timing_or_location: "In the publisher app, before the first location ping is transmitted.",
        },
        {
          disclosure_content:
            "Locus privacy policy describing the geobehavioral segmentation activity, the categories of location data processed, retention, and consumer rights including opt-out of sale/sharing.",
          disclosure_method:
            "Posted at https://www.locustechnologies.example/privacy with a 'Do Not Sell or Share My Personal Information' link.",
          status: "Made",
          timing_or_location: "Online, linked from every publisher app's consent screen.",
        },
      ],

      // § 7152(a)(3)(F) recipient record (A1 g5): the three service providers
      // named in i6_vendors plus the advertiser clients — the third-party
      // segment licensing is the sale/share this record exists to capture.
      recipients: [
        {
          recipient_name_or_category: "AWS (cloud infrastructure)",
          recipient_type: "Service provider",
          pi_categories_made_available: [
            "Device identifiers (IP, cookies, device IDs)",
            "Precise geolocation (GPS-level / specific address)",
          ],
          disclosure_purpose:
            "Hosts the ingestion pipeline and raw location store under a service-provider addendum.",
          contractual_protections:
            "Written contract with the CCPA-required restrictions in place",
        },
        {
          recipient_name_or_category: "Snowflake (data warehouse)",
          recipient_type: "Service provider",
          pi_categories_made_available: [
            "Device identifiers (IP, cookies, device IDs)",
            "Precise geolocation (GPS-level / specific address)",
          ],
          disclosure_purpose:
            "Warehouses raw location pings for the 13-month feature window under row-level security.",
          contractual_protections:
            "Written contract with the CCPA-required restrictions in place",
        },
        {
          recipient_name_or_category: "LiveRamp (segment distribution)",
          recipient_type: "Service provider",
          pi_categories_made_available: [
            "Device identifiers (IP, cookies, device IDs)",
          ],
          disclosure_purpose:
            "Distributes finished audience segments to advertiser platforms under a service-provider addendum.",
          contractual_protections:
            "Written contract with the CCPA-required restrictions in place",
        },
        {
          recipient_name_or_category:
            "Advertiser clients (retail, real-estate, and healthcare-marketing)",
          recipient_type: "Third party",
          pi_categories_made_available: [
            "Device identifiers (IP, cookies, device IDs)",
          ],
          // v4.7.2 fixture-text fix (CEO output review 2026-08-25): the old
          // wording named the internal intake field id, which rendered
          // verbatim in customer output. Same fact, no internal slug.
          disclosure_purpose:
            "Licensed geobehavioral segments for programmatic campaign targeting — this disclosure constitutes the sale or sharing identified in the applicability analysis.",
          contractual_protections:
            "Written contract with the CCPA-required restrictions in place",
        },
      ],

      benefit_business_identified: "Yes",
      benefit_consumer_identified: "Yes",
      benefit_other_stakeholders_identified: "Yes",
      benefit_public_identified: "Yes",

      section_7151_operational_participants: [
        {
          name: "K. Singh",
          role: "Head of Data Engineering",
          processing_responsibility:
            "Owns the ingestion pipeline, the place-category attribution rules, and the 13-month purge job; accountable for the warehouse access controls.",
          participation_confirmed: true,
        },
        {
          name: "E. Marín",
          role: "Chief Privacy Officer",
          processing_responsibility:
            "Owns the publisher-consent audit programme and the segment-taxonomy review excluding sensitive-venue categories; certifies the assessment.",
          participation_confirmed: true,
        },
      ],

      // ── RK3-D (doc 33 D-L3) — Class C→B conversion operands, answered to
      // the Perfect Data standard and honest to this record's own facts.
      // The stated purpose names the operation, the PI involved (precise GPS
      // signals), the affected consumers (publisher-app users), and the
      // outcome (segments sold to advertisers) — all four facets.
      purpose_specificity_facts: [
        "The specific product, service, or operation the processing supports",
        "The categories of personal information involved",
        "The categories of consumers affected",
        "The intended outcome or result of the processing",
      ],
      out_of_scope_confirmation:
        "The affected information is processed only for the stated purpose and any listed secondary uses",
      comparable_processing_status: "This assessment covers a single processing activity",
      consumer_relationship_context: "General public — no direct relationship",
      source_categories: [
        "Automatically from consumer devices or interactions",
      ],
      vendor_dependency:
        "One or more vendors are essential — the processing could not continue without them",
      essential_vendors:
        "AWS, Snowflake, and LiveRamp — the ingestion, warehouse, and distribution layers of the pipeline.",
      // Honest divergence markers: the 13-month history outlives any single
      // app session; pings from multiple publisher apps are combined into one
      // pseudonymous profile; segments go to advertisers the consumer never
      // interacts with. Notice coverage (q12/q13) is full.
      expectation_check: [
        "The processing continues after the interaction ends",
        "Information is combined with information from other sources",
        "Information is disclosed to parties the consumer does not directly interact with",
      ],
      // Honest partial answer: pathway (C) records that publisher consent
      // screens are outside Locus's direct control, so symmetric presentation
      // cannot be confirmed across all integrations.
      choice_architecture_check: [
        "Declining the processing does not degrade the core service the consumer seeks",
        "The Company does not use design elements that steer consumers toward permitting the processing",
      ],
      // ADMT operands intentionally absent — q18_admt_use is "No" and the
      // fields are logically conditional on ADMT (emptyIsAnswer posture).
      risk_interdependency_check: "The identified risk pathways operate independently",
      benefit_business_magnitude_basis: "Quantified or measurable basis stated",
      benefit_consumer_magnitude_basis: "Quantified or measurable basis stated",
      benefit_other_stakeholders_magnitude_basis: "Quantified or measurable basis stated",
      benefit_public_magnitude_basis: "Quantified or measurable basis stated",
    },
    assertions: [
      {
        kind: "must_include",
        pattern: "Locus Technologies",
        label: "names the assessed entity",
      },
      {
        kind: "must_not_include",
        pattern: "TO BE COMPLETED",
        label: "no completion placeholders on a complete record",
      },
      { kind: "jurisdiction_resolved", label: "resolves the CPPA jurisdiction" },
    ],
  },
];
