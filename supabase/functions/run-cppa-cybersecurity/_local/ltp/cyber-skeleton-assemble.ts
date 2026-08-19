// ITEM SO-4 WIRE-IN — CPPA CYBERSECURITY: ASSEMBLY THROUGH THE BYTE-PINNED SKELETON.
//
// This module assembles the document the CUSTOMER actually receives: the PDF
// renderer and the result page both read `report_data.skeleton_document`, which
// is what this file produces. It is DETERMINISTIC — every [DETERMINATION LEAD]
// and [GENERATED] block is composed from typed surfaces the cyber pipeline has
// already written (items 404–407), and every {slot} is filled from the live
// intake per `cppa-cyber.slotmap.ts`. No model call, no invented prose, no
// mutation of the typed surfaces.
//
// ITEM-204: the § 7121 phase-in schedule is quoted from the approved
// `provision_texts` row `cppa-7121`, all three tiers, never paraphrased and
// never resolved to a cohort by this code.

import {
  CYBER_SKELETON_SECTIONS,
  CYBER_SKELETON_TITLE,
  CYBER_SKELETON_SUBTITLE,
  CYBER_SKELETON_VERSION,
  CYBER_V3_BANNED_REGISTER,
} from "../prose/plans/cppa-cyber.spine.ts";
import {
  CYBER_AUDITOR_PHRASE_MAP,
  CYBER_INCIDENTS_PHRASE_MAP,
  CYBER_LAST_AUDIT_PHRASE_MAP,
} from "../prose/plans/cppa-cyber.slotmap.ts";
import {
  renderSkeletonDocument,
  renderTableOfAuthorities,
  skeletonDocumentToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type RenderedSkeletonDocument,
  type SlotValues,
} from "../../../_shared/prose/skeleton-render.ts";
import { repairRegister } from "../../../_shared/ltp/risk-skeleton-assemble.ts";

export const CYBER_SKELETON_ASSEMBLER_STAMP = "cyber-skeleton-assembler@so4-wire-in-2026-08-10";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((x) => (typeof x === "string" ? x.trim() : s((x as Bag)?.label ?? (x as Bag)?.text))).filter(Boolean)
    : s(v) ? [s(v)] : [];

function asProse(items: readonly string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** Drop a trailing period: the skeleton's fixed prose supplies its own. */
const noStop = (t: string): string => t.replace(/\s*\.\s*$/, "");

// ── The § 7121 phase-in passage (ITEM-204, byte-pinned corpus) ──────────────

/** The single pinned sentence that follows the quote; never reworded. */
export const CYBER_PHASE_IN_PINNED_SENTENCE =
  "The customer, in consultation with qualified legal counsel, determines which tier its revenue places it in and calendars the corresponding deadline.";

/**
 * Quotes subsection (a) of the approved § 7121 corpus row — all three tiers —
 * verbatim. Only leading indentation is collapsed; no word is changed, no tier
 * is dropped, and no cohort is computed.
 */
export function buildPhaseInBlock(corpusExcerpt: string): string {
  const text = s(corpusExcerpt);
  if (!text) return "";
  const start = text.indexOf("(a)");
  if (start < 0) return "";
  const endMarker = text.indexOf("\n(b)", start);
  const raw = endMarker > 0 ? text.slice(start, endMarker) : text.slice(start);
  const quoted = raw
    .split("\n")
    .map((line) => line.replace(/\s+$/, "").replace(/^\s{6,}/, "      "))
    .join("\n")
    .trim();
  if (!quoted) return "";
  return `11 CCR § 7121(a) fixes when the first cybersecurity audit report is due:\n\n${quoted}\n\n${CYBER_PHASE_IN_PINNED_SENTENCE}`;
}

// ── Slot values ─────────────────────────────────────────────────────────────

export function buildCyberSlotValues(intake: Bag): SlotValues {
  const profile = ((intake.profile ?? {}) as Bag);
  const framework = s(profile.framework);
  const inScope = arr(profile.in_scope_frameworks);
  const engagement = s(profile.auditor_engagement_status);
  const prior = s(profile.prior_audit_scope);
  const incidents = s(profile.incidents_12mo);
  const lastAudit = s(profile.last_audit);

  return {
    // Entity name is a proper noun — never case-folded (the SO-3 defect class).
    "profile.entity_name": s(profile.entity_name) || "the company",
    "profile.framework": framework || null,
    "profile.in_scope_frameworks": asProse(inScope.length ? inScope : (framework ? [framework] : [])) || null,
    "profile.audit_scope_rationale": noStop(s(profile.audit_scope_rationale)) || null,

    AUDITOR_PHRASE: engagement
      ? (CYBER_AUDITOR_PHRASE_MAP[engagement] ?? `that its auditor engagement is: ${engagement}`)
      : null,
    PRIOR_AUDIT_SENTENCE: prior
      ? `The company has described the coverage of its prior audit as ${noStop(prior)}`
      : "The company has not recorded the coverage of any prior audit",
    "profile.incidents_12mo": incidents
      ? (CYBER_INCIDENTS_PHRASE_MAP[incidents] ?? `${incidents} security incidents`)
      : null,
    "profile.last_audit": lastAudit
      ? (CYBER_LAST_AUDIT_PHRASE_MAP[lastAudit] ?? lastAudit)
      : null,
  };
}

// ── Composed blocks ─────────────────────────────────────────────────────────

interface Counts {
  total: number;
  scored: number;
  insufficient: number;
  byStatus: Record<string, number>;
}

function readCounts(report: Bag): Counts {
  const c = (report.control_status_counts ?? {}) as Bag;
  const byStatus = (c.by_status ?? {}) as Record<string, number>;
  return {
    total: Number(c.total_components ?? 18),
    scored: Number(c.scored_count ?? 0),
    insufficient: Number(c.insufficient_count ?? 0),
    byStatus: byStatus && typeof byStatus === "object" ? byStatus : {},
  };
}

const gapStatuses = ["Critical Gap", "Gap", "Partial"];

function gapCount(counts: Counts): number {
  return gapStatuses.reduce((n, k) => n + Number(counts.byStatus[k] ?? 0), 0);
}

function composeExecutiveLead(report: Bag): string {
  const rd = (report.readiness_determination ?? {}) as Bag;
  const headline = s(rd.headline);
  if (headline) return repairRegister(headline);
  const counts = readCounts(report);
  const gaps = gapCount(counts);
  return gaps === 0
    ? "On the company's answers, its recorded programme is ready for the certified cybersecurity audit across the enumerated components."
    : `On the company's answers, its recorded programme is not yet ready for the certified cybersecurity audit: ${gaps === 1 ? "one component is" : `${gaps} components are`} not yet supported.`;
}

function composeExecutiveBody(report: Bag): string {
  const counts = readCounts(report);
  const rd = (report.readiness_determination ?? {}) as Bag;
  const strongest = Object.entries(counts.byStatus)
    .filter(([k]) => k === "Mature" || k === "Implemented")
    .reduce((n, [, v]) => n + Number(v ?? 0), 0);
  const gaps = gapCount(counts);

  const sentences: string[] = [];
  sentences.push(
    strongest > 0
      ? `The company's answers support ${strongest === 1 ? "one component" : `${strongest} components`} of the ${counts.total} the regulation enumerates.`
      : `The company's answers do not yet support any of the ${counts.total} components the regulation enumerates.`,
  );
  if (gaps > 0) {
    sentences.push(`${gaps === 1 ? "One component carries" : `${gaps} components carry`} a material gap on the company's answers, and the remediation section names the action that closes each.`);
  } else {
    sentences.push("No component carries a material gap on the company's answers.");
  }
  if (counts.insufficient > 0) {
    sentences.push(`${counts.insufficient === 1 ? "One component is" : `${counts.insufficient} components are`} left unsupported by the answers given, and is treated as unassessed rather than as satisfied.`);
  }
  if (s(rd.reasoning)) sentences.push(noStop(s(rd.reasoning)) + ".");
  return repairRegister(sentences.join(" "));
}

function composeIndependence(report: Bag): string {
  const ind = (report.independence_determination ?? {}) as Bag;
  const summary = s(ind.summary);
  return summary ? repairRegister(noStop(summary) + ".") : "";
}

function composeComponentsLead(report: Bag): string {
  const counts = readCounts(report);
  const gaps = gapCount(counts);
  const supported = counts.total - gaps - counts.insufficient;
  if (gaps === 0 && counts.insufficient === 0) {
    return `The company's answers support all ${counts.total} enumerated components, and no material gap arises on those answers.`;
  }
  const clauses: string[] = [`The company's answers support ${supported} of the ${counts.total} enumerated components`];
  if (gaps > 0) clauses.push(`the material gaps sit in ${gaps === 1 ? "one component" : `${gaps} components`}`);
  if (counts.insufficient > 0) clauses.push(`${counts.insufficient === 1 ? "one component is" : `${counts.insufficient} components are`} left unsupported by the answers given`);
  return `${clauses.join("; ")}.`;
}

function componentLabels(intake: Bag): string[] {
  const controls = Array.isArray(intake.controls) ? (intake.controls as Bag[]) : [];
  return controls.map((c) => s(c.label) || s(c.key));
}

function composeComponents(report: Bag, intake: Bag): string {
  const controls = Array.isArray(report.controls) ? (report.controls as Bag[]) : [];
  const labels = componentLabels(intake);
  const intakeControls = Array.isArray(intake.controls) ? (intake.controls as Bag[]) : [];
  const out = controls.map((c, i) => {
    const label = s(c.label) || labels[i] || `Component ${i + 1}`;
    const status = s(c.status);
    const evidence = arr(intakeControls[i]?.evidence);
    const bits: string[] = [];
    bits.push(`${label} — ${status || "not stated"}.`);
    if (evidence.length && !/^none on file$/i.test(evidence[0])) {
      bits.push(`The company has indicated that it holds ${asProse(evidence).toLowerCase()} for this component.`);
    } else if (evidence.length) {
      bits.push("The company has indicated that it holds no evidence on file for this component.");
    }
    if (s(c.finding)) bits.push(noStop(s(c.finding)) + ".");
    if (s(c.remediation)) bits.push(noStop(s(c.remediation)) + ".");
    return repairRegister(bits.join(" "));
  });
  return out.filter(Boolean).join("\n\n");
}

function composeRemediationLead(report: Bag): string {
  const counts = readCounts(report);
  const gaps = gapCount(counts);
  const risks = Array.isArray(report.top_risks) ? (report.top_risks as Bag[]).length : 0;
  if (gaps === 0 && risks === 0) {
    return "On the company's answers, no remediation is outstanding before the audit.";
  }
  return `On the company's answers, ${risks || gaps} ${((risks || gaps) === 1) ? "matter requires" : "matters require"} remediation before the audit, each owned and timed below.`;
}

function composeRemediation(report: Bag, intake: Bag): string {
  const profile = ((intake.profile ?? {}) as Bag);
  const owner = s(profile.remediation_owner);
  const risks = Array.isArray(report.top_risks) ? (report.top_risks as Bag[]) : [];
  const steps = Array.isArray(report.next_steps) ? (report.next_steps as Bag[]) : [];

  const blocks = risks.map((r, i) => {
    const bits = [
      `${i + 1}. ${noStop(s(r.title) || s(r.description))}.`,
      s(r.description) && s(r.title) ? noStop(s(r.description)) + "." : "",
      s(r.deadline) ? `Timeframe: ${noStop(s(r.deadline))}.` : "",
    ].filter(Boolean);
    return repairRegister(bits.join(" "));
  });

  const stepText = steps
    .map((st) => s(st.text) || s(st.action))
    .filter(Boolean)
    .map((t, i) => `${i + 1}. ${repairRegister(noStop(t))}.`);

  const parts: string[] = [];
  if (blocks.length) parts.push(blocks.join("\n\n"));
  if (stepText.length) parts.push(`The actions that close them:\n\n${stepText.join("\n\n")}`);
  if (owner) parts.push(`The company has named ${noStop(owner)} as responsible for closing these actions.`);
  return parts.join("\n\n");
}

function composeConclusionLead(report: Bag): string {
  const rd = (report.readiness_determination ?? {}) as Bag;
  const conclusion = s(rd.conclusion);
  const level = s(report.readiness_level);
  if (conclusion === "ready") {
    return "On the company's answers, the programme is ready for the certified audit, conditional on the evidence named above being retained and produced to the auditor.";
  }
  if (level) {
    return `On the company's answers, the audit-readiness conclusion is ${level.toLowerCase()}, conditional on the remediation named above being completed and evidenced before the audit period closes.`;
  }
  return "On the company's answers, the programme is not yet ready for the certified audit, conditional on the remediation named above being completed and evidenced.";
}

function composeConclusion(report: Bag, intake: Bag): string {
  const profile = ((intake.profile ?? {}) as Bag);
  const owner = s(profile.remediation_owner);
  const rd = (report.readiness_determination ?? {}) as Bag;
  const steps = Array.isArray(report.next_steps) ? (report.next_steps as Bag[]) : [];
  const first = s(steps[0]?.text) || s(steps[0]?.action);
  const sentences: string[] = [];
  if (s(rd.reasoning)) sentences.push(noStop(s(rd.reasoning)) + ".");
  sentences.push(
    "The regulation is satisfied by evidence an auditor can test, not by the company's description of its programme, so each component above stands or falls on the artefact behind it.",
  );
  if (first) {
    sentences.push(
      owner
        ? `The single next act is for ${noStop(owner)} to ${first.charAt(0).toLowerCase()}${noStop(first.slice(1))}.`
        : `The single next act is to ${first.charAt(0).toLowerCase()}${noStop(first.slice(1))}.`,
    );
  }
  return repairRegister(sentences.join(" "));
}

// ── Assembly ────────────────────────────────────────────────────────────────

export interface CyberSkeletonResult {
  readonly document: RenderedSkeletonDocument;
  readonly conformance: ReturnType<typeof verifySkeletonConformance>;
  readonly register_findings: string[];
}

export function assembleCyberSkeletonDocument(
  report: Bag,
  intake: Bag,
  phaseInCorpusExcerpt: string,
): CyberSkeletonResult {
  const values = buildCyberSlotValues(intake);

  const composedBase: ComposedBlocks = {
    "executive_summary:0": composeExecutiveLead(report),
    "executive_summary:2": composeExecutiveBody(report),

    // Section I block 1 is the ITEM-204 byte-pinned corpus quote.
    "audit_scope:1": buildPhaseInBlock(phaseInCorpusExcerpt),

    "required_components:0": composeComponentsLead(report),
    "required_components:1": [composeIndependence(report), composeComponents(report, intake)]
      .filter(Boolean).join("\n\n"),

    "findings_remediation:0": composeRemediationLead(report),
    "findings_remediation:2": composeRemediation(report, intake),

    "conclusion:0": composeConclusionLead(report),
    "conclusion:1": composeConclusion(report, intake),
  };

  const draft = renderSkeletonDocument({
    sections: CYBER_SKELETON_SECTIONS,
    title: CYBER_SKELETON_TITLE,
    subtitle: CYBER_SKELETON_SUBTITLE,
    spineVersion: CYBER_SKELETON_VERSION,
    values,
    composed: composedBase,
  });

  const exhibit = (report.authority_exhibit ?? {}) as Bag;
  const ledger = Array.isArray(exhibit.entries)
    ? (exhibit.entries as Bag[]).map((e) => s(e.citation)).filter(Boolean)
    : [];
  const toa = renderTableOfAuthorities(ledger, skeletonDocumentToText(draft));

  const document = renderSkeletonDocument({
    sections: CYBER_SKELETON_SECTIONS,
    title: CYBER_SKELETON_TITLE,
    subtitle: CYBER_SKELETON_SUBTITLE,
    spineVersion: CYBER_SKELETON_VERSION,
    values,
    composed: { ...composedBase, "table_of_authorities:0": toa },
  });

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = CYBER_V3_BANNED_REGISTER.filter((b) => body.includes(b));

  return {
    document,
    conformance: verifySkeletonConformance(document, CYBER_SKELETON_SECTIONS),
    register_findings,
  };
}
