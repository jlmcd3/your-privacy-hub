// CPPA CYBER — v4 ASSEMBLY (C2: the Spine v1.1 encode, 2026-08-26).
// A-TEAM S3 RULING I.23 (doc 115) — customer-facing dates in long form.
import { formatReportDateLong } from "../../../_shared/report-dates.ts";
//
// Assembles the deterministic customer document through the v4 skeleton
// (`cppa-cyber-v4.spine.ts` — the CEO's Cyber Spine v1.1 as render law).
// Runs ONLY on the deterministic path (CYBER_DETERMINISTIC_ENABLED); the
// flag-off model path keeps the untouched v3 assembler
// (cyber-skeleton-assemble.ts), so legacy behavior cannot drift.
//
// Every composed block is authored by cyber-factors.ts (the single FACTOR
// writer) or read from the typed DERIVED surfaces; every table is built
// here from the same facts. Zero model calls, zero I/O beyond arguments.

import {
  CYBER_V4_BANNED_REGISTER,
  CYBER_V4_SKELETON_SECTIONS,
  CYBER_V4_SKELETON_SUBTITLE,
  CYBER_V4_SKELETON_TITLE,
  CYBER_V4_SKELETON_VERSION,
} from "../prose/plans/cppa-cyber-v4.spine.ts";
import {
  renderSkeletonDocument,
  renderTableOfAuthorities,
  skeletonDocumentToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type RenderedSkeletonDocument,
  type RenderedTable,
  type SkeletonTables,
} from "../../../_shared/prose/skeleton-render.ts";
import { repairRegister } from "../../../_shared/ltp/risk-skeleton-assemble.ts";
import { buildCyberApplicabilityTable } from "./cyber-applicability.ts";
import { buildCyberSubmissionAttestationBlock } from "./cyber-submission-attestation.ts";
import { buildPhaseInBlock } from "./cyber-skeleton-assemble.ts";
import type { CyberDeliverables } from "./cppa-cyber-deliverables/types.ts";
import type { ComponentRecommendation, CyberNextStep } from "./cppa-cyber-deliverables/cyber-recommendations.ts";
import { recommendationFact } from "./cppa-cyber-deliverables/cyber-recommendations.ts";
import { buildCyberFactors, buildRecordCompletionExtras, type CyberFactorOutputs, type RecordCompletionAction } from "./cppa-cyber-deliverables/cyber-factors.ts";
import { CYBER_7123_COMPONENTS } from "./cppa-cyber-deliverables/components.ts";
import { CYBER_CORPUS_MAP } from "../corpus/maps/cyber-corpus-map.ts";
import { ADVISORY_APPENDIX_PREAMBLE, advisoryMatchesTable, matchAdvisoryRows } from "../../../_shared/corpus/advisory-surfacing.ts";

export const CYBER_V4_ASSEMBLER_STAMP = "cyber-skeleton-assembler@c2-spine-v1.1-2026-08-26";

// A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, Cyber
// P0-3) — a year.month framework version derived from the internal stamp's
// date component, for the one customer-facing row that used to print the
// stamp itself.
function cyberFrameworkVersionLabel(stamp: string): string {
  const m = /(\d{4})-(\d{2})-\d{2}$/.exec(stamp);
  return m ? `${m[1]}.${m[2]}` : "Not recorded";
}

type Bag = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => s(x)).filter(Boolean) : s(v) ? [s(v)] : [];

function controlRec(intake: Bag, slug: string): { maturity: string; notes: string; evidence: string[] } {
  const raw = (intake as Bag).controls;
  if (Array.isArray(raw)) {
    for (const c of raw) {
      if (s((c as Bag)?.key) === slug) {
        return {
          maturity: s((c as Bag).maturity),
          notes: s((c as Bag).notes),
          evidence: arr((c as Bag).evidence),
        };
      }
    }
  }
  return { maturity: "", notes: "", evidence: [] };
}

// ── Tables ──────────────────────────────────────────────────────────────────

// BATCH 19a (doc 113 S3.4) — the fleet-law cover verdict row, mapped from
// the typed readiness conclusion ENUM (a status label; the ratified
// headline bytes are untouched — RULING 3.2).
function coverVerdictPhrase(conclusion: string): string {
  switch (conclusion) {
    case "ready":
      return "Ready for the independent audit on the Company's answers";
    case "ready_subject_to_named_remediation":
      return "Ready subject to the named remediation";
    case "not_ready":
      return "Not yet ready — blocking items named in this report";
    default:
      return "No readiness conclusion on the information provided";
  }
}

function deriveCoverTable(intake: Bag, reportDate: string, readinessConclusion: string): RenderedTable {
  const profile = ((intake.profile ?? {}) as Bag);
  return {
    key: "",
    surface: "cyber_v4_cover",
    title: "",
    columns: ["Field", "Value"],
    hideHeader: true,
    rows: [
      ["Entity", s(profile.entity_name) || "the company"],
      ["Report date", formatReportDateLong(reportDate)],
      ["Assessment", "CPPA Cybersecurity Audit Readiness Report"],
      ["Regulatory reference", "11 CCR §§ 7120–7124"],
      // BATCH 19a (doc 113 S3.4): verdict-on-cover, the ADMT pattern as
      // fleet law (doc 109 §1.6).
      ["Overall assessment", coverVerdictPhrase(readinessConclusion)],
      // PANEL CYB-5 (2026-08-30): the spine version string is generation
      // metadata, not cover content; it stays in Appendix D's engine-version
      // row, where the reperformance record belongs.
    ],
  };
}

// BATCH 19a (doc 113 S3.4) — the Readiness snapshot: the exec label/value
// facts as a hideHeader table, directly after the determination lead.
function deriveReadinessSnapshot(factors: CyberFactorOutputs): RenderedTable | null {
  const rows = factors.executive_snapshot_rows.map((r) => [...r]);
  if (!rows.length) return null;
  return {
    key: "",
    surface: "cyber_v4_readiness_snapshot",
    title: "Readiness snapshot",
    columns: ["Field", "Value"],
    rows,
    hideHeader: true,
  };
}

function deriveComponentMatrix(
  intake: Bag,
  deliverables: CyberDeliverables,
  factors: CyberFactorOutputs,
): RenderedTable {
  const covBySlug = new Map(deliverables.component_coverage.map((c) => [c.slug, c]));
  const evBySlug = new Map(deliverables.evidence_sufficiency.map((e) => [e.slug, e]));
  const faBySlug = new Map(factors.component_analyses.map((f) => [f.slug, f]));
  return {
    key: "",
    surface: "cyber_v4_component_matrix",
    title: "Component Readiness Matrix",
    columns: [
      "Component",
      "Maturity",
      "Notes",
      "Evidence categories",
      "Coverage",
      "Evidence sufficiency",
      "Material gap",
      "Program remediation",
      "Evidence / readiness follow-up",
    ],
    rows: CYBER_7123_COMPONENTS.map((comp) => {
      const rec = controlRec(intake, comp.slug);
      const cov = covBySlug.get(comp.slug);
      const ev = evBySlug.get(comp.slug);
      const fa = faBySlug.get(comp.slug);
      return [
        `${comp.number}. ${comp.label}`,
        rec.maturity || "Not stated",
        rec.notes ? "Provided" : "None",
        rec.evidence.length ? rec.evidence.join("; ") : "None identified",
        // DOC 159 — the Company's § 7123(b)(2) position prints as a position,
        // never as a coverage verdict; the evidence cell prints plain words.
        cov
          ? (cov.status === "record_insufficient"
            ? "Record insufficient"
            : cov.verdict === "not_applicable"
            ? "Not applicable (Company's position)"
            : cov.verdict.replace(/_/g, " "))
          : "",
        ev ? ev.sufficiency.replace(/_/g, " ") : "",
        fa && fa.materiality === "Material" ? "Yes" : "No",
        // A-TEAM DELTA (ChatGPT multi-instance review, 2026-08-31, Cyber
        // P1-2) — split from one "Recommended action" column into the two
        // dimensions cyber-factors.ts now types separately: program
        // remediation and evidence/readiness follow-up.
        fa?.recommended_action ?? "",
        fa?.evidence_followup || "None",
      ];
    }),
  };
}

function deriveEvidenceIndex(deliverables: CyberDeliverables): RenderedTable {
  return {
    key: "",
    surface: "cyber_v4_evidence_index",
    title: "Evidence Readiness Index",
    columns: ["Component", "Evidence categories identified", "Testable artifacts", "Sufficiency"],
    // PANEL CYB-6 (2026-08-30): the row label carries an "Evidence
    // sufficiency — " prefix that duplicated the table's own title and
    // Sufficiency column in all 18 rows; the Component cell names the
    // component alone.
    rows: deliverables.evidence_sufficiency.map((e) => [
      `${e.component_number}. ${e.label.replace(/^Evidence sufficiency — /, "")}`,
      e.sufficiency === "not_applicable" ? "Not required (reported as not applicable)" : e.evidence_offered.length ? e.evidence_offered.join("; ") : "None identified",
      e.sufficiency === "not_applicable" ? "—" : e.testable_artifacts.length ? e.testable_artifacts.join("; ") : "None",
      e.sufficiency.replace(/_/g, " "),
    ]),
  };
}

const ACTION_TYPE_BY_GAP_CLASS: Readonly<Record<string, string>> = {
  no_record: "Record completion",
  no_maturity_stated: "Record completion",
  not_implemented: "Implementation",
  partially_implemented: "Implementation",
  evidence_insufficient: "Evidence",
};

function deriveActionRegister(
  intake: Bag,
  recommendations: readonly ComponentRecommendation[],
  recordCompletion: readonly RecordCompletionAction[] = [],
): RenderedTable {
  const owner = s((intake.profile as Bag | undefined)?.remediation_owner);
  // A-TEAM DELTA (ChatGPT multi-instance review, 2026-08-31, Cyber P1-3) —
  // PriorityTier ("Immediate" / "Within 90 days" / "Within 6 months" /
  // "Monitor") names a target timeframe, not a priority level; a single
  // "Priority" column showing "Within 90 days" reads as a deadline mislabeled
  // as urgency. Split into a priority tier word and its target timeframe —
  // no new fact, same tier, two views of it.
  const PRIORITY_TIER_LABEL: Record<string, string> = {
    "Immediate": "High",
    "Within 90 days": "Medium",
    "Within 6 months": "Medium",
    "Monitor": "Low",
  };
  return {
    key: "",
    surface: "cyber_v4_action_register",
    title: "Readiness Action Register",
    columns: ["Rank", "Component", "Action", "Type", "Priority", "Target", "Owner"],
    // PANEL CYB-6 (2026-08-30): a zero-action register used to render as an
    // empty appendix (intro paragraph, then nothing — it read as a
    // rendering failure). The empty state is now an explicit one-row
    // result, consistent with Section 6's "none identified" sentence.
    // A-TEAM S4 RULING S2.6 (doc 119) — audit-readiness record-completion
    // items are a second action class; the empty state fires only when BOTH
    // classes are empty.
    rows: recommendations.length || recordCompletion.length
      ? [
        // DOC 137 (2026-09-01) — a record-completion item can now carry its
        // own rank/priorityTier (currently only the § 7120 applicability
        // item, buildRecordCompletionExtras). Giving it Rank "1" only helps
        // if the row also SITS first: the array order below used to place
        // every record-completion row after all numbered recommendation
        // rows, so a "Rank 1" label would have printed on the LAST row of
        // the table — visually contradicting the very sequencing it names.
        // Ranked record-completion items render first; unranked ones keep
        // their previous position, after the numbered recommendations.
        ...recordCompletion.filter((x) => x.rank).map((x) => [
          x.rank!,
          x.label,
          x.action,
          "Record completion",
          PRIORITY_TIER_LABEL[x.priorityTier ?? "Within 90 days"],
          x.priorityTier ?? "Within 90 days",
          owner || "Not recorded",
        ]),
        ...recommendations.map((r) => {
          const rec = controlRec(intake, r.slug);
          return [
            String(r.rank),
            r.label,
            // FD703575-CY3 — first-sentence fact, never the whole notes narrative.
            r.slot.template.replace("{fact}", recommendationFact(rec.notes, rec.maturity)),
            ACTION_TYPE_BY_GAP_CLASS[r.key.gapClass] ?? "Readiness",
            PRIORITY_TIER_LABEL[r.priority] ?? r.priority,
            r.priority,
            owner || "Not recorded",
          ];
        }),
        ...recordCompletion.filter((x) => !x.rank).map((x) => [
          "—",
          x.label,
          x.action,
          "Record completion",
          PRIORITY_TIER_LABEL["Within 90 days"],
          "Within 90 days",
          owner || "Not recorded",
        ]),
      ]
      : [[
        "—",
        "All components",
        "No readiness actions are identified for any component; Section 6 records the same result.",
        "—",
        "—",
        "—",
        "—",
      ]],
  };
}

function deriveAssessmentProfileRecord(intake: Bag, reportDate: string): RenderedTable {
  const profile = ((intake.profile ?? {}) as Bag);
  // PANEL CYB-3 (2026-08-30): s() returns "" for non-strings, so the
  // ARRAY-valued in_scope_frameworks always rendered "Not recorded" here
  // while § 1 named the same frameworks — the provenance appendix
  // contradicted the body it provenances. Arrays now render joined.
  const field = (label: string, key: string): [string, string] => {
    const v = profile[key];
    const text = Array.isArray(v) ? v.map((x) => s(x)).filter(Boolean).join(", ") : s(v);
    return [label, text || "Not recorded"];
  };
  return {
    key: "",
    surface: "cyber_v4_assessment_record_profile",
    title: "Profile facts and generation metadata",
    columns: ["Field", "Recorded value"],
    rows: [
      field("Entity", "entity_name"),
      field("Industry", "industry"),
      field("Primary framework", "framework"),
      field("Most recent audit", "last_audit"),
      field("Incidents (12 months)", "incidents_12mo"),
      field("Frameworks in scope", "in_scope_frameworks"),
      field("Audit-scope rationale", "audit_scope_rationale"),
      field("Auditor engagement status", "auditor_engagement_status"),
      field("Prior audit scope", "prior_audit_scope"),
      field("Remediation owner", "remediation_owner"),
      ["Report date", formatReportDateLong(reportDate)],
      // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, Cyber
      // P0-3) — the raw internal spine/build tag ("c2-spine-v1.1-2026-08-26")
      // read as an engineering artifact. A customer-facing framework version
      // (year.month, matching the date component) replaces it; the internal
      // tag stays in CYBER_V4_ASSEMBLER_STAMP for engineering use.
      ["Assessment framework version", cyberFrameworkVersionLabel(CYBER_V4_ASSEMBLER_STAMP)],
    ],
  };
}

function deriveAssessmentControlRecord(intake: Bag): RenderedTable {
  return {
    key: "",
    surface: "cyber_v4_assessment_record_controls",
    title: "Component facts, as recorded",
    columns: ["Component", "Maturity", "Description", "Evidence categories"],
    rows: CYBER_7123_COMPONENTS.map((comp) => {
      const rec = controlRec(intake, comp.slug);
      return [
        `${comp.number}. ${comp.label}`,
        rec.maturity || "Not stated",
        rec.notes || "None provided",
        rec.evidence.length ? rec.evidence.join("; ") : "None identified",
      ];
    }),
  };
}

function deriveSignatureTable(): RenderedTable {
  const BLANK = "________________________________";
  return {
    key: "",
    surface: "cyber_signature",
    title: "",
    columns: ["Field", "Value"],
    hideHeader: true,
    rows: [
      ["Name", BLANK],
      ["Title", BLANK],
      ["Signature", BLANK],
      ["Date", BLANK],
    ],
  };
}

// ── Composed sections ───────────────────────────────────────────────────────

function joinLines(...parts: (string | null | undefined)[]): string {
  return parts.map((p) => s(p)).filter(Boolean).join("\n\n");
}

// PANEL CYB-6 (2026-08-30, welded-blocks class): repairRegister ends with
// `\s{2,}` → " ", which collapsed every joinLines("\n\n") seam and every
// label/bullet line list into one run-on paragraph (the published § 1 read
// "…12 months: None Tomorrow4Cariboo, Inc. operates in…"). Repair is applied
// per line, preserving the line and paragraph structure the renderer's
// \n{2,} split depends on. Register bytes are repaired exactly as before.
function repairPreserving(text: string): string {
  return text.split("\n").map((l) => repairRegister(l)).join("\n");
}

function composeCompanyContext(intake: Bag, factors: CyberFactorOutputs): string {
  const profile = ((intake.profile ?? {}) as Bag);
  const lines: string[] = [];
  const line = (label: string, v: string) => {
    if (v) lines.push(`${label}: ${v}`);
  };
  line("Entity", s(profile.entity_name));
  line("Industry / operating context", s(profile.industry));
  line("Primary cybersecurity framework", s(profile.framework));
  line("Most recent cybersecurity audit", s(profile.last_audit));
  line("Security incidents in the preceding 12 months", s(profile.incidents_12mo));
  return joinLines(lines.join("\n"), factors.company_context_analysis);
}

function composeComponentModules(factors: CyberFactorOutputs): string {
  // BATCH 18 (Wave C1): each component renders as its own h3 chunk
  // ("1. Authentication" — the R2 numbered shape), a labeled record chunk,
  // the S4 rulemaking-context panel as its own chunk, and a Next action
  // line only when a real action exists (no-padding law — the ×18
  // "No remediation identified" lines are gone).
  return factors.component_analyses
    .map((f) => {
      const parts = [
        `${f.component_number}. ${f.label}`,
        repairPreserving(f.narrative),
      ];
      if (f.rulemaking_context) parts.push(repairPreserving(f.rulemaking_context));
      if (f.recommended_action && !/^No remediation identified/i.test(f.recommended_action)) {
        parts.push(`Next action: ${f.recommended_action}`);
      }
      return parts.join("\n\n");
    })
    .join("\n\n");
}

function bullets(items: readonly string[]): string {
  return items.map((x) => `• ${x}`).join("\n");
}

// ── Assembly ────────────────────────────────────────────────────────────────

export interface CyberV4SkeletonResult {
  readonly document: RenderedSkeletonDocument;
  readonly conformance: ReturnType<typeof verifySkeletonConformance>;
  readonly register_findings: string[];
  readonly factors: CyberFactorOutputs;
}

export function assembleCyberSkeletonDocumentV4(
  report: Bag,
  intake: Bag,
  phaseInCorpusExcerpt: string,
  reportDate: string = new Date().toISOString().slice(0, 10),
): CyberV4SkeletonResult {
  const deliverables: CyberDeliverables = {
    component_coverage: Array.isArray(report.component_coverage) ? report.component_coverage as never : [],
    evidence_sufficiency: Array.isArray(report.evidence_sufficiency) ? report.evidence_sufficiency as never : [],
    program_obligation_findings: Array.isArray(report.program_obligation_findings)
      ? report.program_obligation_findings as never
      : [],
    independence_determination: (report.independence_determination ?? {
      findings: [],
      engagement_status: "",
      auditor_type: "unknown",
      verdict: "record_insufficient",
      status: "record_insufficient",
      unsatisfied_conditions: [],
      summary: "",
    }) as never,
    readiness_determination: (report.readiness_determination ?? {
      conclusion: "record_insufficient",
      headline: "",
      reasoning: "",
      citations: [],
      blocking_components: [],
      unassessable_components: [],
      status: "record_insufficient",
    }) as never,
  };

  const internal = ((report._meta as Bag | undefined)?.internal ?? {}) as Bag;
  const recBag = (internal.cyber_recommendations ?? {}) as Bag;
  const recommendations: readonly ComponentRecommendation[] = Array.isArray(recBag.recommendations)
    ? recBag.recommendations as never
    : [];
  const nextSteps: readonly CyberNextStep[] = Array.isArray(recBag.next_steps)
    ? recBag.next_steps as never
    : [];
  const s4 = Array.isArray(internal.cyber_corpus_s4) ? internal.cyber_corpus_s4 as Bag[] : [];
  const commentaryBySlug = new Map<string, readonly string[]>(
    s4.map((e) => [s(e.slug), Array.isArray(e.commentary) ? (e.commentary as string[]) : []]),
  );

  const factors = buildCyberFactors(intake, deliverables, recommendations, nextSteps, commentaryBySlug);

  const rd = deliverables.readiness_determination;
  const leadSentence = s(rd.headline) ||
    "The record is insufficient for a readiness conclusion; the open items are named below.";

  const composedBase: ComposedBlocks = {
    // Executive Summary.
    "executive_summary:1": repairPreserving(leadSentence),
    // BATCH 19a (doc 113 S3.4): the snapshot table sits at :2; the
    // analytical prose follows at :3.
    "executive_summary:3": repairPreserving(factors.executive_lines),

    // 1. Purpose, Scope, and Assessment Record.
    "purpose_scope_record:2": repairPreserving(composeCompanyContext(intake, factors)),
    "purpose_scope_record:4": repairPreserving(
      joinLines(factors.scope_record.analysis, factors.scope_record.sufficiency),
    ),
    "purpose_scope_record:6": buildPhaseInBlock(phaseInCorpusExcerpt),
    "purpose_scope_record:8": repairPreserving(factors.prior_audit_reliance_analysis),
    "purpose_scope_record:10": repairPreserving(joinLines(
      // DOC 142 (2026-09-02, external reviewer P2) — was "Components
      // lacking identified evidence: 0", which read as contradicting the
      // Readiness snapshot's "Testable [operating] evidence identified for
      // 0 of 18 components". This count asks only whether ANY evidence
      // category is identified; auditor-testability is the separate measure
      // Section 2 assesses. The label now names its own concept and points
      // at the distinction (paired relabel in cyber-factors.ts,
      // buildExecutiveSnapshotRows).
      `Unassessed or incomplete components: ${factors.record_sufficiency.unassessed_count}. Components lacking narrative support: ${factors.record_sufficiency.without_notes}. Components with no evidence category identified at all: ${factors.record_sufficiency.without_evidence}. Whether identified evidence is testable is assessed separately in Section 2.`,
      factors.record_sufficiency.conclusion,
      factors.record_sufficiency.follow_up,
    )),

    // 2. Auditor Engagement and Evidence Readiness.
    "auditor_evidence:1": repairPreserving(joinLines(
      s(deliverables.independence_determination.summary),
      factors.independence_readiness_consequence,
    )),
    "auditor_evidence:3": repairPreserving(joinLines(
      factors.evidence_readiness.analysis,
      factors.evidence_readiness.follow_up,
    )),

    // 3. Cybersecurity Program Readiness.
    "program_readiness:1": repairPreserving(joinLines(
      factors.program_readiness.analysis,
      factors.program_readiness.conclusion,
    )),
    "program_readiness:3": composeComponentModules(factors),

    // 4. Cross-Cutting Findings and Readiness Gaps.
    "cross_cutting:1": repairPreserving(joinLines(
      factors.cross_cutting.material_implementation_gaps,
      factors.cross_cutting.material_evidence_gaps,
      factors.cross_cutting.cross_component_findings,
      factors.cross_cutting.prior_audit_dependency_gaps,
      factors.cross_cutting.material_record_limitations,
      factors.cross_cutting.conclusion,
    )),

    // 5. Security-Incident Context.
    "incident_context:1": repairPreserving(joinLines(
      factors.incident_readiness.analysis,
      factors.incident_readiness.follow_up,
    )),

    // 6. Readiness Actions.
    "readiness_actions:1": repairPreserving(joinLines(
      factors.readiness_actions.priority_actions.length
        ? `Priority readiness actions:\n${bullets(factors.readiness_actions.priority_actions)}`
        // A-TEAM S4 RULING S2.6 (doc 119) — split classes: no program
        // remediation is not the same as nothing to do.
        : factors.readiness_actions.record_completion_actions.length
        ? "Program remediation: none identified on the information provided. Audit readiness waits on the record-completion actions below."
        : "Priority readiness actions: none identified on the information provided.",
      factors.readiness_actions.evidence_package_actions.length
        ? `Evidence-package actions:\n${bullets(factors.readiness_actions.evidence_package_actions)}`
        : null,
      factors.readiness_actions.implementation_actions.length
        ? `Implementation actions:\n${bullets(factors.readiness_actions.implementation_actions)}`
        : null,
      factors.readiness_actions.record_completion_actions.length
        ? `Record-completion actions:\n${bullets(factors.readiness_actions.record_completion_actions)}`
        : null,
      factors.readiness_actions.sequencing,
    )),

    // 7. Readiness Conclusion.
    "readiness_conclusion:1": repairPreserving(joinLines(
      leadSentence,
      rd.blocking_components.length
        ? `Blocking components: ${rd.blocking_components.map((b) => b.label).join("; ")}.`
        : null,
    )),
    "readiness_conclusion:2": repairPreserving(joinLines(
      factors.overall.narrative,
      factors.overall.single_next_act,
    )),

    // 8. Evidence Preservation and Continuing Readiness.
    "evidence_preservation:1": repairPreserving(joinLines(
      factors.evidence_preservation.actions,
      factors.evidence_preservation.observations,
    )),

    // Submission and Attestation (carried § 7124 corpus block).
    "submission_and_attestation:0": buildCyberSubmissionAttestationBlock(),
  };

  const tables: SkeletonTables = {
    "cover:0": deriveCoverTable(intake, reportDate, s(rd.conclusion)),
    "executive_summary:2": deriveReadinessSnapshot(factors),
    "purpose_scope_record:5": buildCyberApplicabilityTable((intake.profile ?? {}) as Bag),
    "appendix_a_matrix:1": deriveComponentMatrix(intake, deliverables, factors),
    "appendix_b_evidence:1": deriveEvidenceIndex(deliverables),
    "appendix_c_actions:1": deriveActionRegister(intake, recommendations, buildRecordCompletionExtras(intake, deliverables)),
    "appendix_d_record:1": deriveAssessmentProfileRecord(intake, reportDate),
    "appendix_d_record:2": deriveAssessmentControlRecord(intake),
    "signature:1": deriveSignatureTable(),
  };

  const draft = renderSkeletonDocument({
    sections: CYBER_V4_SKELETON_SECTIONS,
    title: CYBER_V4_SKELETON_TITLE,
    subtitle: CYBER_V4_SKELETON_SUBTITLE,
    spineVersion: CYBER_V4_SKELETON_VERSION,
    values: { "profile.entity_name": s((intake.profile as Bag | undefined)?.entity_name) || "the company" },
    composed: composedBase,
    tables,
  });

  const exhibit = (report.authority_exhibit ?? {}) as Bag;
  const ledger = Array.isArray(exhibit.entries)
    ? (exhibit.entries as Bag[]).map((e) => s(e.citation)).filter(Boolean)
    : [];
  // The component citations are always in the ledger's candidate set: the
  // component modules and matrix cite them via the factor records.
  const componentCitations = CYBER_7123_COMPONENTS.map((c) => c.citation);
  // PANEL CYB-6 (2026-08-30): the candidate set omitted authorities the
  // body cites (§ 7120 in the applicability table, § 7123(d)/(f) in the
  // scope rationale walk, Civ. Code § 1798.140(d)(1)) — the iff-cited
  // filter can only list what it is offered, so counsel found body cites
  // missing from the ToA. Candidates the body does not cite still never
  // render.
  const toa = renderTableOfAuthorities(
    [...new Set([
      ...ledger,
      ...componentCitations,
      "11 CCR § 7120",
      "11 CCR § 7121(a)",
      "11 CCR § 7122",
      "11 CCR § 7123(d)",
      "11 CCR § 7123(e)(4)",
      "11 CCR § 7123(f)",
      "11 CCR § 7124",
      "Cal. Civ. Code § 1798.140(d)(1)",
      // DOC 159 — authorities the body now cites: the § 7123(b)(2)
      // applicability limit, the § 7123(c)(1)(B) password condition, the
      // § 7123(e)(9)/(10) notification content, the § 7001(v) nonbusiness
      // definition, the § 1798.140(d) business definition and § 1798.82(a).
      "11 CCR § 7123(b)(1)",
      "11 CCR § 7123(b)(2)",
      "11 CCR § 7123(c)(1)(A)",
      "11 CCR § 7123(c)(1)(B)",
      "11 CCR § 7123(e)(9)",
      "11 CCR § 7123(e)(10)",
      "11 CCR § 7001(v)",
      "Cal. Civ. Code § 1798.140(d)",
      "Cal. Civ. Code § 1798.82(a)",
    ])],
    skeletonDocumentToText(draft),
  );

  // DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01) — EMPTY
  // SCAFFOLD (see the spine comment for why: the Cyber corpus map curates
  // zero advisory_terms today, so this always returns null regardless of
  // input; wired now so the appendix activates automatically, zero further
  // code change, the day the corpus first gains a curated enforcement row).
  const advisoryMatches = advisoryMatchesTable(matchAdvisoryRows(CYBER_CORPUS_MAP, [], new Set()));

  const document = renderSkeletonDocument({
    sections: CYBER_V4_SKELETON_SECTIONS,
    title: CYBER_V4_SKELETON_TITLE,
    subtitle: CYBER_V4_SKELETON_SUBTITLE,
    spineVersion: CYBER_V4_SKELETON_VERSION,
    values: { "profile.entity_name": s((intake.profile as Bag | undefined)?.entity_name) || "the company" },
    composed: {
      ...composedBase,
      "table_of_authorities:0": toa,
      "table_of_authorities:1": advisoryMatches ? ADVISORY_APPENDIX_PREAMBLE : null,
    },
    tables: {
      ...tables,
      ...(advisoryMatches
        ? { "table_of_authorities:2": { key: "", surface: "advisory_corpus_matches", title: "", ...advisoryMatches } }
        : {}),
    },
  });

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = CYBER_V4_BANNED_REGISTER.filter((b) => body.includes(b.toLowerCase()));

  return {
    document,
    conformance: verifySkeletonConformance(document, CYBER_V4_SKELETON_SECTIONS),
    register_findings,
    factors,
  };
}
