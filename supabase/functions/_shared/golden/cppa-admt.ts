// QB-P20 — CPPA ADMT golden set. 3 fixtures.
// Adversarial: pure-advertising scenario that historically invited
// §7001 as an anchor for the DUTY (vs. §7220-series). Fixture is
// solely_advertising with NO significant decisions.
import type { GoldenCase } from "./types.ts";

const commonNotice = {
  notice_delivery: ["Included in our Notice at Collection"] as string[],
  notice_has_specific_purpose: "Yes",
  notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
  notice_has_access_desc: "Yes",
  notice_has_anti_retaliation: "Yes",
  notice_has_how_it_works: "Yes — included inline in the notice",
  notice_has_alternative_process: "Yes",
  access_submission_methods: "Online form on privacy portal.",
  access_verification_process: "Match to account with 2FA.",
  access_logic_disclosure: "We provide a plain-language description of the model inputs and decision rule.",
  access_outcome_disclosure: "The decision, its factors, and appeal path are disclosed in the response.",
  access_response_timeline: "Within 45 calendar days (standard)",
};

export const CPPA_ADMT_GOLDEN: GoldenCase[] = [
  {
    id: "admt-hr-significant-tuning",
    tool: "cppa-admt",
    set: "tuning",
    intake: {
      organization_name: "Meridian Talent Corp",
      system_name: "TalentRank",
      system_type: "ML classifier",
      system_description: "TalentRank scores résumés against role profiles using an in-house LightGBM model; hiring managers see a ranked list.",
      decision_domains: ["Hiring or admission decisions"],
      human_review: "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
      training_data_use: "No",
      profiling_use: "No",
      ...commonNotice,
      opt_out_exception: "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination",
    },
    assertions: [
      { kind: "must_include", pattern: "7221", flags: "i", label: "§7221 anchored" },
      // QB-P25 A3 — established basis when the intake identifies the category.
      { kind: "must_include", pattern: "\"determination_basis\"\\s*:\\s*\"established\"", flags: "", label: "determination_basis=established" },
      // Per-entry enforcement_exposure is now enum-only; free-form dollar text is banned.
      { kind: "must_not_include", pattern: "\"enforcement_exposure\"\\s*:\\s*\"[^\"]*\\$", flags: "", label: "no dollar figures in per-entry enforcement_exposure" },
    ],
  },
  {
    id: "admt-credit-significant-tuning",
    tool: "cppa-admt",
    set: "tuning",
    intake: {
      organization_name: "Sequoia Credit",
      system_name: "CreditGuard",
      system_type: "Statistical model",
      system_description: "CreditGuard scores personal loan applications using a logistic regression with 30 features; decisions gate credit lines.",
      decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
      human_review: "Partial — reviewer sees the output but cannot override it",
      training_data_use: "Yes",
      profiling_use: "Yes",
      ...commonNotice,
      opt_out_exception: "No exception — we provide a full opt-out right",
    },
    assertions: [
      { kind: "must_include", pattern: "opt[- ]?out", flags: "i", label: "opt-out framed" },
      { kind: "must_include", pattern: "\"determination_basis\"\\s*:\\s*\"established\"", flags: "", label: "determination_basis=established" },
    ],
  },
  {
    id: "admt-advertising-adversarial",
    tool: "cppa-admt",
    set: "adversarial",
    intake: {
      organization_name: "Bright Ads Co",
      system_name: "AdPicker",
      system_type: "Ranking / recommender",
      system_description: "AdPicker chooses which display ad to show in a slot based on contextual signals only; no significant decision affecting any consumer.",
      decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
      human_review: "Not applicable / unsure",
      training_data_use: "No",
      profiling_use: "No",
      ...commonNotice,
      opt_out_exception: "No exception — we provide a full opt-out right",
      admt_detail: { solely_advertising: "Yes — solely advertising" },
    },
    assertions: [
      { kind: "must_not_include", pattern: "significant decision", flags: "i",
        label: "does NOT invent significant-decision status" },
      // Established out-of-scope: solely_advertising = Yes resolves the category.
      { kind: "must_include", pattern: "\"determination_basis\"\\s*:\\s*\"established\"", flags: "", label: "determination_basis=established (out-of-scope resolved)" },
    ],
  },
  // QB-P25 A3 — conservative-assumption fixture: the intake does not name an
  // enumerated § 7001(ddd) category, so triggers_significant_decision is set
  // TRUE with determination_basis="conservative_assumption" and the three gap
  // arrays render in COMPACT mode.
  {
    id: "admt-service-eligibility-conservative",
    tool: "cppa-admt",
    set: "adversarial",
    intake: {
      organization_name: "Northstar Platform Inc",
      system_name: "TierSelect",
      system_type: "Rules engine",
      system_description: "TierSelect assigns customers to service tiers for a general consumer subscription product. The operations team originally flagged this as financial-adjacent when scoping the review, but the platform is a general consumer subscription — the tier assignment does NOT determine credit decisions, loan eligibility, account approval, or any other financial-services outcome. The intake does not identify the underlying service as clearly falling within any enumerated § 7001(ddd) category (financial, lending, housing, education, employment, or healthcare).",
      // QB-P25 boundary-batch fix: SIGNIFICANT_DECISION_DOMAINS is
      // required-always in the contract (multi-enum, min 1). We supply the
      // operator's originally-flagged candidate to satisfy the contract
      // while the system_description above disclaims it, preserving the
      // conservative_assumption bait (intake does not affirmatively
      // establish the category — the model should still default to
      // determination_basis="conservative_assumption").
      decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
      human_review: "No — fully automated, no human review",
      training_data_use: "No",
      profiling_use: "No",
      ...commonNotice,
      opt_out_exception: "No exception — we provide a full opt-out right",
    },
    assertions: [
      { kind: "must_include", pattern: "\"determination_basis\"\\s*:\\s*\"conservative_assumption\"", flags: "", label: "determination_basis=conservative_assumption" },
      { kind: "must_include", pattern: "duty_if_in_scope", flags: "", label: "COMPACT entries carry duty_if_in_scope" },
      // COMPACT entries omit remediation entirely.
      { kind: "must_not_include", pattern: "\"remediation\"", flags: "", label: "no remediation field in COMPACT mode" },
    ],
  },
];
