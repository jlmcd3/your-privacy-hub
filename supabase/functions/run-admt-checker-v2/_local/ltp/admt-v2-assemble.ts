// CPPA ADMT v3.2 — DOCUMENT ASSEMBLER (Part I of
// CPPA_ADMT_Audit_Spine_v3.2.docx, CEO-ratified 2026-08-21).
//
// v3.2 supersedes the v1.2-transcribed build this file used to be. Per the
// spine's own front matter, Part II's deterministic architecture (typed
// vocabularies, factor logic, pathway logic, record-grade logic, action
// assembly) is carried forward UNCHANGED from v1.2/v2 — admt-v2-
// deterministic.ts is not touched by this rewrite. What changed is entirely
// the presentation layer this file owns:
//   - Fixed "What the regulations require" legal blocks open each duty
//     section, sentence-cited inline (no more separate Table of
//     Authorities / footnote markers — Appendix C is removed).
//   - Every table lead-in explains what the table shows.
//   - Reader-facing effect phrases replace raw DECISION_EFFECT tokens in
//     every table cell that used to print SUPPORTS/WEIGHS_AGAINST/
//     CONDITION/NEUTRAL literally.
//   - Section 8 true no-padding: an empty action bucket prints neither
//     heading nor table; an all-empty Section 8 prints one sentence, and
//     the internal DECISION_EFFECT string that used to leak into that
//     intro sentence is gone.
//   - Two new appendices: Appendix A (Assessment Fact Record) and Appendix
//     B (Factor, Company Response, and Authority Matrix — replaces
//     Appendix C). Appendix B's third column states ONLY the report's own
//     output phrase for this Company's actual result, never the
//     triggering condition/logic behind it (CEO ruling, 2026-08-21 redline
//     round: a customer-facing table must not let a reader reverse-
//     engineer the deterministic logic).
//
// CEO REPORT REVIEW 2026-08-23/24 — three fixes to the appendix set:
//   - The "ID" (finding_id) column on the three Section 8 action tables is
//     dropped — an internal sequence counter, not a customer-facing value.
//   - Appendix A's "Source field(s)" column is dropped — it printed raw
//     intake schema paths (e.g. "admt_detail.hosting") to the customer.
//   - The appendix set is renumbered and Appendix B's 4th-column merge
//     lands (fleet-wide 3-column "Report Determination" convention, doc 46
//     / commit a062af92e, extended here from DPIA+Risk to ADMT): what was
//     Appendix A (fact record) is now Appendix C; what was Appendix B
//     (factor matrix, now 3 columns) is now Appendix A; what was Appendix C
//     (persuasive authority) is now Appendix B. Determination leads,
//     precedent second, the record appendix last — highest end-user value
//     first, matching the same reordering principle applied to CPPA Risk's
//     appendix G/I/[A-family] the same session. No appendix content lost.
//
// FIDELITY NOTE: fixed prose below is transcribed from
// CPPA_ADMT_Audit_Spine_v3.2.docx (itself the CEO's v3.0 draft plus two
// rounds of CEO redlines/comments, fully ratified). This module still does
// not go through the formal SpineBlockLike/renderSkeletonDocument
// byte-pin-conformance indirection every other converted product uses —
// noted as a reasonable follow-up hardening step, not done here.
//
// NO-PADDING LAW (carried from the shared convention): a section, table
// row, or subsection with nothing to show is omitted entirely, never
// printed with placeholder text.

import type { AdmtV2Computed } from "./admt-v2-deterministic.ts";
import type { NoticeFactor, VendorControl, VendorResult, ScopeResult, OptOutResult } from "./admt-v2-deterministic.ts";
import { VENDOR_MATERIALITY_MATRIX } from "./admt-v2-deterministic.ts";
import type { PathState, DecisionEffect, SubstantiveState, RecordGrade } from "./admt-v2-vocab.ts";
import {
  composeAccessWithholdingAnalysis,
  composeApplicabilityAnalysis,
  composeEmploymentEducationExceptionAnalysis,
  composeFullOptOutAnalysis,
  composeHumanAppealAnalysis,
  composeNoticeAnalysis,
  composeVendorDependencyAnalysis,
} from "./admt-v2-generated.ts";
import type { AuthorityExhibit } from "../../../_shared/report-exhibits/authority-exhibit.ts";
import { attachCorpusRows } from "../../../_shared/corpus/cam-attach.ts";
import { ADMT_CORPUS_MAP } from "../corpus/maps/admt-corpus-map.ts";
// A-TEAM S3 RULING V.7 (doc 115) — acronym-safe mid-sentence casing.
import { lowerFirstWordSafe } from "../../../_shared/ltp/splice-case.ts";

// v3.2.1 (2026-08-24, CEO report review) — adds the "Review of This
// Assessment" section between Section 9 (Conclusion) and Appendix A: a
// blank Name/Title/Signature/Date table with a descriptive (not
// attestation) lead sentence. No CPPA regulation defines a filed "ADMT
// Assessment" document, so nothing is certified — this only records that
// the report was reviewed. No factor logic or intake contract changed.
// v3.2.2 (2026-08-25, CEO-ordered polish round; dispositions in the session
// record) — finality/register pass, no factor logic or intake change:
// cover section retitled "Assessment Profile" (banner already carries the
// report title); the cover's Important Note reframed as a Scope of
// Assessment (drops "to create the formal audit document"); "was
// generated" → "were identified"; conversational Section 9 close replaced
// with a Review and Maintenance paragraph; review section retitled
// "Review and Approval"; conditional Section 6 and the unselected 4.x
// pathway now leave one-line not-applicable records instead of unexplained
// numbering gaps; exec summary explains a Qualified record grade;
// "Meets reported facts" → "Meets on reported facts" for consistency with
// the overall posture label.
export const ADMT_V2_SPINE_VERSION = "cppa-admt-v3.2.2-2026-08-25";
export const ADMT_V2_SPINE_SOURCE = "CPPA_ADMT_Audit_Spine_v3.2.docx — CEO-ratified 2026-08-21";

export interface RenderedTable {
  key: string;
  surface: string;
  title: string;
  columns: string[];
  rows: string[][];
  note?: string;
  /** CEO report review 2026-08-24 — see the shared RenderedTable.hideHeader. */
  hideHeader?: boolean;
}
export interface RenderedParagraph {
  kind: string;
  text: string;
  table?: RenderedTable;
}
export interface RenderedSection {
  id: string;
  title: string;
  paragraphs: RenderedParagraph[];
}
export interface RenderedSkeletonDocument {
  _typed: "skeleton-document@admt-v3.2";
  spine_version: string;
  title: string;
  subtitle: string;
  sections: RenderedSection[];
}

function reader(arr: string[]): string {
  return arr.length ? arr.join("; ") : "not reported";
}

function gradeLabel(g: RecordGrade): string {
  if (g === "COMPLETE") return "Complete.";
  if (g === "QUALIFIED") return "Qualified.";
  return "Materially incomplete.";
}
/** Table-cell form (no trailing period) for the "Record quality" / "Record
 * grade" columns — the exec-summary and governance tables used to print the
 * raw RecordGrade token with underscores swapped for spaces (QUALIFIED,
 * MATERIALLY INCOMPLETE); reader-facing sentence case throughout, matching
 * gradeLabel()'s wording. */
function gradeCell(g: RecordGrade): string {
  return gradeLabel(g).replace(/\.$/, "");
}
/** Reader-facing label for a raw ScopeState/SubstantiveState value. The
 * exec-summary "Result on reported facts" column used to print these raw
 * (IN_SCOPE/GAP/MEETS_REPORTED/…) with only underscores swapped for spaces
 * — exactly the raw-vocabulary leak v3.2 exists to close. */
const STATE_READER_LABEL: Record<string, string> = {
  IN_SCOPE: "In scope", OUT_OF_SCOPE: "Out of scope", UNABLE_TO_ASSESS: "Unable to assess", INCONSISTENT_RECORD: "Record conflict",
  // v3.2.2 — "Meets on reported facts", matching the overall posture label.
  MEETS_REPORTED: "Meets on reported facts", GAP: "Gap identified", PARTIAL: "Partially met", INSUFFICIENT_RECORD: "Not enough information", NOT_APPLICABLE: "Not applicable",
};
function stateCell(raw: string): string {
  return STATE_READER_LABEL[raw] ?? raw;
}

/** Small helper: build a row for a factor table from a NoticeFactor. v3.2
 * drops the raw DECISION_EFFECT column every per-element factor table used
 * to carry — Company response + evidence is enough at element grain; the
 * translated reader-effect phrase is reserved for section-level and
 * Appendix B rows (see the *Phrase() functions below). */
function factorRow(label: string, f: NoticeFactor): string[] {
  return [label, f.label, f.evidenceLabel ?? statusToEvidenceCell(f)];
}
/** Factors with no separate narrative-evidence dimension (most closed-
 * answer-only notice/opt-out elements) have no f.evidence at all — falling
 * through to f.status used to leak the raw SUBSTANTIVE_STATE token
 * (MEETS_REPORTED/GAP/PARTIAL/…) straight into the table cell. Translated
 * here instead. */
function statusToEvidenceCell(f: NoticeFactor): string {
  if (f.evidence) return f.evidence === "DOCUMENTED" ? "Documented" : f.evidence === "NOT_DOCUMENTED" ? "Not documented" : f.evidence === "INSUFFICIENT_RECORD" ? "Unresolved" : "Not applicable";
  return statusReaderLabel(f.status);
}
function statusReaderLabel(s: SubstantiveState): string {
  if (s === "MEETS_REPORTED") return "Reported";
  if (s === "GAP") return "Not covered";
  if (s === "PARTIAL") return "Partially covered";
  if (s === "INSUFFICIENT_RECORD") return "Not enough information";
  return "Not applicable";
}

// ---------------------------------------------------------------------------
// Reader-effect phrase catalog (Part I Appendix B / Part II §D-§I). One
// selector per factor family; used BOTH in the Applicability/Executive-
// Summary "Assessment" columns and in Appendix B's third column, so the
// body of the report and the appendix can never say two different things
// about the same factor.
// ---------------------------------------------------------------------------

function significantDecisionPhrase(effect: DecisionEffect): string {
  return effect === "SUPPORTS" ? "Supports Article 11 applicability." : "Not enough information to determine whether a covered decision is at issue.";
}
function humanInvolvementPhrase(effect: DecisionEffect): string {
  if (effect === "WEIGHS_AGAINST") return "Cuts against ADMT status.";
  if (effect === "SUPPORTS") return "Supports ADMT status.";
  return "Not enough information about the human role.";
}
function advertisingPhrase(effect: DecisionEffect): string {
  return effect === "WEIGHS_AGAINST" ? "Cuts against significant-decision scope." : "No effect on scope.";
}
function outputRolePhrase(): string {
  return "No independent effect on applicability; establishes the factual record for the Notice and Access sections.";
}
function noticeDeliveryPhrase(status: SubstantiveState): string {
  if (status === "GAP") return "Condition — a Pre-use Notice has not yet been put in place.";
  if (status === "PARTIAL" || status === "INSUFFICIENT_RECORD") return "Recommendation — confirm how the Pre-use Notice is delivered.";
  return "Supports the notice-delivery element.";
}
function noticeContentPhrase(posture: SubstantiveState): string {
  if (posture === "GAP") return "Condition — the Pre-use Notice omits a required element.";
  if (posture === "PARTIAL" || posture === "INSUFFICIENT_RECORD") return "Recommendation — clarify a required element in the Pre-use Notice.";
  return "Supports the tested notice elements.";
}
const OPTOUT_PATH_LABEL: Record<string, string> = {
  FULL_OPT_OUT: "full opt-out pathway",
  HUMAN_APPEAL_EXCEPTION: "human-appeal exception",
  HIRING_ADMISSION_EXCEPTION: "hiring/admission exception",
  WORK_ALLOCATION_COMP_EXCEPTION: "work-allocation/compensation exception",
};
/**
 * Opt-out pathway determination for Appendix B. Reads the SAME composite
 * `posture` computeOptOut() already derives from every path-relevant factor
 * (including, for the employment exceptions, exceptionSoleUse/exceptionTesting/
 * exceptionFairnessDoc) and the SAME severity mapping postureEffectPhrase
 * uses for this factor in the Executive Summary — so the two surfaces can
 * never disagree about the same posture (the design intent stated in the
 * file-header comment above).
 *
 * Previously this was two separate, narrower functions
 * (optOutOperationsPhrase for full-opt-out/human-appeal,
 * employmentExceptionPhrase for the employment exceptions) that each
 * re-derived their own partial two-branch logic instead of reading
 * `posture`. employmentExceptionPhrase in particular never checked
 * exceptionTesting's GAP state, so "No testing has been performed" — a
 * priority-1 Condition finding per computeOptOut — printed as "Supports the
 * exception." here, contradicting the report's own Section 4 and Priority
 * Matters. Neither function had a branch for OTHER_UNRESOLVED, so that
 * state produced no Appendix B row at all despite a priority-1 finding.
 */
function optOutPathwayPhrase(o: OptOutResult): string {
  const label = OPTOUT_PATH_LABEL[o.path] ?? "selected pathway";
  return postureEffectPhrase(o.posture, `the ${label}`);
}
function accessProcessPhrase(timelineStatus: SubstantiveState): string {
  if (timelineStatus === "GAP") return "Condition — the Company has not defined a response timeline.";
  if (timelineStatus === "PARTIAL" || timelineStatus === "INSUFFICIENT_RECORD") return "Recommendation — confirm the Company's access-response timeline.";
  return "Supports the access-process requirements.";
}
function accessReadinessPhrase(composite: SubstantiveState): string {
  if (composite === "GAP") return "Condition — the Company cannot yet produce a required explanation element.";
  if (composite === "PARTIAL" || composite === "INSUFFICIENT_RECORD") return "Recommendation — complete readiness for the remaining explanation element.";
  return "Supports access readiness.";
}
function withholdingPhrase(evidence: string): string {
  return evidence === "DOCUMENTED" ? "Supports a defined withholding approach." : "No effect; record limitation only.";
}
function vendorDependencyPhrase(v: VendorResult): string {
  if (!v.identified) return "Not applicable.";
  const capabilityGap = Object.values(v.controls).some((c) => c.relevance === "CONDITION");
  if (capabilityGap) return "Condition — the Company cannot perform this duty independently.";
  const relevantPartial = Object.values(v.controls).some((c) => c.pathwayRelevant && c.relevance === "NEUTRAL" && c.label !== "Not reported" && c.label !== "Yes");
  if (relevantPartial) return "Recommendation — track and resolve through the vendor relationship.";
  return "No independent effect; governance note only.";
}
function scopeAreaPhrase(scope: ScopeResult): string {
  if (scope.scopeState === "OUT_OF_SCOPE") {
    // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, ADMT
    // P1-2, result table pathway-aware) — states the split, not a blanket
    // support, where the automated-pathway condition applies.
    return scope.pathwayDependent
      ? "Supports the out-of-scope determination for the human-reviewed pathway only; automated pathways are addressed in Section 8."
      : "Supports the out-of-scope determination.";
  }
  // v3.2.2 — this cell states a determination, not a condition; the old
  // "Condition —" prefix mislabeled it.
  if (scope.scopeState === "IN_SCOPE") return "ADMT duties apply to this decision.";
  return "No effect; scope is not yet resolved.";
}
// DEF-1 fix (doc 75, CEO-directed 2026-08-26): the GAP branch rendered
// "the Pre-use Notice requirements is not currently supported" — plural
// subject, singular verb — live in production (the PN-A7 sample). The verb
// now agrees via an explicit per-call-site flag (every context is a known
// literal, so plurality is declared, never guessed).
function postureEffectPhrase(posture: SubstantiveState, context: string, plural = false): string {
  if (posture === "GAP") return `Condition — ${context} ${plural ? "are" : "is"} not currently supported.`;
  if (posture === "PARTIAL" || posture === "INSUFFICIENT_RECORD") return `Recommendation — follow up on ${context}.`;
  if (posture === "NOT_APPLICABLE") return "Not applicable.";
  return `Supports ${context}.`;
}

// ---------------------------------------------------------------------------
// Fixed "What the regulations require" legal blocks (Part II §C). Static
// text tied to cited provisions; does not depend on the Company's answers
// and is never altered by generated analysis. Every citation was checked
// against the CPPA's adopted regulation text (11 CCR §§ 7001, 7021, 7050,
// 7051, 7150, 7155, 7200, 7220, 7221, 7222) before this build, not carried
// forward on inference.
// ---------------------------------------------------------------------------

const ADMT_V3_FIXED = {
  applicability_requirement:
    "Article 11 applies when a business uses ADMT to make a significant decision about a consumer (11 CCR § 7200(a)). ADMT is technology that processes personal information and uses computation to replace or substantially replace human decisionmaking (11 CCR § 7001(e)). A human is considered meaningfully involved only when the reviewer knows how to interpret the system's output, reviews that output together with other relevant information, and has authority to make or change the decision (11 CCR § 7001(e)(1)). Significant decisions include decisions about financial or lending services, housing, education, employment or independent contracting opportunities or compensation, and healthcare (11 CCR § 7001(ddd)). Advertising by itself is excluded from that definition (11 CCR § 7001(ddd)(6)).",
  preuse_notice_requirement:
    "A business using ADMT for a significant decision must give consumers a prominent and conspicuous Pre-use Notice at or before collecting personal information that will be processed by the ADMT, or before later using previously collected information for that ADMT purpose (11 CCR § 7220(b)(2)). The notice must be presented through the manner in which the business primarily interacts with the consumer (11 CCR § 7220(b)(3)). The Pre-use Notice must include: the specific purpose for which the ADMT will be used, generic descriptions not being enough (11 CCR § 7220(c)(1)); the consumer's ADMT opt-out right and how to exercise it, or — when an exception applies — the exception itself or the human-appeal right (11 CCR § 7220(c)(2)); the right to access information about the business's use of ADMT and how to submit a request (11 CCR § 7220(c)(3)); a statement that the business will not retaliate against a consumer for exercising CCPA rights (11 CCR § 7220(c)(4)); a plain-language explanation of how the ADMT processes personal information, the categories of information that affect its output, the type of output produced, how the output is used in the decision, and any human role that does not amount to qualifying human involvement (11 CCR § 7220(c)(5)(A)–(B)); and the alternative decision process for consumers who opt out, unless an opt-out exception applies (11 CCR § 7220(c)(5)(C)).",
  preuse_notice_layering:
    "The regulations allow some of the “how it works” detail to be layered or linked, and they do not require disclosure of trade secrets or information whose disclosure would compromise specified security, fraud-prevention, or safety functions (11 CCR § 7220(c)(5), (d)). The core requirement is still a notice that gives the consumer a practical understanding of the proposed use before the ADMT processing begins.",
  optout_default_requirement:
    "A consumer generally has the right to opt out of a business's use of ADMT to make a significant decision (11 CCR § 7221(a)), unless the business qualifies for one of the following exceptions: the human-appeal exception, where consumers can appeal the decision to a human reviewer with authority to overturn it (11 CCR § 7221(b)(1)); the hiring/admission exception, where the business uses the ADMT solely to assess a consumer's ability to perform at work or in an educational program (11 CCR § 7221(b)(2)); or the work-allocation/compensation exception, where the business uses the ADMT solely to allocate work or set compensation (11 CCR § 7221(b)(3)).",
  full_optout_requirement:
    "A business relying on the ordinary opt-out pathway must provide at least two designated opt-out methods, including a method that reflects how it primarily interacts with consumers (11 CCR § 7221(c)). An online business must provide an interactive form through an ADMT-specific opt-out link in the Pre-use Notice; a cookie banner alone is not enough (11 CCR § 7221(c)(1), (c)(4)). The process must be easy to use and require minimal steps, may not force account creation or a verifiable consumer request, and must allow the consumer to confirm that the request was processed (11 CCR § 7221(d)–(f), (h)). If processing has already begun, the business must stop the ADMT processing as soon as feasible and no later than 15 business days, and must notify downstream persons processing the consumer's information with that ADMT so they can comply within the same period (11 CCR § 7221(n)(1)–(2)).",
  full_optout_note:
    "Section 7221 also contains additional handling rules concerning fraudulent requests, authorized agents, later requests for renewed consent, and non-retaliation (11 CCR § 7221(g), (j)–(l)). Those rules remain applicable even when they are not separately scored by the current intake.",
  human_appeal_requirement:
    "A business may rely on the human-appeal exception instead of offering an ADMT opt-out if consumers can appeal the significant decision to a human reviewer who can overturn it (11 CCR § 7221(b)(1)). The reviewer must understand and analyze the ADMT output, consider other relevant information and information supplied by the consumer, and have authority to change the decision (11 CCR § 7221(b)(1)(A)). The appeal route must be clearly described, easy to execute, and require minimal steps; the consumer must be able to submit information in support of the appeal, and the process remains subject to applicable timing and verification rules (11 CCR § 7221(b)(1)(B)).",
  hiring_admission_requirement:
    "For hiring, admission, or acceptance decisions, the opt-out right does not apply when the business uses the ADMT solely to assess the consumer's ability to perform at work or in an educational program, the ADMT works for that purpose, and it does not unlawfully discriminate based on protected characteristics (11 CCR § 7221(b)(2)(A)–(B); see also § 7001(ddd)(3)(A), (ddd)(4)(A)).",
  hiring_admission_note:
    "The current intake tests the sole-use condition and asks about non-discrimination testing and supporting fairness documentation. Those materials are evidence relevant to the regulatory standard; their existence does not by itself prove that the ADMT works for the Company's purpose or that unlawful discrimination cannot occur.",
  work_allocation_requirement:
    "For allocation or assignment of work and compensation decisions, the opt-out right does not apply when the business uses the ADMT solely for that work-allocation or compensation purpose, the ADMT works for the business's purpose, and it does not unlawfully discriminate based on protected characteristics (11 CCR § 7221(b)(3)(A)–(B); see also § 7001(ddd)(4)(B)).",
  work_allocation_note:
    "The current intake uses the Company's sole-use answer, reported non-discrimination testing, and fairness documentation as evidence supporting this exception. Those inputs help test the pathway, but they do not convert the legal standards of effectiveness and non-discrimination into a purely documentary test.",
  access_requirement:
    "When a consumer asks for access to ADMT used for a significant decision, the business must provide a plain-language explanation that is specific to that consumer (11 CCR § 7222(a)). The response must explain: the specific purpose for which the ADMT was used (11 CCR § 7222(b)(1)); enough information about the ADMT's logic to understand how the consumer's personal information produced the output, which may include relevant parameters and the consumer-specific output (11 CCR § 7222(b)(2)); the outcome of the decisionmaking process and how the ADMT output was used, including other material factors and any non-qualifying human role (11 CCR § 7222(b)(3)); how the output will be used for any additional significant decision concerning the consumer, when applicable (11 CCR § 7222(b)(3)(A)); and the prohibition on retaliation and how the consumer can exercise other CCPA rights (11 CCR § 7222(b)(4)).",
  access_process_requirement:
    "Request methods must be easy to use and free of dark patterns, identity verification is required, partial or complete denials must be explained when required, and requested information must be transmitted with reasonable security (11 CCR § 7222(d)–(g)). The business may withhold trade secrets and specified security-, fraud-, or safety-sensitive information from the logic and outcome explanation, but the withholding exception is not a general basis to avoid the access right (11 CCR § 7222(c)). Service providers and contractors must assist the business with access responses when they hold relevant information (11 CCR § 7222(i)).",
  vendor_requirement:
    "Article 11 places the consumer-facing duties on the business, but some duties expressly depend on downstream cooperation, and every service-provider or contractor contract must already require that cooperation, including assisting the business with its ADMT compliance and granting the business audit and testing rights over the vendor's systems (11 CCR § 7050(h); § 7051(a)(6)–(7)). When a consumer opts out after ADMT processing has begun, the business must notify service providers, contractors, and other persons processing the consumer's information with that ADMT and instruct them to comply within the same 15-business-day period (11 CCR § 7221(n)(2)). For access requests, service providers and contractors must assist the business by providing or making available relevant personal information (11 CCR § 7222(i)). Vendor controls therefore matter when the Company depends on a third party to execute the selected compliance pathway; they are not automatically standalone Article 11 violations merely because a particular contract term is absent.",
  governance_requirement:
    "Businesses using ADMT for significant decisions must comply with Article 11 beginning January 1, 2027 (11 CCR § 7200(b)). The same use of ADMT is also a separate risk-assessment trigger under Article 10 (11 CCR § 7150(b)(3)). A required risk assessment must be conducted before covered processing begins (11 CCR §§ 7150(a), 7155(a)(1)) and reviewed at least every three years (11 CCR § 7155(a)(2)); it must be updated sooner — as soon as feasible and no later than 45 calendar days after the change — when a material change creates new privacy impacts, increases existing impacts, or weakens safeguards (11 CCR § 7155(a)(3)).",
  // PANEL ADMT-2 (2026-08-30, panel-B memo 2 (h)): there is no freestanding
  // "Article 11 of the California Code of Regulations", and Article 11
  // governs ADMT requirements, not "ADMT audits" — cited precisely.
  general_requirement_summary:
    "Article 11 of the CCPA regulations (Cal. Code Regs. tit. 11, §§ 7200–7222) requires a business to determine whether it uses ADMT for a significant decision and, if so, to give consumers the required Pre-use Notice, provide an effective opt-out or support the exception it relies on, and be able to explain a consumer-specific decision on request.",
};

// ---------------------------------------------------------------------------
// WAVE C1 (2026-08-23, doc 56 / doc 62 §9 amendment / doc 63 §3) — S4
// (per-factor regulator commentary) and S5 (Persuasive Authority appendix),
// gated on the map's s4_ratification stamp exactly as Risk's Appendix I is
// gated. Mirrors risk-skeleton-assemble.ts's buildPersuasiveAuthority
// pattern: pure CAM attachment over the report's own typed states, no
// runtime corpus query (the determinism law).
// ---------------------------------------------------------------------------

/** The ADMT report's fired-state tokens for CAM attachment. */
export function deriveAdmtFiredStates(computed: AdmtV2Computed): Set<string> {
  const states = new Set<string>();
  if (computed.scope.scopeState === "IN_SCOPE") states.add("admt_in_scope");
  if (computed.scope.humanInvolvementEffect !== "NEUTRAL") states.add("human_involvement_addressed");
  if (computed.scope.advertisingEffect === "WEIGHS_AGAINST") states.add("advertising_exclusion_addressed");
  return states;
}

/** F-ADMT-HI / F-ADMT-AD — the two ratified S4 frame sentences (doc 63
 * §3.1), byte-stable across every report that composes them.
 *
 * A-TEAM S3 RULINGS V.10/V.11 (doc 115, 2026-08-31): the conversational
 * "What the regulator said" head and the emphatic "persuasive only, never
 * operative" are recast in professional register; content and the
 * operative/nonbinding distinction unchanged. */
const ADMT_S4_FRAMES: Record<string, string> = {
  "Human involvement":
    "Regulatory interpretation of the human-involvement standard — nonbinding interpretive context from the Agency's Final Statement of Reasons; the operative test is stated in this factor's determination above.",
  "Advertising exclusion":
    "Regulatory interpretation of the advertising exclusion — nonbinding interpretive context from the Agency's Final Statement of Reasons; the exclusion's scope is set by the operative definition cited above.",
};

export interface AdmtS4Attachment {
  readonly factor_id: string;
  readonly frame: string;
  readonly excerpts: readonly string[];
}

/** S4 attachment — pure function over the CAM + fired states. Returns one
 * entry per factor that has both a ratified frame AND at least one
 * attached row; NO-PADDING LAW: a factor with no attached row emits
 * nothing, never an empty frame. */
export function buildAdmtS4Attachments(computed: AdmtV2Computed): readonly AdmtS4Attachment[] {
  const fired = deriveAdmtFiredStates(computed);
  const byFactor = new Map<string, string[]>();
  for (const row of attachCorpusRows(ADMT_CORPUS_MAP, "S4", fired)) {
    if (row.role !== "FC") continue;
    const list = byFactor.get(row.factor_id) ?? [];
    list.push(row.pinned_excerpt);
    byFactor.set(row.factor_id, list);
  }
  const out: AdmtS4Attachment[] = [];
  for (const [factor_id, excerpts] of byFactor) {
    const frame = ADMT_S4_FRAMES[factor_id];
    if (!frame || excerpts.length === 0) continue;
    out.push({ factor_id, frame, excerpts });
  }
  return out;
}

export interface AdmtPersuasiveAuthority {
  readonly table: RenderedTable | null;
  readonly trail: string | null;
}

/** S5 — the Persuasive Authority appendix. Reuses the Risk Appendix-I
 * 4-column display shape verbatim (doc 63 §3.3). Release-1: Deliveroo
 * alone (Friuli deferred at the doc 62 gate review). */
export function buildAdmtPersuasiveAuthority(computed: AdmtV2Computed): AdmtPersuasiveAuthority {
  const fired = deriveAdmtFiredStates(computed);
  const ap = attachCorpusRows(ADMT_CORPUS_MAP, "S5", fired).filter((r) => r.role === "AP");
  if (ap.length === 0) return { table: null, trail: null };
  const rows = ap.map((r) => [
    r.display!.matter,
    r.display!.what_happened,
    r.display!.bearing,
    r.display!.authority_label,
  ]);
  const table: RenderedTable = {
    key: "",
    surface: "persuasive_authority_matrix",
    title: "",
    columns: ["Matter", "What happened", "Bearing on this assessment", "Authority"],
    rows,
  };
  const trail = ap.map((r) => r.display!.trail_cite).join("; ");
  return { table, trail };
}

/** Ratified fixed lead for the Persuasive Authority appendix — the ADMT
 * twin of RISK_APPENDIX_I_LEAD (risk-skeleton-assemble.ts), reworded for
 * the ADMT reader. Composed iff ≥1 precedent row attaches. */
export const ADMT_APPENDIX_B_LEAD =
  "This appendix collects enforcement decisions issued under analogous data-protection law that bear on factors assessed in this report. These decisions were issued under the EU General Data Protection Regulation, not the CCPA or its Article 10/11 regulations; they are persuasive context only, are not binding on the California Privacy Protection Agency or on any court applying California law, and are cited because the processing or the failure they address is analogous to a factor this assessment addresses. Each entry names the factor it bears on. The operative determination for every factor remains the analysis in the body of this report.";

/** Appendix A's (formerly "B") Primary-authority column, extended (doc 62
 * §11's R1 amendment): a factor with a ratified `trail_impact` tag carries
 * it in the cell; the Significant-decision factor additionally carries the
 * S5 pointer when Appendix B (formerly "C") renders — mirroring Risk's
 * Appendix G/I mechanism exactly, so the pointer can never dangle when
 * Appendix B is suppressed. */
function admtTrailImpactFor(factorId: string): string | null {
  const tagged = ADMT_CORPUS_MAP.rows.find((r) => r.factor_id === factorId && r.trail_impact);
  return tagged?.trail_impact ?? null;
}

export interface AssembleArgs {
  intake: Record<string, unknown>;
  computed: AdmtV2Computed;
  /** Internal citation ledger only, as of v3.2 — no longer rendered as a
   * customer-facing Table of Authorities (removed; see Appendix B). Kept in
   * the signature so index.ts's existing exhibit-building call site needs
   * no change, and so the ledger remains available for QA/footnote tooling
   * per the spine's own note. */
  exhibit: AuthorityExhibit | null;
  organizationName: string;
  systemName: string;
}

export function assembleAdmtV2Document(args: AssembleArgs): RenderedSkeletonDocument {
  const { intake, computed, organizationName, systemName } = args;

  const d = (intake as any)?.admt_detail ?? {};
  const { scope, notice, optOut, access, vendor } = computed;

  // PANEL ADMT-1 (2026-08-30): when the System is out of scope, only the
  // Applicability findings are reached; duty-area findings must not surface
  // as Priority Matters or §8 items for duties this report does not assess.
  const computedForActions = scope.scopeState === "OUT_OF_SCOPE"
    ? { ...computed, allFindings: computed.allFindings.filter((f) => f.area === "Applicability") }
    : computed;

  const sections: RenderedSection[] = [];
  const push = (id: string, title: string, paragraphs: RenderedParagraph[]) => {
    const nonEmpty = paragraphs.filter((p) => p.kind === "table" ? !!p.table && p.table.rows.length > 0 : !!p.text?.trim());
    if (nonEmpty.length > 0) sections.push({ id, title, paragraphs: nonEmpty });
  };
  const legal = (text: string): RenderedParagraph => ({ kind: "legal_requirement", text });

  // ── Cover / header table ────────────────────────────────────────────────
  // v3.2.2 — was "CPPA ADMT Compliance Audit Assessment"; the banner
  // already carries the report title, so the repeat read as a defect.
  push("cover", "Assessment Profile", [
    { kind: "table", text: "", table: {
      // CEO report review 2026-08-24 — the header row adds nothing the
      // row's own first cell ("Organization", "System reviewed", ...)
      // doesn't already say.
      key: "cover:0", surface: "header", title: "", columns: ["Report field", "Value"], hideHeader: true,
      rows: [
        ["Organization", organizationName || "(not provided)"],
        ["System reviewed", systemName || "(not provided)"],
        // A-TEAM S3 RULINGS V.8/V.16 (doc 115, 2026-08-31) — when the
        // out-of-scope determination rests on a condition stated later
        // ("Conditions on this determination"), the cover flags it beside
        // the outcome instead of leaving the qualification buried.
        // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31,
        // ADMT P0-1) — "Pathway-dependent" replaces the blanket "Out of
        // scope" headline where the automated-pathway condition applies.
        ["Overall assessment", `${scope.pathwayDependent ? "Pathway-dependent" : computed.overallPostureLabel}${scope.scopeState === "OUT_OF_SCOPE" ? " — see Scope qualification (Section 2)" : ""}`],
        // v3.2.2 — sentence case ("Qualified"), matching gradeCell().
        // A-TEAM S3 RULING V.2 (doc 115) — "Qualified" carries its meaning
        // inline instead of standing as an unexplained grade.
        ["Record sufficiency", `${gradeCell(computed.overallRecordGrade)}${String(computed.overallRecordGrade).toLowerCase() === "qualified" ? " — one or more supporting fields were not provided" : ""}`],
        ["Regulatory framework", "11 CCR §§ 7001(e), 7001(ddd), 7200, 7220–7222; vendor-cooperation provisions in §§ 7050–7051; related risk-assessment provisions in §§ 7150(b)(3) and 7155"],
      ],
    }},
    // v3.2.2 — reframed from "Important Note" to a Scope of Assessment: the
    // old close ("… to create the formal audit document") told the reader
    // the deliverable was a precursor. Same scope limits, final register.
    // A-TEAM S3 RULING V.3 (doc 115, 2026-08-31) — "automated compliance
    // assessment" exposed the generation method on page 1; the limitation
    // sentence carries the same legal force without it.
    { kind: "skeleton", text: "Scope of Assessment: This report evaluates the Company's reported practices against the CCPA regulations governing automated decisionmaking technology (“ADMT”) used for significant decisions. It explains the principal legal requirements, identifies where the Company's reported practices support those requirements, and calls out missing or inconsistent information. The conclusions are based on the information and materials supplied by the Company. This report does not constitute legal advice, a legal opinion, an assurance engagement, or a certification of compliance. The Company remains responsible for the accuracy and completeness of the assessment record." },
  ]);

  // ── Executive Summary ───────────────────────────────────────────────────
  const domains = Array.isArray((intake as any)?.decision_domains) ? (intake as any).decision_domains as string[] : [];
  const execLead = overallDeterminationSentence(computed);
  push("executive_summary", "Executive Summary", [
    { kind: "lead", text: execLead },
    { kind: "skeleton", text: ADMT_V3_FIXED.general_requirement_summary },
    // NR-75 fix (doc 75, CEO-directed 2026-08-26): reader()'s "not reported"
    // fallback spliced mid-sentence produced "The Company uses the System in
    // not reported." on a blank-domains record; the blank branch now
    // degrades as its own honest sentence.
    { kind: "skeleton", text: `${
      domains.length
        ? `The Company uses ${systemName || "the System"} in ${reader(domains)}.`
        : `The Company has not identified the decision domain in which it uses ${systemName || "the System"}.`
    } This assessment addresses four questions: whether Article 11 applies to that use; whether the required Pre-use Notice is in place; whether the Company provides the required opt-out or can support the exception it selected; and whether it can provide the consumer-specific access and explanation required by the regulations.` },
    { kind: "table", text: "", table: {
      key: "executive_summary:2", surface: "audit_area_summary", title: "",
      columns: ["Audit area", "Result on reported facts", "Record grade", "Assessment"],
      rows: [
        // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31,
        // ADMT P1-2) — "Pathway-dependent" replaces the bare "Out of scope"
        // result cell where the automated-pathway condition applies.
        ["Applicability", scope.pathwayDependent ? "Pathway-dependent" : stateCell(scope.scopeState), gradeCell(scope.recordGrade), scopeAreaPhrase(scope)],
        // PANEL ADMT-1 (2026-08-30, panel-B memo 2 (c)): the summary promises
        // four questions; an out-of-scope record used to answer one and drop
        // the rest without a word. The three duty rows now state that they
        // are not reached, so the table always accounts for every question.
        ...(scope.scopeState !== "OUT_OF_SCOPE" ? [
          ["Pre-use Notice", stateCell(notice.posture), gradeCell(notice.recordGrade), postureEffectPhrase(notice.posture, "the Pre-use Notice requirements", true)],
          ["Opt-out / exception", stateCell(optOut.posture), gradeCell(optOut.recordGrade), postureEffectPhrase(optOut.posture, "the selected opt-out pathway")],
          ["Access and explanation", stateCell(access.posture), gradeCell(access.recordGrade), postureEffectPhrase(access.posture, "the access and explanation requirements", true)],
        ] : [
          // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31,
          // ADMT P1-4) — names which pathway is not reached, and points at
          // the automated-pathway condition, instead of the flat phrase.
          ["Pre-use Notice", "Not reached", "—", scope.pathwayDependent ? NOT_REACHED_PHRASE_PATHWAY : NOT_REACHED_PHRASE],
          ["Opt-out / exception", "Not reached", "—", scope.pathwayDependent ? NOT_REACHED_PHRASE_PATHWAY : NOT_REACHED_PHRASE],
          ["Access and explanation", "Not reached", "—", scope.pathwayDependent ? NOT_REACHED_PHRASE_PATHWAY : NOT_REACHED_PHRASE],
        ]),
        ...(vendor.identified && scope.scopeState !== "OUT_OF_SCOPE"
          ? [["Vendor dependency", stateCell(vendor.posture), gradeCell(vendor.recordGrade), vendorDependencyPhrase(vendor)]]
          : []),
      ],
    }},
    // v3.2.2 — an overall "Meets" next to a bare "Qualified" grade left the
    // qualification unexplained (CEO output review); say why, and where the
    // specifics live.
    ...(computed.overallRecordGrade !== "COMPLETE"
      ? [{
        kind: "skeleton",
        text: computed.overallRecordGrade === "QUALIFIED"
          ? "Record sufficiency is graded Qualified because one or more supporting fields were not provided. The record-quality table in the Governance section identifies the affected areas, and the Assessment Fact Record appendix identifies the specific fields."
          : "Record sufficiency is graded Materially incomplete because material supporting information was not provided. The record-quality table in the Governance section identifies the affected areas, and the Assessment Fact Record appendix identifies the specific fields.",
      } as RenderedParagraph]
      : []),
    ...priorityMattersParagraphs(computedForActions),
  ]);

  // ── 1. System and Decision Profile ──────────────────────────────────────
  const systemType = str((intake as any)?.system_type);
  // A-TEAM S3 RULING V.7 (doc 115) — a full toLowerCase() mangled acronyms in
  // the Company's own system description ("ML" → "ml"); only the first
  // character may be case-adjusted, acronym-guarded.
  const sysTypePhrase = systemType ? `, described by the Company as a ${lowerFirstWordSafe(systemType)}` : "";
  // v3.2.2 — the old single spliced sentence garbled when the description
  // value was itself multi-sentence prose; split into attributed sentences
  // and normalize the description's terminal period. Attribution retained.
  const sysDesc = (str((intake as any)?.system_description) || "(not provided)").trim();
  const sysDescSentence = /[.!?]$/.test(sysDesc) ? sysDesc : `${sysDesc}.`;
  push("system_profile", "1. System and Decision Profile", [
    // NR-75 fix (doc 75): same blank-domains degradation as the exec summary.
    { kind: "skeleton", text: `The Company identifies the System as ${systemName || "(not provided)"}${sysTypePhrase}. The Company describes the System as follows: ${sysDescSentence} ${
      domains.length
        ? `The System is used in ${reader(domains)}.`
        : "The Company has not identified the decision domain in which the System is used."
    }` },
    { kind: "skeleton", text: `The Company describes human review as: ${str((intake as any)?.human_review) || "(not answered)"}. ADMT status turns on whether the System replaces or substantially replaces human judgment.` },
    { kind: "skeleton", text: vendorLead(intake, vendor) },
  ]);

  // ── 2. Applicability ────────────────────────────────────────────────────
  // Wave C1 (doc 62 §9 amendment / doc 63 §3.1-3.2): S4 attachments render
  // as a "What the regulator said" subsection, factor by factor, gated on
  // the CAM's s4_ratification stamp + the factor's own fired state
  // (NO-PADDING LAW: no attachment, no subsection — never an empty frame).
  const admtS4 = buildAdmtS4Attachments(computed);
  push("applicability", "2. Applicability of the ADMT Requirements", [
    legal(ADMT_V3_FIXED.applicability_requirement),
    { kind: "lead", text: applicabilityDeterminationSentence(scope) },
    { kind: "table", text: "", table: {
      key: "applicability:2", surface: "applicability_factors", title: "",
      columns: ["Factor", "Company response", "Assessment"],
      rows: [
        ["Covered significant decision", scope.significantDecisionLabel, significantDecisionPhrase(scope.significantDecisionEffect)],
        ["Human involvement", scope.humanInvolvementLabel, humanInvolvementPhrase(scope.humanInvolvementEffect)],
        ["Advertising exclusion", scope.advertisingLabel, advertisingPhrase(scope.advertisingEffect)],
        ["Role of ADMT output", scope.outputRoleLabel, outputRolePhrase()],
      ],
    }},
    { kind: "generated", text: composeApplicabilityAnalysis(scope, systemName || "the System") },
    // PANEL ADMT-1 (2026-08-30, panel-B memo 2 (e), unanimous): the
    // out-of-scope determination hangs on one self-reported fact —
    // qualifying human review. The conditions under which it holds are
    // stated with the determination, from facts already in the record.
    ...(scope.scopeState === "OUT_OF_SCOPE"
      ? buildOutOfScopeConditions(intake, systemName || "the System")
      : []),
    ...admtS4.flatMap((att): RenderedParagraph[] => [
      // A-TEAM S3 RULING V.10 (doc 115) — professional register heading.
      { kind: "skeleton", text: `Regulatory Interpretation — ${att.factor_id}` },
      { kind: "skeleton", text: att.frame },
      ...att.excerpts.map((text): RenderedParagraph => ({ kind: "quoted_authority", text })),
    ]),
  ]);

  // PANEL ADMT-1 (2026-08-30, panel-B memo 2 (a)-(c)): the out-of-scope
  // path used to RETURN here — the document ended after Section 2 with no
  // conclusion, no governance/record table, no fact-record appendix, no
  // signature, no ToA, while the Executive Summary pointed at two of those
  // missing destinations. The duty audits (§§3-6) are rightly not reached;
  // each now renders a one-sentence not-reached stub (the fixed-numbering
  // pattern §6 already used for the no-vendor case), and everything
  // downstream renders with its content gated to what was actually
  // assessed.
  const outOfScope = scope.scopeState === "OUT_OF_SCOPE";
  // A-TEAM S3 RULING V.13 (doc 115, 2026-08-31) — the trailing "section
  // number is retained…" sentence explained the template to the customer;
  // removed from every stub (the Not-reached sentence states the substance).
  // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, ADMT
  // P1-4) — where the automated-pathway condition applies, the stub names
  // which pathway is not reached and points at Section 8 rather than
  // stating a blanket "outside Article 11" that the Condition to Proceed
  // two sections earlier already qualifies.
  const NOT_REACHED_STUB = (dutyPhrase: string): RenderedParagraph => ({
    kind: "skeleton",
    text: scope.pathwayDependent
      ? `Not reached for the human-reviewed pathway assessed as out of scope (Section 2), so ${dutyPhrase} in this report for that pathway. For the automatically-decided pathways, see the Condition to Proceed in Section 8.`
      : `Not reached. On the Company's reported facts the System is outside Article 11 for this decision (Section 2), so ${dutyPhrase} in this report.`,
  });

  // ── 3. Pre-use Notice Audit ──────────────────────────────────────────────
  const deliveryPhrase = str((intake as any)?.notice_delivery) || reader(Array.isArray((intake as any)?.notice_delivery) ? (intake as any).notice_delivery : []);
  if (outOfScope) {
    push("notice", "3. Pre-use Notice Audit", [NOT_REACHED_STUB("the Pre-use Notice requirements are not assessed")]);
    push("optout", "4. Opt-Out and Exception Audit", [NOT_REACHED_STUB("the opt-out and exception requirements are not assessed")]);
    push("access", "5. Access and Explanation Audit", [NOT_REACHED_STUB("the access and explanation requirements are not assessed")]);
    push("vendor", "6. Third-Party and Vendor Dependency", [NOT_REACHED_STUB("no vendor-dependency analysis is performed")]);
  }

  if (!outOfScope) push("notice", "3. Pre-use Notice Audit", [
    legal(ADMT_V3_FIXED.preuse_notice_requirement),
    legal(ADMT_V3_FIXED.preuse_notice_layering),
    { kind: "lead", text: noticeDeterminationSentence(notice) },
    { kind: "skeleton", text: `The Company states that it provides the Pre-use Notice ${deliveryPhrase || "(not reported)"}. The following table shows whether the Company's notice covers each element the regulations require:` },
    { kind: "table", text: "", table: {
      key: "notice:2", surface: "notice_elements", title: "",
      columns: ["Required notice element", "Company response", "Evidence"],
      rows: [
        factorRow("Specific purpose", notice.purpose),
        factorRow("Opt-out / exception or appeal", notice.optoutDesc),
        factorRow("Access right", notice.accessDesc),
        factorRow("Anti-retaliation", notice.antiRet),
        factorRow("How the ADMT works", notice.howWorks),
        factorRow("Alternative process", notice.altProcess),
      ],
    }},
    { kind: "generated", text: composeNoticeAnalysis(notice) },
  ]);

  // ── 4. Opt-Out and Exception Audit ──────────────────────────────────────
  const optOutParas: RenderedParagraph[] = [
    legal(ADMT_V3_FIXED.optout_default_requirement),
    { kind: "lead", text: optOutDeterminationSentence(optOut) },
    { kind: "skeleton", text: optOutPathwaySentence(optOut) },
  ];
  if (optOut.path === "FULL_OPT_OUT") {
    optOutParas.push(
      { kind: "skeleton", text: "4.1 Full Opt-Out Pathway" },
      legal(ADMT_V3_FIXED.full_optout_requirement),
      { kind: "skeleton", text: `${ADMT_V3_FIXED.full_optout_note} The following table shows whether the Company's opt-out process meets each operational requirement:` },
      { kind: "table", text: "", table: {
        key: "optout:4.1", surface: "full_optout_factors", title: "",
        columns: ["Operational requirement", "Company response", "Evidence"],
        rows: [
          factorRow("Designated methods", optOut.methods),
          factorRow("ADMT-specific route", optOut.cookie),
          factorRow("No account required", optOut.account),
          factorRow("15-business-day process", optOut.fifteenDay),
          factorRow("Confirmation mechanism", optOut.confirmation),
        ],
      }},
      { kind: "generated", text: composeFullOptOutAnalysis(optOut) },
      // v3.2.2 — the fixed 4.x numbering stays; the unselected pathways
      // state themselves instead of leaving an unexplained numbering gap.
      { kind: "skeleton", text: "4.2–4.3 Exception Pathways. Not applicable: the Company offers the ADMT opt-out and does not rely on a § 7221(b) exception." },
    );
  } else if (optOut.path === "HUMAN_APPEAL_EXCEPTION") {
    optOutParas.push(
      // v3.2.2 — see the 4.x numbering note above.
      { kind: "skeleton", text: "4.1 Full Opt-Out Pathway. Not applicable: the Company relies on the human-appeal exception under § 7221(b)(1) rather than offering the ADMT opt-out." },
      { kind: "skeleton", text: "4.2 Human-Appeal Exception" },
      legal(ADMT_V3_FIXED.human_appeal_requirement),
      { kind: "skeleton", text: "The following table shows the Company's answers on each factor this exception depends on:" },
      { kind: "table", text: "", table: {
        key: "optout:4.2", surface: "human_appeal_factors", title: "",
        columns: ["Exception requirement", "Company response", "Evidence"],
        rows: [
          factorRow("Appeal process", optOut.appealProcess),
          factorRow("Reviewer training", optOut.appealTraining),
          factorRow("Authority to overturn", optOut.appealAuthority),
          factorRow("Steps to reviewer", optOut.appealSteps),
        ],
      }},
      { kind: "generated", text: composeHumanAppealAnalysis(optOut) },
      { kind: "skeleton", text: "4.3 Employment and Education Exceptions. Not applicable: the Company does not rely on the hiring/admission or work-allocation exception." },
    );
  } else if (optOut.path === "HIRING_ADMISSION_EXCEPTION" || optOut.path === "WORK_ALLOCATION_COMP_EXCEPTION") {
    const isHiring = optOut.path === "HIRING_ADMISSION_EXCEPTION";
    const heading = isHiring ? "Hiring / admission exception" : "Work-allocation / compensation exception";
    optOutParas.push(
      // v3.2.2 — see the 4.x numbering note above.
      { kind: "skeleton", text: `4.1–4.2 Opt-Out Pathway and Human-Appeal Exception. Not applicable: the Company relies on the ${heading.toLowerCase()} rather than offering the ADMT opt-out or the human-appeal exception.` },
      { kind: "skeleton", text: `4.3 ${heading}` },
      legal(isHiring ? ADMT_V3_FIXED.hiring_admission_requirement : ADMT_V3_FIXED.work_allocation_requirement),
      { kind: "skeleton", text: `${isHiring ? ADMT_V3_FIXED.hiring_admission_note : ADMT_V3_FIXED.work_allocation_note} The following table shows the Company's answers on each factor this exception depends on:` },
      { kind: "table", text: "", table: {
        key: "optout:4.3", surface: "employment_exception_factors", title: "",
        columns: ["Exception factor", "Company response", "Evidence"],
        rows: [
          factorRow("Sole-use condition", optOut.exceptionSoleUse),
          factorRow("Non-discrimination testing", optOut.exceptionTesting),
          factorRow("Fairness documentation", optOut.exceptionFairnessDoc),
        ],
      }},
      { kind: "generated", text: composeEmploymentEducationExceptionAnalysis(optOut) },
    );
  }
  if (!outOfScope) push("optout", "4. Opt-Out and Exception Audit", optOutParas);

  // ── 5. Access and Explanation Audit ─────────────────────────────────────
  if (!outOfScope) push("access", "5. Access and Explanation Audit", [
    legal(ADMT_V3_FIXED.access_requirement),
    legal(ADMT_V3_FIXED.access_process_requirement),
    { kind: "skeleton", text: "The following tables show the Company's access-request process and its readiness to produce each element of the required explanation:" },
    { kind: "lead", text: accessDeterminationSentence(access) },
    { kind: "table", text: "", table: {
      key: "access:2", surface: "access_process_factors", title: "",
      columns: ["Process requirement", "Company response", "Evidence"],
      rows: [factorRow("Response timeline", access.timeline)],
    }},
    { kind: "table", text: "", table: {
      key: "access:3", surface: "access_readiness", title: "Explanation Readiness",
      columns: ["Explanation element", "Company readiness", "Supporting evidence"],
      rows: [
        factorRow("Specific purpose", access.readiness["b1_purpose_ready"]),
        factorRow("Logic / parameters", access.readiness["b2_logic_ready"]),
        factorRow("Output and use", access.readiness["b3_output_use_ready"]),
        factorRow("Outcome / future use", access.readiness["b3_outcome_ready"]),
        factorRow("Human role", access.readiness["b3_human_role_ready"]),
      ],
    }},
    { kind: "skeleton", text: `Withholding and Security: ${str((intake as any)?.access_trade_secret_policy) || "The Company has not described a trade-secret or security withholding policy."}` },
    { kind: "generated", text: composeAccessWithholdingAnalysis(access) },
  ]);

  // ── 6. Third-Party and Vendor Dependency ────────────────────────────────
  // ADMT v3.2 is an assessment, not a vendor audit: this section identifies
  // dependencies and explains why they matter. It escalates to a Condition
  // only in the one case the intake itself establishes the Company cannot
  // perform the duty independently (vendor-hosted System + a missing,
  // pathway-relevant control) — see VENDOR_MATERIALITY_MATRIX.
  if (!outOfScope && vendor.identified) {
    push("vendor", "6. Third-Party and Vendor Dependency", [
      legal(ADMT_V3_FIXED.vendor_requirement),
      { kind: "skeleton", text: vendor.sectionLead },
      { kind: "skeleton", text: "The following table shows which vendor controls are relevant to the Company's selected pathway and whether the vendor supports each one:" },
      { kind: "table", text: "", table: { key: "vendor:0", surface: "vendor_materiality_matrix", ...vendorMaterialityMatrixTable() } },
      { kind: "skeleton", text: `On the pathway the Company selected (${pathwayLabel(optOut.path)}), the Company's reported vendor controls are:` },
      { kind: "table", text: "", table: {
        key: "vendor:1", surface: "vendor_controls", title: "",
        columns: ["Vendor control", "Company response", "Why it matters"],
        rows: [
          vendorRow("Audit / monitoring", vendor.controls.audit),
          vendorRow("Access-request assistance", vendor.controls.assist),
          vendorRow("Downstream opt-out", vendor.controls.optout),
          vendorRow("Appeal / human-review", vendor.controls.appeal),
          vendorRow("Incident notification", vendor.controls.incident),
        ],
      }},
      { kind: "generated", text: composeVendorDependencyAnalysis(vendor) },
    ]);
  } else if (!outOfScope) {
    // v3.2.2 — the fixed section numbering stays; a report with no vendor
    // dependency states that instead of jumping 5 → 7 unexplained.
    push("vendor", "6. Third-Party and Vendor Dependency", [
      // A-TEAM S3 RULING V.13 (doc 115) — template commentary removed.
      { kind: "skeleton", text: "Not applicable. The Company did not identify a third-party ADMT vendor for the assessed System, so no vendor-dependency analysis is required." },
    ]);
  }

  // ── 7. Governance, Record Sufficiency, and Related Risk-Assessment ─────
  push("governance", "7. Governance, Record Sufficiency, and Related Risk-Assessment Obligations", [
    legal(ADMT_V3_FIXED.governance_requirement),
    { kind: "skeleton", text: "This ADMT Compliance Assessment is not the Article 10 risk assessment. The two records should nevertheless stay aligned because changes to the system, its decision use, or its safeguards may affect both analyses. The following table shows the record quality supporting each section of this assessment:" },
    { kind: "skeleton", text: `The overall record supporting this assessment is graded ${computed.overallRecordGrade.replace(/_/g, " ").toLowerCase()}.` },
    { kind: "table", text: "", table: {
      key: "governance:1", surface: "record_grades", title: "",
      columns: ["Area", "Record quality"],
      // PANEL ADMT-1 (2026-08-30): out of scope, only the Applicability
      // record was assessed — grading duty areas this report never reached
      // would reverse the body. The duty rows state "Not reached" instead,
      // so the overall grade keeps its referent.
      rows: [
        ["Applicability", gradeCell(scope.recordGrade)],
        ...(outOfScope
          ? [
            ["Pre-use Notice", "Not reached"],
            ["Opt-out / exception", "Not reached"],
            ["Access", "Not reached"],
          ]
          : [
            ["Pre-use Notice", gradeCell(notice.recordGrade)],
            ["Opt-out / exception", gradeCell(optOut.recordGrade)],
            ["Access", gradeCell(access.recordGrade)],
            ...(vendor.identified ? [["Vendor dependency", gradeCell(vendor.recordGrade)]] : []),
          ]),
      ],
    }},
  ]);

  // ── 8. Conditions, Required Follow-Up, and Recommendations ──────────────
  push("actions", "8. Conditions, Required Follow-Up, and Recommendations", buildActionParagraphs(computedForActions));

  // ── 9. Conclusion ────────────────────────────────────────────────────────
  push("conclusion", "9. Conclusion", [
    { kind: "lead", text: overallConclusionSentence(computed) },
    // v3.2.2 — the conversational "easiest way to keep this report useful"
    // close read as product copy, not counsel's report language.
    { kind: "skeleton", text: "Review and Maintenance. Update and reissue this assessment when material changes occur to the System, its decision use, the Pre-use Notice, the opt-out or appeal process, the access process, or other facts material to the conclusions stated in this report." },
  ]);

  // ── Review and Approval ─────────────────────────────────────────────────
  // CEO report review 2026-08-24. Deliberately NOT an attestation or
  // certification: no CPPA regulation defines a filed "ADMT Assessment"
  // document, so there is nothing for this signature to certify against
  // (see the discussion this section closes out). It only records that the
  // report was reviewed. Name/Title/Signature/Date are never pre-filled.
  // v3.2.2 — retitled "Review and Approval" (matches CPPA Risk's section).
  push("review_of_assessment", "Review and Approval", [
    // PANEL ADMT-1 (2026-08-30): the fixed sentence claimed the report
    // "describes the pre-use notice, opt-out mechanisms, and consumer
    // access response processes" — untrue of an out-of-scope report that
    // assessed none of them.
    { kind: "skeleton", text: outOfScope
      ? "The foregoing report records the applicability assessment of the System, and the facts supporting it, as of the date of this assessment."
      : "The foregoing report describes the pre-use notice, opt-out mechanisms, and consumer access response processes implemented as of the date of this assessment." },
    { kind: "table", text: "", table: {
      key: "review_of_assessment:1", surface: "admt_review_signature", title: "",
      columns: ["Field", "Value"], hideHeader: true,
      rows: [
        ["Name", "________________________________"],
        ["Title", "________________________________"],
        ["Signature", "________________________________"],
        ["Date", "________________________________"],
      ],
    }},
  ]);

  // CEO review 2026-08-23/24 (same fleet-wide reordering principle applied
  // to CPPA Risk: lead with the determination matrix, then precedent, then
  // the record appendix — highest end-user value first). Former
  // Appendix A (fact record), B (factor matrix), C (persuasive authority)
  // are renumbered A=factor matrix, B=persuasive authority, C=fact record.
  // No content lost; only order and labels change.

  // ── Appendix A — Factor, Determination, and Authority Matrix ───────────
  // Wave C1: computed BEFORE the table build so the Significant-decision
  // row's authority cell can carry the S5 pointer exactly when Appendix B
  // renders (Factor-Bearing Law; no dangling pointer on suppression).
  const persuasive = buildAdmtPersuasiveAuthority(computed);
  push("appendix_a", "Appendix A — Factor, Determination, and Authority Matrix", [
    // v3.2.2 — "It exists so the assessment can be reviewed and updated"
    // framed the deliverable as a working draft; state what the matrix IS.
    { kind: "skeleton", text: "This matrix restates each material factor behind the assessment in one place: the report's determination on that factor, in the report's own words, and the specific regulatory provision that governs it. It provides a consolidated record of the material determinations and authorities supporting this assessment." },
    { kind: "table", text: "", table: { key: "appendix_a:0", surface: "factor_matrix", ...buildFactorMatrixTable(intake, computed, optOut.path, admtS4, persuasive.trail) } },
  ]);

  // ── Appendix B — Persuasive Authority (Analogous Enforcement) ──────────
  // Wave C1 (doc 62 §9 amendment / doc 63 §3.3). NO-PADDING LAW: no
  // attached precedent, no appendix.
  //
  // A-TEAM S3 RULING V.19 (doc 115, 2026-08-31) — when the no-padding law
  // suppresses this appendix, the lettering used to jump A→C (flagged P0 as
  // an unexplained numbering gap). Letters are now assigned sequentially to
  // the appendices that actually render; no report can carry a gap. Body
  // cross-references use the appendix NAME ("Assessment Fact Record"), so no
  // lettered cross-reference can dangle.
  let nextAppendixLetter = "B";
  if (persuasive.table) {
    push("appendix_b", `Appendix ${nextAppendixLetter} — Persuasive Authority (Analogous Enforcement)`, [
      { kind: "skeleton", text: ADMT_APPENDIX_B_LEAD },
      { kind: "table", text: "", table: { ...persuasive.table, key: "appendix_b:1" } },
    ]);
    nextAppendixLetter = "C";
  }

  // ── Assessment Fact Record (Appendix C, or B when Persuasive Authority
  // is suppressed by the no-padding law) ──────────────────────────────────
  push("appendix_c", `Appendix ${nextAppendixLetter} — Assessment Fact Record`, [
    { kind: "skeleton", text: "This appendix captures the material facts the Company supplied and that the assessment used. It supports later review and updating; it does not independently verify the Company's responses. The following table records the material facts the Company supplied for each topic:" },
    { kind: "table", text: "", table: { key: "appendix_c:0", surface: "fact_record", ...buildFactRecordTable(intake, computed, organizationName, systemName, systemType, domains) } },
  ]);

  return {
    _typed: "skeleton-document@admt-v3.2",
    spine_version: ADMT_V2_SPINE_VERSION,
    title: "CPPA ADMT Compliance Assessment",
    subtitle: `Prepared for ${organizationName || "(organization not provided)"}`,
    sections,
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function vendorRow(label: string, c: VendorControl): string[] {
  const dependencyStatus = c.relevance === "CONDITION"
    ? "Condition — vendor-hosted, Company has no independent capability"
    : "Informational — identify and track, not itself an Article 11 gap";
  return [label, c.label, dependencyStatus];
}

const VENDOR_PATHWAY_ORDER: { path: PathState; label: string }[] = [
  { path: "FULL_OPT_OUT", label: "Full opt-out" },
  { path: "HUMAN_APPEAL_EXCEPTION", label: "Human-appeal exception" },
  { path: "HIRING_ADMISSION_EXCEPTION", label: "Hiring/admission exception" },
  { path: "WORK_ALLOCATION_COMP_EXCEPTION", label: "Work-allocation/compensation exception" },
];

function pathwayLabel(path: PathState): string {
  return VENDOR_PATHWAY_ORDER.find((p) => p.path === path)?.label ?? "Unresolved";
}

/**
 * The vendor-dependency matrix: which of the five tracked controls is
 * relevant to which pathway, independent of any single Company's answers.
 * Built directly from VENDOR_MATERIALITY_MATRIX — the same table the
 * deterministic engine evaluates against — so the printed matrix can never
 * drift from the logic that actually drives the findings above it.
 */
function vendorMaterialityMatrixTable(): { title: string; columns: string[]; rows: string[][] } {
  const controlOrder: (keyof typeof VENDOR_MATERIALITY_MATRIX)[] = ["optout", "assist", "appeal", "audit", "incident"];
  const columns = ["Vendor control", ...VENDOR_PATHWAY_ORDER.map((p) => p.label)];
  const rows = controlOrder.map((key) => {
    const m = VENDOR_MATERIALITY_MATRIX[key];
    return [
      m.label,
      ...VENDOR_PATHWAY_ORDER.map((p) => (m.pathwayRelevant(p.path, "IN_SCOPE") ? "Relevant" : "Not relevant")),
    ];
  });
  return { title: "Vendor-Dependency Matrix", columns, rows };
}

function vendorLead(intake: Record<string, unknown>, vendor: { identified: boolean }): string {
  // DEF-4 fix (doc 75): the free-text answer may end in its own period —
  // strip the terminal stop at the seam so the template's stop is the only
  // one ("…third-party data providers.." rendered in the PN-A7 sample).
  const thirdParty = str((intake as any)?.third_party_admt).replace(/\.\s*$/, "");
  return vendor.identified
    ? `The Company identifies a third-party ADMT: ${thirdParty}.`
    : "The Company did not identify a third-party ADMT in the information supplied for this assessment.";
}

// ---------------------------------------------------------------------------
// Determination-lead sentence composers (one sentence, bound to the typed
// state). v3.2: reworded to drop Part II §L's banned canned phrases (the
// old "the Pre-use Notice duty is discharged" line specifically).
// ---------------------------------------------------------------------------

// PANEL ADMT-1 (2026-08-30) — the out-of-scope surfaces.
// A-TEAM S4 RULING S2.14 (doc 119, 2026-08-31) — the exec table's Result
// cell already reads "Not reached"; the Assessment cell repeating that lead
// rendered "Not reached | — | Not reached — …" (flagged P0-2). The cell now
// states only the reason.
const NOT_REACHED_PHRASE =
  "This requirement is not assessed because the decision pathway is outside Article 11 on the reported facts (see Section 2).";
// A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, ADMT
// P1-4) — the pathway-aware variant, used where scope.pathwayDependent is
// true: names which pathway is not reached and points at the Condition to
// Proceed for the automated ones, instead of the flat single-pathway phrase.
const NOT_REACHED_PHRASE_PATHWAY =
  "Not reached for the human-reviewed pathway assessed as out of scope (see Section 2). For the automatically-decided pathways, see the Condition to Proceed in Section 8.";

/** The conditions under which the out-of-scope determination holds, stated
 * with the determination (panel-B memo 2 (e), unanimous). The band sentence
 * fires on a lexical signal in the Company's OWN system description —
 * nothing is inferred beyond what the description says. */
function buildOutOfScopeConditions(intake: Record<string, unknown>, systemName: string): RenderedParagraph[] {
  const paras: RenderedParagraph[] = [
    // A-TEAM S3 RULING V.9 (doc 115, 2026-08-31) — "Conditions on this
    // determination" read against Priority Matters' "no conditions to
    // proceed"; the head now names what this IS (a scope qualification),
    // a different thing from a remediation condition.
    { kind: "skeleton", text: "Scope qualification — conditions on this determination" },
    { kind: "skeleton", text: `This determination rests on the reported human review operating in practice for every significant decision ${systemName} touches. Qualifying review under 11 CCR § 7001(e)(1) means the reviewer knows how to interpret the output, considers it together with other information, and has authority to change the decision — for each decision, not in the aggregate. Where a decision is made without that review, the System is ADMT for that decision, and the Article 11 duties this report does not reach — the Pre-use Notice, the opt-out or exception, and consumer access and explanation — apply to it.` },
  ];
  const desc = str((intake as any)?.system_description);
  if (/auto(?:matic(?:ally)?|-)\s*(?:approv|declin|reject|deni)/i.test(desc)) {
    paras.push({
      kind: "skeleton",
      text: "The Company's own description of the System routes some outcomes automatically. Decisions reached that way are not covered by the reported human review, and for them the determination above does not hold: the Article 11 duties would apply to those decisions.",
    });
  }
  return paras;
}

function overallDeterminationSentence(c: AdmtV2Computed): string {
  const label = c.overallPostureLabel;
  if (c.scope.scopeState === "OUT_OF_SCOPE") {
    // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, ADMT
    // P0-1; CEO directive: split the pathway explicitly). The out-of-scope
    // conclusion is stated as holding for the human-reviewed pathway only
    // where the Company's own system description names an automated one.
    return c.scope.pathwayDependent
      ? `On the Company's reported facts, the human-reviewed decision pathway falls outside Article 11. Automatically approved or declined pathways do not share that conclusion and require the treatment stated below.`
      : `On the Company's reported facts, the System is out of scope for the ADMT requirements addressed in this report.`;
  }
  if (label === "Record conflict — resolve before a determination can be reached") return `The Company's answers on decision domain and advertising use conflict, so a determination cannot be reached until that conflict is resolved.`;
  if (label === "Unable to assess — scope cannot be determined on the current record") return `The Company has not supplied enough information to determine whether the System is within the ADMT rules for this decision.`;
  if (label === "Gaps identified") return `On the Company's reported facts, one or more ADMT requirements addressed in this report are not currently met.`;
  if (label === "Meets on reported facts") return `On the Company's reported facts, the ADMT requirements addressed in this report are met.`;
  return `On the Company's reported facts, the ADMT requirements addressed in this report are qualified — one or more items require follow-up before a firmer conclusion can be reached.`;
}

function applicabilityDeterminationSentence(scope: AdmtV2Computed["scope"]): string {
  if (scope.scopeState === "INCONSISTENT_RECORD") return "The Company's decision-domain and advertising answers conflict, so the applicability determination cannot be finalized on the current record.";
  if (scope.scopeState === "UNABLE_TO_ASSESS") return "The Company has not supplied enough information to determine whether the System is ADMT for this decision.";
  if (scope.scopeState === "OUT_OF_SCOPE") {
    // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, ADMT
    // P0-1) — pathway-aware, matching overallDeterminationSentence.
    return scope.pathwayDependent
      ? "On the Company's reported facts, the human-reviewed decision pathway is outside the ADMT rules for this decision. The automatically-decided pathways named in the Company's own system description are not covered by that conclusion; see the Scope qualification below."
      : "On the Company's reported facts, the System is outside the ADMT rules for this decision.";
  }
  return "On the Company's reported facts, the System is ADMT for this decision and the requirements addressed below apply.";
}

function noticeDeterminationSentence(n: AdmtV2Computed["notice"]): string {
  if (n.posture === "MEETS_REPORTED") return "On the Company's reported facts, the Company's responses support the Pre-use Notice requirements evaluated here.";
  if (n.posture === "GAP") return "On the Company's reported facts, the Pre-use Notice does not yet cover one or more required elements.";
  if (n.posture === "PARTIAL") return "On the Company's reported facts, the Pre-use Notice partially covers the required elements.";
  return "The Company has not supplied enough information to determine whether the Pre-use Notice meets the required elements.";
}

function optOutDeterminationSentence(o: AdmtV2Computed["optOut"]): string {
  if (o.path === "OTHER_UNRESOLVED") return "The Company's opt-out / exception selection does not resolve to a pathway this audit can evaluate.";
  if (o.posture === "MEETS_REPORTED") return "On the Company's reported facts, the opt-out or exception pathway the Company selected is supported.";
  if (o.posture === "GAP") return "On the Company's reported facts, the selected opt-out or exception pathway is not currently supported.";
  if (o.posture === "PARTIAL") return "On the Company's reported facts, the selected pathway is partially supported.";
  return "The Company has not supplied enough information to determine whether the selected pathway is supported.";
}

function optOutPathwaySentence(o: AdmtV2Computed["optOut"]): string {
  const map: Record<string, string> = {
    FULL_OPT_OUT: "The Company reports that it offers a full opt-out right rather than relying on a § 7221(b) exception.",
    HUMAN_APPEAL_EXCEPTION: "The Company reports that it relies on the human-appeal exception under § 7221(b)(1).",
    HIRING_ADMISSION_EXCEPTION: "The Company reports that it relies on the hiring/admission exception under § 7221(b)(2).",
    WORK_ALLOCATION_COMP_EXCEPTION: "The Company reports that it relies on the work-allocation/compensation exception under § 7221(b)(3).",
    OTHER_UNRESOLVED: "The Company's answer to the opt-out / exception question does not match one of the recognized pathways.",
  };
  return map[o.path] ?? "";
}

function accessDeterminationSentence(a: AdmtV2Computed["access"]): string {
  if (a.posture === "MEETS_REPORTED") return "On the Company's reported facts, the access and explanation duty is supported.";
  if (a.posture === "GAP") return "On the Company's reported facts, the access and explanation duty is not currently supported.";
  if (a.posture === "PARTIAL") return "On the Company's reported facts, the access and explanation duty is partially supported.";
  return "The Company has not supplied enough information to determine whether the access and explanation duty is supported.";
}

function overallConclusionSentence(c: AdmtV2Computed): string {
  return overallDeterminationSentence(c);
}

// ---------------------------------------------------------------------------
// Priority Matters (Executive Summary) + §8 action-list assembly
// ---------------------------------------------------------------------------

function priorityMattersParagraphs(c: AdmtV2Computed): RenderedParagraph[] {
  const top = [...c.allFindings].filter((f) => f.priority === 1).slice(0, 3);
  if (top.length === 0) {
    // v3.2.2 — "was generated" exposed the machinery; findings are
    // "identified", not "generated".
    return [{ kind: "skeleton", text: "Priority Matters: no conditions to proceed or required follow-up items were identified from the Company's current responses." }];
  }
  return [
    { kind: "skeleton", text: "Priority Matters" },
    ...top.map((f, i) => ({ kind: "generated", text: `${i + 1}. ${f.action_text} (${f.area} — ${f.criterion})` })),
  ];
}

function buildActionParagraphs(c: AdmtV2Computed): RenderedParagraph[] {
  const conditions = c.allFindings.filter((f) => f.priority === 1);
  const followups = c.allFindings.filter((f) => f.substantive_state === "INSUFFICIENT_RECORD" && f.priority !== 1);
  const recommendations = c.allFindings.filter((f) => f.priority !== 1 && f.substantive_state !== "INSUFFICIENT_RECORD");

  // v3.2 true no-padding: an empty bucket prints neither heading nor table.
  // An all-empty Section 8 prints one plain-English sentence and nothing
  // else — no internal DECISION_EFFECT token, no three-empty-headings.
  if (conditions.length === 0 && followups.length === 0 && recommendations.length === 0) {
    // v3.2.2 — same "identified, not generated" fix as Priority Matters.
    return [{ kind: "skeleton", text: "No conditions to proceed, required follow-up items, or additional recommendations were identified from the Company's current responses." }];
  }

  const paras: RenderedParagraph[] = [
    { kind: "skeleton", text: "The items below separate changes needed before the assessment can support the Company's selected compliance approach from factual follow-up and non-blocking improvements. The following tables list any conditions, follow-up items, and recommendations generated from the Company's responses:" },
  ];

  // CEO review 2026-08-23/24: "ID" (finding_id, an internal sequence
  // counter from mkFinding()/nextFindingId() in admt-v2-deterministic.ts)
  // is not a customer-facing variable and confused the reader as the first
  // column of these three tables. Dropped; Area/Condition/etc. already
  // uniquely identify each row for the reader, and finding_id was never
  // referenced from any other surface (checked — it exists only to key
  // these three arrays internally).
  if (conditions.length > 0) {
    paras.push(
      { kind: "skeleton", text: "8.1 Conditions to Proceed" },
      { kind: "table", text: "", table: {
        key: "actions:8.1", surface: "conditions", title: "",
        columns: ["Area", "Condition", "Why it matters", "Closure condition"],
        rows: conditions.map((f) => [f.area, f.action_text, f.factual_basis, f.closure_condition]),
      }},
    );
  }

  if (followups.length > 0) {
    paras.push(
      { kind: "skeleton", text: "8.2 Required Assessment Follow-Up" },
      { kind: "table", text: "", table: {
        key: "actions:8.2", surface: "followups", title: "",
        columns: ["Area", "Missing or unresolved item", "Why it matters", "What resolves it"],
        rows: followups.map((f) => [f.area, f.action_text, f.factual_basis, f.closure_condition]),
      }},
    );
  }

  if (recommendations.length > 0) {
    paras.push(
      { kind: "skeleton", text: "8.3 Recommendations" },
      { kind: "table", text: "", table: {
        key: "actions:8.3", surface: "recommendations", title: "",
        columns: ["Area", "Recommendation", "Reason"],
        rows: recommendations.map((f) => [f.area, f.action_text, f.factual_basis]),
      }},
    );
  }

  return paras;
}

// ---------------------------------------------------------------------------
// Appendix A — Assessment Fact Record. Purely factual restatement of what
// the Company supplied; no judgment, no D_*-effect language. Blank fields
// render "Not reported" per the no-padding law (the row itself still
// prints — this is a fact record, not a findings table, so a topic with no
// answer is itself a fact worth recording).
// ---------------------------------------------------------------------------

function factOr(v: string | undefined | null): string {
  const s = (v ?? "").toString().trim();
  return s || "Not reported.";
}

function buildFactRecordTable(
  intake: Record<string, unknown>,
  computed: AdmtV2Computed,
  organizationName: string,
  systemName: string,
  systemType: string,
  domains: string[],
): { title: string; columns: string[]; rows: string[][] } {
  const d = (intake as any)?.admt_detail ?? {};
  const arrJoin = (v: unknown): string => Array.isArray(v) ? v.join("; ") : str(v as any);

  const hosting = str(d.hosting);
  const modelTypes = arrJoin(d.model_types);
  const decisionEffects = arrJoin(d.decision_effects);
  const decisionCadence = str(d.decision_cadence);
  const soleFactor = str(d.sole_factor);
  const feedsFuture = str(d.feeds_future_decisions);
  const training = str((intake as any)?.training_data_use);
  const profiling = str((intake as any)?.profiling_use);
  const consumerCount = str((intake as any)?.ca_consumer_count);
  const popBand = str((intake as any)?.affected_population_band);
  const systemCount = str((intake as any)?.admt_system_count);
  const roleRoster = arrJoin((intake as any)?.role_roster);
  const noticeDelivery = arrJoin((intake as any)?.notice_delivery);
  const thirdParty = str((intake as any)?.third_party_admt);

  // CEO review 2026-08-23/24: "Source field(s)" printed the raw intake
  // schema paths (e.g. "admt_detail.hosting; admt_detail.model_types") to
  // the customer — an internal variable name, not information the reader
  // can use. Dropped; the Topic column already names the subject in plain
  // English and the Recorded value column carries the actual fact.
  const rows: string[][] = [
    ["Organization and system",
      factOr(`${organizationName || "(not reported)"} — ${systemName || "(not reported)"}${systemType ? `, ${systemType}` : ""}.`)],
    // A-TEAM S3 RULING V.20 (doc 115, 2026-08-31) — a combined row could
    // print "Not reported" against a model type the report described
    // elsewhere; the two facts get their own rows so neither can read
    // against the other.
    ["Hosting", factOr(hosting)],
    ["Model type", factOr(modelTypes)],
    ["Decision domains", factOr(reader(domains))],
    ["Decision role",
      factOr([decisionEffects && `Effects: ${decisionEffects}.`, decisionCadence && `Cadence: ${decisionCadence}.`, soleFactor && `Role of output: ${soleFactor}.`, feedsFuture && `Feeds future decisions: ${feedsFuture}.`].filter(Boolean).join(" "))],
    ["Human review", factOr(str((intake as any)?.human_review))],
    ["Training / profiling",
      factOr([training && `Training data use: ${training}.`, profiling && `Profiling use: ${profiling}.`].filter(Boolean).join(" "))],
    ["Scale",
      factOr([consumerCount && `CA consumers: ${consumerCount}.`, popBand && `Population band: ${popBand}.`, systemCount && `ADMT system count: ${systemCount}.`].filter(Boolean).join(" "))],
    ["Internal roles", factOr(roleRoster)],
    ["Notice",
      factOr([noticeDelivery && `Delivery: ${noticeDelivery}.`, `Record quality: ${gradeLabel(computed.notice.recordGrade)}`].filter(Boolean).join(" "))],
    ["Opt-out / exception",
      factOr(`Pathway: ${OPTOUT_PATH_LABEL[computed.optOutPath] ?? "unresolved"}. Record quality: ${gradeLabel(computed.optOut.recordGrade)}`)],
    ["Access",
      factOr(`Record quality: ${gradeLabel(computed.access.recordGrade)}`)],
    ["Vendor / system detail",
      factOr(thirdParty ? `Third-party ADMT: ${thirdParty}. Record quality: ${gradeLabel(computed.vendor.recordGrade)}` : "No third-party ADMT identified.")],
  ];

  return { title: "", columns: ["Topic", "Recorded value"], rows };
}

// ---------------------------------------------------------------------------
// Appendix A (formerly "B") — Factor, Determination, and Authority Matrix.
// The determination column (report language) is selected for THIS report's
// actual computed result — never a static menu of every possible outcome —
// and never shows the triggering condition, per the CEO's 2026-08-21
// redline-round ruling. 2026-08-23/24: merged with the former "Company's
// reported answer" column into one Report Determination cell, matching the
// fleet-wide 3-column convention (doc 46).
// Only the ONE opt-out pathway row matching the Company's selected path
// renders, matching the conditional-printing rule Part I already follows
// for the body sections themselves.
// ---------------------------------------------------------------------------

function buildFactorMatrixTable(
  intake: Record<string, unknown>,
  computed: AdmtV2Computed,
  path: PathState,
  admtS4?: readonly AdmtS4Attachment[],
  persuasiveTrail?: string | null,
): { title: string; columns: string[]; rows: string[][] } {
  const { scope, notice, optOut, access, vendor } = computed;
  const withholdingText = str((intake as any)?.access_trade_secret_policy);

  const rows: string[][] = [
    ["Significant decision", scope.significantDecisionLabel, significantDecisionPhrase(scope.significantDecisionEffect), "11 CCR §§ 7001(ddd), 7200(a)"],
    ["Human involvement", scope.humanInvolvementLabel, humanInvolvementPhrase(scope.humanInvolvementEffect), "11 CCR § 7001(e)(1)"],
    ["Advertising exclusion", scope.advertisingLabel, advertisingPhrase(scope.advertisingEffect), "11 CCR § 7001(ddd)(6)"],
    ["Output role", scope.outputRoleLabel, outputRolePhrase(), "11 CCR §§ 7001(e)(1), 7220(c)(5)(B), 7222(b)(3)–(3)(A)"],
  ];

  // PANEL ADMT-1 (2026-08-30): the matrix "restates each material factor
  // behind the assessment" — out of scope, the duty factors were never
  // assessed, so restating them here would reverse the body.
  if (scope.scopeState === "OUT_OF_SCOPE") {
    return {
      title: "",
      columns: ["Factor", "Report Determination", "Primary Authority"],
      rows: rows.map((r) => [r[0], `${r[1]} — ${r[2]}`, r[3]]),
    };
  }

  rows.push(
    ["Notice delivery", notice.delivery.label, noticeDeliveryPhrase(notice.delivery.status), "11 CCR § 7220(b)(2)–(3)"],
    ["Notice content", `Composite across the six required elements (see §3 table)`, noticeContentPhrase(notice.posture), "11 CCR § 7220(c)(1)–(5)"],
    ["Notice text (evidence / record grade)", `Record grade: ${gradeLabel(notice.recordGrade)}`, gradeLabel(notice.recordGrade), "11 CCR § 7220(c)"],
  );

  if (path === "FULL_OPT_OUT") {
    rows.push(["Opt-out pathway", "Full opt-out (§4.1 table)", optOutPathwayPhrase(optOut), "11 CCR § 7221(c)–(h), (n)"]);
  } else if (path === "HUMAN_APPEAL_EXCEPTION") {
    rows.push(["Opt-out pathway", "Human-appeal exception (§4.2 table)", optOutPathwayPhrase(optOut), "11 CCR § 7221(b)(1)"]);
  } else if (path === "HIRING_ADMISSION_EXCEPTION") {
    // Both employment exceptions render under the SAME §4.3 section
    // (admt-v2-assemble.ts:423) — there is no separate §4.4.
    rows.push(["Opt-out pathway", "Hiring/admission exception (§4.3 table)", optOutPathwayPhrase(optOut), "11 CCR § 7221(b)(2)(A)–(B)"]);
  } else if (path === "WORK_ALLOCATION_COMP_EXCEPTION") {
    rows.push(["Opt-out pathway", "Work-allocation/compensation exception (§4.3 table)", optOutPathwayPhrase(optOut), "11 CCR § 7221(b)(3)(A)–(B)"]);
  } else {
    // OTHER_UNRESOLVED — no §4.x sub-section renders (there is no resolved
    // pathway to show a table for), but the row must still appear:
    // computeOptOut emits a priority-1 finding and posture INSUFFICIENT_RECORD
    // for this state, so silently omitting it understated an open finding.
    rows.push(["Opt-out pathway", "Selection does not match a recognized pathway", optOutPathwayPhrase(optOut), "11 CCR § 7221(a)–(b)"]);
  }

  rows.push(
    ["Access process", `Submission/verification/timeline (see §5 table)`, accessProcessPhrase(access.timeline.status), "11 CCR § 7222(d)–(e); § 7021(a)–(b) (response timeline)"],
    ["Access readiness", `Five explanation-readiness elements (see §5 table)`, accessReadinessPhrase(access.readinessComposite), "11 CCR § 7222(a)–(b)"],
    ["Withholding", factOr(withholdingText), withholdingPhrase(access.withholdingEvidence), "11 CCR § 7222(c)"],
  );

  if (vendor.identified) {
    rows.push(["Vendor dependency", "Third-party ADMT identified (see §6 table)", vendorDependencyPhrase(vendor), "11 CCR §§ 7221(n)(2), 7222(i), 7050(h), 7051(a)(6)–(7)"]);
  }

  rows.push(["Record quality", `Overall: ${gradeLabel(computed.overallRecordGrade)}`, gradeLabel(computed.overallRecordGrade), "Audit methodology — no specific ADMT provision"]);

  // Wave C1 (doc 62 §11's R1 amendment): extend the Primary-authority
  // column. A factor with S4 attachments gets a pointer to §2.1 (content
  // renders there, not repeated here — avoids the aggregate-budget clutter
  // R2 exists to prevent); a factor with a ratified dark trail_impact tag
  // gets that tag; Significant decision additionally gets the S5 pointer
  // when Appendix B renders. At most one of these per row, by construction.
  const s4Factors = new Set((admtS4 ?? []).map((a) => a.factor_id));
  for (const row of rows) {
    const factorId = row[0];
    if (s4Factors.has(factorId)) {
      // v3.2.2 — the body has no numbered "§2.1"; point at the callout by
      // name and section instead of a number that doesn't exist.
      // A-TEAM S3 RULING V.10 (doc 115) — heading renamed; pointer follows.
      row[3] = `${row[3]}; see the "Regulatory Interpretation" discussion in Section 2, above — interpretive`;
      continue;
    }
    const tag = admtTrailImpactFor(factorId);
    if (tag) row[3] = `${row[3]}; ${tag}`;
    if (factorId === "Significant decision" && persuasiveTrail) {
      row[3] = `${row[3]}; persuasive (Appendix B): analogous enforcement — ${persuasiveTrail}`;
    }
  }

  // CEO review 2026-08-23/24, fleet-wide convention (doc 46; landed for
  // DPIA + CPPA Risk in commit a062af92e, never carried to ADMT until now):
  // "Company's reported answer" and "What the report says" merge into one
  // Report Determination cell — the report's own determination language
  // already reflects the company's answer, so a separate raw-answer column
  // is the same redundant-detail problem the fleet-wide redesign fixed
  // elsewhere. Three columns, matching every other product's appendix.
  const merged = rows.map((r) => [r[0], `${r[1]} — ${r[2]}`, r[3]]);

  return { title: "", columns: ["Factor", "Report Determination", "Primary Authority"], rows: merged };
}
