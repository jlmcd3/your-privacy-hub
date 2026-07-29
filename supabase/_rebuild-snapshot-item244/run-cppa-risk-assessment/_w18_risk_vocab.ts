// W18-RISK-VOCABSCRUB — deterministic post-emit scrub of raw intake field-ID
// tokens leaking into customer-facing prose. Wave-17 doc 17c0aa18: prose in
// inconsistency_flags[].description embedded raw normalised-intake ids like
// `i1b_min_pi` and `i1_processing_purpose`. h2_internal_vocab and
// rubric_internal_reasoning_leak both fired on these.
//
// Scope: rewrite raw ids in prose ONLY. Structured technical anchors
// (source_fields, field, intake_field_1, intake_field_2, provision) are
// legitimate pipeline vocabulary and are LEFT UNTOUCHED — those arrays/strings
// are skipped by the walker.
//
// Label source: derived from the CPPA_RISK intake contract's leaf keys (single
// source of truth). Unknown/unmapped ids fall back to the neutral phrase
// "the corresponding intake response". Never emit the raw id in prose.
//
// Fail-open: per-node try/catch; a walker fault never breaks generation.

import { cppaRiskContract } from "../_shared/intake-contracts/cppa-risk-assessment.ts";

export const W18_RISK_VOCABSCRUB_STAMP = "w18-risk-vocabscrub@2026-07-25T03:34:41Z";

// Human-readable labels for the risk intake fields most commonly leaked in
// prose (wave-17 evidence + surrounding neighbourhood). Any id not in this
// map falls back to NEUTRAL_LABEL — the scrub NEVER emits the raw id.
export const RISK_INTAKE_LABELS: Record<string, string> = {
  entity_name: "the entity name",
  subject_anchor: "the subject of the assessment",
  q1_revenue: "the annual-revenue band",
  q2_consumers: "the California-consumer count",
  q3_sector: "the reported sector",
  q4_pi_categories: "the personal-information categories collected",
  q5_sell_share: "the sell-or-share answer",
  q5b_profiling_observation: "the systematic-observation / sensitive-location profiling answer",
  q5c_share_revenue_50pct: "the share-of-revenue-from-selling answer",
  sensitive_location_basis: "the sensitive-location basis",
  public_privacy_policy_url: "the public privacy-policy URL",
  q6_right_know: "the right-to-know disclosures",
  q6_right_know_multi: "the right-to-know disclosure elements",
  q7_right_delete: "the right-to-delete process",
  q8_right_correct: "the right-to-correct process",
  q9_opt_out: "the opt-out-of-sale/share posture",
  q10_id_verification: "the identity-verification process",
  q11_policy_review: "the privacy-policy review date",
  q12_notice_at_collection: "the notice-at-collection coverage",
  q13_notice_content: "the notice content",
  q14_employee_notice: "the employee-notice arrangement",
  q15_sensitive_pi: "the sensitive-PI answer",
  q15b_under16_knowledge: "the under-16 knowledge answer",
  q15c_spi_volume: "the sensitive-PI volume figure",
  q16_sensitive_limit: "the limit-use-of-sensitive-PI mechanism",
  q17_sensitive_basis: "the sensitive-PI processing basis",
  q18_admt_use: "the ADMT-use answer",
  q19_admt_description: "the ADMT-system description",
  q20_admt_opt_out: "the ADMT opt-out mechanism",
  q18b_admt_training: "the ADMT-training answer",
  i1_processing_purpose: "the stated processing purpose",
  i1b_min_pi: "the data-minimisation commitment",
  i2_retention_period: "the stated retention period",
  i2_retention_criteria: "the retention-criteria answer",
  i2_retention_detail: "the retention-schedule detail",
  i3_ca_consumer_band: "the California-consumer band",
  i4_disclosure_mechanisms: "the disclosure mechanisms",
  i4b_sources: "the personal-information sources",
  i5_admt_logic: "the ADMT logic description",
  i5_admt_training_source: "the ADMT training-data source",
  i5_admt_fairness_testing: "the ADMT fairness-testing record",
  i5_admt_human_review: "the ADMT human-review procedure",
  i6_vendors: "the vendor list",
  i7_internal_contributors: "the internal-contributors roster",
  i7_external_consultees: "the external-consultees list",
  i8_certifying_exec_name: "the certifying-executive name",
  i8_certifying_exec_title: "the certifying-executive title",
  i8_contact_phone: "the certifying-executive phone",
  i8_contact_email: "the certifying-executive email",
  i9_has_existing_dpia: "the existing-DPIA answer",
  i9_existing_dpia_summary: "the existing-DPIA summary",
  exceptions_intake: "the exceptions intake",
  impact_intake: "the impact intake",
};

export const NEUTRAL_LABEL = "the corresponding intake response";

// Structured anchor keys — legitimate pipeline vocabulary. Any string VALUE
// stored under one of these keys (or any nested descendant of one of these
// keys) is skipped by the walker so raw ids can survive as technical anchors.
const ANCHOR_KEYS = new Set<string>([
  "source_fields",
  "field",
  "intake_field_1",
  "intake_field_2",
  "provision",
]);

// The intake-contract-derived list of leaf field ids. Dotted paths are
// reduced to their last segment (e.g. impact_intake.likelihood → likelihood
// is EXCLUDED here — leaf enum names are noisy). We restrict to top-level
// intake keys, which is exactly the class that leaked in wave-17.
export const RISK_INTAKE_FIELD_IDS: string[] = Array.from(new Set(
  cppaRiskContract.fields
    .map((f) => f.key)
    .filter((k) => !k.includes(".")),
));

// Precompiled regex: whole-word alternation over the actual intake ids.
// Longest-first so `q5b_profiling_observation` matches before `q5`. Word
// boundaries prevent chopping tokens like `q19_admt_description_extra`.
const ID_ALTERNATION = RISK_INTAKE_FIELD_IDS
  .slice()
  .sort((a, b) => b.length - a.length)
  .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const ID_RE = new RegExp(`\\b(?:${ID_ALTERNATION})\\b`, "g");

export interface VocabScrubMetrics {
  vocab_prose_strings_scanned: number;
  vocab_ids_rewritten: number;
  vocab_neutral_fallbacks: number;
  vocab_anchor_strings_skipped: number;
}

export function newVocabScrubMetrics(): VocabScrubMetrics {
  return {
    vocab_prose_strings_scanned: 0,
    vocab_ids_rewritten: 0,
    vocab_neutral_fallbacks: 0,
    vocab_anchor_strings_skipped: 0,
  };
}

/**
 * Rewrite raw intake field ids inside `s` to their human-readable labels.
 * Unmapped ids collapse to NEUTRAL_LABEL. Quoted intake VALUES are untouched
 * because only the id TOKEN is replaced (a value like "'privacy@ex.com'" has
 * no id token inside the quotes).
 */
export function scrubProseString(s: string, metrics?: VocabScrubMetrics): string {
  if (!s || typeof s !== "string") return s;
  if (metrics) metrics.vocab_prose_strings_scanned++;
  return s.replace(ID_RE, (id: string) => {
    const label = RISK_INTAKE_LABELS[id];
    if (label) {
      if (metrics) metrics.vocab_ids_rewritten++;
      return label;
    }
    if (metrics) metrics.vocab_neutral_fallbacks++;
    return NEUTRAL_LABEL;
  });
}

/**
 * Recursively walk `node` and rewrite intake-id tokens found in string leaves.
 * Skips any subtree rooted at an ANCHOR_KEYS key so structured technical
 * anchors (source_fields, field, intake_field_1/2, provision) remain intact.
 */
export function scrubReportVocab(node: unknown, metrics: VocabScrubMetrics): void {
  try {
    walk(node, metrics, /* inAnchor */ false);
  } catch (e) {
    console.warn(
      `[${W18_RISK_VOCABSCRUB_STAMP}] fail-open: ${(e as Error)?.message ?? e}`,
    );
  }
}

function walk(node: unknown, metrics: VocabScrubMetrics, inAnchor: boolean): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const v = node[i];
      if (typeof v === "string") {
        if (inAnchor) {
          metrics.vocab_anchor_strings_skipped++;
        } else {
          node[i] = scrubProseString(v, metrics);
        }
      } else if (v && typeof v === "object") {
        walk(v, metrics, inAnchor);
      }
    }
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const childAnchor = inAnchor || ANCHOR_KEYS.has(key);
    const v = obj[key];
    if (typeof v === "string") {
      if (childAnchor) {
        metrics.vocab_anchor_strings_skipped++;
      } else {
        try {
          obj[key] = scrubProseString(v, metrics);
        } catch { /* per-node fail-open */ }
      }
    } else if (v && typeof v === "object") {
      walk(v, metrics, childAnchor);
    }
  }
}
