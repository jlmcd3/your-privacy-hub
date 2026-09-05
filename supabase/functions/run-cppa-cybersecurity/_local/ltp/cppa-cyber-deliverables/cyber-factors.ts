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
import { resolveCyberApplicability } from "../cyber-applicability.ts";
// DOC 159 (2026-09-03) — the one resolver for the framework and prior-audit
// answers (shared with build.ts), the not-applicable maturity, and the
// counts-as-words helper.
import { NOT_APPLICABLE_MATURITY, countWord, frameworkFact, incidentPhrase, priorAuditFact } from "./record-facts.ts";

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
  // A-TEAM DELTA (ChatGPT multi-instance review, 2026-08-31, Cyber P1-2) —
  // program remediation ("Recommended action") and evidence-readiness
  // follow-up are two different dimensions (Factor-Bearing Law: the
  // consequence_type field above already types them as ReadinessRemediation
  // vs. AuditorVerification/RecordFollowUp). A component can have no
  // material remediation and still need a testable artifact; conflating
  // that into one "Recommended action" field printed "No remediation
  // identified" beside a table row that separately showed evidence
  // sufficiency as Partial. This field carries that ask on its own.
  readonly evidence_followup: string;
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
  // DOC 159 — "None / informal" and "Other" are answers about the framework,
  // not framework names; "Never" is an answer about the audit, not a date.
  const fw = frameworkFact(framework);
  sentences.push(
    fw.kind === "named"
      ? `The Company has indicated that its cybersecurity program is organized around ${noStop(fw.answer)}.`
      : fw.kind === "informal"
      ? "The Company reports that its cybersecurity program is run informally against no published framework; the component record below is therefore read on its own terms rather than against a named framework."
      : fw.kind === "other"
      ? "The Company reports that its cybersecurity program is organized around a framework outside the listed set; the component record below is read on its own terms rather than against a named framework."
      : "The Company has not named a primary cybersecurity framework in the assessment record; the component record below is therefore read on its own terms rather than against a named framework.",
  );
  const prior = priorAuditFact(lastAudit, get(intake, "profile.prior_audit_scope"));
  if (prior.never) sentences.push("The Company reports that it has not had an independent cybersecurity audit.");
  else if (prior.recorded) sentences.push(`Its most recent cybersecurity audit is recorded as ${noStop(prior.lastAudit)}.`);
  if (incidents) {
    // PANEL CYB-6 (2026-08-30): "reports None security incidents" was the
    // raw enum spliced into prose, followed by a reference to "what those
    // incidents involved" for incidents that do not exist. A None answer
    // gets its own sentence; any other answer keeps the prior bytes.
    sentences.push(/^none$/i.test(incidents)
      ? "The Company reports no security incidents in the preceding twelve months."
      : `The Company reports ${incidentPhrase(incidents)} in the preceding twelve months; what those incidents involved is addressed only to the extent the incident-response record states it.`);
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
  // DOC 159 — "Never" is an explicit no-prior-audit answer, read as such.
  const prior = priorAuditFact(profileStr(intake, "last_audit"), profileStr(intake, "prior_audit_scope"));
  const lastAudit = prior.lastAudit;
  const priorScope = prior.scope;
  if (prior.never) {
    return "The Company reports no prior independent cybersecurity audit, so no reliance on prior coverage is available; the eventual audit record builds from the evidence identified in this assessment.";
  }
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
  // DOC 159 — components the Company reports as not applicable are outside
  // the notes and evidence counts; a blank basis for that position is a
  // record-completion item of its own.
  let withoutNotes = 0;
  let withoutEvidence = 0;
  let notApplicable = 0;
  let notApplicableWithoutBasis = 0;
  for (const comp of CYBER_7123_COMPONENTS) {
    const rec = controlRec(intake, comp.slug);
    if (rec.maturity === NOT_APPLICABLE_MATURITY) {
      notApplicable++;
      const rows = get(intake, "controls");
      const row = (Array.isArray(rows) ? (rows as Bag[]) : []).find((r) => s(r.key) === comp.slug);
      if (!s(row?.na_reason)) notApplicableWithoutBasis++;
      continue;
    }
    if (!rec.notes) withoutNotes++;
    if (rec.evidence.length === 0 || rec.evidence.every((e) => /^none on file$/i.test(e))) withoutEvidence++;
  }
  const applicableCount = CYBER_7123_COMPONENTS.length - notApplicable;
  const scope = notApplicable
    ? `all ${countWord(applicableCount)} applicable components (the Company reports ${countWord(notApplicable)} as not applicable)`
    : "all eighteen components";
  const conclusion = unassessed === 0 && withoutEvidence === 0
    ? `The record is populated across ${scope}: each carries a stated implementation status and identified evidence, which is the state a readiness conclusion can rest on.`
    : unassessed === 0
    ? `The record states an implementation status for ${scope}; ${withoutEvidence === 1 ? "one component identifies" : `${countWord(withoutEvidence)} components identify`} no evidence, which limits what an auditor could later test on ${withoutEvidence === 1 ? "that component" : "those components"}.`
    : `${unassessed === 1 ? "One component is" : `${countWord(unassessed)} components are`} unassessed or incomplete on the information provided, and the readiness conclusion is qualified to that extent rather than converted into a negative finding.`;
  const followUps: string[] = [];
  if (unassessed > 0) followUps.push(`record an implementation status for the ${unassessed === 1 ? "unassessed component" : `${countWord(unassessed)} unassessed components`}`);
  if (withoutNotes > 0) followUps.push(`add a narrative description for the ${withoutNotes === 1 ? "component" : `${countWord(withoutNotes)} components`} that carry none`);
  if (withoutEvidence > 0) followUps.push(`identify the evidence categories available for the ${withoutEvidence === 1 ? "component" : `${countWord(withoutEvidence)} components`} with none identified`);
  if (notApplicableWithoutBasis > 0) followUps.push(`state the basis for the ${notApplicableWithoutBasis === 1 ? "component" : `${countWord(notApplicableWithoutBasis)} components`} reported as not applicable (11 CCR § 7123(b)(2))`);
  // PANEL CYB-3 (2026-08-30): "No record-completion follow-up is
  // identified." used to fire while the same report named two
  // record-completion items in so many words — the undescribed auditor
  // engagement (Section 2) and the undescribed prior-audit coverage
  // (Section 1). Both now count here, so the none-branch is true when it
  // prints.
  if (!["external", "internal", "none"].includes(s(d.independence_determination.auditor_type))) {
    followUps.push("describe the auditor engagement, whose unresolved status Section 2 identifies as a record-completion item");
  }
  {
    // DOC 159 — never asked of a Company that reports no prior audit.
    const prior = priorAuditFact(profileStr(intake, "last_audit"), profileStr(intake, "prior_audit_scope"));
    if (prior.recorded && !prior.scope) {
      followUps.push("record what the prior audit covered, which Section 1 identifies as a record-completion item");
    }
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
    ? "The evidence follow-up is component-specific and appears in each component module and Appendix C: in each case the action is to retain a testable artifact—a log, a configuration export, a report, a test result, an auditor letter, or a training record—behind the described control."
    : partial > 0
    ? `No component leaves a finding resting primarily on management assertion, but ${partial === 1 ? "one component evidences" : `${partial} components evidence`} intent only—a policy or procedure with no testable artifact yet identified behind it. The component modules in Section 3 name each; the action in each case is to retain a testable artifact—a log, a configuration export, a report, a test result, an auditor letter, or a training record—behind the described control.`
    : "No evidence follow-up is identified: every component's identified evidence includes testable material.";
  return { analysis, follow_up };
}

// ── Program readiness (v1.1: program_readiness_analysis / conclusion) ──────

export function buildProgramReadiness(intake: Bag, d: CyberDeliverables): { analysis: string; conclusion: string } {
  const framework = profileStr(intake, "framework");
  const rs = buildRecordSufficiency(intake, d);
  const gaps = d.readiness_determination.blocking_components.length;
  // A-TEAM DELTA (ChatGPT Dropbox Batch 1 review, 2026-08-31, P0-B) —
  // "assessable" and "audit-ready" are not synonyms. `gaps` (implementation
  // verdict) and `rs.unassessed_count` (component-record completeness) say
  // nothing about whether the identified evidence is actually testable — a
  // report where every component is implemented but 0/18 have testable
  // evidence used to still clear this branch. Untestable is scoped the same
  // way buildEvidenceReadinessAnalysis() already scopes it elsewhere in this
  // file, so the two surfaces cannot disagree with each other.
  const untestable = d.evidence_sufficiency.filter((r) => r.sufficiency === "insufficient" || r.sufficiency === "unknown" || r.sufficiency === "partial").length;
  const sentences: string[] = [];
  // DOC 159 — the same framework resolver as Section 1 and the § 7123(b)(1)
  // finding, so the three surfaces cannot disagree.
  const fw = frameworkFact(framework);
  sentences.push(
    fw.kind === "named"
      ? `The Company describes its cybersecurity program as organized around ${noStop(fw.answer)}.`
      : fw.kind === "informal"
      ? "The Company reports that its cybersecurity program is run informally against no published framework."
      : fw.kind === "other"
      ? "The Company describes its cybersecurity program as organized around a framework outside the listed set."
      : "The Company does not name an organizing framework for the program.",
  );
  sentences.push(
    rs.unassessed_count === 0
      ? "The component record is complete enough to evaluate the program as a whole."
      : `The component record is incomplete in ${rs.unassessed_count === 1 ? "one place" : `${rs.unassessed_count} places`}, and the program-level read is qualified to that extent.`,
  );
  if (gaps > 0) {
    sentences.push(`${gaps === 1 ? "One material weakness cuts" : `${gaps} material weaknesses cut`} across the readiness picture; the cross-cutting section consolidates ${gaps === 1 ? "it" : "them"}.`);
  }
  if (gaps === 0 && rs.unassessed_count === 0 && untestable > 0) {
    // Batch b83ea3c4 (2026-09-05, Veltrix): "one component do not yet have" —
    // the verb now agrees with the count.
    sentences.push(`No material implementation weakness is described, but ${untestable === 1 ? "one component does not" : `${untestable} components do not`} yet have a testable operating artifact identified behind the described control.`);
  }
  // DOC 129 CY-1 (Batch 3 A-Team ruling, 2026-09-01) — the "appear prepared"
  // all-clear now requires the Section-2 readiness determination itself to
  // be "ready". Batch 3 showed the Batch-1 false-success returning: page one
  // said no readiness conclusion could be reached (auditor engagement not
  // described) while this § 3 sentence said the program appeared prepared.
  // A positive implementation posture is not an audit-readiness conclusion
  // while a § 7122 gating item (auditor engagement above all) is unresolved.
  const overallReadiness = d.readiness_determination.conclusion;
  const conclusion = gaps === 0 && rs.unassessed_count === 0 && untestable === 0 && overallReadiness === "ready"
    ? "At the program level, the described program and its identified evidence appear prepared for the independent audit, subject to auditor verification."
    : gaps === 0 && rs.unassessed_count === 0 && untestable === 0
    ? "At the program level, no material implementation weakness is identified on the information supplied, but the readiness conclusion in Section 2 remains open — the § 7122 auditor-engagement record above all — so the program cannot yet be described as prepared for the independent audit."
    : gaps === 0 && untestable > 0
    ? "At the program level, no material implementation weakness is identified. Evidence readiness is incomplete: not every component currently has a testable operating artifact identified. The programme therefore cannot yet be described as prepared for the independent audit."
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
    // DOC 159 — the Company's § 7123(b)(2) position renders as a position
    // with its stated basis, never as a maturity rung; the password line on
    // Authentication applies the § 7123(c)(1)(B) condition from the
    // Company's own answer (FC-L4) instead of inferring it from the notes.
    const notApplicable = intakeRec.maturity === NOT_APPLICABLE_MATURITY;
    const naReason = (() => {
      const raw = get(inputs.intake, "controls");
      if (!Array.isArray(raw)) return "";
      const row = raw.find((r) => s(get(r, "key")) === comp.slug);
      return s(get(row, "na_reason"));
    })();
    if (notApplicable) {
      lines.push("Status. Reported by the Company as not applicable to its information system, subject to the auditor's determination under 11 CCR § 7123(b)(2).");
      lines.push(naReason
        ? `Basis stated. "${noStop(naReason)}."`
        : "Basis stated. None recorded, so the auditor has nothing on which to confirm the position; stating it is a record-completion item.");
    } else {
      lines.push(intakeRec.maturity
        ? `Status. ${cap(maturityPhrase(intakeRec.maturity))}.`
        : "Status. No implementation status is recorded.");
    }
    if (comp.slug === "c1_auth" && !notApplicable) {
      const pw = profileStr(inputs.intake, "password_auth_used");
      lines.push(pw === "No"
        ? "Passwords. The Company reports that its authentication method does not use passwords or passphrases, so the strong-password element in 11 CCR § 7123(c)(1)(B) does not apply on that answer; multi-factor authentication under § 7123(c)(1)(A) remains the element assessed."
        : pw === "Yes"
        ? "Passwords. The Company reports that passwords or passphrases are part of its authentication method, so 11 CCR § 7123(c)(1)(B) applies: strong, unique passwords or passphrases must be evidenced alongside multi-factor authentication."
        : "Passwords. Whether passwords or passphrases are part of the authentication method is not recorded; 11 CCR § 7123(c)(1)(B) applies only if they are.");
    }
    if (c && c.status === "record_insufficient" && s(c.application)) {
      lines.push(stop(s(c.application)));
    }
    if (intakeRec.notes) {
      lines.push(`Controls described. "${noStop(intakeRec.notes)}."`);
    } else if (!notApplicable) {
      lines.push("Controls described. None recorded, so an auditor would test the assertion rather than accept it.");
    }
    if (notApplicable) {
      lines.push("Evidence identified. Not required for a component reported as not applicable.");
    } else if (intakeRec.evidence.length && !intakeRec.evidence.every((x) => /^none on file$/i.test(x))) {
      // PANEL CYB-6: acronym-safe per-item lowercasing (SOC 2 survives).
      lines.push(`Evidence identified.\n${intakeRec.evidence.map((x) => `— ${lowerItemLabel(x)}`).join("\n")}`);
    } else {
      lines.push("Evidence identified. None.");
    }
    if (e && !notApplicable) {
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
    // Batch 4ed05f22 (2026-09-05): when the note is a single sentence, the
    // "fact" and the "gap sentence" are the SAME sentence — the live run
    // printed the company's note twice in adjacent clauses on four
    // components. The gap sentence is appended only when it adds something.
    const factText = rec ? noStop(recommendationFact(intakeRec.notes, intakeRec.maturity)) : "";
    const gapRaw = rec ? recommendationGap(intakeRec.notes) : "";
    const gapSentence = gapRaw && !sameSentence(gapRaw, factText) ? gapRaw : "";
    const action = rec
      ? `${rec.slot.template.replace("{fact}", factText)}${gapSentence ? ` The recorded description locates the remaining work: ${gapSentence}.` : ""}`
      : "No remediation identified for this component.";
    // A-TEAM DELTA (ChatGPT multi-instance review, 2026-08-31, Cyber P1-2)
    // — same condition the narrative above already states in prose (line
    // "Auditor testability..."); this surfaces it as its own structured
    // field so the component matrix table can carry it in its own column
    // instead of leaving it buried in the per-component narrative only.
    const evidenceFollowup = e?.sufficiency === "partial"
      ? "Retain a testable artifact supporting operation of the control (a log, configuration export, report, test result, auditor letter, or training record)."
      : "";

    const supporting: string[] = [];
    if (intakeRec.maturity) supporting.push(`recorded maturity: ${intakeRec.maturity}`);
    if (intakeRec.evidence.length) supporting.push(`evidence categories identified: ${intakeRec.evidence.join("; ")}`);

    return {
      slug: comp.slug,
      label: comp.label,
      component_number: comp.number,
      conclusion: notApplicable
        ? `${comp.label}: reported as not applicable on the Company's answer, subject to the auditor's determination.`
        : c && c.status !== "record_insufficient"
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
      evidence_followup: evidenceFollowup,
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
  // DOC 159 — "Never" is no prior audit, not an undescribed one.
  const priorFact = priorAuditFact(profileStr(intake, "last_audit"), priorScope);
  const prior_audit_dependency_gaps = priorFact.scope
    ? "Prior audit work is recorded; where the report relies on it, the reliance is limited to the coverage the Company itself describes."
    : priorFact.recorded
    ? "A prior audit is recorded, but its coverage is not described, so nothing in this assessment relies on prior work."
    : "No prior audit coverage is recorded, so nothing in this assessment depends on prior work.";
  // A-TEAM DELTA (ChatGPT batch review, 2026-08-31, P0-4) — recordGaps is
  // narrower than the full set of record-completion items this report
  // separately lists (unresolved auditor engagement, undescribed prior-audit
  // coverage, partial-evidence components) — an unqualified "No material
  // record limitation is identified" read as contradicting those. Scoped to
  // what this specific check actually covers.
  const material_record_limitations = recordGaps.length
    ? `The record itself is the limitation for ${asProse(recordGaps.map((r) => r.label))}: no assessable entry exists yet.`
    : "No additional cross-cutting record limitation is identified beyond the readiness actions stated in this report.";
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
      : `The Company reports ${incidentPhrase(count)} in the preceding twelve months.`);
  } else {
    sentences.push("The Company has not recorded an incident count for the preceding twelve months.");
  }
  if (c17.maturity) {
    sentences.push(`Its security-incident response management component is recorded as ${maturityPhrase(c17.maturity)}${c17.notes ? `, described as: "${noStop(c17.notes)}"` : ""}.`);
  }
  // DOC 159 — 11 CCR § 7123(e)(9) and (e)(10) make the audit report's
  // content turn on whether any incident was notified to consumers under
  // Civ. Code § 1798.82(a) or to an agency. The Company's own answer decides
  // what is stated; nothing is inferred from the count (guardrail i3).
  const hasIncidents = !!count && !/^none$/i.test(count);
  const notif = profileStr(intake, "incident_notifications");
  const consumersNotified = /^Affected consumers were notified|^Both affected consumers/.test(notif);
  const agencyNotified = /^An agency with jurisdiction|^Both affected consumers/.test(notif);
  const notificationOpen = hasIncidents && (!notif || notif === "Unsure");
  if (hasIncidents && notif === "No notification was required") {
    sentences.push("The Company reports that no reported incident required notification to affected consumers or to an agency, so 11 CCR § 7123(e)(9) and (e)(10) call for no notification material in the audit report on that answer.");
  }
  if (consumersNotified) {
    sentences.push("The Company reports that affected consumers were notified under Civ. Code § 1798.82(a); 11 CCR § 7123(e)(9) requires the audit report to include a sample copy of the notification, excluding any personal information, or a description of it.");
  }
  if (agencyNotified) {
    sentences.push("The Company reports that an agency with jurisdiction over privacy laws in California was notified; 11 CCR § 7123(e)(10) requires the audit report to include a sample copy of the required notification, excluding any personal information, or a description of it together with the dates and details of the activity that gave rise to it and any related remediation measures.");
  }
  if (notificationOpen) {
    sentences.push(notif === "Unsure"
      ? "The Company is unsure whether any reported incident required notification to affected consumers or to an agency; resolving that is a record-completion item, because 11 CCR § 7123(e)(9) and (e)(10) turn on it."
      : "Whether any reported incident required notification to affected consumers or to an agency is not recorded; 11 CCR § 7123(e)(9) and (e)(10) turn on it, so recording it is a record-completion item.");
  }
  sentences.push("Whether any incident involved personal information is addressed only to the extent the incident-response record states it; nothing is inferred from the count alone.");
  const followUps: string[] = [];
  if (!c17.maturity || c17.evidence.length === 0) {
    followUps.push("complete the incident-response component's record: its implementation status, its description, and the evidence categories available for it");
  }
  if (consumersNotified || agencyNotified) {
    followUps.push("prepare, for the audit report, the sample copy (personal information excluded) or the description of each notification the Company reports, with the dates, details and remediation measures 11 CCR § 7123(e)(10) requires for an agency notification");
  }
  if (notificationOpen) {
    followUps.push("record whether any reported incident required notification to affected consumers (Civ. Code § 1798.82(a)) or to an agency");
  }
  const follow_up = followUps.length
    ? `The incident-record follow-up is to ${followUps.join("; and to ")}.`
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
  const factText = noStop(recommendationFact(rec.notes, rec.maturity));
  const text = r.slot.template.replace("{fact}", factText);
  // Batch 4ed05f22 — see the per-component action above: never the same
  // sentence twice.
  const gapRaw = recommendationGap(rec.notes);
  const gapSentence = gapRaw && !sameSentence(gapRaw, factText) ? gapRaw : "";
  const owner = profileStr(intake, "remediation_owner");
  return `Rank ${r.rank} — ${r.label} - ${text}${gapSentence ? ` Remaining work, as recorded: ${gapSentence}.` : ""}${owner ? ` Recorded remediation owner: ${noStop(owner)}.` : ""} (EUP readiness recommendation; priority: ${r.priority}.)`;
}

/** Two note fragments are the same sentence when they match after trimming
 *  terminal punctuation, whitespace and case — the shape recommendationFact
 *  (first sentence, stop removed) and recommendationGap (the gap sentence)
 *  both return for a one-sentence note. Exported for the batch-4ed05f22 pin. */
export function sameSentence(a: string, b: string): boolean {
  const norm = (t: string) => t.trim().replace(/[.!?]+$/, "").replace(/\s+/g, " ").toLowerCase();
  const x = norm(a);
  const y = norm(b);
  return x.length > 0 && x === y;
}

// A-TEAM S4 RULING S2.6 (doc 119, 2026-08-31) — TWO ACTION CLASSES. The
// report identified four policy-only components, an unresolved auditor
// engagement, and missing prior-audit coverage, then said "Priority
// readiness actions: none identified" — because evidence "partial" resolves
// to no_gap and the engagement/prior-audit items were never actions at all
// (live batch row 32c9a611, mechanism-verified). Those items are now
// AUDIT-READINESS (RECORD-COMPLETION) actions, a separate class from
// program remediation; no determination changes and the ratified
// recommendation library is untouched.
export interface RecordCompletionAction {
  readonly label: string;
  readonly action: string;
  // DOC 137 (2026-09-01) — most record-completion items are unranked (the
  // register prints Rank "—" and Target "Within 90 days" for them) because
  // nothing else in THIS register waits on them. The § 7120 applicability
  // item is different: per the ratified gating hierarchy (applicability →
  // first-audit timing → auditor engagement → evidence readiness), it gates
  // every other item in this register, including the "Auditor engagement"
  // row directly below it. An explicit rank/priority lets
  // deriveActionRegister() (cyber-skeleton-assemble-v4.ts) print it as Rank
  // 1 / Immediate instead of "—" / "Within 90 days", so the register's own
  // columns actually reflect the sequencing the Executive Summary's
  // "Sequencing priority among the above" row already claims.
  readonly rank?: string;
  readonly priorityTier?: "Immediate" | "Within 90 days" | "Within 6 months" | "Monitor";
}

export function buildRecordCompletionExtras(intake: Bag, d: CyberDeliverables): RecordCompletionAction[] {
  const out: RecordCompletionAction[] = [];
  // DOC 137 (2026-09-01) — the § 7120 applicability question was the
  // Executive Summary's own stated top-priority item (see the "Sequencing
  // priority among the above" row in buildExecutiveSnapshotRows below) but
  // had no line item anywhere in the Readiness Action Register, so the
  // register meant to enumerate priorities was silent on the one the
  // Company was told matters most.
  if (resolveCyberApplicability((intake.profile ?? {}) as Bag).auditRequired.value === null) {
    out.push({
      label: "Audit applicability",
      action: "Resolve whether an independent cybersecurity audit is required (§ 7120) — the record does not yet state the revenue and sale/share facts the trigger table depends on. This precedes auditor engagement and every other item below.",
      rank: "1",
      priorityTier: "Immediate",
    });
  }
  if (d.independence_determination?.status === "record_insufficient") {
    out.push({
      label: "Auditor engagement",
      action: "Record the auditor engagement and its independence status; the readiness conclusion waits on completing this item.",
    });
  }
  // DOC 159 — never asked of a Company that reports no prior audit.
  const prior = priorAuditFact(profileStr(intake, "last_audit"), profileStr(intake, "prior_audit_scope"));
  if (prior.recorded && !prior.scope) {
    out.push({
      label: "Prior audit coverage",
      action: "Record what the prior cybersecurity audit covered, so any reliance on it can be assessed.",
    });
  }
  // DOC 159 — § 7123(e)(9)/(10): the notification answer beside a reported
  // incident, and the audit-report material it calls for.
  {
    const count = profileStr(intake, "incidents_12mo");
    const hasIncidents = !!count && !/^none$/i.test(count);
    const notif = profileStr(intake, "incident_notifications");
    if (hasIncidents && (!notif || notif === "Unsure")) {
      out.push({
        label: "Notification record",
        action: "Record whether any reported incident required notification to affected consumers (Civ. Code § 1798.82(a)) or to an agency with jurisdiction over privacy laws in California; 11 CCR § 7123(e)(9) and (e)(10) turn on it.",
      });
    } else if (hasIncidents && notif !== "No notification was required") {
      out.push({
        label: "Notification material for the audit report",
        action: "Prepare the sample copy (personal information excluded) or the description of each notification the Company reports, with the dates, details and remediation measures 11 CCR § 7123(e)(10) requires for an agency notification, for inclusion in the audit report under 11 CCR § 7123(e)(9) and (e)(10).",
      });
    }
  }
  // DOC 159 — § 7123(b)(2): a not-applicable position without a stated basis.
  {
    const raw = get(intake, "controls");
    if (Array.isArray(raw)) {
      for (const row of raw) {
        if (s(get(row, "maturity")) !== NOT_APPLICABLE_MATURITY || s(get(row, "na_reason"))) continue;
        const slug = s(get(row, "key"));
        const label = CYBER_7123_COMPONENTS.find((c) => c.slug === slug)?.label ?? slug;
        out.push({
          label,
          action: "State the basis for reporting this component as not applicable to the Company's information system, so the auditor can confirm the position (11 CCR § 7123(b)(2)).",
        });
      }
    }
  }
  for (const e of d.evidence_sufficiency) {
    if (e.sufficiency === "partial") {
      const label = CYBER_7123_COMPONENTS.find((c) => c.slug === e.slug)?.label ?? e.slug;
      out.push({
        label,
        action: "Add a testable artifact — a log, a configuration export, a report, a test result, an auditor letter, or a training record — behind the described control.",
      });
    }
  }
  return out;
}

export function buildReadinessActions(intake: Bag, recs: readonly ComponentRecommendation[], d?: CyberDeliverables): ReadinessActionsResult {
  // FD703575-CY4 — an action appears ONCE. Immediate-priority items render
  // under "Priority readiness actions"; the class families below list only
  // the remaining (non-Immediate) items. The live batch rendered the same
  // four Immediate items verbatim in both lists.
  const nonPriority = recs.filter((r) => r.priority !== "Immediate");
  const byClass = (classes: readonly string[]) => nonPriority.filter((r) => classes.includes(r.key.gapClass)).map((r) => actionSentence(r, intake));
  const priority_actions = recs.filter((r) => r.priority === "Immediate").map((r) => actionSentence(r, intake));
  // DOC 129 CY-1 (Batch 3 A-Team ruling, 2026-09-01) — while the Section-2
  // readiness conclusion is open (record_insufficient), "Priority readiness
  // actions: none identified" must not print beside it: the gating
  // record-completion ask IS the priority action.
  //
  // DOC 137 (2026-09-01) — this bullet always named auditor engagement (§
  // 7122) as the top item, even when § 7120 applicability was the actual
  // open gating question — the SAME applicability-first hierarchy that
  // buildOverallReadinessNarrative's single_next_act and
  // buildExecutiveSnapshotRows's "Sequencing priority among the above" row
  // (both below) already apply. A Batch 5 external PDF review caught the
  // resulting contradiction: the Executive Summary named § 7120 as gating
  // everything, while this Section 6 bullet named § 7122 auditor engagement
  // as the thing to complete "above all." The ratified gating hierarchy
  // (applicability → first-audit timing → auditor engagement → evidence
  // readiness) now governs here too, matching the other two surfaces.
  if (d && d.readiness_determination.conclusion === "record_insufficient" && priority_actions.length === 0) {
    const applicabilityUnresolved = resolveCyberApplicability((intake.profile ?? {}) as Bag).auditRequired.value === null;
    priority_actions.push(
      applicabilityUnresolved
        ? "Resolve whether an independent cybersecurity audit is required (§ 7120) — the record does not yet state the revenue and sale/share facts the trigger table depends on. This precedes auditor engagement and every other item, so the readiness conclusion cannot be reached until it is resolved."
        : "Complete the readiness record identified in Section 2 — the § 7122 auditor-engagement description above all — so the readiness conclusion can be reached; no readiness conclusion is available while it is open.",
    );
  }
  const evidence_package_actions = byClass(["evidence_insufficient"]);
  const implementation_actions = byClass(["not_implemented", "partially_implemented"]);
  const extras = d ? buildRecordCompletionExtras(intake, d) : [];
  const record_completion_actions = [
    ...byClass(["no_record", "no_maturity_stated"]),
    ...extras.map((x) => `${x.label} — ${x.action} (Audit-readiness record-completion item.)`),
  ];
  const sequencing = recs.length === 0 && extras.length === 0
    ? "No readiness actions are identified; the preparation focus is organizing the identified evidence for auditor access."
    : recs.length === 0
    ? "Program remediation: none identified on the information provided. The record-completion items above are what audit readiness waits on."
    : "Suggested sequencing: complete the record first, then close implementation gaps, then assemble the evidence packages - each earlier group unblocks the assessment of the later ones.";
  return { priority_actions, evidence_package_actions, implementation_actions, record_completion_actions, sequencing };
}

// ── Readiness conclusion (v1.1 § 7; guardrail i5) ─────────────────────────

export function buildOverallReadinessNarrative(intake: Bag, d: CyberDeliverables, recs: readonly ComponentRecommendation[]): { narrative: string; single_next_act: string } {
  const rd = d.readiness_determination;
  let narrative: string;
  switch (rd.conclusion) {
    case "ready":
      narrative = "On the Company's present description of its program and the evidence categories identified, the Company appears prepared to proceed to independent audit, subject to auditor verification of the identified evidence.";
      break;
    case "ready_subject_to_named_remediation": {
      // DOC 159 — the named items are the partially implemented, policy-only
      // and documented-not-demonstrated items the determination now carries
      // (blocking_components is empty by definition on this conclusion; the
      // old sentence printed an empty list).
      const named = rd.remediation_items && rd.remediation_items.length
        ? rd.remediation_items
        : [
          ...d.component_coverage.filter((c) => c.verdict === "partially_satisfied").map((c) => c.label),
          ...d.evidence_sufficiency.filter((e) => e.sufficiency === "partial").map((e) => e.label.replace(/^Evidence sufficiency — /, "")),
        ];
      narrative = `On the Company's present description, the Company can prepare to proceed to independent audit once the named items are closed: ${asProse(named)}. Each is a readiness item, not an auditor finding.`;
      break;
    }
    case "not_ready":
      narrative = `On the Company's own description, ${rd.blocking_components.length === 1 ? "a material item stands" : "material items stand"} between the program and audit readiness: ${asProse(rd.blocking_components.map((b) => b.label))}. The readiness actions above sequence the closing work.`;
      break;
    default:
      narrative = "The record is insufficient for a readiness conclusion: the open items are record-completion matters, and completing them - not remediating a described deficiency - is what a conclusion waits on.";
  }
  // A-TEAM DELTA (ChatGPT batch review, 2026-08-31, P0-4/fleet P0-4) — this
  // picked recs[0] (or the generic evidence-organizing fallback) with no
  // visibility into d.independence_determination, the SAME status
  // buildRecordCompletionExtras (above) already reads to know that an
  // unresolved auditor engagement gates the whole readiness conclusion. The
  // narrative built two paragraphs up can say resolving auditor engagement
  // precedes everything, while this sentence named a different "most
  // important" act — a direct contradiction. The gating check now runs
  // first, matching the narrative's own logic.
  //
  // DOC 135 (Batch 4 A-Team review, 2026-09-01) — the auditor-engagement
  // gate itself was outranking a MORE fundamental open question: whether
  // § 7120 even requires an audit. Section 1's applicability table can show
  // both A1/A2 triggers as "Insufficient information" while this sentence
  // told the Company auditor engagement was the first gating item, with no
  // acknowledgment that applicability was open too. Applicability now gates
  // ahead of auditor engagement, matching the ratified gating hierarchy
  // (applicability → first-audit timing → auditor engagement → evidence
  // readiness).
  const applicabilityUnresolved = resolveCyberApplicability((intake.profile ?? {}) as Bag).auditRequired.value === null;
  const auditorEngagementGating = d.independence_determination?.status === "record_insufficient";
  const top = recs[0];
  const single_next_act = applicabilityUnresolved
    ? "The most important next act is to resolve whether an independent cybersecurity audit is required (§ 7120) — the record does not yet state the revenue and sale/share facts that trigger table depends on. The Company may continue preparing voluntarily while that is open; auditor engagement becomes the next gating item once applicability is resolved or the Company elects to proceed voluntarily."
    : auditorEngagementGating
    ? "The most important next act is to record the auditor engagement and its independence status; the readiness conclusion waits on completing this item before any other action below is sequenced."
    : top
    ? `The most important next act is on ${top.label}: ${top.slot.template.replace("{fact}", "the recorded entry")}`
    : "The most important next act is to keep the identified evidence packages organized for auditor access.";
  return { narrative, single_next_act };
}

// ── Evidence preservation (v1.1 § 8) ─────────────────────────────────────

export function buildEvidencePreservation(intake: Bag, d: CyberDeliverables): { actions: string; observations: string } {
  const withEvidence = d.evidence_sufficiency.filter((e) => e.testable_artifacts.length > 0).length;
  // DOC 159 — "Never" is no audit history, not a most-recent date.
  const prior = priorAuditFact(profileStr(intake, "last_audit"), profileStr(intake, "prior_audit_scope"));
  const actions = withEvidence > 0
    ? `Keep the evidence packages behind the ${withEvidence === 1 ? "component" : `${countWord(withEvidence)} components`} with testable artifacts organized for auditor access, and preserve everything relevant to the audit for at least five years after its completion.`
    : "As evidence is assembled for the components above, organize it for auditor access and preserve everything relevant to the audit for at least five years after its completion.";
  const observations = prior.recorded
    ? `Continuing readiness builds on the recorded audit history (most recent: ${noStop(prior.lastAudit)}): the annual cadence means the evidence practices established now recur, and the record built for this cycle is the baseline for the next.`
    : prior.never
    ? "Continuing readiness is annual: this first cycle sets the evidence practices that recur, and the record built now is the baseline for the next."
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
  // DOC 159 — the Company's § 7123(b)(2) positions: counted out of the
  // evidence denominator and named in their own row.
  const naRows = d.readiness_determination.not_applicable_components ?? [];
  const applicableTotal = CYBER_7123_COMPONENTS.length - naRows.length;

  const rows: string[][] = [["Company", entity]];
  if (industry) rows.push(["Operating context", industry]);
  if (naRows.length) {
    rows.push([
      "Components reported not applicable",
      `${countWord(naRows.length)} — ${asProse(naRows.map((r) => r.label))}; the Company's position, subject to the auditor's determination (11 CCR § 7123(b)(2))`,
    ]);
  }
  rows.push([
    "Evidence posture",
    // DOC 142 (2026-09-02, external reviewer P2) — "Testable evidence
    // identified for 0 of 18 components" sat alongside Section 1's
    // "Components lacking identified evidence: 0" and read as a
    // contradiction. The two measure different things: this row counts
    // components whose identified evidence an auditor could actually test
    // (operating artifacts, the "sufficient" bucket), while the Section 1
    // count asks only whether any evidence category is identified at all.
    // Both labels now name their own concept; see the paired relabel in
    // cyber-skeleton-assemble-v4.ts (purpose_scope_record:10).
    `Testable operating evidence identified for ${evOk} of ${applicableTotal}${naRows.length ? " applicable" : ""} components`,
  ]);
  rows.push([
    "Material program gaps identified",
    gaps.length
      ? `${asProse(gaps.slice(0, 3).map((r) => r.label))}${gaps.length > 3 ? `, and ${gaps.length - 3} more in Section 4` : ""}`
      : "None identified on the information provided",
  ]);
  // A-TEAM S4 RULING S2.6 (doc 119) — the snapshot separates program
  // remediation from audit-readiness record completion.
  const rcExtras = buildRecordCompletionExtras(intake, d);
  rows.push([
    "Audit-readiness (record-completion) actions",
    rcExtras.length
      ? `${rcExtras.length} — ${asProse(rcExtras.slice(0, 3).map((x) => x.label))}${rcExtras.length > 3 ? `, and ${rcExtras.length - 3} more in the Readiness Action Register` : ""}`
      : "None identified on the information provided",
  ]);
  // A-TEAM DELTA (ChatGPT multi-instance review, 2026-08-31, Cyber P1-1) —
  // this row ranks a subset of the actions ABOVE by sequencing priority; it
  // is not a fourth, independent action count. The old label and its bare
  // "None identified" read as directly contradicting the "6" two rows up.
  // Renamed, and the empty case now says explicitly that it means no item
  // carries elevated priority beyond what the record-completion row above
  // already lists — not that there is nothing to do.
  // A-TEAM DELTA (ChatGPT batch review, 2026-08-31, P0-4) — same gating
  // check as buildOverallReadinessNarrative's single_next_act: an unresolved
  // auditor engagement outranks every component-level item, and this row
  // must say so rather than falling to the generic "no item" sentence.
  // DOC 135 — same applicability-first gating fix as
  // buildOverallReadinessNarrative's single_next_act.
  const applicabilityUnresolved = resolveCyberApplicability((intake.profile ?? {}) as Bag).auditRequired.value === null;
  const auditorEngagementGating = d.independence_determination?.status === "record_insufficient";
  rows.push([
    "Sequencing priority among the above",
    applicabilityUnresolved
      ? "Audit applicability (§ 7120) — gating: whether an independent cybersecurity audit is required is not yet resolved; that precedes auditor engagement and every other item."
      : auditorEngagementGating
      ? "Auditor engagement — gating: the readiness conclusion waits on this item before any other action is sequenced."
      : inputs.nextSteps.length
      ? `${asProse(inputs.nextSteps.map((st) => st.slug).map((slug) => CYBER_7123_COMPONENTS.find((c) => c.slug === slug)?.label ?? slug))} — each stated in Section 6 with its owner`
      : "No item above carries elevated sequencing priority; the preparation focus is organizing the identified evidence for auditor access",
  ]);
  return rows;
}

export function buildExecutiveReadinessLines(inputs: FactorInputs): string {
  const { intake, deliverables: d, recommendations } = inputs;
  const rd = d.readiness_determination;
  const rs = buildRecordSufficiency(intake, d);
  const ind = buildIndependenceReadinessConsequence(d);

  const lines: string[] = [];
  if (s(rd.reasoning)) lines.push(stop(s(rd.reasoning)));
  lines.push(stop(rs.conclusion));
  lines.push(stop(ind));
  // DOC 137 (Category B, 2026-09-01) — the Readiness Action Register's Owner
  // column honestly prints "Not recorded" for every row when
  // remediation_owner is blank (deriveActionRegister, cyber-skeleton-
  // assemble-v4.ts), but nothing told the Company it needs to designate one.
  // Fires once, at summary level (a per-row sentence in a table column is
  // awkward), only when the register actually has at least one row —
  // otherwise there is nothing to own yet.
  const registerHasRows = recommendations.length > 0 || buildRecordCompletionExtras(intake, d).length > 0;
  if (registerHasRows && !profileStr(intake, "remediation_owner")) {
    lines.push(
      "The Company will need to designate an owner for the items in the Readiness Action Register; none is currently recorded.",
    );
  }
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
    readiness_actions: buildReadinessActions(intake, recommendations, deliverables),
    overall: buildOverallReadinessNarrative(intake, deliverables, recommendations),
    evidence_preservation: buildEvidencePreservation(intake, deliverables),
    executive_lines: buildExecutiveReadinessLines(inputs),
    executive_snapshot_rows: buildExecutiveSnapshotRows(inputs),
  };
}
