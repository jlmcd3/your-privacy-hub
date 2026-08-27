// CPPA CYBER — THE FACTOR LAYER (C2, the Spine v1.1 encode, 2026-08-26).
//
// Implements the v1.1 spine's §4 "Proposed Factor Outputs" as PURE,
// deterministic composers over the existing intake and the already-typed
// DERIVED surfaces (buildCyberDeliverables' output + the ratified
// recommendation library). Zero model calls, zero I/O, never throws
// (callers wrap fail-open, matching every deterministic pass in this
// product). The v1.1 §5 factor-record shape is carried on every component
// analysis; section-level factors compose to strings the assembler splices.
//
// THE v1.1 CORE CONSTRAINT, verbatim from the spine's own header: "No
// client-facing proposition may depend on a factual field that the current
// Cyber intake does not collect. A FACTOR output may analyze, organize,
// weigh, or characterize existing intake facts; it may not invent a
// missing fact. Where the present intake cannot support a legal
// conclusion, the report states the limitation rather than filling it with
// an assumed field."
//
// §6 GENERATOR GUARDRAILS bound into these composers (each verified by the
// c2 battery): blank maturity/notes/evidence never becomes a substantive
// failure (record-insufficient handling); no per-company legal-
// applicability claim for the 18 components; no § 7120/§ 7121 inference;
// no claim that evidence was examined/tested/found sufficient by the
// auditor ("identified" / "represented as available" only); no breach-fact
// inference from the incident count; EUP actions never presented as the
// Company's § 7123(e)(4) remediation plan; the mean score never appears as
// a readiness conclusion; no invented statutory deadline.
//
// ADVANCE-RATIFICATION LEDGER: every sentence template in this module is
// an implementation-authored customer byte shipped under the CEO's
// 2026-08-26 batch ruling + build directive ("Go ahead and build the
// queued items now"), the RK3-C advance-ratification pattern. The
// extraction for CEO redline is the constants and template literals in
// THIS FILE — they are deliberately written as visible string literals,
// never assembled from fragments, so the redline surface is complete.

import type {
  CyberComponentCoverage,
  CyberDeliverables,
  EvidenceSufficiency,
} from "./types.ts";
import type { ComponentRecommendation, CyberNextStep } from "./cyber-recommendations.ts";
import { recommendationFact } from "./cyber-recommendations.ts";
import { CYBER_7123_COMPONENTS } from "./components.ts";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => s(x)).filter(Boolean) : s(v) ? [s(v)] : [];

function get(o: unknown, path: string): unknown {
  let cur: unknown = o;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Bag)[part];
  }
  return cur;
}

function asProse(items: readonly string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

const noStop = (t: string): string => t.replace(/\s*\.\s*$/, "");
const stop = (t: string): string => (t ? (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`) : "");

/** The v1.1 §5 factor record — one reusable shape for component analyses. */
export interface CyberFactorRecord {
  readonly conclusion: string;
  readonly supporting_reasons: readonly string[];
  readonly contrary_consideration: string;
  readonly record_sufficiency: "Complete" | "Qualified" | "MateriallyIncomplete";
  readonly evidence_support: "Strong" | "Moderate" | "Limited" | "NoneIdentified";
  readonly materiality: "Material" | "Secondary" | "Immaterial";
  readonly consequence_type: "None" | "AuditorVerification" | "ReadinessRemediation" | "RecordFollowUp";
  readonly recommended_action: string;
  readonly authority: string;
  readonly factual_basis: readonly string[];
}

export interface CyberComponentAnalysis extends CyberFactorRecord {
  readonly slug: string;
  readonly label: string;
  readonly component_number: number;
  readonly narrative: string;
}

// ── Shared readers ──────────────────────────────────────────────────────────

interface FactorInputs {
  readonly intake: Bag;
  readonly deliverables: CyberDeliverables;
  readonly recommendations: readonly ComponentRecommendation[];
  readonly nextSteps: readonly CyberNextStep[];
  readonly corpusCommentaryBySlug: ReadonlyMap<string, readonly string[]>;
}

function profileStr(intake: Bag, field: string): string {
  return s(get(intake, `profile.${field}`));
}

function controlRec(intake: Bag, slug: string): { maturity: string; notes: string; evidence: string[] } {
  const raw = get(intake, "controls");
  if (Array.isArray(raw)) {
    for (const c of raw) {
      if (s(get(c, "key")) === slug) {
        return { maturity: s(get(c, "maturity")), notes: s(get(c, "notes")), evidence: arr(get(c, "evidence")) };
      }
    }
  }
  return { maturity: "", notes: "", evidence: [] };
}

function coverageBySlug(d: CyberDeliverables): ReadonlyMap<string, CyberComponentCoverage> {
  return new Map(d.component_coverage.map((c) => [c.slug, c]));
}

function evidenceBySlug(d: CyberDeliverables): ReadonlyMap<string, EvidenceSufficiency> {
  return new Map(d.evidence_sufficiency.map((e) => [e.slug, e]));
}

// ── Company context (v1.1: company_context_analysis) ───────────────────────

export function buildCompanyContextAnalysis(intake: Bag): string {
  const entity = profileStr(intake, "entity_name") || "The Company";
  const industry = profileStr(intake, "industry");
  const framework = profileStr(intake, "framework");
  const lastAudit = profileStr(intake, "last_audit");
  const incidents = profileStr(intake, "incidents_12mo");
  const sentences: string[] = [];
  if (industry) sentences.push(`${entity} operates in ${noStop(industry)}.`);
  sentences.push(
    framework
      ? `The Company has indicated that its cybersecurity program is organized around ${noStop(framework)}.`
      : "The Company has not named a primary cybersecurity framework in the intake; the component record below is therefore read on its own terms rather than against a named framework.",
  );
  if (lastAudit) sentences.push(`Its most recent cybersecurity audit is recorded as ${noStop(lastAudit)}.`);
  if (incidents) {
    sentences.push(`The Company reports ${noStop(incidents)} security incidents in the preceding twelve months; what those incidents involved is addressed only to the extent the incident-response record states it.`);
  }
  return sentences.join(" ");
}

// ── Scope record (v1.1: scope_record_analysis / scope_record_sufficiency) ──

export function buildScopeRecordAnalysis(intake: Bag): { analysis: string; sufficiency: string } {
  const inScope = arr(get(intake, "profile.in_scope_frameworks"));
  const rationale = profileStr(intake, "audit_scope_rationale");
  const analysisParts: string[] = [];
  if (inScope.length) {
    analysisParts.push(`The Company has identified ${asProse(inScope)} as the frameworks in scope for the engagement.`);
  } else {
    analysisParts.push("The Company has not identified frameworks in scope for the engagement.");
  }
  if (rationale) {
    analysisParts.push(`Its recorded scope rationale: "${noStop(rationale)}."`);
  }
  analysisParts.push("These facts describe how the Company is organizing the engagement; the independent auditor's final audit scope is not established by them.");
  const sufficiency = inScope.length && rationale
    ? "The scope record is coherent on the information provided: frameworks are named and a rationale is recorded."
    : inScope.length || rationale
    ? "The scope record is partially stated on the information provided; completing it would let the auditor plan against the Company's own framing rather than reconstructing it."
    : "The scope record is not yet stated; identifying the frameworks in scope and the rationale for the intended coverage is a record-completion item, not a cybersecurity finding.";
  return { analysis: analysisParts.join(" "), sufficiency };
}

// ── Prior audit reliance (v1.1: prior_audit_reliance_analysis) ─────────────

export function buildPriorAuditRelianceAnalysis(intake: Bag): string {
  const lastAudit = profileStr(intake, "last_audit");
  const priorScope = profileStr(intake, "prior_audit_scope");
  if (!lastAudit && !priorScope) {
    return "No prior audit work is recorded, so no reliance on prior coverage is available; the eventual audit record builds from the evidence identified in this assessment.";
  }
  const sentences: string[] = [];
  if (lastAudit) sentences.push(`The Company records its most recent audit as ${noStop(lastAudit)}.`);
  if (priorScope) {
    sentences.push(`The prior work's coverage, as the Company describes it: "${noStop(priorScope)}."`);
    sentences.push("Where that coverage actually reaches the California audit subject matter, it may reduce duplication; a named framework or certification is not assumed to satisfy Article 9 by itself.");
  } else {
    sentences.push("The coverage of that prior work is not described, so no reliance can be assessed; recording what the prior audit covered is a record-completion item.");
  }
  return sentences.join(" ");
}

// ── Record sufficiency (v1.1: record_sufficiency_* + DERIVED counts) ───────

export interface RecordSufficiencyResult {
  readonly unassessed_count: number;
  readonly without_notes: number;
  readonly without_evidence: number;
  readonly conclusion: string;
  readonly follow_up: string;
}

export function buildRecordSufficiency(intake: Bag, d: CyberDeliverables): RecordSufficiencyResult {
  const unassessed = d.component_coverage.filter((c) => c.status === "record_insufficient").length;
  let withoutNotes = 0;
  let withoutEvidence = 0;
  for (const comp of CYBER_7123_COMPONENTS) {
    const rec = controlRec(intake, comp.slug);
    if (!rec.notes) withoutNotes++;
    if (rec.evidence.length === 0 || rec.evidence.every((e) => /^none on file$/i.test(e))) withoutEvidence++;
  }
  const conclusion = unassessed === 0 && withoutEvidence === 0
    ? "The record is populated across all eighteen components: each carries a stated implementation status and identified evidence, which is the state a readiness conclusion can rest on."
    : unassessed === 0
    ? `The record states an implementation status for all eighteen components; ${withoutEvidence === 1 ? "one component identifies" : `${withoutEvidence} components identify`} no evidence, which limits what an auditor could later test on ${withoutEvidence === 1 ? "that component" : "those components"}.`
    : `${unassessed === 1 ? "One component is" : `${unassessed} components are`} unassessed or incomplete on the information provided, and the readiness conclusion is qualified to that extent rather than converted into a negative finding.`;
  const followUps: string[] = [];
  if (unassessed > 0) followUps.push(`record an implementation status for the ${unassessed === 1 ? "unassessed component" : `${unassessed} unassessed components`}`);
  if (withoutNotes > 0) followUps.push(`add a narrative description for the ${withoutNotes === 1 ? "component" : `${withoutNotes} components`} that carry none`);
  if (withoutEvidence > 0) followUps.push(`identify the evidence categories available for the ${withoutEvidence === 1 ? "component" : `${withoutEvidence} components`} with none identified`);
  const follow_up = followUps.length
    ? `To improve the record: ${asProse(followUps)}.`
    : "No record-completion follow-up is identified.";
  return { unassessed_count: unassessed, without_notes: withoutNotes, without_evidence: withoutEvidence, conclusion, follow_up };
}

// ── Independence consequence (v1.1: independence_readiness_consequence) ────

export function buildIndependenceReadinessConsequence(d: CyberDeliverables): string {
  const ind = d.independence_determination;
  switch (ind.auditor_type) {
    case "external":
      return "An external engagement posture is recorded; the auditor's qualifications, procedures, and independence in fact remain matters the engagement itself must establish, and this report does not certify them.";
    case "internal":
      return "An internal audit function can perform the audit only if it reports as § 7122 requires and is insulated from influence over its findings; the recorded posture leaves that structural showing to be established in the engagement documentation.";
    case "none":
      return "No auditor engagement is recorded, so engaging a qualified, objective, independent professional is the gating readiness step ahead of every component-level item below.";
    default:
      return "The auditor-engagement status is not resolved on the information provided; resolving it is a record-completion item that precedes any independence assessment.";
  }
}

// ── Evidence readiness (v1.1: evidence_readiness_analysis / follow-up) ─────

export function buildEvidenceReadinessAnalysis(d: CyberDeliverables): { analysis: string; follow_up: string } {
  const rows = d.evidence_sufficiency;
  const sufficient = rows.filter((r) => r.sufficiency === "sufficient").length;
  const partial = rows.filter((r) => r.sufficiency === "partial").length;
  const insufficient = rows.filter((r) => r.sufficiency === "insufficient").length;
  const unknown = rows.filter((r) => r.sufficiency === "unknown").length;
  const sentences: string[] = [];
  sentences.push(
    `Across the eighteen components, the Company identifies evidence an auditor could later test for ${sufficient === 1 ? "one component" : `${sufficient} components`}${partial ? `, partially for ${partial === 1 ? "one more" : `${partial} more`}` : ""}.`,
  );
  if (insufficient + unknown > 0) {
    sentences.push(
      `For ${insufficient + unknown === 1 ? "one component" : `${insufficient + unknown} components`}, the identified material would leave a finding resting primarily on management assertion, which § 7122(d) does not permit as the primary basis.`,
    );
  }
  const analysis = sentences.join(" ");
  const follow_up = insufficient + unknown > 0
    ? "The evidence follow-up is component-specific and appears in each component module and Appendix C: in each case the action is to retain a testable artifact - a log, a configuration export, a report, a test result, an auditor letter, or a training record - behind the described control."
    : "No evidence follow-up is identified: every component's identified evidence includes testable material.";
  return { analysis, follow_up };
}

// ── Program readiness (v1.1: program_readiness_analysis / conclusion) ──────

export function buildProgramReadiness(intake: Bag, d: CyberDeliverables): { analysis: string; conclusion: string } {
  const framework = profileStr(intake, "framework");
  const rs = buildRecordSufficiency(intake, d);
  const gaps = d.readiness_determination.blocking_components.length;
  const sentences: string[] = [];
  sentences.push(
    framework
      ? `The intake describes a program organized around ${noStop(framework)}.`
      : "The intake does not name an organizing framework for the program.",
  );
  sentences.push(
    rs.unassessed_count === 0
      ? "The component record is complete enough to evaluate the program as a whole."
      : `The component record is incomplete in ${rs.unassessed_count === 1 ? "one place" : `${rs.unassessed_count} places`}, and the program-level read is qualified to that extent.`,
  );
  if (gaps > 0) {
    sentences.push(`${gaps === 1 ? "One material weakness cuts" : `${gaps} material weaknesses cut`} across the readiness picture; the cross-cutting section consolidates ${gaps === 1 ? "it" : "them"}.`);
  }
  const conclusion = gaps === 0 && rs.unassessed_count === 0
    ? "At the program level, the described program and its identified evidence appear prepared for the independent audit, subject to auditor verification."
    : gaps === 0
    ? "At the program level, no material implementation weakness is described; the open items are record-completion matters rather than identified deficiencies."
    : "At the program level, the described program is not yet prepared for the independent audit; the blocking items are named in the readiness conclusion.";
  return { analysis: sentences.join(" "), conclusion };
}

// ── Component modules (v1.1: component_analysis[slug]) ─────────────────────

function evidenceSupportOf(ev: EvidenceSufficiency | undefined): CyberFactorRecord["evidence_support"] {
  if (!ev) return "NoneIdentified";
  switch (ev.sufficiency) {
    case "sufficient":
      return ev.testable_artifacts.length > 1 ? "Strong" : "Moderate";
    case "partial":
      return "Limited";
    default:
      return "NoneIdentified";
  }
}

export function buildComponentAnalyses(inputs: FactorInputs): CyberComponentAnalysis[] {
  const cov = coverageBySlug(inputs.deliverables);
  const ev = evidenceBySlug(inputs.deliverables);
  const recBySlug = new Map(inputs.recommendations.map((r) => [r.slug, r]));

  return CYBER_7123_COMPONENTS.map((comp) => {
    const c = cov.get(comp.slug);
    const e = ev.get(comp.slug);
    const rec = recBySlug.get(comp.slug);
    const intakeRec = controlRec(inputs.intake, comp.slug);

    const recordSufficiency: CyberFactorRecord["record_sufficiency"] = !c || c.status === "record_insufficient"
      ? (intakeRec.maturity || intakeRec.notes ? "Qualified" : "MateriallyIncomplete")
      : (e && (e.sufficiency === "insufficient" || e.sufficiency === "unknown") ? "Qualified" : "Complete");

    const materiality: CyberFactorRecord["materiality"] = rec
      ? (rec.priority === "Immediate" ? "Material" : rec.priority === "Monitor" ? "Immaterial" : "Secondary")
      : "Immaterial";

    const consequence: CyberFactorRecord["consequence_type"] = !rec
      ? "AuditorVerification"
      : rec.key.gapClass === "evidence_insufficient"
      ? "AuditorVerification"
      : rec.key.gapClass === "no_record" || rec.key.gapClass === "no_maturity_stated"
      ? "RecordFollowUp"
      : "ReadinessRemediation";

    // The narrative: fact -> implementation posture -> evidence posture ->
    // consequence, each sentence attributed and guardrail-compliant.
    const sentences: string[] = [];
    if (intakeRec.maturity) {
      sentences.push(`The Company records this component as ${noStop(intakeRec.maturity).toLowerCase()}.`);
    } else {
      sentences.push("The Company has not recorded an implementation status for this component.");
    }
    if (intakeRec.notes) {
      sentences.push(`Its description: "${noStop(intakeRec.notes)}."`);
    }
    if (intakeRec.evidence.length && !intakeRec.evidence.every((x) => /^none on file$/i.test(x))) {
      sentences.push(`Evidence identified: ${asProse(intakeRec.evidence).toLowerCase()}.`);
    } else {
      sentences.push("No evidence is identified for this component.");
    }
    if (c && c.status !== "record_insufficient" && s(c.application)) {
      sentences.push(stop(s(c.application)));
    }
    if (e && s(e.application)) {
      sentences.push(stop(s(e.application)));
    }
    const commentary = inputs.corpusCommentaryBySlug.get(comp.slug) ?? [];
    for (const line of commentary) sentences.push(stop(line));

    // FD703575-CY3 — {fact} takes the first sentence of the notes, never the
    // whole narrative (recommendationFact's own comment carries the finding).
    const action = rec
      ? rec.slot.template.replace("{fact}", noStop(recommendationFact(intakeRec.notes, intakeRec.maturity)))
      : "No remediation identified for this component.";

    const supporting: string[] = [];
    if (intakeRec.maturity) supporting.push(`recorded maturity: ${intakeRec.maturity}`);
    if (intakeRec.evidence.length) supporting.push(`evidence categories identified: ${intakeRec.evidence.join("; ")}`);

    return {
      slug: comp.slug,
      label: comp.label,
      component_number: comp.number,
      conclusion: c && c.status !== "record_insufficient"
        ? `${comp.label}: ${c.verdict.replace(/_/g, " ")} on the information provided.`
        : `${comp.label}: the record is insufficient for a readiness finding.`,
      supporting_reasons: supporting,
      contrary_consideration: e && (e.sufficiency === "insufficient" || e.sufficiency === "unknown") && c?.verdict === "satisfied"
        ? "The stated implementation is not yet matched by testable evidence."
        : "",
      record_sufficiency: recordSufficiency,
      evidence_support: evidenceSupportOf(e),
      materiality,
      consequence_type: consequence,
      recommended_action: action,
      authority: comp.citation,
      factual_basis: [`controls[${comp.slug}].maturity`, `controls[${comp.slug}].notes`, `controls[${comp.slug}].evidence`],
      narrative: sentences.join(" "),
    };
  });
}

// ── Cross-cutting findings (v1.1 §IV families) ─────────────────────────────

export interface CrossCuttingResult {
  readonly material_implementation_gaps: string;
  readonly material_evidence_gaps: string;
  readonly cross_component_findings: string;
  readonly prior_audit_dependency_gaps: string;
  readonly material_record_limitations: string;
  readonly conclusion: string;
}

export function buildCrossCutting(intake: Bag, d: CyberDeliverables, recs: readonly ComponentRecommendation[]): CrossCuttingResult {
  const implGaps = recs.filter((r) => r.key.gapClass === "not_implemented" || r.key.gapClass === "partially_implemented");
  const evGaps = recs.filter((r) => r.key.gapClass === "evidence_insufficient");
  const recordGaps = recs.filter((r) => r.key.gapClass === "no_record" || r.key.gapClass === "no_maturity_stated");
  const priorScope = profileStr(intake, "prior_audit_scope");

  const material_implementation_gaps = implGaps.length
    ? `Implementation is the open matter for ${asProse(implGaps.map((r) => r.label))}.`
    : "No material implementation gap is described on the Company's answers.";
  const material_evidence_gaps = evGaps.length
    ? `Evidence is the open matter for ${asProse(evGaps.map((r) => r.label))}: each is described as implemented, and the record identifies no testable artifact behind the description.`
    : "No material evidence gap is identified: where implementation is stated, testable evidence is identified with it.";
  const cross_component_findings = evGaps.length >= 3
    ? "The recurring pattern across the gapped components is evidentiary rather than operational: controls are described, and the artifacts that would let an auditor test the descriptions are not yet identified."
    : implGaps.length >= 3
    ? "The recurring pattern across the gapped components is implementational: several enumerated components are recorded below full implementation."
    : "No systemic pattern emerges across components; the open items are component-specific.";
  const prior_audit_dependency_gaps = priorScope
    ? "Prior audit work is recorded; where the report relies on it, the reliance is limited to the coverage the Company itself describes."
    : "No prior audit coverage is recorded, so nothing in this assessment depends on prior work.";
  const material_record_limitations = recordGaps.length
    ? `The record itself is the limitation for ${asProse(recordGaps.map((r) => r.label))}: no assessable entry exists yet.`
    : "No material record limitation is identified.";
  const openCount = recs.length;
  const conclusion = openCount === 0
    ? "Nothing rises to a cross-cutting readiness concern on the Company's answers."
    : `${openCount === 1 ? "One matter bears" : `${openCount} matters bear`} on the overall readiness conclusion; the readiness actions in Section VI sequence ${openCount === 1 ? "it" : "them"}.`;
  return {
    material_implementation_gaps,
    material_evidence_gaps,
    cross_component_findings,
    prior_audit_dependency_gaps,
    material_record_limitations,
    conclusion,
  };
}

// ── Incident context (v1.1 §V; guardrail i3 — never infer breach facts) ────

export function buildIncidentReadiness(intake: Bag, d: CyberDeliverables): { analysis: string; follow_up: string } {
  const count = profileStr(intake, "incidents_12mo");
  const c17 = controlRec(intake, "c17_incident");
  const sentences: string[] = [];
  if (count) {
    sentences.push(`The Company reports ${noStop(count)} security incidents in the preceding twelve months.`);
  } else {
    sentences.push("The Company has not recorded an incident count for the preceding twelve months.");
  }
  if (c17.maturity) {
    sentences.push(`Its security-incident response management component is recorded as ${noStop(c17.maturity).toLowerCase()}${c17.notes ? `, described as: "${noStop(c17.notes)}"` : ""}.`);
  }
  sentences.push("Whether any incident involved personal information, required notification, or was notified is addressed only to the extent the incident-response record states it; nothing is inferred from the count alone.");
  const follow_up = !c17.maturity || c17.evidence.length === 0
    ? "The incident-record follow-up is to complete the incident-response component's record: its implementation status, its description, and the evidence categories available for it."
    : "No incident-record follow-up is identified beyond the component-level actions above.";
  return { analysis: sentences.join(" "), follow_up };
}

// ── Readiness actions (v1.1 §VI families; guardrail i4 — no invented deadlines) ──

export interface ReadinessActionsResult {
  readonly priority_actions: readonly string[];
  readonly evidence_package_actions: readonly string[];
  readonly implementation_actions: readonly string[];
  readonly record_completion_actions: readonly string[];
  readonly sequencing: string;
}

function actionSentence(r: ComponentRecommendation, intake: Bag): string {
  const rec = controlRec(intake, r.slug);
  // FD703575-CY3 — first-sentence fact, never the whole notes narrative.
  const text = r.slot.template.replace("{fact}", noStop(recommendationFact(rec.notes, rec.maturity)));
  return `${r.label} - ${text} (EUP readiness recommendation; priority: ${r.priority}.)`;
}

export function buildReadinessActions(intake: Bag, recs: readonly ComponentRecommendation[]): ReadinessActionsResult {
  // FD703575-CY4 — an action appears ONCE. Immediate-priority items render
  // under "Priority readiness actions"; the class families below list only
  // the remaining (non-Immediate) items. The live batch rendered the same
  // four Immediate items verbatim in both lists.
  const nonPriority = recs.filter((r) => r.priority !== "Immediate");
  const byClass = (classes: readonly string[]) => nonPriority.filter((r) => classes.includes(r.key.gapClass)).map((r) => actionSentence(r, intake));
  const priority_actions = recs.filter((r) => r.priority === "Immediate").map((r) => actionSentence(r, intake));
  const evidence_package_actions = byClass(["evidence_insufficient"]);
  const implementation_actions = byClass(["not_implemented", "partially_implemented"]);
  const record_completion_actions = byClass(["no_record", "no_maturity_stated"]);
  const sequencing = recs.length === 0
    ? "No readiness actions are identified; the preparation focus is organizing the identified evidence for auditor access."
    : "Suggested sequencing: complete the record first, then close implementation gaps, then assemble the evidence packages - each earlier group unblocks the assessment of the later ones.";
  return { priority_actions, evidence_package_actions, implementation_actions, record_completion_actions, sequencing };
}

// ── Readiness conclusion (v1.1 §VII; guardrail i5) ─────────────────────────

export function buildOverallReadinessNarrative(d: CyberDeliverables, recs: readonly ComponentRecommendation[]): { narrative: string; single_next_act: string } {
  const rd = d.readiness_determination;
  let narrative: string;
  switch (rd.conclusion) {
    case "ready":
      narrative = "On the Company's present description of its program and the evidence categories identified, the Company appears prepared to proceed to independent audit, subject to auditor verification of the identified evidence.";
      break;
    case "ready_subject_to_named_remediation":
      narrative = `On the Company's present description, the Company can prepare to proceed to independent audit once the named items are closed: ${asProse(rd.blocking_components.map((b) => b.label))}. Each is a readiness item, not an auditor finding.`;
      break;
    case "not_ready":
      narrative = `On the Company's own description, ${rd.blocking_components.length === 1 ? "a material item stands" : "material items stand"} between the program and audit readiness: ${asProse(rd.blocking_components.map((b) => b.label))}. The readiness actions above sequence the closing work.`;
      break;
    default:
      narrative = "The record is insufficient for a readiness conclusion: the open items are record-completion matters, and completing them - not remediating a described deficiency - is what a conclusion waits on.";
  }
  const top = recs[0];
  const single_next_act = top
    ? `The most important next act is on ${top.label}: ${top.slot.template.replace("{fact}", "the recorded entry")}`
    : "The most important next act is to keep the identified evidence packages organized for auditor access.";
  return { narrative, single_next_act };
}

// ── Evidence preservation (v1.1 §VIII) ─────────────────────────────────────

export function buildEvidencePreservation(intake: Bag, d: CyberDeliverables): { actions: string; observations: string } {
  const withEvidence = d.evidence_sufficiency.filter((e) => e.testable_artifacts.length > 0).length;
  const lastAudit = profileStr(intake, "last_audit");
  const actions = withEvidence > 0
    ? `Keep the evidence packages behind the ${withEvidence === 1 ? "component" : `${withEvidence} components`} with testable artifacts organized for auditor access, and preserve everything relevant to the audit for at least five years after its completion.`
    : "As evidence is assembled for the components above, organize it for auditor access and preserve everything relevant to the audit for at least five years after its completion.";
  const observations = lastAudit
    ? `Continuing readiness builds on the recorded audit history (most recent: ${noStop(lastAudit)}): the annual cadence means the evidence practices established now recur, and the record built for this cycle is the baseline for the next.`
    : "Continuing readiness is annual: the evidence practices established for this cycle recur, and the record built now is the baseline for the next.";
  return { actions, observations };
}

// ── Executive summary lines (v1.1 front section) ───────────────────────────

export function buildExecutiveReadinessLines(inputs: FactorInputs): string {
  const { intake, deliverables: d, recommendations: recs } = inputs;
  const entity = profileStr(intake, "entity_name") || "The Company";
  const industry = profileStr(intake, "industry");
  const rd = d.readiness_determination;
  const rs = buildRecordSufficiency(intake, d);
  const evRows = d.evidence_sufficiency;
  const evOk = evRows.filter((r) => r.sufficiency === "sufficient").length;
  const ind = buildIndependenceReadinessConsequence(d);
  const gaps = recs.filter((r) => r.priority === "Immediate" || r.priority === "Within 90 days");

  const lines: string[] = [];
  lines.push(`Company / operating context: ${entity}${industry ? ` / ${industry}` : ""}.`);
  if (s(rd.reasoning)) lines.push(stop(s(rd.reasoning)));
  lines.push(stop(rs.conclusion));
  lines.push(`Evidence posture: the Company identifies testable evidence for ${evOk} of the eighteen components.`);
  lines.push(stop(ind));
  lines.push(
    gaps.length
      ? `Principal readiness gaps: ${asProse(gaps.slice(0, 3).map((r) => r.label))}${gaps.length > 3 ? `, and ${gaps.length - 3} more in Section IV` : ""}.`
      : "Principal readiness gaps: none identified on the Company's answers.",
  );
  lines.push(
    inputs.nextSteps.length
      ? `Priority readiness actions: ${asProse(inputs.nextSteps.map((st) => st.slug).map((slug) => CYBER_7123_COMPONENTS.find((c) => c.slug === slug)?.label ?? slug))} - each stated in Section VI with its owner.`
      : "Priority readiness actions: none identified; the preparation focus is organizing the identified evidence for auditor access.",
  );
  return lines.join("\n");
}

// ── The bundle ─────────────────────────────────────────────────────────────

export interface CyberFactorOutputs {
  readonly company_context_analysis: string;
  readonly scope_record: { analysis: string; sufficiency: string };
  readonly prior_audit_reliance_analysis: string;
  readonly record_sufficiency: RecordSufficiencyResult;
  readonly independence_readiness_consequence: string;
  readonly evidence_readiness: { analysis: string; follow_up: string };
  readonly program_readiness: { analysis: string; conclusion: string };
  readonly component_analyses: readonly CyberComponentAnalysis[];
  readonly cross_cutting: CrossCuttingResult;
  readonly incident_readiness: { analysis: string; follow_up: string };
  readonly readiness_actions: ReadinessActionsResult;
  readonly overall: { narrative: string; single_next_act: string };
  readonly evidence_preservation: { actions: string; observations: string };
  readonly executive_lines: string;
}

export const CYBER_FACTORS_STAMP = "cyber-factors@c2-spine-v1.1-2026-08-26";

export function buildCyberFactors(
  intake: Bag,
  deliverables: CyberDeliverables,
  recommendations: readonly ComponentRecommendation[],
  nextSteps: readonly CyberNextStep[],
  corpusCommentaryBySlug: ReadonlyMap<string, readonly string[]> = new Map(),
): CyberFactorOutputs {
  const inputs: FactorInputs = { intake, deliverables, recommendations, nextSteps, corpusCommentaryBySlug };
  return {
    company_context_analysis: buildCompanyContextAnalysis(intake),
    scope_record: buildScopeRecordAnalysis(intake),
    prior_audit_reliance_analysis: buildPriorAuditRelianceAnalysis(intake),
    record_sufficiency: buildRecordSufficiency(intake, deliverables),
    independence_readiness_consequence: buildIndependenceReadinessConsequence(deliverables),
    evidence_readiness: buildEvidenceReadinessAnalysis(deliverables),
    program_readiness: buildProgramReadiness(intake, deliverables),
    component_analyses: buildComponentAnalyses(inputs),
    cross_cutting: buildCrossCutting(intake, deliverables, recommendations),
    incident_readiness: buildIncidentReadiness(intake, deliverables),
    readiness_actions: buildReadinessActions(intake, recommendations),
    overall: buildOverallReadinessNarrative(deliverables, recommendations),
    evidence_preservation: buildEvidencePreservation(intake, deliverables),
    executive_lines: buildExecutiveReadinessLines(inputs),
  };
}
