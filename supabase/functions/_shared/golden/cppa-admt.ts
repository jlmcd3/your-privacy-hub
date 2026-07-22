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
    ],
  },
];
