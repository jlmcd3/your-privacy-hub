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
import { maturityPhrase } from "./cyber-factors.ts";
// DOC 159 (2026-09-03) — the one resolver for the framework and prior-audit
// answers, shared with cyber-factors.ts, plus the not-applicable maturity.
import { NOT_APPLICABLE_MATURITY, countWord, frameworkFact, priorAuditFact } from "./record-facts.ts";
// DOC 137 (2026-09-01) — needed so the record_insufficient headline/
// reasoning can name § 7120 applicability as an open gate alongside the
// § 7122 auditor-engagement gate, matching the gating hierarchy already
// used in cyber-factors.ts (applicability -> first-audit timing -> auditor
// engagement -> evidence readiness).
import { resolveCyberApplicability } from "../cyber-applicability.ts";
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
  // DOC 159 — the Company's § 7123(b)(2) position; recorded, never decided.
  [NOT_APPLICABLE_MATURITY]: "not_applicable",
};

/**
 * DOC 159 — evidence types that ARE the program's written documentation for
 * 11 CCR § 7123(b)(1) ("the related written documentation thereof (e.g.,
 * policies and procedures)"). The optional notes box describes a control; it
 * is not documentation.
 */
const WRITTEN_DOCUMENTATION = new Set<string>([
  "Policy / procedure document",
  "Runbook / SOP",
]);

/**
 * Evidence types that are testable artifacts. § 7122(d) requires findings to
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
  /** DOC 159 — the Company's stated basis for a not-applicable position. */
  na_reason: string;
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
        na_reason: str(get(c, "na_reason")),
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

    // DOC 159 — the Company's § 7123(b)(2) position. 11 CCR § 7123(c)
    // assesses the components "if applicable" and § 7123(b)(2) limits the
    // audit to those "the auditor deems applicable to the business's
    // information system"; the report records the position and its stated
    // basis for that determination and never decides applicability itself.
    if (verdict === "not_applicable") {
      const reason = rec?.na_reason ?? "";
      return {
        ...base,
        in_scope: false,
        record_fact: reason
          ? `The Company reports that ${comp.label} is not applicable to its information system: ${reason}`
          : `The Company reports that ${comp.label} is not applicable to its information system, without stating the basis.`,
        application:
          `${comp.citation} is assessed if applicable, and 11 CCR § 7123(b)(2) limits the audit to the components the auditor ` +
          `deems applicable to the business's information system. The Company's position is recorded for that determination; ` +
          `this report does not decide applicability` +
          (reason ? "." : ", and the auditor will need the basis the Company has not yet stated."),
        verdict: "not_applicable" as Verdict,
        status: "analysed" as const,
        remediation: reason
          ? "Retain the stated basis for the not-applicable position so the auditor can confirm it (11 CCR § 7123(b)(2))."
          : "State and retain the basis for treating this component as not applicable; the auditor determines applicability (11 CCR § 7123(b)(2)).",
        ...(reason ? {} : { information_needed: `State why ${comp.label} does not apply to the Company's information system.` }),
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
      // PANEL CYB-6 (2026-08-30): the satisfied branch hardcoded
      // "implemented across the organisation" — asserting a second maturity
      // two sentences after components recorded as "Implemented with
      // continuous monitoring" stated their own, and in UK spelling inside
      // a California regulatory document. The sentence now reflects the
      // recorded maturity itself.
      const recordedMaturity = maturityPhrase(maturity);
      application =
        `${comp.citation} requires this component to be assessed and documented. The record shows it ` +
        `${recordedMaturity}, which is what the component asks for; ` +
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
    } else if (maturity === "Ad hoc / informal") {
      // DOC 159 — an informal control exists but is undocumented; the audit
      // reaches the written documentation (11 CCR § 7123(b)(1)), so the
      // finding names the documentation gap rather than calling the
      // component absent.
      application =
        `${comp.citation} requires this component to be assessed and documented, and 11 CCR § 7123(b)(1) reaches the ` +
        `written documentation of the program. The record shows a status of "${maturity}": the component operates ` +
        `informally, without the written policies and procedures the audit assesses, so the audit would report it as ` +
        `not implemented as a documented component.`;
      remediation = `Document ${comp.label} in written policies and procedures and implement them across the systems in audit scope before the audit is certified under ${CYBER_7124_CITATION}.`;
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

    // DOC 159 — no evidence is assessed on a component the Company reports
    // as not applicable (§ 7123(b)(2)); the row says so rather than reading
    // the empty checklist as an unevidenced component.
    if (MATURITY_VERDICT[rec?.maturity ?? ""] === "not_applicable") {
      return {
        ...base,
        record_fact: `The Company reports ${comp.label} as not applicable to its information system; no evidence is required for it.`,
        application:
          `${EVIDENCE_STANDARD.citation} governs findings on the components the auditor deems applicable. No finding is ` +
          `made on a component the Company reports as not applicable, subject to the auditor's determination under 11 CCR § 7123(b)(2).`,
        verdict: "not_applicable" as Verdict,
        status: "analysed" as const,
        assessable_on_record: null,
        sufficiency: "not_applicable" as const,
      };
    }

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
          `and interviews conducted. The record offers ${testable.length} testable artifact` +
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
      information_needed: `Add one operational artifact (log, configuration export, or test report) for ${comp.label}.`,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────
// § 7123(b)(1) and (b)(3) — program obligations (never components)
// ─────────────────────────────────────────────────────────────────────
export function buildProgramObligationFindings(facts: CyberFacts): Finding[] {
  // DOC 159 — § 7123(b)(1) reaches "the related written documentation
  // thereof (e.g., policies and procedures)". The evidence checklist is where
  // the record says a written policy, procedure, runbook or SOP exists; the
  // optional notes box describes a control and is not documentation.
  // Components the Company reports as not applicable are outside the count,
  // and "None / informal" / "Other" are read as what they say rather than
  // spliced as framework names.
  const applicable = CYBER_7123_COMPONENTS.filter((c) =>
    MATURITY_VERDICT[facts.controls[c.slug]?.maturity ?? ""] !== "not_applicable"
  );
  const documented = applicable.filter((c) =>
    (facts.controls[c.slug]?.evidence ?? []).some((e) => WRITTEN_DOCUMENTATION.has(e))
  ).length;
  const anyEvidenceIdentified = applicable.some((c) =>
    (facts.controls[c.slug]?.evidence ?? []).some((e) => e !== NO_EVIDENCE_SENTINEL)
  );
  const total = applicable.length;
  const fw = frameworkFact(facts.framework);

  const establishment = CYBER_PROGRAM_OBLIGATIONS[0];
  const enforcement = CYBER_PROGRAM_OBLIGATIONS[1];

  const remaining = total - documented;
  const documentationClause = documented === total
    ? "written documentation (a policy, procedure, runbook or SOP) across every applicable component"
    : `written documentation (a policy, procedure, runbook or SOP) for ${countWord(documented)} of ${countWord(total)} applicable components`;
  const frameworkClause = fw.kind === "named"
    ? `The record identifies ${fw.answer} as the program framework`
    : fw.kind === "informal"
    ? "The Company reports that its program is run informally against no published framework"
    : "The record identifies a framework outside the listed set";
  const establishmentVerdict: Verdict = documented === total
    ? "satisfied"
    : documented > 0
    ? "partially_satisfied"
    : anyEvidenceIdentified
    ? "not_satisfied"
    : "record_insufficient";

  const establishmentFinding: Finding = fw.kind !== "blank"
    ? {
      key: "program_establishment",
      label: establishment.label,
      citation: establishment.citation,
      standard: establishment.verbatim,
      record_fact: `${frameworkClause} and carries ${documentationClause}.`,
      application:
        `${establishment.citation} makes the establishment, implementation, and maintenance of the program — and the ` +
        `written documentation of it — an audited matter in its own right, separate from the components in ` +
        `subsection (c). ` +
        (establishmentVerdict === "record_insufficient"
          ? "The record identifies no evidence category for any applicable component, so whether the program is documented in writing cannot be read from it."
          : `The record evidences ${fw.kind === "named" ? "a named framework" : fw.kind === "informal" ? "an informally organized program" : "a framework outside the listed set"} and ${documentationClause}.`),
      verdict: establishmentVerdict,
      status: establishmentVerdict === "record_insufficient" ? "record_insufficient" : "analysed",
      ...(documented === total ? {} : {
        information_needed:
          `Identify the written documentation (a policy, procedure, runbook or SOP) for the remaining ${countWord(remaining)} applicable component${remaining === 1 ? "" : "s"}.`,
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
            `in the engagement letter rather than concluded from the submitted record alone.`,
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

    if (cond.key === "no_primary_reliance_on_management") {
      // DOC 159 — § 7122(d) is the evidence standard for the auditor's
      // findings, applied per component in Op. B. Before doc 159 it fell
      // through to the retention branch below and printed prior-audit prose
      // under the § 7122(d) label on every record. It is reported here on the
      // evidence posture and never rolled into the § 7122 engagement verdict:
      // the readiness determination already reads the per-component rows.
      const applicableD = CYBER_7123_COMPONENTS.filter((c) =>
        MATURITY_VERDICT[facts.controls[c.slug]?.maturity ?? ""] !== "not_applicable"
      );
      const testableD = applicableD.filter((c) =>
        (facts.controls[c.slug]?.evidence ?? []).some((e) => TESTABLE_EVIDENCE.has(e))
      ).length;
      const declaredNoneD = applicableD.filter((c) => {
        const ev = facts.controls[c.slug]?.evidence ?? [];
        return ev.includes(NO_EVIDENCE_SENTINEL) && !ev.some((e) => e !== NO_EVIDENCE_SENTINEL);
      }).length;
      const verdictD: Verdict = testableD === applicableD.length
        ? "satisfied"
        : declaredNoneD > 0
        ? "not_satisfied"
        : "partially_satisfied";
      return {
        ...base,
        record_fact:
          `The record identifies testable evidence (a log, a configuration export, a report, a test result, an auditor letter, ` +
          `or a training record) for ${countWord(testableD)} of ${countWord(applicableD.length)} applicable components` +
          `${declaredNoneD ? `, and states that none is on file for ${countWord(declaredNoneD)}` : ""}.`,
        application:
          `${cond.citation} bars a finding that rests primarily on management assertion. ` +
          (verdictD === "satisfied"
            ? "On the identified evidence an auditor could test every applicable component rather than accept management's account of it."
            : verdictD === "not_satisfied"
            ? "Where the record states that no evidence is on file, no supportable finding could be reached on that component; the per-component rows in Section 2 and Appendix B carry the detail."
            : "Where a component is evidenced by policy documentation alone, a finding on it would rest on management's account until an operating artifact is retained; the per-component rows in Section 2 and Appendix B carry the detail."),
        verdict: verdictD,
        status: "analysed" as const,
      };
    }

    // five_year_retention — DOC 159: § 7122(g) attaches to "each
    // cybersecurity audit" once completed. It is a duty on the business AND
    // the auditor, not a qualification or independence condition, so it is
    // reported as its own row and never drives the § 7122 verdict below. A
    // Company with no prior audit ("Never" or blank, no prior scope) has
    // nothing yet to retain: the row reads not applicable, never
    // record-insufficient, so a first-time auditee with a fully described
    // engagement is not told its engagement is undescribed.
    const prior = priorAuditFact(facts.lastAudit, facts.priorAuditScope);
    if (!prior.recorded) {
      return {
        ...base,
        applies: false,
        record_fact: prior.never
          ? "The Company reports that it has not had an independent cybersecurity audit."
          : "The Company records no prior cybersecurity audit.",
        application:
          `${cond.citation} requires the business and the auditor to retain all documents relevant to each cybersecurity ` +
          `audit for five years after its completion. With no prior audit there is nothing yet to retain; the duty ` +
          `attaches to this audit's documents on completion.`,
        verdict: "not_applicable" as Verdict,
        status: "analysed" as const,
      };
    }
    return {
      ...base,
      record_fact: prior.scope
        ? `The record describes the prior audit scope as: ${prior.scope}`
        : "The record does not describe the prior audit or its retained documents.",
      application: prior.scope
        ? `${cond.citation} requires the business and the auditor to retain all documents relevant to each audit for ` +
          `five years. A prior audit is described on the record, so the retention duty is live and the retained set ` +
          `should be identified.`
        : `${cond.citation} requires five-year retention of documents relevant to each audit. A prior audit is recorded ` +
          `but its coverage is not described, so the retained set cannot be identified from the record.`,
      verdict: (prior.scope ? "partially_satisfied" : "record_insufficient") as Verdict,
      status: (prior.scope ? "analysed" : "record_insufficient") as
        | "analysed"
        | "record_insufficient",
      ...(prior.scope
        ? { information_needed: "Confirm where the prior audit's documents are retained and for how long." }
        : { information_needed: "Describe what the prior audit covered and where its documents are retained." }),
    };
  });

  // DOC 159 — the § 7122 verdict rolls up the qualification and independence
  // conditions only ((a), (a)(1), (a)(2), (a)(3)); the § 7122(d) evidence row
  // and the § 7122(g) retention row are reported, never rolled up.
  const NOT_ROLLED_UP = new Set(["five_year_retention", "no_primary_reliance_on_management"]);
  const live = findings.filter((f) => f.verdict !== "not_applicable" && !NOT_ROLLED_UP.has(f.condition_key));
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
    ? `The record does not describe the engagement in enough detail to conclude on § 7122 independence.`
    : `The engagement is consistent with § 7122, but the record documents rather than demonstrates the auditor's ` +
      `qualifications.`;

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
  // DOC 137 (2026-09-01) — optional and defaulted false so every existing
  // positional call site (all of which predate § 7120 applicability being
  // wired into this function) is byte-identical unless it opts in. Does NOT
  // change `conclusion` — that stays governed by the existing
  // blocking/unassessable/independence/partial logic; it only lets the
  // record_insufficient headline and reasoning ALSO name the applicability
  // gate when it is the (or an additional) open question, alongside the
  // auditor-engagement gate they already name.
  applicabilityUnresolved = false,
): ReadinessDetermination {
  const evidenceBySlug = new Map(evidence.map((e) => [e.slug, e]));

  const blocking: ReadinessDetermination["blocking_components"] = [];
  const unassessable: ReadinessDetermination["unassessable_components"] = [];
  // DOC 159 — the Company's § 7123(b)(2) positions sit outside every count,
  // and the items a "subject to named remediation" conclusion names are
  // collected as they are found.
  const notApplicable: NonNullable<ReadinessDetermination["not_applicable_components"]> = [];
  const remediationItems: string[] = [];
  let partial = 0;

  for (const c of coverage) {
    const ev = evidenceBySlug.get(c.slug);
    if (c.verdict === "not_applicable") {
      notApplicable.push({ slug: c.slug, label: c.label });
      continue;
    }
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
    if (c.verdict === "partially_satisfied" || ev?.sufficiency === "partial") {
      partial++;
      remediationItems.push(
        c.verdict === "partially_satisfied"
          ? `${c.label} (documented, partially implemented)`
          : `${c.label} (implemented, evidenced by policy documentation only)`,
      );
    }
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

  // DOC 159 — § 7122 conditions documented rather than demonstrated are
  // named alongside the component items when the conclusion is "subject to
  // named remediation"; the retention row is never one of them.
  if (conclusion === "ready_subject_to_named_remediation") {
    for (const f of independence.findings) {
      if (f.verdict === "partially_satisfied" && f.condition_key !== "five_year_retention" && f.condition_key !== "no_primary_reliance_on_management") {
        remediationItems.push(`${f.label} (a § 7122 condition documented rather than demonstrated)`);
      }
    }
  }
  const total = coverage.length - notApplicable.length;
  const naNote = notApplicable.length
    ? ` The Company reports ${countWord(notApplicable.length)} component${notApplicable.length === 1 ? "" : "s"} as not applicable to its information system, subject to the auditor's determination under 11 CCR § 7123(b)(2).`
    : "";
  const applicableWord = notApplicable.length ? "applicable " : "";
  const headline = conclusion === "ready"
    ? `On the information provided the business is ready for a § 7124 certified cybersecurity audit: all ${countWord(total)} ${applicableWord}§ 7123(c) components are implemented and each is supported by testable evidence.${naNote}`
    : conclusion === "ready_subject_to_named_remediation"
    ? `On the information provided the business is ready for a § 7124 certified cybersecurity audit subject to ${countWord(remediationItems.length)} named remediation item${remediationItems.length === 1 ? "" : "s"}: ${remediationItems.join("; ")}. No component is unimplemented and no § 7122 condition is unmet.${naNote}`
    : conclusion === "not_ready"
    ? `On the information provided the business is not ready for a § 7124 certified cybersecurity audit: ${countWord(blocking.length)} § 7123(c) component${blocking.length === 1 ? "" : "s"} would be reported as not implemented or unevidenced${independenceBlocks ? ", and the § 7122 independence conditions are not met" : ""}.${naNote}`
    : (() => {
        // 2026-08-25 — REAL BUG FOUND while investigating C1.1b (prose-gold's
        // CY-5 dangling-clause sub-pass was silently masking it downstream):
        // "record_insufficient" is reached via EITHER unassessable.length > 0
        // OR independenceUnknown alone (line ~645). The prior template always
        // stated "${unassessable.length} components... not assessable", which
        // rendered the nonsensical "0 § 7123(c) components are not
        // assessable..." whenever independenceUnknown was the SOLE trigger
        // (every component assessable, but the auditor engagement status was
        // never described). Fixed by stating each applicable clause only when
        // it applies; byte-identical to the prior wording when BOTH apply.
        // DOC 137 (2026-09-01, ChatGPT-agreed wording polish) — § 7120
        // applicability is Gate 1 of the ratified sequencing hierarchy
        // (applicability -> first-audit timing -> auditor engagement ->
        // evidence readiness); when it is unresolved this headline must
        // name it, not just the auditor-engagement gate, so the Executive
        // Summary does not read as if only one gate were open.
        const bits: string[] = [];
        if (applicabilityUnresolved) bits.push("audit applicability under § 7120 remains unresolved");
        if (unassessable.length > 0) {
          bits.push(`${unassessable.length} § 7123(c) component${unassessable.length === 1 ? "" : "s"} ${unassessable.length === 1 ? "is" : "are"} not assessable on the information supplied`);
        }
        if (independenceUnknown) bits.push("the auditor engagement is not described");
        return `No readiness conclusion can be reached on the current record: ${bits.join(", and ")}.`;
      })();

  const reasoning = conclusion === "ready"
    ? `Every ${applicableWord}component in § 7123(c) is recorded as implemented, and for each the record identifies at ` +
      `least one testable artifact, so no finding would rest primarily on management assertion under § 7122(d). ` +
      `${independence.summary} Nothing on the information provided prevents an auditor from completing and certifying the audit.${naNote}`
    : conclusion === "ready_subject_to_named_remediation"
    ? `No component is recorded as unimplemented. ${countWord(partial)} component${partial === 1 ? " is" : "s are"} either ` +
      `partially implemented or evidenced only by policy documentation; each carries a named remediation step in its ` +
      `component module (Section 3) and in Appendix B. The named items are: ${remediationItems.join("; ")}. ${independence.summary}${naNote}`
    : conclusion === "not_ready"
    ? `The audit cannot be certified while a component enumerated in § 7123(c) is unimplemented or unevidenced. ` +
      `The blocking components are: ${blocking.map((b) => b.label).join("; ")}.` +
      `${independenceBlocks ? ` Separately, ${independence.summary}` : ""}` +
      // FD703575-CY2 — the (b)(3) sentence must carry its basis in the same
      // sentence (this function's own § 7123(b)(1)/(b)(3) usage discipline);
      // the bare "is also unmet" form was flagged as an unsupported claim.
      `${enforcementBlocks ? ` § 7123(b)(3) implementation-and-enforcement evidence is also unmet on this record: components recorded as unimplemented are, on their face, components the program is not enforcing.` : ""}`
    : (() => {
        // Same fix as the headline above, same root cause: never emit "The
        // following are not assessable on this record: ." with nothing
        // after the colon when unassessable is empty and independenceUnknown
        // is the sole trigger.
        // DOC 137 (2026-09-01) — same applicability-gate naming as the
        // headline above.
        const bits: string[] = [
          applicabilityUnresolved
            ? "A readiness conclusion requires a position on § 7120 audit applicability, on every enumerated component, and on the § 7122 auditor engagement."
            : "A readiness conclusion requires a position on every enumerated component and on the § 7122 auditor engagement.",
        ];
        if (applicabilityUnresolved) {
          bits.push("Audit applicability under § 7120 is not yet resolved: the record does not state the revenue and sale/share facts the trigger table depends on.");
        }
        if (unassessable.length > 0) {
          bits.push(`The following are not assessable on this record: ${unassessable.map((u) => u.label).join("; ")}.`);
        }
        if (independenceUnknown) {
          bits.push("The auditor engagement is not described, so no § 7122 independence conclusion can be reached either.");
        }
        bits.push("Supplying that information — not a change of posture — is what allows the conclusion to be reached.");
        return bits.join(" ");
      })();

  return {
    conclusion,
    headline,
    reasoning,
    citations: ["11 CCR § 7122", "11 CCR § 7123(b)", "11 CCR § 7123(c)", CYBER_7124_CITATION],
    blocking_components: blocking,
    unassessable_components: unassessable,
    not_applicable_components: notApplicable,
    remediation_items: remediationItems,
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
  // DOC 137 (2026-09-01) — threaded through so the record_insufficient
  // headline/reasoning can name § 7120 applicability alongside auditor
  // engagement; see buildReadinessDetermination's own comment.
  const applicabilityUnresolved = resolveCyberApplicability(
    ((intake as Record<string, unknown> | null | undefined)?.profile ?? {}) as Record<string, unknown>,
  ).auditRequired.value === null;
  const readiness_determination = buildReadinessDetermination(
    component_coverage,
    evidence_sufficiency,
    independence_determination,
    program_obligation_findings,
    applicabilityUnresolved,
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
