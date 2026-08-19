/**
 * ITEM 341 — DETERMINISTIC topic derivation for the EU persuasive-authority
 * section of cppa-risk.
 *
 * MATCH LAW: a topic is engaged by a NAMED intake key holding a NAMED value.
 * No model judgement, no embedding similarity, no keyword sniffing over free
 * text. Every engaged topic carries the key/value that engaged it, so the
 * match is explainable on the face of the document.
 */
import type { EuTopicId } from "./pinned-guidance.ts";
import type { EuTopicTrigger } from "./types.ts";

export const EU_TOPIC_RULES_VERSION =
  "cppa-risk-eu-authority-topics-2026-08-01-item341";

export interface EuTopicRule {
  readonly topic_id: EuTopicId;
  readonly topic_label: string;
  readonly rule_id: string;
  /** Intake keys the rule reads — used for the explainability trace. */
  readonly intake_keys: readonly string[];
  /** Art. 60 register match keys. */
  readonly gdpr_provisions: readonly string[];
  readonly topic_tags: readonly string[];
  readonly evaluate: (intake: Record<string, unknown>) => EuTopicTrigger[];
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function list(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => str(x)).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
}

function trigger(key: string, value: string, rule_id: string): EuTopicTrigger {
  return { intake_key: key, intake_value: value, rule_id };
}

export const EU_TOPIC_RULES: readonly EuTopicRule[] = [
  {
    topic_id: "risk_methodology",
    topic_label: "Risk-assessment methodology (severity and likelihood)",
    rule_id: "EU.T1.always",
    intake_keys: [],
    gdpr_provisions: ["Article 35"],
    topic_tags: [],
    evaluate: () => [
      trigger(
        "(section)",
        "every risk assessment states severity and likelihood",
        "EU.T1.always",
      ),
    ],
  },
  {
    topic_id: "automated_decision_making",
    topic_label: "Automated decision-making, profiling and scoring",
    rule_id: "EU.T2.admt",
    intake_keys: ["q18_admt_use", "q5b_profiling_observation"],
    gdpr_provisions: ["Article 22"],
    topic_tags: ["Automated decision making, profiling and Online tracking"],
    evaluate: (intake) => {
      const out: EuTopicTrigger[] = [];
      const admt = str(intake["q18_admt_use"]);
      if (admt === "Yes" || admt === "In evaluation") {
        out.push(trigger("q18_admt_use", admt, "EU.T2.admt"));
      }
      const prof = str(intake["q5b_profiling_observation"]);
      if (prof.startsWith("Yes")) {
        out.push(trigger("q5b_profiling_observation", prof, "EU.T2.admt"));
      }
      return out;
    },
  },
  {
    topic_id: "sensitive_data",
    topic_label: "Sensitive personal information",
    rule_id: "EU.T3.sensitive",
    intake_keys: ["q15_sensitive_pi"],
    gdpr_provisions: ["Article 9"],
    topic_tags: ["Basic principles"],
    evaluate: (intake) => {
      const v = str(intake["q15_sensitive_pi"]);
      return v === "Yes" ? [trigger("q15_sensitive_pi", v, "EU.T3.sensitive")] : [];
    },
  },
  {
    topic_id: "vulnerable_or_minor_subjects",
    topic_label: "Vulnerable data subjects, including minors",
    rule_id: "EU.T4.vulnerable",
    intake_keys: ["q15b_under16_knowledge"],
    gdpr_provisions: ["Article 8"],
    topic_tags: ["Children"],
    evaluate: (intake) => {
      const v = str(intake["q15b_under16_knowledge"]);
      return v.startsWith("Yes")
        ? [trigger("q15b_under16_knowledge", v, "EU.T4.vulnerable")]
        : [];
    },
  },
  {
    topic_id: "legitimate_interest_balancing",
    topic_label: "Selling, sharing and interest-balancing analogues",
    rule_id: "EU.T5.sell_share",
    intake_keys: ["q5_sell_share"],
    gdpr_provisions: ["Article 6", "Article 21"],
    topic_tags: ["Legal basis"],
    evaluate: (intake) => {
      const v = str(intake["q5_sell_share"]);
      return v.startsWith("Yes") || v === "Both"
        ? [trigger("q5_sell_share", v, "EU.T5.sell_share")]
        : [];
    },
  },
  {
    topic_id: "access_and_transparency",
    topic_label: "Consumer-facing notice and access rights",
    rule_id: "EU.T6.disclosure",
    intake_keys: ["i4_disclosure_mechanisms"],
    gdpr_provisions: ["Article 12", "Article 13", "Article 15"],
    topic_tags: ["Data subject rights"],
    evaluate: (intake) => {
      const v = list(intake["i4_disclosure_mechanisms"]);
      return v.length
        ? [trigger("i4_disclosure_mechanisms", v.join("; "), "EU.T6.disclosure")]
        : [];
    },
  },
  {
    topic_id: "retention",
    topic_label: "Retention period and storage limitation",
    rule_id: "EU.T7.retention",
    intake_keys: ["i2_retention_period"],
    gdpr_provisions: ["Article 5", "Article 17"],
    topic_tags: ["Basic principles"],
    evaluate: (intake) => {
      const v = str(intake["i2_retention_period"]);
      return v ? [trigger("i2_retention_period", v, "EU.T7.retention")] : [];
    },
  },
];

/** Ordered, deduplicated list of engaged topics with their triggers. */
export function deriveEuTopics(
  intake: Record<string, unknown>,
): { rule: EuTopicRule; triggers: EuTopicTrigger[] }[] {
  const out: { rule: EuTopicRule; triggers: EuTopicTrigger[] }[] = [];
  for (const rule of EU_TOPIC_RULES) {
    let triggers: EuTopicTrigger[] = [];
    try {
      triggers = rule.evaluate(intake ?? {});
    } catch {
      triggers = [];
    }
    if (triggers.length) out.push({ rule, triggers });
  }
  return out;
}
