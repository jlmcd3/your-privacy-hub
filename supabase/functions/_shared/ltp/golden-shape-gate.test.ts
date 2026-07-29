/**
 * ITEM 247 — TRACK 2 STAGE 2 / TASK B: GOLDEN-SHAPE GATE ASSESSMENT.
 * ITEM 248 — TRACK 2 STAGE 3: REAL-INTAKE FIXTURE.
 *
 * Spec §6: "quotas are review-flags in production, hard asserts in the
 * e2e gate." This file runs a REAL archived intake (doc
 * 43c17b1c-dbb7-467a-ad99-fc98e352cbac, source_row_id
 * f5b607fa-fd54-4aaf-b2b2-2e08cd5fea3c — the spec §9 Target Dossier
 * exemplar, C-93/G-90, gpt_overall_score 90) through derivePlan +
 * assembleReport, then calls evaluateGoldenShape on the shipped body.
 *
 * Per Item 248: no hand-added weighing_frame/factor_table/propositions
 * overrides. The real intake's trigger signals (q5_sell_share=Yes,
 * q18_admt_use=Yes, q15_sensitive_pi=Yes, q18b_admt_training=Yes) must
 * engage gates/propositions naturally through the normal derive pipeline.
 *
 * The hard assert stays commented out unless the real-intake pass
 * produces zero shortfalls. Item 236 law: never weaken CPPA_RISK_GOLDEN_QUOTAS,
 * never pad the fixture to force a green.
 */
import { assembleReport } from "./pass2-assembler.ts";
import { derivePlan } from "./derive.ts";
import { evaluateGoldenShape } from "./golden-shape-quotas.ts";

// Real archived intake — quality_archive.quality_run_documents_20260728.intake_data
// for doc 43c17b1c-dbb7-467a-ad99-fc98e352cbac. Verbatim; do not paraphrase.
const REAL_INTAKE_248: Record<string, unknown> = {
  q3_sector: "Financial services",
  i1b_min_pi:
    "Loan-application fields are limited to FCRA-permitted data and Plaid-sourced cash-flow data. Device telemetry collection was expanded in 2023 without a formal minimization review; the data-science team collects 34 device behavioral features, of which only 12 have documented necessity rationale. Citizenship/immigration status is collected for PATRIOT Act CIP compliance but is also being evaluated for underwriting use, which has not been approved.",
  i6_vendors:
    "Experian (bureau data and identity verification), Equifax (bureau data), Plaid (open banking / cash-flow data), Acxiom (marketing data supplement), AWS (cloud infrastructure and ML platform), Salesforce (CRM and request management), Twilio (communications), LexisNexis Risk Solutions (fraud and CIP checks). Vendor security assessments are current for Experian, Plaid, and AWS; Acxiom and LexisNexis assessments are overdue by approximately 8 months.",
  q1_revenue: "$100M–$500M",
  q9_opt_out: "Yes, but in footer only",
  entity_name: "ClearPath Credit Solutions, Inc.",
  i4b_sources:
    "PI is collected directly from applicants via the ClearPath app and web portal. Bank-account data is ingested via Plaid with consumer-initiated OAuth permissioning. Credit bureau data is obtained from Experian and Equifax under FCRA permissible purpose. Device signals are passively collected by the ClearPath SDK. Marketing-partner data supplements are received from one identity-graph provider (Acxiom) under a contractual data-use agreement.",
  q18_admt_use: "Yes",
  q2_consumers: "250,000–1 million",
  i5_admt_logic:
    "ScoreEdge v3 is an ensemble model (XGBoost + logistic regression) trained on 4 years of ClearPath origination and performance data. Inputs include VantageScore 3.0, 12 Plaid-derived cash-flow features, 12 device-behavior features, and application metadata. The model produces an approval probability and a rate-tier assignment. A post-hoc SHAP explainability layer generates adverse-action reason codes. No disparate-impact analysis has been completed since the v3 retraining in January 2024.",
  impact_intake: {
    severity: "Severe",
    cyberGaps: "Yes",
    harmTypes: [
      "Unlawful discrimination",
      "Economic harm",
      "Impairment of consumer control over personal information",
      "Reputational harm",
      "Unauthorised access, destruction, use, modification, or disclosure",
    ],
    likelihood: "Likely",
    benefitsOutweigh: "Uncertain",
  },
  q5_sell_share: "Yes — share for advertising only",
  q6_right_know:
    "Applicants and customers can request access via the in-app Privacy Center or by calling 1-800-555-0182. Requests are logged in Salesforce and fulfilled within 45 days. FCRA-regulated data is handled under a parallel process with separate disclosures.",
  subject_anchor:
    "California consumers who apply for personal loans or credit-building products through the ClearPath mobile app",
  q15c_spi_volume: "50,000 or more",
  q7_right_delete: "Manual process, documented",
  i8_contact_email: "tosei-mensah@clearpathcredit.com",
  i8_contact_phone: "+1-628-400-7721",
  q15_sensitive_pi: "Yes",
  q20_admt_opt_out: "No",
  q4_pi_categories: [
    "Contact identifiers (name, email, phone)",
    "Device identifiers (IP, cookies, device IDs)",
    "Financial information",
    "Employment information",
    "General location (city, region, ZIP, IP-derived)",
    "Racial or ethnic origin",
    "Citizenship or immigration status",
    "Internet or network activity",
  ],
  q8_right_correct: "Handled via support",
  exceptions_intake: {
    fraud_security: {
      claimed: true,
      strength: "moderate",
      documented: false,
      description:
        "Device telemetry and fraud signals are processed and retained for fraud detection and synthetic-identity prevention. The exception is partially documented; necessity review for individual telemetry features is incomplete.",
    },
    legal_obligation: {
      claimed: true,
      strength: "strong",
      documented: true,
      description:
        "Retention of adverse-action records and bureau data is required under FCRA, ECOA, and CFPB examination standards. Processing of citizenship status is required under the USA PATRIOT Act CIP rule.",
    },
  },
  q11_policy_review: "Within 12 months",
  q13_notice_content: "Yes, all three",
  q18b_admt_training: "Yes — training ADMT for significant decisions",
  i2_retention_detail:
    "Retention schedule reviewed by legal in Q1 2024. An automated purge pipeline covers bureau-data and application records but device telemetry purge relies on manual scripts that have failed silently on two occasions in the past 18 months, resulting in data retained beyond schedule. Remediation is in progress.",
  i2_retention_period:
    "Approved loan records: 7 years post-payoff. Declined applications: 25 months (FCRA adverse-action window plus buffer). Device telemetry: 36 months. Fraud signals: 5 years.",
  i3_ca_consumer_band: "100,000–1,000,000",
  q10_id_verification: "Documented verification process matching CPPA guidance",
  q14_employee_notice: "Yes",
  q16_sensitive_limit: 'Yes, with a separate "Limit the Use of My Sensitive PI" link',
  q17_sensitive_basis: "Necessary for the service",
  q6_right_know_multi: [
    "Online form with identity verification",
    "In-app account settings",
    "Email or written request process",
  ],
  i5_admt_human_review:
    "Approximately 22% of declined applications trigger manual underwriter review based on a score-proximity threshold (score within 8 points of approval cutoff) or a fraud flag. The remaining 78% of declines are fully automated. There is no mechanism for a consumer to request human review of an automated decision, which is an identified compliance gap.",
  i9_has_existing_dpia: "Yes",
  q19_admt_description:
    "ClearPath uses a proprietary credit-decisioning model ('ScoreEdge v3') that ingests bureau tradeline data, cash-flow signals from permissioned bank-account data (via Plaid), device-behavior telemetry, and app-usage patterns to generate an approval probability score and personalized rate offer. Decisions to decline applications are made algorithmically with no human review in approximately 78% of cases.",
  i1_processing_purpose:
    "PI is processed to: (1) underwrite personal loan applications using alternative credit data; (2) set individualized interest rates and credit limits; (3) detect application fraud and synthetic identity abuse; (4) share aggregated, pseudonymized behavioral data with two marketing partners for retargeting under a data-sharing agreement; (5) comply with FCRA adverse-action notice obligations and CFPB examination requirements. The use of racial-origin proxy variables in the ScoreEdge model has been raised as a fair-lending concern by the compliance team but has not been resolved.",
  i2_retention_criteria: "Statutory or regulatory retention requirement",
  i7_external_consultees:
    "Orrick Herrington & Sutcliffe LLP (CPRA and fair-lending counsel); external penetration-testing firm (Bishop Fox) — most recent assessment March 2024.",
  q15b_under16_knowledge: "No — we do not knowingly process under-16 data",
  i5_admt_training_source:
    "Training corpus is 48 months of ClearPath's own originated loans (approved and denied) merged with bureau performance data. Data includes applicants from all 50 states; California sub-population comprises approximately 31% of training records.",
  i8_certifying_exec_name: "Tatiana Osei-Mensah",
  q5c_share_revenue_50pct: "No",
  i4_disclosure_mechanisms: [
    "Notice at Collection",
    "Privacy policy",
    "Consent screen",
    "Just-in-time notice",
    "Contract / terms of service",
  ],
  i5_admt_fairness_testing:
    "A disparate-impact regression was run on the v2 model in 2022 and showed no statistically significant disparity on race or gender proxies. The v3 model added new device-behavior features; no updated fairness test has been conducted. Compliance has flagged this as a CFPB and CPPA risk pending the next model review scheduled for Q3 2025.",
  i7_internal_contributors:
    "Chief Compliance Officer (assessment lead), Chief Data Officer, VP Credit Risk, CISO, Head of Legal, Product Director (Lending), Data Science Manager.",
  i8_certifying_exec_title: "Chief Compliance Officer",
  i9_existing_dpia_summary:
    "ClearPath completed an internal DPIA for the ScoreEdge v2 model in October 2022, covering CCPA obligations and FCRA interaction. That assessment identified the lack of human-review opt-in as a risk and recommended remediation by Q2 2023; the recommendation remains open. No DPIA was conducted for the v3 model retraining. The current intake is intended to satisfy CPPA Risk Assessment requirements for both the ScoreEdge ADMT and the data-sharing arrangement with marketing partners.",
  q12_notice_at_collection: "Yes, covers all collection points",
  q5b_profiling_observation: "No",
};

function realIntakePlan() {
  // Item 248: no hand-added overrides. The normal derive pipeline is
  // responsible for populating weighing_frame / factor_table / propositions
  // from the real intake's trigger signals.
  return derivePlan({
    intake: REAL_INTAKE_248,
    report_data: {},
    buildStamp: "golden-shape-gate@item248-real-intake",
  });
}

Deno.test("ITEM 248 (Task B): golden-shape gate on real-intake fixture (best-document exemplar)", () => {
  const plan = realIntakePlan();
  const result = assembleReport(plan, {}, { exitMode: "observe" });
  const report = evaluateGoldenShape(result.report as Record<string, unknown>);

  // Print verbatim shortfall data for the controller courier.
  console.log("[ITEM 248 / Task B] evaluateGoldenShape shortfall report:");
  console.log(JSON.stringify({
    version: report.version,
    review_flag: report.review_flag,
    shortfall_keys: report.shortfall_keys,
    sections: report.sections.map((s) => ({
      key: s.key,
      kind: s.kind,
      present: s.present,
      chars: s.chars,
      items: s.items,
      avg_chars_per_item: s.avg_chars_per_item,
      meets_quota: s.meets_quota,
      shortfall_reasons: s.shortfall_reasons,
    })),
  }, null, 2));

  // HARD ASSERT — INTENTIONALLY COMMENTED OUT per Item 247/248 spec.
  // Enable ONLY if the real-intake fixture produces zero shortfalls.
  // Item 236 law: never weaken CPPA_RISK_GOLDEN_QUOTAS, never pad the fixture.
  //
  //   assertEquals(report.shortfall_keys, [],
  //     `golden-shape shortfalls: ${JSON.stringify(report.shortfall_keys)}`);
});
