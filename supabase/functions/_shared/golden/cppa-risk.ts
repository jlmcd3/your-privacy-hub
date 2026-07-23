// QB-P20 — CPPA Risk Assessment golden set. 3 fixtures.
// Adversarial: consumer volume at enum boundary ("100,000–249,999") — tests
// cohort determinism at the trigger edge.
import type { GoldenCase } from "./types.ts";

const base = {
  entity_name: "Meridian SaaS Inc.",
  subject_anchor: "California consumers using the free tier",
  q1_revenue: "$25M–$50M",
  q2_consumers: "250,000–1 million",
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
    intake: { ...base, q5b_profiling_observation: "Yes" },
    assertions: [
      { kind: "must_include", pattern: "risk assessment|Article", flags: "i", label: "risk framing present" },
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
    ],
  },
  {
    id: "risk-consumer-boundary-adversarial",
    tool: "cppa-risk",
    set: "adversarial",
    intake: {
      ...base,
      entity_name: "Cascade Data Ltd",
      // Right on the trigger boundary:
      q2_consumers: "100,000–249,999",
      i3_ca_consumer_band: "100,000–1,000,000",
      // QB-P25 boundary-batch fix: enable ADMT trigger so the fixture
      // clears the § 7150(b) pre-generation validator; the boundary
      // character (consumer-volume enum edge) is unchanged.
      q18_admt_use: "Yes",
    },
    assertions: [
      { kind: "must_include", pattern: "100,000", flags: "i", label: "boundary threshold surfaced" },
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
