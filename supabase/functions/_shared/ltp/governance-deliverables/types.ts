/**
 * ITEM 313 — types for the governance analytic deliverables.
 *
 * SHAPE LAW: every finding carries the same four-part analysis shape used by
 * every prior rebuild — standard (verbatim corpus) → record fact → application
 * → verdict. A finding that cannot be reasoned from the record degrades to
 * `record_insufficient` with a named `information_needed`; it never fabricates.
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
 * GOVERNANCE UPGRADE (product 5) — the assessed governance domains.
 * Every deliverable belongs to exactly one of them, and every domain is
 * walked with the same tracker record.
 */
export type GovernanceDomain =
  | "accountability"
  | "demonstrability"
  | "records_of_processing"
  | "dpo"
  | "risk_calibration"
  | "review_and_update"
  | "international_transfers";

export type RemediationPriority =
  | "Critical — remediate now"
  | "High — remediate this quarter"
  | "Medium — remediate this year"
  | "Low — monitor"
  | "unspecified";

/**
 * GOVERNANCE UPGRADE ITEM 2 — the shared remediation record attached to every
 * ADVERSE finding. Degrades honestly: where the record carries no owner, date
 * or priority, the record is emitted with `record_insufficient` status and a
 * named `information_needed` rather than an invented plan.
 */
export interface RemediationRecord {
  finding_key: string;
  domain: GovernanceDomain;
  accountable_owner: string;
  target_date: string;
  priority: RemediationPriority;
  validation_method: string;
  /** Whether the validation method came from the record or the standard menu. */
  validation_method_source: "recorded" | "default";
  status: FindingStatus;
  information_needed?: string;
}

/**
 * GOVERNANCE UPGRADE ITEM 1 — the generalised per-domain finding.
 *
 * The house SHAPE-LAW finding (standard → record fact → application → verdict,
 * honest degradation) PLUS the two extra fields the ICO Data Protection Audit
 * Framework trackers carry: the regulator expectation and the control question
 * actually tested. The ICO framing is TEMPLATE GUIDANCE ONLY — it is never
 * asserted as corpus authority and never quoted as law.
 */
export interface DomainElementFinding extends Finding {
  domain: GovernanceDomain;
  domain_label: string;
  /** What a regulator looks for on this control (audit-framework framing). */
  regulator_expectation: string;
  /** The specific control question this finding tests. */
  control_question: string;
  /** The customer's own answer, verbatim from the record. */
  customer_answer: string;
  /** What record content was reviewed to reach the verdict. */
  evidence_reviewed: string;
  /** Present on adverse findings only. */
  remediation?: RemediationRecord;
}

/** Op. 2 — Art. 5(2)/24(1) demonstrability: which artifact evidences the duty. */
export interface DemonstrabilityFinding extends Finding {
  duty: string;
  /** The artifact a supervisory authority would ask for. */
  evidencing_artifact: string;
  /** Whether the record shows that artifact exists. */
  artifact_present: "yes" | "partial" | "no" | "unknown";
}

/** Op. 3 — Art. 30(1)(a)-(g) element walk. */
export interface Art30ElementFinding extends Finding {
  element: "a" | "b" | "c" | "d" | "e" | "f" | "g";
}

/** Art. 30(5) exemption — any ONE defeating condition removes the exemption. */
export interface Art30ExemptionDetermination extends Finding {
  under_250_employees: boolean | null;
  defeating_conditions: Array<{
    condition: "likely_risk" | "not_occasional" | "special_category";
    label: string;
    met: boolean | null;
    basis: string;
  }>;
  exemption_available: boolean | null;
}

/** Op. 4 — DPO: three sub-findings, never a boolean. */
export interface DpoDetermination {
  designation_trigger: Finding;
  position_and_independence: Finding;
  task_coverage: Finding;
  verdict: Verdict;
  status: FindingStatus;
}

/**
 * The HEADLINE conclusion. Statutory, not a maturity tier: can this controller
 * demonstrate compliance (Art. 5(2)), and are its measures appropriate to its
 * risk (Art. 24(1))?
 */
export interface AccountabilityDetermination {
  standard_demonstrability: string;
  standard_appropriateness: string;
  citation: string;
  demonstrability_verdict: Verdict;
  appropriateness_verdict: Verdict;
  verdict: Verdict;
  reasoning: string;
  unevidenced_duties: string[];
  status: FindingStatus;
  information_needed?: string;
}

/**
 * The former headline. Demoted: explicitly non-statutory, explicitly secondary.
 */
export interface MaturityTierAid {
  tier: string;
  label: "Non-statutory readability aid";
  statutory_basis: "none";
  caveat: string;
  superseded_by: "accountability_determination";
}

/**
 * ITEM 327 — Chapter V international-transfer analysis.
 *
 * DISTINCT-RAIL LAW: the EU and UK chapters are separate bodies of law with
 * separate citations and separate benchmarks. UK Art. 44 is omitted; UK
 * adequacy is tested against Art. 45B ("not materially lower"), not the EU
 * essential-equivalence standard; UK Art. 46 clause sets come from the
 * Secretary of State (Art. 47A(1)) or the Commissioner (s. 119A DPA 2018).
 * A UK-scoped leg is never cited to the EU chapter, and vice versa.
 */
export interface TransferAnalysis extends Finding {
  regime: "eu" | "uk" | "dual" | "not_engaged";
  /** Recorded transfer_status, verbatim from the record. */
  transfer_status: string;
  /** Recorded transfer_mechanism, verbatim from the record. */
  mechanism: string;
  /** Which chapter the recorded mechanism belongs to. */
  mechanism_regime: "uk" | "eu" | "both" | "unrecorded";
  /** Recorded mechanism belongs to a chapter the record does not engage. */
  mechanism_regime_mismatch: boolean;
  /** The adequacy/safeguard benchmark actually applied, verbatim. */
  benchmark_citation: string;
  benchmark_verbatim: string;
  /** Per-leg citations relied on, in walk order. */
  citations_used: string[];
}

export interface GovernanceDeliverables {
  accountability_determination: AccountabilityDetermination;
  demonstrability_findings: DemonstrabilityFinding[];
  art30_element_findings: Art30ElementFinding[];
  art30_exemption_determination: Art30ExemptionDetermination;
  dpo_determination: DpoDetermination;
  risk_calibration_finding: Finding;
  review_and_update_finding: Finding;
  transfer_analysis: TransferAnalysis;
  /**
   * GOVERNANCE UPGRADE ITEM 1 — the generalised tracker walk across every
   * assessed domain. `art30_element_findings` is retained alongside it for
   * backward compatibility; the Art. 30 rows appear in both, carrying
   * `domain: "records_of_processing"` here.
   */
  domain_element_findings: DomainElementFinding[];
  /** GOVERNANCE UPGRADE ITEM 2 — every remediation record, in walk order. */
  remediation_plan: RemediationRecord[];
  maturity_tier_readability_aid?: MaturityTierAid;
}

