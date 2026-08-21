// CPPA ADMT v3.2 — GENERATED-ANALYSIS COMPOSER (Part II §L/§M of
// CPPA_ADMT_Audit_Spine_v3.2.docx, CEO-ratified 2026-08-21).
//
// NO MODEL CALL. Every G_ variable is composed by selecting among a small,
// bounded set of template sentences keyed to the already-computed
// deterministic state — never free text, never a fact the deterministic
// layer didn't already establish.
//
// INVARIANTS (CEO ruling, 2026-08-20 — stricter than the original §K read,
// carried forward unchanged into v3.2):
//   1. May explain a D_* result — restate what it is and why it followed
//      from the Company's answer. May NOT change, soften, or contradict it.
//   2. May quote or summarize SUPPLIED narrative verbatim. May NOT infer
//      any fact from narrative content, and may NOT characterize whether
//      supplied narrative is adequate, sufficient, specific enough,
//      properly tailored, genuine, usable, or compliant — those are
//      judgment calls for the Company or its counsel, and this layer does
//      not perform them, even as a hedge.
//   3. Missing narrative is ALWAYS an evidence limitation ("the Company has
//      not supplied…"), never silently treated as satisfied and never
//      described as a defect either — absence is neutral, not a finding.
//   4. v3.2 voice rule (Part II §L, new): never print raw implementation
//      vocabulary (DECISION_EFFECT, SUBSTANTIVE_STATE, etc.) and never use
//      the banned canned phrases in VOICE_BANNED_PATTERNS below — "the
//      important question is," "that answer matters because," "none show
//      a gap," "the audit can only evaluate," "the duty is discharged,"
//      "the record establishes," "no remediation item was generated." Use
//      natural, varied verbs instead of repeating one canned transition
//      across every section.
//
// ADEQUACY-LANGUAGE DISCIPLINE: no template below uses any word or phrase
// in ADEQUACY_LANGUAGE_BANNED_PATTERNS. That list is exported and is the
// SAME list the guard test (admt-v2-generated-invariants.test.ts) scans
// every template's output against — one source of truth, not a style
// convention that could drift from what's actually enforced. v3.2 adds
// VOICE_BANNED_PATTERNS, scanned the same way, for the new canned-phrase
// and raw-vocabulary rules.

import type {
  AccessResult,
  NoticeResult,
  OptOutResult,
  ScopeResult,
  VendorResult,
} from "./admt-v2-deterministic.ts";
import { VENDOR_MATERIALITY_MATRIX } from "./admt-v2-deterministic.ts";

function j(...sentences: (string | null | undefined | false)[]): string {
  return sentences.filter((s): s is string => !!s && s.trim().length > 0).join(" ");
}

/**
 * Every phrase a G_ template must never emit, because each one asserts or
 * gestures at a completed adequacy/quality judgment about narrative text.
 * Matched case-insensitively as a plain substring by the guard test — kept
 * as literal strings (not regexes) here so a human reviewer can read this
 * list directly as "here is what we don't say," the same list the test
 * enforces byte-for-byte.
 */
export const ADEQUACY_LANGUAGE_BANNED_PATTERNS: readonly string[] = [
  "is adequate", "is not adequate", "adequacy of", "adequately", "inadequate",
  "is sufficient", "sufficiently", "insufficiently",
  "specific enough", "detailed enough", "clear enough",
  "properly tailored", "is proper", "is not proper", "improperly",
  "is genuine", "genuinely", "is nominal", "nominal rather than",
  "is usable", "genuinely usable",
  "satisfies the requirement", "satisfies the standard", "does not satisfy",
  "meets the standard", "does not meet the standard",
  "is compliant", "is not compliant", "is noncompliant", "noncompliant",
  "is reasonable", "unreasonable",
  "is valid", "is invalid",
  "is acceptable", "unacceptable",
  "is appropriate", "inappropriate",
];

/**
 * v3.2 Part II §L voice-discipline patterns: canned transitions the old
 * (v1.2) catalog leaned on, now retired fleet-wide for this product, plus
 * the raw implementation vocabulary that must never reach a customer.
 * Scanned the same way as ADEQUACY_LANGUAGE_BANNED_PATTERNS — see the
 * "guard: no G_* composer emits v3.2-banned voice patterns" test.
 */
export const VOICE_BANNED_PATTERNS: readonly string[] = [
  "the important question is",
  "that answer matters because",
  "none show a gap",
  "the audit can only evaluate",
  "the duty is discharged",
  "the record establishes",
  "no remediation item was generated",
  "DECISION_EFFECT",
  "SUBSTANTIVE_STATE",
  "EVIDENCE_STATE",
  "PATH_STATE",
];

// ---------------------------------------------------------------------------
// G_APPLICABILITY_ANALYSIS
// ---------------------------------------------------------------------------

export function composeApplicabilityAnalysis(scope: ScopeResult, systemName: string): string {
  const s = scope.scopeState;
  if (s === "INCONSISTENT_RECORD") {
    return `The Company has stated that ${systemName} is used solely for advertising but also identifies a regulated significant decision. Those answers lead to different outcomes under the ADMT rules because the significant-decision test and the advertising exclusion cannot both apply. Accordingly, applicability cannot be resolved until the Company reconciles the conflict.`;
  }
  if (s === "UNABLE_TO_ASSESS") {
    return `The Company has not provided enough information to determine whether ${systemName} constitutes ADMT. The key missing facts are the decision category and the human role. The audit cannot resolve applicability without that information.`;
  }
  if (s === "OUT_OF_SCOPE") {
    if (scope.humanInvolvementEffect === "WEIGHS_AGAINST") {
      return `The Company has identified a reviewer who knows how to interpret the output, reviews it together with other information, and has the authority to change the decision. Because those are the elements of qualifying human involvement, ${systemName} falls outside the ADMT rules for this decision on the Company's reported facts.`;
    }
    if (scope.advertisingEffect === "WEIGHS_AGAINST") {
      return `The Company reports that ${systemName} is used solely for advertising. Advertising is excluded from the significant-decision definition, so the ADMT rules do not apply to this use.`;
    }
    return `The Company has not identified a regulated significant decision. Without a covered decision category, the ADMT requirements do not attach.`;
  }
  // IN_SCOPE
  return scope.humanInvolvementLabel === "No human review reported"
    ? `The Company identifies a regulated significant decision and reports no human review. On those facts, the System is ADMT for this decision.`
    : `The Company has identified that ${systemName} is used in a covered significant decision, but the reported human review does not include all elements of qualifying human involvement. On those facts, the System is considered ADMT.`;
}

// ---------------------------------------------------------------------------
// G_NOTICE_TEXT_ANALYSIS
// ---------------------------------------------------------------------------

export function composeNoticeAnalysis(notice: NoticeResult): string {
  const parts: string[] = [];
  if (notice.purpose.evidence === "DOCUMENTED") {
    parts.push(`The Company supplied notice text addressing the specific-purpose element. The Company or its counsel should confirm whether the text supports the requirement; this report does not evaluate the wording.`);
  } else if (notice.purpose.status === "GAP") {
    parts.push(`The Company has not supplied notice text stating the specific decision the System informs, so the lack of this element is factored into the audit as a non-response.`);
  }
  if (notice.optoutDesc.status === "PARTIAL") {
    parts.push(`The Company's own answer shows the notice mentions opt-out without describing specific instructions.`);
  }
  if (notice.howWorks.status === "PARTIAL") {
    parts.push(`The Company reports that the how-it-works element is only partially covered, without specifying which of inputs, output, or the role of human review is missing.`);
  }
  if (parts.length === 0) {
    parts.push(`Where notice text is not supplied, the lack of information is factored into the audit as a non-response. The Company or its counsel should review the notice elements directly.`);
  }
  return j(...parts);
}

// ---------------------------------------------------------------------------
// G_FULL_OPTOUT_ANALYSIS / G_HUMAN_APPEAL_ANALYSIS / G_EMPLOYMENT_EDUCATION_EXCEPTION_ANALYSIS
// ---------------------------------------------------------------------------

export function composeFullOptOutAnalysis(o: OptOutResult): string {
  const parts: string[] = [];
  if (o.cookie.status === "GAP") {
    parts.push(`The Company reports that a cookie banner is its only opt-out method, and the regulations call for an ADMT-specific route in addition to a cookie banner.`);
  }
  if (o.account.status === "GAP") {
    parts.push(`The regulations do not permit requiring an account to opt out, and the Company reports that an account is currently required.`);
  }
  if (o.methods.status === "GAP") {
    parts.push(`The Company reports fewer than two designated opt-out methods. The regulations require at least two.`);
  }
  if (o.fifteenDay.status === "INSUFFICIENT_RECORD" || o.confirmation.status === "INSUFFICIENT_RECORD") {
    parts.push(`The Company did not supply enough information to describe the cessation or confirmation process.`);
  }
  if (parts.length === 0) {
    parts.push(`On the Company's answers, every operational factor above is reported and supports the opt-out pathway.`);
  }
  return j(...parts);
}

export function composeHumanAppealAnalysis(o: OptOutResult): string {
  const parts: string[] = [];
  if (o.appealTraining.status === "GAP" || o.appealAuthority.status === "GAP") {
    parts.push(`The Company's answers do not show the reviewer meeting all three elements of qualifying human involvement, which puts whether the human-appeal exception is available at all in question.`);
  }
  if (o.appealProcess.status === "INSUFFICIENT_RECORD") {
    parts.push(`The Company did not supply enough information to describe the appeal process.`);
  }
  parts.push(`The number of steps a consumer must take to reach a reviewer are as described by the Company and are not otherwise evaluated.`);
  return j(...parts);
}

export function composeEmploymentEducationExceptionAnalysis(o: OptOutResult): string {
  const parts: string[] = [];
  if (o.exceptionSoleUse.status === "GAP") {
    parts.push(`The Company reports that the System is not used solely for the qualifying purpose, which puts whether the exception is available at all for this decision in question.`);
  }
  if (o.exceptionTesting.status === "GAP") {
    parts.push(`The exception depends on documented testing, and the Company reports none has been performed.`);
  } else if (o.exceptionTesting.status === "PARTIAL") {
    parts.push(`The Company reports that testing was performed but not documented. This report states that fact and does not otherwise evaluate the testing.`);
  }
  if (parts.length === 0) {
    parts.push(`On the Company's answers, every factor above is reported and supports the exception. This audit evaluates the underlying testing only on what the Company reports.`);
  }
  return j(...parts);
}

// ---------------------------------------------------------------------------
// G_ACCESS_WITHHOLDING_ANALYSIS
// ---------------------------------------------------------------------------

export function composeAccessWithholdingAnalysis(a: AccessResult): string {
  if (a.withholdingEvidence === "DOCUMENTED") {
    return `The Company supplied a policy addressing trade-secret or security-based withholding in ADMT access responses. That is useful evidence of a defined approach, but whether the policy's scope is limited to what the carve-out permits should be confirmed by the Company or its counsel.`;
  }
  return `The Company has not provided enough information here to describe its withholding practice. That is a record limitation, not a finding about how requests are handled.`;
}

// ---------------------------------------------------------------------------
// G_VENDOR_DEPENDENCY_ANALYSIS
//
// GOVERNING PRINCIPLE (CEO ruling, 2026-08-20): ADMT v2/v3 is an assessment,
// not a vendor audit. This composer identifies dependencies and explains
// why they matter; it never characterizes a vendor's performance and never
// implies a vendor control's absence is itself a finding about the
// Company, except in the one case the deterministic layer already marked
// as a genuine capability gap (vendor-hosted System, no independent way to
// perform the duty) — see VENDOR_MATERIALITY_MATRIX.
// ---------------------------------------------------------------------------

export function composeVendorDependencyAnalysis(v: VendorResult): string {
  if (!v.identified) return `The Company did not identify a third-party ADMT, so no vendor-dependency analysis is included.`;

  const controlLabel = (key: string): string => (VENDOR_MATERIALITY_MATRIX as any)[key]?.label ?? key;

  const capabilityGaps = Object.entries(v.controls).filter(([, c]) => c.relevance === "CONDITION");
  if (capabilityGaps.length > 0) {
    const names = capabilityGaps.map(([key]) => controlLabel(key)).join(", ");
    return `The Company reports that the System is hosted by the vendor and that the vendor contract does not address the following controls: ${names}. The Company remains the CCPA-responsible business regardless of which vendor it uses, so the Company will need to gather the missing vendor information to close out this part of the audit.`;
  }

  const relevantPartials = Object.entries(v.controls).filter(([, c]) => c.pathwayRelevant && c.relevance === "NEUTRAL" && c.label !== "Not reported" && c.label !== "Yes");
  if (relevantPartials.length > 0) {
    const names = relevantPartials.map(([key]) => controlLabel(key)).join(", ");
    return j(
      `The Company has identified a third-party ADMT relationship. The Company reports the vendor contract does not currently address the following controls: ${names}.`,
      `This does not by itself establish a gap in the ADMT requirements this audit addresses; instead it identifies a dependency the Company should track and, where useful, resolve through the vendor relationship.`,
    );
  }

  if (v.docsEvidence === "INSUFFICIENT_RECORD") {
    return `The Company has not provided enough information here to describe what documentation it holds on the vendor's system.`;
  }

  return `The Company's answers identify the pathway-relevant vendor controls. The Company remains the CCPA-responsible business regardless of the vendor relationship.`;
}
