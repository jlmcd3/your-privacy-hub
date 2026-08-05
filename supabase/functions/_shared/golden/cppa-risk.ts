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
  sensitive_location_basis: "Not applicable — no sensitive-location processing",

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
      harm: "(A) Unauthorized access, destruction, use, modification, or disclosure",
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
      harm: "(A) Unauthorized access, destruction, use, modification, or disclosure",
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
      sensitive_location_basis: "Not applicable — no sensitive-location processing",
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
          harm: "(A) Unauthorized access, destruction, use, modification, or disclosure",
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
          harm: "(A) Unauthorized access, destruction, use, modification, or disclosure",
          safeguard:
            "Encryption at rest and in transit, MFA on all decision-system accounts, and quarterly access review.",
          safeguard_status: "Implemented and tested",
          residual: "Low — monitored via SOC alerts",
        },
        {
          harm: "(B) Unlawful discrimination on protected characteristics",
          safeguard:
            "Annual disparate-impact testing with a 60-day remediation SLA.",
          safeguard_status: "Implemented and tested",
          residual: "Low — last three cycles within band",
        },
        {
          harm: "(E) Economic harms",
          safeguard:
            "Human-review path on request and mandatory analyst routing for thin-file applications.",
          safeguard_status: "Implemented and tested",
          residual: "Low — overturn rate tracked monthly",
        },
        {
          harm: "(G) Reputational harms",
          safeguard: "Tokenised storage of Social Security numbers and a 25-month purge job.",
          safeguard_status: "Implemented and tested",
          residual: "Low — purge job audited quarterly",
        },
      ],

      a8_information_providers:
        "Application data from the consumer; bureau attributes from Experian; fraud signals from Sentinel Risk; outcome history from CoreLedger servicing records.",
      a9_approver_name: "L. Whitcomb",
      a9_approver_position: "Chief Compliance Officer",
      a9_approval_date: "2026-06-12",
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
];
