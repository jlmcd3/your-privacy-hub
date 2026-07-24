// TURN 2 (cppa-admt) — deterministic slot reprojection.
//
// Three typed hard slots the customer-facing report MUST expose. Every value
// is derived from the intake + the model's own scope_analysis; nothing is
// invented. Registry-sourced deadlines come from ADMT_VERIFIED_AUTHORITIES.
//
// Slots emitted:
//   * applicability_verdict — TOP-of-report verdict placed BEFORE any duty
//     analysis (A-C: applicability first). Enums are closed.
//   * deadline_table        — registry-sourced deadline matrix (A-C).
//   * adequacy_finding      — EDPB logic-disclosure adequacy (A-A) + Art 22(3)
//                             three-element human-intervention qualification (A-B).
//
// Pattern mirrors run-cppa-risk-assessment/_w9_risk_slots.ts (TURN 1a/1b).

import {
  ADMT_VERIFIED_AUTHORITIES,
  ADMT_VERIFIED_AUTHORITY_VERSION,
} from "../_shared/registry/admt-verified-authorities.ts";

export const W9_ADMT_SLOTS_STAMP =
  "w9-admt-turn2-slots@2026-07-24T10:12:00Z";

type Report = Record<string, any>;
type Intake = Record<string, any>;

const s = (v: unknown): string => (typeof v === "string" ? v : "");
const truthy = (v: unknown): boolean => v === true || v === "true" || v === "Yes" || v === "yes";

// ---------------------------------------------------------------------------
// Enum vocabularies (A-C: applicability verdict first).
// ---------------------------------------------------------------------------
export const APPLICABILITY_VERDICTS = [
  "in_scope",
  "out_of_scope",
  "conservative_assumption",
  "insufficient_basis",
] as const;
export type ApplicabilityVerdict = typeof APPLICABILITY_VERDICTS[number];

export interface ApplicabilityBlock {
  verdict: ApplicabilityVerdict;
  basis: string;                   // one-sentence deterministic prose
  statutory_anchors: string[];     // registry-stamped pinpoints
  determination_basis: "established" | "conservative_assumption" | "unknown";
  compliance_deadline: string;     // § 7200(b)
}

export interface DeadlineRow {
  obligation: string;
  deadline: string;
  citation: string;
  subsection: string;
  proposition_key: string;
  applies_when: string;
}

export interface ThreeElementQualification {
  knows_how_to_interpret_output: boolean | null;
  reviews_output_with_other_information: boolean | null;
  has_authority_to_override: boolean | null;
  all_three_satisfied: boolean | null;
  basis: string;
}

export interface AdequacyFinding {
  logic_disclosure_adequate: boolean | null;
  logic_disclosure_basis: string;
  logic_disclosure_registry_anchor: string;
  three_element_human_intervention: ThreeElementQualification;
  overall_summary: string;
}

// ---------------------------------------------------------------------------
// Registry-sourced deadline table (A-C).
// ---------------------------------------------------------------------------
function pin(pk: string): { citation: string; subsection: string } {
  const row = (ADMT_VERIFIED_AUTHORITIES as any)[pk];
  return row
    ? { citation: row.citation, subsection: row.subsection }
    : { citation: "", subsection: "" };
}

export function buildDeadlineTable(intake: Intake, report: Report): DeadlineRow[] {
  const rows: DeadlineRow[] = [];
  const scope = (report?.scope_analysis ?? {}) as Record<string, any>;
  const inScope =
    scope.triggers_significant_decision === true &&
    scope.determination_basis !== "insufficient_basis";
  const trainingUse = truthy((intake as any).training_data_use);

  // 1) § 7200(b) — Article 11 compliance deadline for existing uses.
  {
    const p = pin("scope_deadline");
    rows.push({
      obligation: "Article 11 (ADMT) compliance — existing uses",
      deadline: "January 1, 2027",
      citation: p.citation,
      subsection: p.subsection,
      proposition_key: "scope_deadline",
      applies_when: "Business uses ADMT for a significant decision (in scope).",
    });
  }
  // 2) § 7220(b) — Pre-use Notice timing (pre-processing).
  if (inScope) {
    const p = pin("notice_timing");
    rows.push({
      obligation: "Deliver Pre-use Notice before processing",
      deadline: "Before initiating ADMT processing for a significant decision",
      citation: p.citation,
      subsection: p.subsection,
      proposition_key: "notice_timing",
      applies_when: "Applicable each time before the ADMT is used for a significant decision.",
    });
  }
  // 3) § 7155(a)(1) — Risk assessment before initiating new activities.
  if (inScope) {
    const p = pin("ra_timing_new");
    rows.push({
      obligation: "Conduct risk assessment before initiating new ADMT processing",
      deadline: "Before initiating the § 7150(b) processing",
      citation: p.citation,
      subsection: p.subsection,
      proposition_key: "ra_timing_new",
      applies_when: "Any new processing added under § 7150(b).",
    });
  }
  // 4) § 7155(b) — Risk assessment for existing activities.
  if (inScope) {
    const p = pin("ra_timing_existing");
    rows.push({
      obligation: "Conduct risk assessment for existing ADMT processing",
      deadline: "December 31, 2027",
      citation: p.citation,
      subsection: p.subsection,
      proposition_key: "ra_timing_existing",
      applies_when: "Processing initiated before the effective date and continuing after it.",
    });
  }
  // 5) § 7157(a)(1) — Agency attestation window.
  if (inScope) {
    const p = pin("ra_submit");
    rows.push({
      obligation: "Submit attestation + risk-assessment info to the Agency",
      deadline: "April 1, 2028",
      citation: p.citation,
      subsection: p.subsection,
      proposition_key: "ra_submit",
      applies_when: "One-time submission covering assessments through December 31, 2027.",
    });
  }
  // 6) § 7150(b)(6) — training trigger — appears regardless of downstream scope.
  if (trainingUse) {
    const p = pin("ra_trigger_train");
    rows.push({
      obligation: "Risk assessment for training ADMT/AI on personal information",
      deadline: "Before initiating the training processing",
      citation: p.citation,
      subsection: p.subsection,
      proposition_key: "ra_trigger_train",
      applies_when: "Business processes personal information to train ADMT/AI capable of significant decisions or biometric/identity uses.",
    });
  }
  // 7) § 7222(c) — access request response window.
  if (inScope) {
    const p = pin("access_timeline");
    rows.push({
      obligation: "Respond to consumer ADMT access requests",
      deadline: "Within 45 calendar days",
      citation: p.citation,
      subsection: p.subsection,
      proposition_key: "access_timeline",
      applies_when: "Verifiable consumer access request received under § 7222.",
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// A-C — Applicability verdict (top-of-report).
// ---------------------------------------------------------------------------
export function buildApplicabilityVerdict(intake: Intake, report: Report): ApplicabilityBlock {
  const scope = (report?.scope_analysis ?? {}) as Record<string, any>;
  const trigSD: boolean | null =
    typeof scope.triggers_significant_decision === "boolean" ? scope.triggers_significant_decision : null;
  const detBasisRaw = s(scope.determination_basis);
  const determination_basis: ApplicabilityBlock["determination_basis"] =
    detBasisRaw === "established" || detBasisRaw === "conservative_assumption"
      ? detBasisRaw
      : "unknown";
  const humanQualifies: boolean | null =
    typeof scope.human_review_qualifies === "boolean" ? scope.human_review_qualifies : null;

  let verdict: ApplicabilityVerdict = "insufficient_basis";
  let basis = "The intake does not resolve the § 7001(e) ADMT test or the § 7001(ddd) significant-decision test; applicability cannot be established on this record.";

  if (trigSD === true && humanQualifies !== true) {
    if (determination_basis === "conservative_assumption") {
      verdict = "conservative_assumption";
      basis = "The intake does not affirmatively identify an enumerated § 7001(ddd) category; the checker defaults to in-scope pending business confirmation. If confirmed, all Article 11 duties attach; if the underlying service falls outside § 7001(ddd), the verdict flips to out-of-scope.";
    } else {
      verdict = "in_scope";
      basis = "The intake affirmatively identifies a § 7001(ddd) significant decision and no qualifying human reviewer overrides the output before it issues, so Article 11 duties (Pre-use Notice, opt-out, access) attach.";
    }
  } else if (trigSD === false || humanQualifies === true) {
    verdict = "out_of_scope";
    basis = humanQualifies === true
      ? "A qualifying § 7001(e)(1) human reviewer overrides the output before the decision issues; the technology does not substantially replace human decisionmaking and Article 11 duties do not attach on this record."
      : "The intake does not describe a § 7001(ddd) significant decision; Article 11 duties do not attach on this record.";
  }

  const anchors: string[] = [];
  const push = (pk: string) => { const p = pin(pk); if (p.subsection) anchors.push(p.subsection); };
  push("admt_def");
  push("human_involvement");
  push("sig_decision");
  push("scope_apply");

  return {
    verdict,
    basis,
    statutory_anchors: anchors,
    determination_basis,
    compliance_deadline: "January 1, 2027",
  };
}

// ---------------------------------------------------------------------------
// A-A + A-B — Adequacy finding.
// ---------------------------------------------------------------------------
function coerceYesNo(v: unknown): boolean | null {
  if (v === true || v === "Yes" || v === "yes") return true;
  if (v === false || v === "No" || v === "no") return false;
  return null;
}

export function buildAdequacyFinding(intake: Intake, report: Report): AdequacyFinding {
  // A-A: EDPB logic-disclosure adequacy — a disclosure is adequate only when
  // it names inputs, output, and how the output is used in the decision.
  const logicText = s((intake as any).access_logic_disclosure);
  const outcomeText = s((intake as any).access_outcome_disclosure);
  const lower = (logicText + " " + outcomeText).toLowerCase();
  const namesInputs = /input|feature|variable|signal|factor|data used/.test(lower);
  const namesOutput = /output|score|rank|classif|prediction|result/.test(lower);
  const namesUse = /decision|used|weight|threshold|gate|approv|denial|rank/.test(lower);
  const wordCount = logicText.trim().split(/\s+/).filter(Boolean).length;
  const hasSubstance = wordCount >= 20 && logicText.trim().length >= 120;
  let logic_disclosure_adequate: boolean | null = null;
  let logic_basis: string;
  if (!logicText.trim()) {
    logic_disclosure_adequate = null;
    logic_basis = "insufficient basis — the intake does not describe the logic disclosure.";
  } else if (namesInputs && namesOutput && namesUse && hasSubstance) {
    logic_disclosure_adequate = true;
    logic_basis = "The logic disclosure names inputs, the output, and how the output is used in the decision — meeting the EDPB-informed § 7222(b)(3) plain-language explanation standard.";
  } else {
    logic_disclosure_adequate = false;
    const missing: string[] = [];
    if (!namesInputs) missing.push("input categories");
    if (!namesOutput) missing.push("output");
    if (!namesUse) missing.push("how the output is used in the decision");
    if (!hasSubstance) missing.push("sufficient specificity");
    logic_basis = `The logic disclosure omits: ${missing.join(", ")}. § 7222(b)(3) requires each element in plain language.`;
  }
  const logicRegistry = pin("access_logic").subsection;

  // A-B: Art 22(3) three-element human-intervention qualification.
  const adv = ((intake as any).admt_detail ?? {}) as Record<string, any>;
  const hr = s((intake as any).human_review);
  const shortcircuitAll = hr.startsWith("Yes — reviewer knows");
  const knows = shortcircuitAll ? true : coerceYesNo(adv.hi_trained);
  const reviews = shortcircuitAll ? true : coerceYesNo(adv.hi_reviews_other_info);
  const authority = shortcircuitAll ? true : coerceYesNo(adv.hi_authority_override);
  const explicitNoHR = hr.startsWith("No — fully automated") || hr === "Partial — reviewer sees the output but cannot override it";
  const anyDefined = knows !== null || reviews !== null || authority !== null || explicitNoHR;
  const allTrue = knows === true && reviews === true && authority === true;
  const anyFalse = knows === false || reviews === false || authority === false;
  let all_three: boolean | null = null;
  if (explicitNoHR) all_three = false;
  else if (allTrue) all_three = true;
  else if (anyFalse) all_three = false;
  else if (!anyDefined) all_three = null;

  const three: ThreeElementQualification = {
    knows_how_to_interpret_output: explicitNoHR ? false : knows,
    reviews_output_with_other_information: explicitNoHR ? false : reviews,
    has_authority_to_override: explicitNoHR ? false : authority,
    all_three_satisfied: all_three,
    basis: all_three === true
      ? "The human reviewer satisfies all three § 7001(e)(1) elements — interpretation, review-with-other-information, and override authority — so § 7001(e) is not engaged on this record."
      : all_three === false
        ? "The human review does not satisfy all three § 7001(e)(1) elements; the technology substantially replaces human decisionmaking under § 7001(e)."
        : "insufficient basis — the intake does not resolve all three § 7001(e)(1) elements.",
  };

  const overall =
    logic_disclosure_adequate === true && all_three === true
      ? "Both the § 7222(b)(3) logic disclosure and the § 7001(e)(1) human-intervention posture are adequate on this record."
      : logic_disclosure_adequate === false || all_three === false
        ? "At least one adequacy element (§ 7222(b)(3) logic disclosure or § 7001(e)(1) human intervention) is deficient on this record; see basis."
        : "insufficient basis to conclude adequacy for one or more elements; see basis.";

  return {
    logic_disclosure_adequate,
    logic_disclosure_basis: logic_basis,
    logic_disclosure_registry_anchor: logicRegistry,
    three_element_human_intervention: three,
    overall_summary: overall,
  };
}

// ---------------------------------------------------------------------------
// Intake → § 7150(b) subsections (parity with risk slots computeIntakeSelectedSubsections).
// ---------------------------------------------------------------------------
export function computeAdmtSelectedSubsections(intake: Intake): string[] {
  const out: string[] = [];
  const push = (x: string) => { if (!out.includes(x)) out.push(x); };
  const scope = (intake?.scope_analysis ?? {}) as Record<string, any>;
  const trigSD = scope.triggers_significant_decision === true;
  if (trigSD) push("§ 7150(b)(3)");
  if (truthy((intake as any).training_data_use)) push("§ 7150(b)(6)");
  return out;
}

// ---------------------------------------------------------------------------
// Validation.
// ---------------------------------------------------------------------------
export interface SlotValidation { ok: boolean; errors: string[]; warnings: string[] }

export function validateAdmtSlots(report: Report): SlotValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const av = report?.applicability_verdict;
  const dt = report?.deadline_table;
  const af = report?.adequacy_finding;

  if (!av || typeof av !== "object") errors.push("applicability_verdict missing or non-object");
  else {
    for (const k of ["verdict", "basis", "statutory_anchors", "determination_basis", "compliance_deadline"]) {
      if (!(k in av)) errors.push(`applicability_verdict.${k} missing`);
    }
    if (!APPLICABILITY_VERDICTS.includes(av.verdict)) errors.push(`applicability_verdict.verdict invalid enum: ${av.verdict}`);
    if (!Array.isArray(av.statutory_anchors)) errors.push("applicability_verdict.statutory_anchors not an array");
  }

  if (!Array.isArray(dt)) errors.push("deadline_table missing or non-array");
  else {
    dt.forEach((r: any, i: number) => {
      for (const k of ["obligation", "deadline", "citation", "subsection", "proposition_key", "applies_when"]) {
        if (!(k in r)) errors.push(`deadline_table[${i}].${k} missing`);
      }
    });
  }

  if (!af || typeof af !== "object") errors.push("adequacy_finding missing or non-object");
  else {
    for (const k of ["logic_disclosure_adequate", "logic_disclosure_basis", "logic_disclosure_registry_anchor", "three_element_human_intervention", "overall_summary"]) {
      if (!(k in af)) errors.push(`adequacy_finding.${k} missing`);
    }
    const tei = af.three_element_human_intervention;
    if (!tei || typeof tei !== "object") errors.push("adequacy_finding.three_element_human_intervention missing");
    else {
      for (const k of ["knows_how_to_interpret_output", "reviews_output_with_other_information", "has_authority_to_override", "all_three_satisfied", "basis"]) {
        if (!(k in tei)) errors.push(`adequacy_finding.three_element_human_intervention.${k} missing`);
      }
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function attachAndValidateAdmtSlots(report: Report, intake: Intake): {
  attached: string[]; validation: SlotValidation; va_version: string;
} {
  const attached: string[] = [];
  try { report.applicability_verdict = buildApplicabilityVerdict(intake, report); attached.push("applicability_verdict"); } catch (_) {}
  try { report.deadline_table = buildDeadlineTable(intake, report); attached.push("deadline_table"); } catch (_) {}
  try { report.adequacy_finding = buildAdequacyFinding(intake, report); attached.push("adequacy_finding"); } catch (_) {}
  return { attached, validation: validateAdmtSlots(report), va_version: ADMT_VERIFIED_AUTHORITY_VERSION };
}
