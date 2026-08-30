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
import { recommendationFact, recommendationGap } from "./cyber-recommendations.ts";
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
  /** BATCH 18: the S4 regulator commentary, composed as its own demoted
   * "Rulemaking context — persuasive only." chunk; "" when none curated. */
  readonly rulemaking_context: string;
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

// PANEL CYB-6 (2026-08-30) — splice hygiene for recorded enum labels.
// maturityPhrase lowercases a sentence-cased maturity label and restores the
// article the enum omits ("Implemented across organization" → "implemented
// across the organization"); labels already carrying their article, and the
// continuous-monitoring label, pass through lowercased only. lowerItemLabel
// lowercases a sentence-cased first letter but leaves acronym-initial items
// (SOC 2) untouched.
export function maturityPhrase(label: string): string {
  const t = label.trim();
  const lowered = /^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
  return lowered.replace(/across organization\b/i, "across the organization");
}

export function lowerItemLabel(label: string): string {
  const t = label.trim();
  return /^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
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
    // PANEL CYB-6 (2026-08-30): "reports None security incidents" was the
    // raw enum spliced into prose, followed by a reference to "what those
    // incidents involved" for incidents that do not exist. A None answer
    // gets its own sentence; any other answer keeps the prior bytes.
    sentences.push(/^none$/i.test(incidents)
      ? "The Company reports no security incidents in the preceding twelve months."
      : `The Company reports ${noStop(incidents)} security incidents in the preceding twelve months; what those incidents involved is addressed only to the extent the incident-response record states it.`);
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
  // PANEL CYB-3 (2026-08-30): "No record-completion follow-up is
  // identified." used to fire while the same report named two
  // record-completion items in so many words — the undescribed auditor
  // engagement (Section 2) and the undescribed prior-audit coverage
  // (Section 1). Both now count here, so the none-branch is true when it
  // prints.
  if (!["external", "internal", "none"].includes(s(d.independence_determination.auditor_type))) {
    followUps.push("describe the auditor engagement, whose unresolved status Section 2 identifies as a record-completion item");
  }
  if (profileStr(intake, "last_audit") && !profileStr(intake, "prior_audit_scope")) {
    followUps.push("record what the prior audit covered, which Section 1 identifies as a record-completion item");
  }
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
  // PANEL CYB-2 (2026-08-30): the all-clear used to fire whenever nothing
  // was insufficient/unknown — so 4 "partial" components whose Appendix B
  // testable-artifacts column reads "None" sat under "every component's
  // identified evidence includes testable material". Partial means
  // policy-only evidence; the all-clear now requires none of the three.
  const follow_up = insufficient + unknown > 0
    ? "The evidence follow-up is component-specific and appears in each component module and Appendix C: in each case the action is to retain a testable artifact - a log, a configuration export, a report, a test result, an auditor letter, or a training record - behind the described control."
    : partial > 0
    ? `No component leaves a finding resting primarily on management assertion, but ${partial === 1 ? "one component evidences" : `${partial} components evidence`} intent only - a policy or procedure with no testable artifact yet identified behind it. The component modules in Section 3 name each; the action in each case is to retain a testable artifact - a log, a configuration export, a report, a test result, an auditor letter, or a training record - behind the described control.`
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

    // BATCH 18 (Wave C1, doc 109 §2.5 items 1-2 / A-Team doc-111 queue):
    // the component entry is a labeled record, not a fused paragraph. The
    // shared § 7123(c)/§ 7122(d) methodology sentences state ONCE in the
    // § 3 section lead (spine v1.4); each entry carries only this
    // component's own facts. Labels are doc-66 RUN-INs; the assembler
    // renders the number line as an h3 chunk and the rulemaking context as
    // its own demoted panel (A-Team RULING 3.4). The typed coverage and
    // evidence rows are UNTOUCHED — this narrows only what the body prints.
    const cap = (t: string): string => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
    const lines: string[] = [];
    lines.push(intakeRec.maturity
      ? `Status. ${cap(maturityPhrase(intakeRec.maturity))}.`
      : "Status. No implementation status is recorded.");
    if (c && c.status === "record_insufficient" && s(c.application)) {
      lines.push(stop(s(c.application)));
    }
    if (intakeRec.notes) {
      lines.push(`Controls described. "${noStop(intakeRec.notes)}."`);
    } else {
      lines.push("Controls described. None recorded, so an auditor would test the assertion rather than accept it.");
    }
    if (intakeRec.evidence.length && !intakeRec.evidence.every((x) => /^none on file$/i.test(x))) {
      // PANEL CYB-6: acronym-safe per-item lowercasing (SOC 2 survives).
      lines.push(`Evidence identified.\n${intakeRec.evidence.map((x) => `— ${lowerItemLabel(x)}`).join("\n")}`);
    } else {
      lines.push("Evidence identified. None.");
    }
    if (e) {
      lines.push(e.sufficiency === "sufficient"
        ? "Auditor testability. The identified evidence includes material an auditor can examine and test."
        : e.sufficiency === "partial"
        ? "Auditor testability. The identified material evidences intent rather than operation; a testable artifact — a log, a configuration export, a report, a test result, an auditor letter, or a training record — belongs behind the described control."
        : "Auditor testability. No testable material is identified; a finding would rest primarily on management assertion, which § 7122(d) does not permit as the primary basis.");
    }
    // The ratified S4 regulator commentary renders as its own demoted panel
    // chunk; a line already closing with ".)" is never double-stopped (the
    // ".)." class, doc 109 §2.5 item 2).
    const commentary = inputs.corpusCommentaryBySlug.get(comp.slug) ?? [];
    const stopSafe = (t: string): string => (/[.!?)]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
    const rulemaking_context = commentary.length
      ? `Rulemaking context — persuasive only. ${commentary.map(stopSafe).join(" ")}`
      : "";

    // FD703575-CY3 — {fact} takes the first sentence of the notes, never the
    // whole narrative. 3E9AD759-CY3 — the action then locates the remaining
    // work in the record's own gap sentence, so it never reads identically
    // across components that reported different gaps.
    const gapSentence = rec ? recommendationGap(intakeRec.notes) : "";
    const action = rec
      ? `${rec.slot.template.replace("{fact}", noStop(recommendationFact(intakeRec.notes, intakeRec.maturity)))}${gapSentence ? ` The recorded description locates the remaining work: ${gapSentence}.` : ""}`
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
      narrative: lines.join("\n"),
      rulemaking_context,
    };
  });
}

// ── Cross-cutting findings (v1.1 § 4 families) ─────────────────────────────

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
  // PANEL CYB-2 (2026-08-30): the § 4 all-clear repeated § 2's false
  // negative — it looked only at evidence_insufficient recommendations, so
  // components graded "partial" (policy-only evidence, Appendix B testable
  // artifacts "None") sat under "testable evidence is identified with it".
  const policyOnly = d.evidence_sufficiency.filter((r) =>
    r.sufficiency === "partial" && !evGaps.some((g) => g.slug === r.slug)
  );
  const material_evidence_gaps = evGaps.length
    ? `Evidence is the open matter for ${asProse(evGaps.map((r) => r.label))}: each is described as implemented, and the record identifies no testable artifact behind the description.`
    : policyOnly.length
    ? `${policyOnly.length === 1 ? "One component rests" : `${policyOnly.length} components rest`} on policy-only evidence - ${asProse(policyOnly.map((r) => r.label.replace(/^Evidence sufficiency — /, "")))} - each described as implemented with no testable artifact yet identified; Section 3 carries the follow-up for each.`
    : "No material evidence gap is identified: where implementation is stated, testable evidence is identified with it.";
  // 3E9AD759-CY2 (2026-08-27, live batch 3e9ad759) — the implementational
  // branch was tautological ("the implementation gaps are implementational").
  // The synthesis is now computed from the gapped components' OWN
  // descriptions: proper-noun terms recurring across three or more gapped
  // components are named with their counts (the batch record's Guadalajara
  // facility recurred across at least eight descriptions and went unnamed),
  // and the gap-class split is stated. Purely mechanical term recurrence —
  // nothing is invented.
  const recurringTerms = (() => {
    const perComponentTerms: Set<string>[] = implGaps.map((r) => {
      const notes = controlRec(intake, r.slug).notes || "";
      // Proper-noun phrases in NON-sentence-initial position only, so
      // ordinary sentence-starting words never count as named systems.
      const found = notes.match(/(?<![.!?]\s)(?<=[a-z0-9,;)] )[A-Z][A-Za-z0-9.-]+(?: [A-Z][A-Za-z0-9.-]+)*/g) ?? [];
      return new Set(found.map((t) => t.trim()).filter((t) => t.length > 2));
    });
    const counts = new Map<string, number>();
    for (const terms of perComponentTerms) {
      for (const t of terms) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()]
      .filter(([, n]) => n >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  })();
  const notImplCount = implGaps.filter((r) => r.key.gapClass === "not_implemented").length;
  const partialCount = implGaps.length - notImplCount;
  const cross_component_findings = evGaps.length >= 3
    ? "The recurring pattern across the gapped components is evidentiary rather than operational: controls are described, and the artifacts that would let an auditor test the descriptions are not yet identified."
    : implGaps.length >= 3
    ? (recurringTerms.length
      ? `Across the ${implGaps.length} components with implementation gaps (${notImplCount} not implemented, ${partialCount} partially implemented), the Company's own descriptions recur on ${asProse(recurringTerms.map(([t, n]) => `${t} (named in ${n} of the gapped descriptions)`))}. The gaps concentrate on shared systems and facilities rather than isolated misses, and closing the shared surface closes several components at once.`
      : `Across the ${implGaps.length} components with implementation gaps (${notImplCount} not implemented, ${partialCount} partially implemented), no single system or facility recurs across the Company's descriptions; the gaps are component-specific in origin and close independently.`)
    : "No systemic pattern emerges across components; the open items are component-specific.";
  // PANEL CYB-3 (2026-08-30): "No prior audit coverage is recorded" collided
  // with "Most recent audit: Within 12 months" two sections earlier. Where
  // an audit is recorded but its scope is not described, the sentence says
  // that; only a record with no prior audit at all keeps the old bytes.
  const prior_audit_dependency_gaps = priorScope
    ? "Prior audit work is recorded; where the report relies on it, the reliance is limited to the coverage the Company itself describes."
    : profileStr(intake, "last_audit")
    ? "A prior audit is recorded, but its coverage is not described, so nothing in this assessment relies on prior work."
    : "No prior audit coverage is recorded, so nothing in this assessment depends on prior work.";
  const material_record_limitations = recordGaps.length
    ? `The record itself is the limitation for ${asProse(recordGaps.map((r) => r.label))}: no assessable entry exists yet.`
    : "No material record limitation is identified.";
  const openCount = recs.length;
  const conclusion = openCount === 0
    ? "Nothing rises to a cross-cutting readiness concern on the Company's answers."
    : `${openCount === 1 ? "One matter bears" : `${openCount} matters bear`} on the overall readiness conclusion; the readiness actions in Section 6 sequence ${openCount === 1 ? "it" : "them"}.`;
  return {
    material_implementation_gaps,
    material_evidence_gaps,
    cross_component_findings,
    prior_audit_dependency_gaps,
    material_record_limitations,
    conclusion,
  };
}

// ── Incident context (v1.1 § 5; guardrail i3 — never infer breach facts) ────

export function buildIncidentReadiness(intake: Bag, d: CyberDeliverables): { analysis: string; follow_up: string } {
  const count = profileStr(intake, "incidents_12mo");
  const c17 = controlRec(intake, "c17_incident");
  const sentences: string[] = [];
  if (count) {
    // PANEL CYB-6 (2026-08-30): same None-splice fix as § 1.
    sentences.push(/^none$/i.test(count)
      ? "The Company reports no security incidents in the preceding twelve months."
      : `The Company reports ${noStop(count)} security incidents in the preceding twelve months.`);
  } else {
    sentences.push("The Company has not recorded an incident count for the preceding twelve months.");
  }
  if (c17.maturity) {
    sentences.push(`Its security-incident response management component is recorded as ${maturityPhrase(c17.maturity)}${c17.notes ? `, described as: "${noStop(c17.notes)}"` : ""}.`);
  }
  sentences.push("Whether any incident involved personal information, required notification, or was notified is addressed only to the extent the incident-response record states it; nothing is inferred from the count alone.");
  const follow_up = !c17.maturity || c17.evidence.length === 0
    ? "The incident-record follow-up is to complete the incident-response component's record: its implementation status, its description, and the evidence categories available for it."
    : "No incident-record follow-up is identified beyond the component-level actions above.";
  return { analysis: sentences.join(" "), follow_up };
}

// ── Readiness actions (v1.1 § 6 families; guardrail i4 — no invented deadlines) ──

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
  // 3E9AD759-CY3 — the record's own gap sentence locates the remaining work.
  // D1D2B3B8-CY1 (2026-08-28) — each action line carries its RANK (the
  // cross-family sequencing signal the register table already computes) and
  // the RECORDED remediation owner: the live batch named the owner once in
  // the profile and never on the actions, leaving every action unassigned on
  // its face. The owner is the intake's own remediation_owner, never an
  // inferred assignment.
  const text = r.slot.template.replace("{fact}", noStop(recommendationFact(rec.notes, rec.maturity)));
  const gapSentence = recommendationGap(rec.notes);
  const owner = profileStr(intake, "remediation_owner");
  return `Rank ${r.rank} — ${r.label} - ${text}${gapSentence ? ` Remaining work, as recorded: ${gapSentence}.` : ""}${owner ? ` Recorded remediation owner: ${noStop(owner)}.` : ""} (EUP readiness recommendation; priority: ${r.priority}.)`;
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

// ── Readiness conclusion (v1.1 § 7; guardrail i5) ─────────────────────────

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

// ── Evidence preservation (v1.1 § 8) ─────────────────────────────────────

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

// BATCH 19a (Wave C3, doc 113 S3.4) — the seven orphan exec lines split:
// the label/value FACTS are the Readiness snapshot table rows; the
// ANALYTICAL sentences remain the generated prose block below the table.
// Fact/sentence bytes are unchanged where they survive; the debug-looking
// "Label: value" stack retires (doc 109 Cyber first-ten-seconds offense).
export function buildExecutiveSnapshotRows(inputs: FactorInputs): readonly (readonly string[])[] {
  const { intake, deliverables: d, recommendations: recs } = inputs;
  const entity = profileStr(intake, "entity_name") || "The Company";
  const industry = profileStr(intake, "industry");
  const evRows = d.evidence_sufficiency;
  const evOk = evRows.filter((r) => r.sufficiency === "sufficient").length;
  const gaps = recs.filter((r) => r.priority === "Immediate" || r.priority === "Within 90 days");

  const rows: string[][] = [["Company", entity]];
  if (industry) rows.push(["Operating context", industry]);
  rows.push([
    "Evidence posture",
    `Testable evidence identified for ${evOk} of the eighteen components`,
  ]);
  rows.push([
    "Principal readiness gaps",
    gaps.length
      ? `${asProse(gaps.slice(0, 3).map((r) => r.label))}${gaps.length > 3 ? `, and ${gaps.length - 3} more in Section 4` : ""}`
      : "None identified on the Company's answers",
  ]);
  rows.push([
    "Priority readiness actions",
    inputs.nextSteps.length
      ? `${asProse(inputs.nextSteps.map((st) => st.slug).map((slug) => CYBER_7123_COMPONENTS.find((c) => c.slug === slug)?.label ?? slug))} — each stated in Section 6 with its owner`
      : "None identified; the preparation focus is organizing the identified evidence for auditor access",
  ]);
  return rows;
}

export function buildExecutiveReadinessLines(inputs: FactorInputs): string {
  const { intake, deliverables: d } = inputs;
  const rd = d.readiness_determination;
  const rs = buildRecordSufficiency(intake, d);
  const ind = buildIndependenceReadinessConsequence(d);

  const lines: string[] = [];
  if (s(rd.reasoning)) lines.push(stop(s(rd.reasoning)));
  lines.push(stop(rs.conclusion));
  lines.push(stop(ind));
  return lines.filter(Boolean).join(" ");
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
  /** BATCH 19a (doc 113 S3.4) — the Readiness snapshot table rows. */
  readonly executive_snapshot_rows: readonly (readonly string[])[];
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
    executive_snapshot_rows: buildExecutiveSnapshotRows(inputs),
  };
}
