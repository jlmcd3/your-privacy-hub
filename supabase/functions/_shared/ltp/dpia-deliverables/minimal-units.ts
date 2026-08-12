/**
 * PROMPT 10 (2026-08-12) — DETERMINISTIC REPLACEMENTS FOR u1/u5 SURFACES.
 *
 * Under DPIA_UNITS_MINIMAL the u1 and u5 model calls retire. The four
 * legacy-shape surfaces that still have readers — `dpia_metadata`,
 * `framework_disclaimer`, `section_5_interested_parties` and
 * `section_6_conclusion` — are built here instead, deterministically.
 *
 * PURITY LAW: pure functions of the intake and the already-built typed
 * surfaces. No I/O, no clock, no env, no model call.
 *
 * BYTE LAW: `DPIA_FRAMEWORK_DISCLAIMER` is copied character-for-character
 * from the U5_SKELETON `framework_disclaimer` string in
 * run-dpia-framework/index.ts. It is the counsel-referral zone text; the
 * bytes must not change.
 *
 * SINGLE-SOURCE LAW: the DPO sentence and the data-subject-views sentence
 * are the assembler's own (`dpoSentence`, `dataSubjectsViewsSlot`) — reused,
 * never re-written here.
 *
 * DO NOT TOUCH: sign-off / approval leaf keys (name, role, approved_by_name,
 * approved_by_title, approval_date, status) keep their existing sources in
 * the attestation builder. Nothing here re-sources them.
 */

import {
  dataSubjectsViewsSlot,
  dpoSentence,
} from "../dpia-skeleton-assemble.ts";
import type { DpiaDecision, DpiaDetermination } from "./types.ts";

export const DPIA_MINIMAL_UNITS_VERSION = "dpia-minimal-unit-surfaces-2026-08-12-prompt10";

type Bag = Record<string, unknown>;

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean) : [];
}

/** BYTE-EXACT copy of the U5_SKELETON framework_disclaimer. */
export const DPIA_FRAMEWORK_DISCLAIMER =
  "This document helps your organisation structure its Data Protection Impact Assessment using the EDPB-endorsed Guidelines on DPIA (WP248 rev.01). It is not a completed DPIA and does not satisfy the requirements of GDPR Article 35 on its own. Your qualified Data Protection Officer or legal counsel must review, complete, and own it. It does not constitute legal advice.";

/** Fixed template_basis — the U1_SKELETON value, unchanged. */
export const DPIA_TEMPLATE_BASIS = "EDPB (endorsed) Guidelines on DPIA (WP248 rev.01)";

export const DPIA_FRAMEWORK_VERSION = "1.0";

/**
 * MAPPING TABLE 1 — jurisdictions multi-enum → applicable frameworks.
 * Keys are the intake enum options verbatim (src/pages/DPIAFramework.enums.ts
 * JURISDICTIONS). Mechanical; no inference beyond the table.
 */
export const DPIA_APPLICABLE_FRAMEWORKS_MAP: Readonly<Record<string, readonly string[]>> = {
  "EU (GDPR)": ["Regulation (EU) 2016/679 (GDPR), Article 35"],
  "United Kingdom (UK GDPR)": [
    "UK GDPR, Article 35 (as applied by the Data Protection Act 2018)",
  ],
  "United States — Federal": ["United States federal sectoral privacy law"],
  "California (CCPA/CPRA)": [
    "California Consumer Privacy Act as amended by the CPRA (Cal. Civ. Code § 1798.100 et seq.)",
  ],
  "Other US States": ["United States state comprehensive privacy statutes"],
  "Canada": ["Personal Information Protection and Electronic Documents Act (PIPEDA)"],
  "Brazil (LGPD)": ["Lei Geral de Proteção de Dados (Law No. 13.709/2018)"],
  "Australia": ["Privacy Act 1988 (Cth) and the Australian Privacy Principles"],
  "Singapore": ["Personal Data Protection Act 2012"],
  "Other": ["Other jurisdiction recorded in the intake"],
};

/** Fixed text when the record names no jurisdiction from the enum. */
export const DPIA_FRAMEWORKS_UNMAPPED =
  "No jurisdiction is recorded on the intake; the applicable frameworks are not settled on this record.";

/**
 * MAPPING TABLE 2 — reasons_to_conduct multi-enum → Article 35(3) trigger
 * labels. Keys are the intake enum options verbatim
 * (src/pages/DPIAFramework.enums.ts REASONS_TO_CONDUCT). The three options
 * that carry an Art. 35(3) subparagraph in their own label map to that
 * subparagraph; the remaining WP248 / beneficial options map to their WP248
 * criterion wording and do not, by themselves, assert an Art. 35(3) trigger.
 */
export const DPIA_ART_35_3_TRIGGER_MAP: Readonly<Record<string, string>> = {
  "Systematic, extensive evaluation / profiling with significant effects (Art. 35(3)(a))":
    "Art. 35(3)(a) — systematic and extensive evaluation of personal aspects, including profiling, with significant effects",
  "Large-scale special-category or criminal-offence data (Art. 35(3)(b))":
    "Art. 35(3)(b) — processing on a large scale of special categories of data or of personal data relating to criminal convictions and offences",
  "Large-scale systematic monitoring of a public area (Art. 35(3)(c))":
    "Art. 35(3)(c) — systematic monitoring of a publicly accessible area on a large scale",
  "Evaluation or scoring (incl. profiling / prediction)":
    "WP248 criterion — evaluation or scoring, including profiling and prediction",
  "Automated decision-making with legal or significant effect":
    "WP248 criterion — automated decision-making with legal or similarly significant effect",
  "Sensitive or highly personal data":
    "WP248 criterion — sensitive data or data of a highly personal nature",
  "Data processed on a large scale": "WP248 criterion — data processed on a large scale",
  "Matching or combining datasets": "WP248 criterion — matching or combining datasets",
  "Data concerning vulnerable subjects":
    "WP248 criterion — data concerning vulnerable data subjects",
  "Innovative use of new technology":
    "WP248 criterion — innovative use or application of new technological or organisational solutions",
  "Processing prevents exercising a right / using a service":
    "WP248 criterion — processing that prevents data subjects from exercising a right or using a service or contract",
  "Required by national law": "National law requires this assessment",
  "DPO or data-subject recommendation":
    "Conducted on the recommendation of the data protection officer or of data subjects",
  "Required by a code of conduct / standard":
    "Required by an applicable code of conduct or standard",
  "Risk management / accountability (beneficial)":
    "Conducted as a risk-management and accountability measure (beneficial, not mandatory)",
  "Existing processing — the risk has changed":
    "Existing processing where the risk represented by the processing has changed (Art. 35(11))",
};

/** Fixed precautionary wording when no reason is recorded. */
export const DPIA_ART_35_3_PRECAUTIONARY =
  "Precautionary — the record does not select an Article 35(3) trigger for this processing, and this assessment is conducted as a precautionary accountability measure under Article 35(1).";

export interface DpiaMinimalMetadata {
  readonly processing_activity_name: string;
  readonly framework_version: string;
  readonly template_basis: string;
  readonly applicable_frameworks: readonly string[];
  readonly article_35_3_trigger: string;
  readonly rule_id: "dpia_minimal_metadata_v1";
}

export function buildDpiaMetadata(intakeInput: unknown): DpiaMinimalMetadata {
  const intake = (intakeInput ?? {}) as Bag;
  const name = s(intake.processing_activity_name);

  const frameworks: string[] = [];
  for (const j of arr(intake.jurisdictions)) {
    for (const f of DPIA_APPLICABLE_FRAMEWORKS_MAP[j] ?? []) {
      if (!frameworks.includes(f)) frameworks.push(f);
    }
  }
  if (frameworks.length === 0) frameworks.push(DPIA_FRAMEWORKS_UNMAPPED);

  const triggers: string[] = [];
  for (const r of arr(intake.reasons_to_conduct)) {
    const t = DPIA_ART_35_3_TRIGGER_MAP[r];
    if (t && !triggers.includes(t)) triggers.push(t);
  }
  const article_35_3_trigger = triggers.length === 0
    ? DPIA_ART_35_3_PRECAUTIONARY
    : triggers.join("; ") + ".";

  return {
    processing_activity_name: name,
    framework_version: DPIA_FRAMEWORK_VERSION,
    template_basis: DPIA_TEMPLATE_BASIS,
    applicable_frameworks: frameworks,
    article_35_3_trigger,
    rule_id: "dpia_minimal_metadata_v1",
  };
}

export interface DpiaMinimalInterestedParties {
  readonly title: string;
  readonly dpo_advice: string;
  readonly data_subject_views: string;
  readonly rule_id: "dpia_minimal_section5_v1";
}

export function buildInterestedParties(intakeInput: unknown): DpiaMinimalInterestedParties {
  const intake = (intakeInput ?? {}) as Bag;
  const advice = s(intake.dpo_advice);
  // SINGLE SOURCE: the assembler's own sentences.
  const dpo = advice ? advice : `${dpoSentence(intake)}.`;
  const views = s(intake.data_subjects_views);
  const data_subject_views = views ? views : `The company has recorded ${dataSubjectsViewsSlot(intake)}.`;
  return {
    title: "Involvement of Interested Parties",
    dpo_advice: dpo,
    data_subject_views,
    rule_id: "dpia_minimal_section5_v1",
  };
}

/** Legacy label vocabulary for the typed determination. */
export const DPIA_LEGACY_DECISION_LABELS: Readonly<Record<DpiaDetermination, string>> = {
  approved: "APPROVED",
  conditionally_approved: "CONDITIONALLY APPROVED",
  consultation_required: "CONSULTATION (SA)",
  draft_incomplete: "DRAFT — INCOMPLETE",
};

/** Fixed U5_SKELETON review-schedule and sign-off texts, copied unchanged. */
export const DPIA_REVIEW_SCHEDULE =
  "review triggers — (1) legal requirement: whenever the risk represented by the processing changes (GDPR Art. 35(11)); (2) recommended practice: at least annually as an internal governance measure";
export const DPIA_SIGN_OFF_TEMPLATE =
  "Controller sign-off template (the controller, not the DPO, owns this decision): Processing activity: [name] | DPIA version: [TO COMPLETE] | DPIA completion date: [TO COMPLETE] | DPO advice received and considered: Yes / No / N/A (no DPO designated) | Overall residual risk level (post-measures): [TO BE RE-SCORED by organisation] | Supervisory authority consultation required: Yes / No / Conditional | Controller representative name and title: [TO COMPLETE] | Signature: [TO COMPLETE] | Date: [TO COMPLETE]";

export interface DpiaMinimalConclusion {
  readonly title: string;
  readonly decision: string;
  readonly conditions: readonly string[];
  readonly justification: string;
  readonly review_schedule: string;
  readonly sign_off_template: string;
  readonly rule_id: "dpia_minimal_section6_v1";
}

/** Typed echo of the deterministic decision surface, in the legacy shape. */
export function buildConclusionEcho(decision: DpiaDecision): DpiaMinimalConclusion {
  return {
    title: "Conclusion and Decision",
    decision: DPIA_LEGACY_DECISION_LABELS[decision.determination] ?? DPIA_LEGACY_DECISION_LABELS.draft_incomplete,
    conditions: decision.conditions ?? [],
    justification: decision.why ?? "",
    review_schedule: DPIA_REVIEW_SCHEDULE,
    sign_off_template: DPIA_SIGN_OFF_TEMPLATE,
    rule_id: "dpia_minimal_section6_v1",
  };
}

/**
 * Writes the four surfaces onto the report. Called ONLY when
 * DPIA_UNITS_MINIMAL is true; inert otherwise. Never throws.
 */
export function attachMinimalUnitSurfaces(
  report: Bag,
  intake: unknown,
  decision: DpiaDecision,
): Record<string, unknown> {
  try {
    const meta = buildDpiaMetadata(intake);
    const s5 = buildInterestedParties(intake);
    const s6 = buildConclusionEcho(decision);
    report.dpia_metadata = meta;
    report.framework_disclaimer = DPIA_FRAMEWORK_DISCLAIMER;
    report.section_5_interested_parties = s5;
    report.section_6_conclusion = s6;
    return {
      version: DPIA_MINIMAL_UNITS_VERSION,
      ok: true,
      frameworks: meta.applicable_frameworks.length,
      article_35_3_precautionary: meta.article_35_3_trigger === DPIA_ART_35_3_PRECAUTIONARY,
      legacy_decision: s6.decision,
    };
  } catch (e) {
    return { version: DPIA_MINIMAL_UNITS_VERSION, ok: false, error: (e as Error)?.message ?? String(e) };
  }
}
