/**
 * ITEM 315 — builder for the cppa-cyber analytic deliverables.
 *
 * PURITY LAW: pure function of the record object. No I/O, no clock, no env.
 *
 * SINGLE-WRITER LAW: this module is the only writer of `component_coverage`,
 * `evidence_sufficiency`, `program_obligation_findings`,
 * `independence_determination`, `readiness_determination` and
 * `mean_score_readability_aid`.
 *
 * REUSE LAW: every `standard` string comes from ./components.ts, which is
 * generated from the approved §§ 7122 / 7123 rows in `provision_texts`.
 * Nothing here paraphrases the statute.
 *
 * DEMOTION LAW: the mean component score is not a conclusion. The report's
 * conclusion is `readiness_determination`; the mean survives only as a
 * labelled read-aid.
 */
import {
  CYBER_7122_CONDITIONS,
  CYBER_7123_COMPONENTS,
  CYBER_7124_CITATION,
  CYBER_PROGRAM_OBLIGATIONS,
} from "./components.ts";
import type {
  CyberComponentCoverage,
  CyberDeliverables,
  EvidenceSufficiency,
  Finding,
  IndependenceDetermination,
  IndependenceFinding,
  MeanScoreReadabilityAid,
  ReadinessConclusion,
  ReadinessDetermination,
  Verdict,
} from "./types.ts";

export const CYBER_DELIVERABLES_VERSION = "cppa-cyber-deliverables-item315-2026-07-31";

// ── record helpers ───────────────────────────────────────────────────
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : [];
}
function get(root: unknown, path: string): unknown {
  let node: unknown = root;
  for (const seg of path.split(".")) {
    if (node === null || node === undefined || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[seg];
  }
  return node;
}

// ── maturity rubric ──────────────────────────────────────────────────
// Maps the intake maturity enum onto a § 7123(c) coverage verdict. The
// statute asks whether the component is implemented, not how it scores.
const MATURITY_VERDICT: Record<string, Verdict> = {
  "Not implemented": "not_satisfied",
  "Ad hoc / informal": "not_satisfied",
  "Documented, partially implemented": "partially_satisfied",
  "Implemented across organization": "satisfied",
  "Implemented with continuous monitoring": "satisfied",
};

/**
 * Evidence types that are testable artefacts. § 7122(d) requires findings to
 * rest on "documents reviewed, sampling and testing performed, and interviews
 * conducted" — a policy document alone evidences intent, not operation.
 */
const TESTABLE_EVIDENCE = new Set<string>([
  "Screenshot / config export",
  "Sample log / report",
  "SOC 2 or auditor letter",
  "Third-party pen test / scan report",
  "Training completion record",
]);
const NO_EVIDENCE_SENTINEL = "None on file";

/** ITEM 315 intake extension — auditor-engagement status enum. */
export const CYBER_AUDITOR_ENGAGEMENT_OPTIONS = [
  "No auditor engaged yet",
  "Internal auditor identified, reporting line not yet settled",
  "Internal auditor engaged, reports to an executive without cybersecurity-program responsibility",
  "Internal auditor engaged, reports to the executive responsible for the cybersecurity program",
  "External auditor engaged",
  "External auditor engaged, independence confirmed in writing",
] as const;

const EXTERNAL_STATUSES = new Set<string>([
  "External auditor engaged",
  "External auditor engaged, independence confirmed in writing",
]);
const INTERNAL_STATUSES = new Set<string>([
  "Internal auditor identified, reporting line not yet settled",
  "Internal auditor engaged, reports to an executive without cybersecurity-program responsibility",
  "Internal auditor engaged, reports to the executive responsible for the cybersecurity program",
]);
const INDEPENDENT_REPORTING_LINE =
  "Internal auditor engaged, reports to an executive without cybersecurity-program responsibility";
const CONFLICTED_REPORTING_LINE =
  "Internal auditor engaged, reports to the executive responsible for the cybersecurity program";

// ── shared facts ─────────────────────────────────────────────────────
export interface CyberControlRecord {
  key: string;
  label: string;
  maturity: string;
  notes: string;
  evidence: string[];
}

export interface CyberFacts {
  entity: string;
  industry: string;
  framework: string;
  lastAudit: string;
  incidents: string;
  engagementStatus: string;
  priorAuditScope: string;
  controls: Record<string, CyberControlRecord>;
}

export function readCyberFacts(intake: unknown): CyberFacts {
  const raw = get(intake, "controls");
  const controls: Record<string, CyberControlRecord> = {};
  if (Array.isArray(raw)) {
    for (const c of raw) {
      const key = str(get(c, "key"));
      if (!key) continue;
      controls[key] = {
        key,
        label: str(get(c, "label")),
        maturity: str(get(c, "maturity")),
        notes: str(get(c, "notes")),
        evidence: arr(get(c, "evidence")),
      };
    }
  }
  return {
    entity: str(get(intake, "profile.entity_name")),
    industry: str(get(intake, "profile.industry")),
    framework: str(get(intake, "profile.framework")),
    lastAudit: str(get(intake, "profile.last_audit")),
    incidents: str(get(intake, "profile.incidents_12mo")),
    engagementStatus: str(get(intake, "profile.auditor_engagement_status")),
    priorAuditScope: str(get(intake, "profile.prior_audit_scope")),
    controls,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Op. A — § 7123(c) component coverage
// ─────────────────────────────────────────────────────────────────────
export function buildComponentCoverage(facts: CyberFacts): CyberComponentCoverage[] {
  return CYBER_7123_COMPONENTS.map((comp) => {
    const rec = facts.controls[comp.slug];
    const maturity = rec?.maturity ?? "";
    const notes = rec?.notes ?? "";
    const verdict = MATURITY_VERDICT[maturity];

    const base = {
      key: `component_${comp.slug}`,
      label: comp.label,
      citation: comp.citation,
      standard: comp.verbatim,
      component_number: comp.number,
      slug: comp.slug,
      maturity,
      in_scope: true,
    };

    if (!rec) {
      return {
        ...base,
        record_fact: `The record contains no entry for ${comp.label}.`,
        application:
          `${comp.citation} requires the audit to assess and document ${comp.label.charAt(0).toLowerCase()}${comp.label.slice(1)}. ` +
          `Nothing on this record addresses it, so no coverage conclusion can be reached.`,
        verdict: "record_insufficient" as Verdict,
        status: "record_insufficient" as const,
        information_needed: `State the implementation status of ${comp.label} and describe the controls in place.`,
        remediation: `Supply a record entry for ${comp.label}.`,
      };
    }

    if (!verdict) {
      return {
        ...base,
        record_fact: notes
          ? `The record describes ${comp.label} as follows: ${notes}`
          : `The record names ${comp.label} but states no implementation status and offers no description.`,
        application:
          `${comp.citation} requires the audit to assess ${comp.label}. The record does not state an implementation ` +
          `status for this component, so its coverage cannot be concluded either way.`,
        verdict: "record_insufficient" as Verdict,
        status: "record_insufficient" as const,
        information_needed: `State the implementation status of ${comp.label} using the maturity scale.`,
        remediation: `Record the implementation status of ${comp.label}.`,
      };
    }

    const factSentence = notes
      ? `The record states the implementation status of ${comp.label} is "${maturity}", described as: ${notes}`
      : `The record states the implementation status of ${comp.label} is "${maturity}", without further description.`;

    let application: string;
    let remediation: string;
    if (verdict === "satisfied") {
      application =
        `${comp.citation} requires this component to be assessed and documented. The record shows it implemented ` +
        `across the organisation, which is what the component asks for; ` +
        (notes
          ? `the description identifies the specific controls relied on.`
          : `no description is recorded, so an auditor would test the assertion rather than accept it.`);
      remediation = notes
        ? "No remediation identified for this component."
        : "Describe the controls relied on so the position can be tested rather than asserted.";
    } else if (verdict === "partially_satisfied") {
      application =
        `${comp.citation} requires this component to be assessed and documented. The record shows it documented but ` +
        `only partially implemented, so the component is addressed in policy and incompletely in operation.`;
      remediation = `Complete implementation of ${comp.label} across the systems in audit scope and record the completion date.`;
    } else {
      application =
        `${comp.citation} requires this component to be assessed and documented. The record shows a status of ` +
        `"${maturity}", which does not evidence an implemented component; the audit would report it as not implemented.`;
      remediation = `Implement ${comp.label} and document the controls before the audit is certified under ${CYBER_7124_CITATION}.`;
    }

    return {
      ...base,
      record_fact: factSentence,
      application,
      verdict,
      status: "analysed" as const,
      remediation,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────
// Op. B — § 7122(d) evidence sufficiency
// ─────────────────────────────────────────────────────────────────────
const EVIDENCE_STANDARD =
  CYBER_7122_CONDITIONS.find((c) => c.key === "no_primary_reliance_on_management")!;

export function buildEvidenceSufficiency(facts: CyberFacts): EvidenceSufficiency[] {
  return CYBER_7123_COMPONENTS.map((comp) => {
    const rec = facts.controls[comp.slug];
    const offered = (rec?.evidence ?? []).filter((e) => e !== NO_EVIDENCE_SENTINEL);
    const testable = offered.filter((e) => TESTABLE_EVIDENCE.has(e));
    const declaredNone = (rec?.evidence ?? []).includes(NO_EVIDENCE_SENTINEL);
    const notes = rec?.notes ?? "";

    const base = {
      key: `evidence_${comp.slug}`,
      label: `Evidence sufficiency — ${comp.label}`,
      citation: EVIDENCE_STANDARD.citation,
      standard: EVIDENCE_STANDARD.verbatim,
      component_number: comp.number,
      slug: comp.slug,
      evidence_offered: offered,
      testable_artifacts: testable,
    };

    if (!rec || (offered.length === 0 && !declaredNone)) {
      return {
        ...base,
        record_fact: `The record names no evidence for ${comp.label}.`,
        application:
          `${EVIDENCE_STANDARD.citation} bars a finding that rests primarily on management assertion. With no ` +
          `evidence identified, there is nothing for the auditor to review, sample, or test, so whether this ` +
          `component is assessable cannot be determined from the record.`,
        verdict: "record_insufficient" as Verdict,
        status: "record_insufficient" as const,
        assessable_on_record: null,
        sufficiency: "unknown" as const,
        information_needed: `Identify the documents, logs, or test reports that evidence ${comp.label}.`,
      };
    }

    if (declaredNone && offered.length === 0) {
      return {
        ...base,
        record_fact: `The record states that no evidence is on file for ${comp.label}.`,
        application:
          `${EVIDENCE_STANDARD.citation} requires findings to rest primarily on specific evidence. The record ` +
          `affirmatively states none exists${notes ? ", so the description on file is a management assertion" : ""}. ` +
          `An auditor could not reach a supportable finding on this component.`,
        verdict: "not_satisfied" as Verdict,
        status: "analysed" as const,
        assessable_on_record: false,
        sufficiency: "insufficient" as const,
      };
    }

    if (testable.length > 0) {
      return {
        ...base,
        record_fact:
          `The record offers ${offered.length} evidence item${offered.length === 1 ? "" : "s"} for ${comp.label}: ` +
          `${offered.join("; ")}.`,
        application:
          `${EVIDENCE_STANDARD.citation} requires reliance on documents reviewed, sampling and testing performed, ` +
          `and interviews conducted. The record offers ${testable.length} testable artefact` +
          `${testable.length === 1 ? "" : "s"} (${testable.join("; ")}), so the auditor can test the position ` +
          `rather than accept management's account of it.`,
        verdict: "satisfied" as Verdict,
        status: "analysed" as const,
        assessable_on_record: true,
        sufficiency: "sufficient" as const,
      };
    }

    return {
      ...base,
      record_fact:
        `The record offers only documentary evidence for ${comp.label}: ${offered.join("; ")}.`,
      application:
        `${EVIDENCE_STANDARD.citation} permits reliance on documents reviewed, but a policy or procedure evidences ` +
        `what the business intends rather than what it operates. Without a log, configuration export, test report, ` +
        `or third-party letter, a finding that the component operates would rest primarily on management's account.`,
      verdict: "partially_satisfied" as Verdict,
      status: "analysed" as const,
      assessable_on_record: true,
      sufficiency: "partial" as const,
      information_needed: `Add one operational artefact (log, configuration export, or test report) for ${comp.label}.`,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────
// § 7123(b)(1) and (b)(3) — program obligations (never components)
// ─────────────────────────────────────────────────────────────────────
export function buildProgramObligationFindings(facts: CyberFacts): Finding[] {
  const documented = Object.values(facts.controls).filter((c) => c.notes).length;
  const total = CYBER_7123_COMPONENTS.length;

  const establishment = CYBER_PROGRAM_OBLIGATIONS[0];
  const enforcement = CYBER_PROGRAM_OBLIGATIONS[1];

  const establishmentFinding: Finding = facts.framework
    ? {
      key: "program_establishment",
      label: establishment.label,
      citation: establishment.citation,
      standard: establishment.verbatim,
      record_fact:
        `The record identifies ${facts.framework} as the program framework and carries written descriptions for ` +
        `${documented} of ${total} components.`,
      application:
        `${establishment.citation} makes the establishment, implementation, and maintenance of the program — and the ` +
        `written documentation of it — an audited matter in its own right, separate from the components in ` +
        `subsection (c). The record evidences a named framework and ${documented === total ? "written descriptions across every component" : `written descriptions across ${documented} of ${total} components`}.`,
      verdict: documented === total ? "satisfied" : "partially_satisfied",
      status: "analysed",
      ...(documented === total ? {} : {
        information_needed:
          `Document the remaining ${total - documented} component${total - documented === 1 ? "" : "s"} in the written program.`,
      }),
    }
    : {
      key: "program_establishment",
      label: establishment.label,
      citation: establishment.citation,
      standard: establishment.verbatim,
      record_fact: "The record names no cybersecurity-program framework.",
      application:
        `${establishment.citation} requires the audit to assess the program and its written documentation. The record ` +
        `does not identify the program, so this obligation cannot be assessed.`,
      verdict: "record_insufficient",
      status: "record_insufficient",
      information_needed: "Identify the cybersecurity-program framework and its written documentation.",
    };

  const unimplemented = CYBER_7123_COMPONENTS.filter((c) => {
    const m = facts.controls[c.slug]?.maturity ?? "";
    return MATURITY_VERDICT[m] === "not_satisfied";
  });

  const enforcementFinding: Finding = {
    key: "program_enforcement",
    label: enforcement.label,
    citation: enforcement.citation,
    standard: enforcement.verbatim,
    record_fact: unimplemented.length === 0
      ? "The record shows no component recorded as unimplemented or ad hoc."
      : `The record shows ${unimplemented.length} component${unimplemented.length === 1 ? "" : "s"} not implemented or ad hoc: ` +
        `${unimplemented.map((c) => c.label).join("; ")}.`,
    application: unimplemented.length === 0
      ? `${enforcement.citation} asks how the business implements and enforces compliance with its program and the ` +
        `applicable subsection (c) components. Every component is recorded as implemented, which is consistent with ` +
        `enforced compliance; the audit would test enforcement rather than infer it.`
      : `${enforcement.citation} asks how the business implements and enforces compliance with its program and the ` +
        `applicable subsection (c) components. Components recorded as unimplemented or ad hoc are, on their face, ` +
        `components the program is not enforcing.`,
    verdict: unimplemented.length === 0 ? "satisfied" : "not_satisfied",
    status: "analysed",
  };

  return [establishmentFinding, enforcementFinding];
}

// ─────────────────────────────────────────────────────────────────────
// Op. D — § 7122 auditor qualification and independence
// ─────────────────────────────────────────────────────────────────────
export function buildIndependenceDetermination(facts: CyberFacts): IndependenceDetermination {
  const status = facts.engagementStatus;
  const auditorType: IndependenceDetermination["auditor_type"] = !status
    ? "unknown"
    : EXTERNAL_STATUSES.has(status)
    ? "external"
    : INTERNAL_STATUSES.has(status)
    ? "internal"
    : status === "No auditor engaged yet"
    ? "none"
    : "unknown";

  const findings: IndependenceFinding[] = CYBER_7122_CONDITIONS.map((cond) => {
    const applies = cond.applies_when === "always" || auditorType === "internal";
    const base = {
      key: `independence_${cond.key}`,
      label: cond.label,
      citation: cond.citation,
      standard: cond.verbatim,
      condition_key: cond.key,
      applies,
    };

    if (cond.applies_when === "internal_auditor_only" && auditorType !== "internal") {
      return {
        ...base,
        record_fact: auditorType === "unknown"
          ? "The record does not state whether the auditor is internal or external."
          : `The record states the engagement is: ${status}.`,
        application: auditorType === "unknown"
          ? `${cond.citation} applies only where the business uses an internal auditor. The record does not say which ` +
            `it is, so the condition cannot be assessed.`
          : `${cond.citation} applies only where the business uses an internal auditor. This engagement is ` +
            `${auditorType === "external" ? "external" : "not yet in place"}, so the reporting-line condition does not bite.`,
        verdict: (auditorType === "unknown" ? "record_insufficient" : "not_applicable") as Verdict,
        status: (auditorType === "unknown" ? "record_insufficient" : "analysed") as
          | "analysed"
          | "record_insufficient",
        ...(auditorType === "unknown"
          ? { information_needed: "State whether the cybersecurity auditor is internal or external." }
          : {}),
      };
    }

    if (!status) {
      return {
        ...base,
        record_fact: "The record does not state the auditor-engagement status.",
        application:
          `${cond.citation} governs who may perform the audit. Without the engagement status on the record, this ` +
          `condition cannot be assessed.`,
        verdict: "record_insufficient" as Verdict,
        status: "record_insufficient" as const,
        information_needed: "State the auditor-engagement status.",
      };
    }

    if (status === "No auditor engaged yet") {
      return {
        ...base,
        record_fact: "The record states no auditor has been engaged.",
        application:
          `${cond.citation} governs the auditor performing the audit. No auditor is engaged, so the condition is ` +
          `unmet on this record — not because the auditor fails it, but because there is no auditor.`,
        verdict: "not_satisfied" as Verdict,
        status: "analysed" as const,
      };
    }

    if (cond.key === "internal_auditor_reporting_line") {
      const independent = status === INDEPENDENT_REPORTING_LINE;
      const conflicted = status === CONFLICTED_REPORTING_LINE;
      return {
        ...base,
        record_fact: `The record states the engagement is: ${status}.`,
        application: independent
          ? `${cond.citation} requires the highest-ranking internal auditor to report directly to an executive who ` +
            `does not have direct responsibility for the cybersecurity program. The record states exactly that ` +
            `reporting line.`
          : conflicted
          ? `${cond.citation} requires the highest-ranking internal auditor to report directly to an executive who ` +
            `does not have direct responsibility for the cybersecurity program. The record states the auditor reports ` +
            `to the executive who owns the program, which is the arrangement the condition forbids.`
          : `${cond.citation} requires a settled reporting line to an executive without direct responsibility for the ` +
            `cybersecurity program. The record states the reporting line is not yet settled, so independence is not ` +
            `established.`,
        verdict: (independent ? "satisfied" : "not_satisfied") as Verdict,
        status: "analysed" as const,
      };
    }

    if (cond.key === "impartiality_and_non_participation") {
      const conflicted = status === CONFLICTED_REPORTING_LINE;
      return {
        ...base,
        record_fact: `The record states the engagement is: ${status}.`,
        application: conflicted
          ? `${cond.citation} requires the auditor to be free from influence by the business's managers. An internal ` +
            `auditor reporting to the executive responsible for the audited program is exposed to precisely that ` +
            `influence.`
          : `${cond.citation} requires objective and impartial judgment free from influence by the business. The ` +
            `record's engagement description is consistent with that requirement; the arrangement would be confirmed ` +
            `in the engagement letter rather than concluded from the intake alone.`,
        verdict: (conflicted ? "not_satisfied" : "satisfied") as Verdict,
        status: "analysed" as const,
      };
    }

    if (cond.key === "qualified_objective_independent" || cond.key === "auditor_qualification") {
      const confirmed = status === "External auditor engaged, independence confirmed in writing";
      return {
        ...base,
        record_fact: `The record states the engagement is: ${status}.`,
        application: confirmed
          ? `${cond.citation} requires a qualified, objective, independent professional. The record states an external ` +
            `auditor is engaged with independence confirmed in writing, which evidences the condition.`
          : `${cond.citation} requires a qualified, objective, independent professional with knowledge of cybersecurity ` +
            `and of how to audit a cybersecurity program. An auditor is engaged, but the record does not carry the ` +
            `qualification evidence, so the condition is documented rather than demonstrated.`,
        verdict: (confirmed ? "satisfied" : "partially_satisfied") as Verdict,
        status: "analysed" as const,
        ...(confirmed ? {} : {
          information_needed: "Record the auditor's cybersecurity-audit qualifications and independence confirmation.",
        }),
      };
    }

    // five_year_retention
    return {
      ...base,
      record_fact: facts.priorAuditScope
        ? `The record describes the prior audit scope as: ${facts.priorAuditScope}`
        : "The record does not describe any prior audit or its retained documents.",
      application: facts.priorAuditScope
        ? `${cond.citation} requires the business and the auditor to retain all documents relevant to each audit for ` +
          `five years. A prior audit is described on the record, so the retention duty is live and the retained set ` +
          `should be identified.`
        : `${cond.citation} requires five-year retention of documents relevant to each audit. The record describes no ` +
          `prior audit, so there is nothing on the record from which retention can be assessed.`,
      verdict: (facts.priorAuditScope ? "partially_satisfied" : "record_insufficient") as Verdict,
      status: (facts.priorAuditScope ? "analysed" : "record_insufficient") as
        | "analysed"
        | "record_insufficient",
      ...(facts.priorAuditScope
        ? { information_needed: "Confirm where the prior audit's documents are retained and for how long." }
        : { information_needed: "Describe the prior audit (or state that none has been performed)." }),
    };
  });

  const live = findings.filter((f) => f.verdict !== "not_applicable");
  const unsatisfied = live.filter((f) => f.verdict === "not_satisfied");
  const insufficient = live.filter((f) => f.status === "record_insufficient");

  let verdict: Verdict;
  if (unsatisfied.length > 0) verdict = "not_satisfied";
  else if (insufficient.length > 0) verdict = "record_insufficient";
  else if (live.some((f) => f.verdict === "partially_satisfied")) verdict = "partially_satisfied";
  else verdict = "satisfied";

  const summary = verdict === "satisfied"
    ? `The engagement described on the record meets the § 7122 qualification and independence conditions.`
    : verdict === "not_satisfied"
    ? `The engagement described on the record does not meet ${unsatisfied.length} § 7122 condition` +
      `${unsatisfied.length === 1 ? "" : "s"}: ${unsatisfied.map((f) => f.label).join("; ")}.`
    : verdict === "record_insufficient"
    ? `The record does not carry enough about the engagement to conclude on § 7122 independence.`
    : `The engagement is consistent with § 7122, but the record documents rather than demonstrates the auditor's ` +
      `qualifications and retention practice.`;

  return {
    findings,
    engagement_status: status,
    auditor_type: auditorType,
    verdict,
    status: verdict === "record_insufficient" ? "record_insufficient" : "analysed",
    unsatisfied_conditions: unsatisfied.map((f) => f.condition_key),
    summary,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Op. C — readiness determination (REPLACES the mean score)
// ─────────────────────────────────────────────────────────────────────
export function buildReadinessDetermination(
  coverage: CyberComponentCoverage[],
  evidence: EvidenceSufficiency[],
  independence: IndependenceDetermination,
  programObligations: Finding[],
): ReadinessDetermination {
  const evidenceBySlug = new Map(evidence.map((e) => [e.slug, e]));

  const blocking: ReadinessDetermination["blocking_components"] = [];
  const unassessable: ReadinessDetermination["unassessable_components"] = [];
  let partial = 0;

  for (const c of coverage) {
    const ev = evidenceBySlug.get(c.slug);
    if (c.verdict === "not_satisfied") {
      blocking.push({ slug: c.slug, label: c.label, reason: c.remediation });
      continue;
    }
    if (c.status === "record_insufficient") {
      unassessable.push({
        slug: c.slug,
        label: c.label,
        information_needed: c.information_needed ?? `Complete the record for ${c.label}.`,
      });
      continue;
    }
    if (ev?.sufficiency === "insufficient") {
      blocking.push({
        slug: c.slug,
        label: c.label,
        reason: `No evidence is on file, so a finding on ${c.label} would rest primarily on management assertion (11 CCR § 7122(d)).`,
      });
      continue;
    }
    if (ev?.sufficiency === "unknown") {
      unassessable.push({
        slug: c.slug,
        label: c.label,
        information_needed: ev.information_needed ?? `Identify the evidence for ${c.label}.`,
      });
      continue;
    }
    if (c.verdict === "partially_satisfied" || ev?.sufficiency === "partial") partial++;
  }

  const independenceBlocks = independence.verdict === "not_satisfied";
  const independenceUnknown = independence.status === "record_insufficient";
  const enforcementBlocks = programObligations.some(
    (f) => f.key === "program_enforcement" && f.verdict === "not_satisfied",
  );

  let conclusion: ReadinessConclusion;
  if (blocking.length > 0 || independenceBlocks || enforcementBlocks) conclusion = "not_ready";
  else if (unassessable.length > 0 || independenceUnknown) conclusion = "record_insufficient";
  else if (partial > 0) conclusion = "ready_subject_to_named_remediation";
  else conclusion = "ready";

  const total = coverage.length;
  const headline = conclusion === "ready"
    ? `On this record the business is ready for a § 7124 certified cybersecurity audit: all ${total} § 7123(c) components are implemented and each is supported by testable evidence.`
    : conclusion === "ready_subject_to_named_remediation"
    ? `On this record the business is ready for a § 7124 certified cybersecurity audit subject to ${partial} named remediation item${partial === 1 ? "" : "s"}; no component is unimplemented and no § 7122 condition is unmet.`
    : conclusion === "not_ready"
    ? `On this record the business is not ready for a § 7124 certified cybersecurity audit: ${blocking.length} § 7123(c) component${blocking.length === 1 ? "" : "s"} would be reported as not implemented or unevidenced${independenceBlocks ? ", and the § 7122 independence conditions are not met" : ""}.`
    : `On this record no readiness conclusion can be reached: ${unassessable.length} § 7123(c) component${unassessable.length === 1 ? "" : "s"} ${unassessable.length === 1 ? "is" : "are"} not assessable on the information supplied${independenceUnknown ? ", and the auditor engagement is not described" : ""}.`;

  const reasoning = conclusion === "ready"
    ? `Every enumerated component in § 7123(c) is recorded as implemented, and for each the record identifies at ` +
      `least one testable artefact, so no finding would rest primarily on management assertion under § 7122(d). ` +
      `${independence.summary} Nothing on this record prevents an auditor from completing and certifying the audit.`
    : conclusion === "ready_subject_to_named_remediation"
    ? `No component is recorded as unimplemented. ${partial} component${partial === 1 ? " is" : "s are"} either ` +
      `partially implemented or evidenced only by policy documentation; each carries a named remediation step in ` +
      `\`component_coverage\` and \`evidence_sufficiency\`. ${independence.summary}`
    : conclusion === "not_ready"
    ? `The audit cannot be certified while a component enumerated in § 7123(c) is unimplemented or unevidenced. ` +
      `The blocking components are: ${blocking.map((b) => b.label).join("; ")}.` +
      `${independenceBlocks ? ` Separately, ${independence.summary}` : ""}` +
      `${enforcementBlocks ? ` § 7123(b)(3) enforcement of the program is also unmet on this record.` : ""}`
    : `A readiness conclusion requires a position on every enumerated component. The following are not assessable ` +
      `on this record: ${unassessable.map((u) => u.label).join("; ")}. Supplying that information — not a change of ` +
      `posture — is what allows the conclusion to be reached.`;

  return {
    conclusion,
    headline,
    reasoning,
    citations: ["11 CCR § 7122", "11 CCR § 7123(b)", "11 CCR § 7123(c)", CYBER_7124_CITATION],
    blocking_components: blocking,
    unassessable_components: unassessable,
    status: conclusion === "record_insufficient" ? "record_insufficient" : "analysed",
  };
}

// ── mean demotion ────────────────────────────────────────────────────
export function buildMeanScoreAid(aggregates: unknown): MeanScoreReadabilityAid | undefined {
  if (!aggregates || typeof aggregates !== "object") return undefined;
  const a = aggregates as Record<string, unknown>;
  const value = typeof a.mean_score === "number" ? a.mean_score : null;
  const scored = typeof a.scored_count === "number" ? a.scored_count : 0;
  if (value === null && scored === 0) return undefined;
  return {
    label: "Secondary read-aid — mean component score (no statutory basis)",
    value,
    scored_count: scored,
    basis: "Arithmetic mean of the scored § 7123(c) components on this record.",
    caveat:
      "This figure is a reading convenience only. Neither § 7122 nor § 7123 recognises a score, and no audit " +
      "conclusion follows from it. The conclusion is `readiness_determination`.",
  };
}

// ─────────────────────────────────────────────────────────────────────
// Composition
// ─────────────────────────────────────────────────────────────────────
export function buildCyberDeliverables(
  intake: unknown,
  aggregates?: unknown,
): CyberDeliverables {
  const facts = readCyberFacts(intake);
  const component_coverage = buildComponentCoverage(facts);
  const evidence_sufficiency = buildEvidenceSufficiency(facts);
  const program_obligation_findings = buildProgramObligationFindings(facts);
  const independence_determination = buildIndependenceDetermination(facts);
  const readiness_determination = buildReadinessDetermination(
    component_coverage,
    evidence_sufficiency,
    independence_determination,
    program_obligation_findings,
  );
  const mean_score_readability_aid = buildMeanScoreAid(aggregates);
  return {
    component_coverage,
    evidence_sufficiency,
    program_obligation_findings,
    independence_determination,
    readiness_determination,
    ...(mean_score_readability_aid ? { mean_score_readability_aid } : {}),
  };
}

/**
 * SEPARATION GUARD — the readiness conclusion must not be restated as a score,
 * and the mean must not appear outside the labelled read-aid.
 */
export function assertSeparation(d: CyberDeliverables): void {
  const r = d.readiness_determination;
  const blob = `${r.headline} ${r.reasoning}`;
  if (/\bmean\b/i.test(blob)) {
    throw new Error("SEPARATION GUARD: readiness_determination restates the mean score");
  }
  if (r.conclusion === "ready" && (r.blocking_components.length || r.unassessable_components.length)) {
    throw new Error("SEPARATION GUARD: 'ready' conclusion carries blocking or unassessable components");
  }
}

export function attachCyberDeliverables(
  report: Record<string, unknown>,
  intake: unknown,
): Record<string, unknown> {
  try {
    const built = buildCyberDeliverables(intake, (report as Record<string, unknown>).aggregates);
    assertSeparation(built);

    report.component_coverage = built.component_coverage;
    report.evidence_sufficiency = built.evidence_sufficiency;
    report.program_obligation_findings = built.program_obligation_findings;
    report.independence_determination = built.independence_determination;
    report.readiness_determination = built.readiness_determination;

    // DEMOTION LAW — the mean can no longer be the conclusion.
    if (built.mean_score_readability_aid) {
      report.mean_score_readability_aid = built.mean_score_readability_aid;
    }

    return {
      version: CYBER_DELIVERABLES_VERSION,
      ok: true,
      conclusion: built.readiness_determination.conclusion,
      components_analysed: built.component_coverage.filter((c) => c.status === "analysed").length,
      blocking: built.readiness_determination.blocking_components.length,
      unassessable: built.readiness_determination.unassessable_components.length,
      independence_verdict: built.independence_determination.verdict,
      mean_demoted: Boolean(built.mean_score_readability_aid),
    };
  } catch (e) {
    return {
      version: CYBER_DELIVERABLES_VERSION,
      ok: false,
      error: (e as Error)?.message ?? "unknown",
    };
  }
}
