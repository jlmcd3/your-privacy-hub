/**
 * ITEM 315 — types for the cppa-cyber analytic deliverables.
 *
 * SHAPE LAW: every finding carries the four-part analysis shape used by every
 * prior rebuild (Items 305/308/310/311/312/313) — standard (verbatim corpus)
 * → record fact → application → verdict. A finding that cannot be reasoned
 * from the record degrades to `record_insufficient` with a named
 * `information_needed`; it never fabricates and never guesses.
 */

export type FindingStatus = "analysed" | "record_insufficient";

export type Verdict =
  | "satisfied"
  | "not_satisfied"
  | "partially_satisfied"
  | "not_applicable"
  | "record_insufficient";

/** The common four-part analysis shape. */
export interface Finding {
  key: string;
  label: string;
  citation: string;
  /** Verbatim corpus text — never paraphrased. */
  standard: string;
  /** What the intake record actually says. */
  record_fact: string;
  /** Application of the standard to the record fact. */
  application: string;
  verdict: Verdict;
  status: FindingStatus;
  information_needed?: string;
}

/**
 * Op. A — § 7123(c) component coverage. ONE ROW PER ENUMERATED COMPONENT,
 * re-derived from the statute rather than from the prior ungrounded model.
 */
export interface CyberComponentCoverage extends Finding {
  component_number: number;
  slug: string;
  /** Maturity as stated on the record (verbatim intake enum), or "" if absent. */
  maturity: string;
  /** Whether the component is in scope at all under § 7123(c). */
  in_scope: boolean;
  /** What must change for this component to reach "satisfied". */
  remediation: string;
}

/**
 * Op. B — § 7122(d) evidence sufficiency. The question is NOT "did the
 * business say it does this" but "could an auditor reach a finding on this
 * record without relying primarily on management assertions".
 */
export interface EvidenceSufficiency extends Finding {
  component_number: number;
  slug: string;
  /** Evidence types named on the record. */
  evidence_offered: string[];
  /** Of those, the ones that are testable artefacts rather than assertions. */
  testable_artifacts: string[];
  /** Reasoned, not asserted: can an auditor assess this component on this record? */
  assessable_on_record: boolean | null;
  sufficiency: "sufficient" | "partial" | "insufficient" | "unknown";
}

/** Op. D — § 7122 auditor qualification and independence. */
export interface IndependenceFinding extends Finding {
  condition_key: string;
  /** "always" conditions are assessed on every record. */
  applies: boolean;
}

export interface IndependenceDetermination {
  findings: IndependenceFinding[];
  engagement_status: string;
  auditor_type: "internal" | "external" | "none" | "unknown";
  verdict: Verdict;
  status: FindingStatus;
  /** Conditions that are not satisfied on this record. */
  unsatisfied_conditions: string[];
  summary: string;
}

/**
 * Op. C — the readiness determination. This REPLACES the mean score as the
 * report's conclusion. It must be able to conclude "ready" cleanly: a record
 * with every component satisfied and evidence sufficient does NOT get hedged.
 */
export type ReadinessConclusion =
  | "ready"
  | "ready_subject_to_named_remediation"
  | "not_ready"
  | "record_insufficient";

export interface ReadinessDetermination {
  conclusion: ReadinessConclusion;
  /** One-sentence statement of the conclusion in the statute's own frame. */
  headline: string;
  /** Reasoning that names the components driving the conclusion. */
  reasoning: string;
  citations: string[];
  /** Components that must be fixed before an audit can be certified. */
  blocking_components: Array<{ slug: string; label: string; reason: string }>;
  /** Components whose record is too thin for an auditor to assess. */
  unassessable_components: Array<{ slug: string; label: string; information_needed: string }>;
  status: FindingStatus;
}

/**
 * DEMOTION LAW (Item 315, mirroring Item 313): the mean component score has
 * no statutory basis. It survives only as an explicitly-labelled secondary
 * read-aid, never as the report's conclusion.
 */
export interface MeanScoreReadabilityAid {
  label: string;
  value: number | null;
  scored_count: number;
  basis: string;
  caveat: string;
}

export interface CyberDeliverables {
  component_coverage: CyberComponentCoverage[];
  evidence_sufficiency: EvidenceSufficiency[];
  program_obligation_findings: Finding[];
  independence_determination: IndependenceDetermination;
  readiness_determination: ReadinessDetermination;
  mean_score_readability_aid?: MeanScoreReadabilityAid;
}
