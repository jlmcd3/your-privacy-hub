// SO-9 — CPPA / CCPA Scope Assessment: byte-pinned render law.
//
// CERTIFIED SOURCE: the CEO's paragraph-by-paragraph certification of
// 2026-08-10, reconciled byte-for-byte against
// CPPA_Scope_Checker_Skeleton_v3-3.docx (word/document.xml, 20 paragraphs).
// Both produce SHA-256 21d6feb4eca175b687e1d99df060b88d6de354a6a2da0783c1eb8b510170fe40 (re-pinned doc 119 S3.1)
// over the "\n"-joined paragraph list. ASCII only, straight quotes, no entities.
//
// DO NOT reformat, re-wrap, or "fix" typography in this file. The spine is law;
// the renderer composes around it and never rewrites it.

export const SCOPE_SPINE: readonly string[] = [
  "CCPA / CPRA SCOPE ASSESSMENT",
  "An applicability screening under Cal. Civ. Code Section 1798.140(d)",
  "Register guide (v3 - CEO-ratified counsel register, senior privacy lawyers with the professors editing) - Fixed prose is a lawyer's client document: full flowing sentences, measured connectives, the law stated plainly and applied. The company's facts are always attributed (\"{org} has indicated that ...\", \"the company has described ...\") - \"the record shows\" and its family are banned. No dramatization, no rhetorical questions, no self-narration. Facts enter only through {slots} and [GENERATED] blocks under the ATTRIBUTION RULE: every factual clause names its source and traces to an intake answer or typed analysis; coverage, CSC and refinement police this mechanically. Statutory sentences in fixed prose are registry-verified at encode time. Slot notation: {field - rule}.",
  "Executive Summary",
  "[DETERMINATION LEAD] One sentence stating whether the business is in scope and by which limb - or the honest not-determinable form naming the unanswered threshold.",
  "The CCPA applies to a for-profit business that does business in California and meets any one of three statutory thresholds. The company's answers, applied below, resolve that question as far as they go; where an answer leaves a threshold undetermined, the assessment says so rather than assuming.",
  "[GENERATED] Two to three sentences: the limbs engaged and the decisive fact for each, attributed; only decisive figures appear.",
  "I. California Nexus",
  "The company has answered the for-profit question {q1 - rendered as prose} and the doing-business-in-California question {q2 - rendered as prose}{LEGACY_CLAUSE - q2LegacyConfirm folded in}. Taken together, those answers {NEXUS_PHRASE - establish / do not establish / leave open} the California nexus.",
  "II. The Statutory Thresholds",
  "[DETERMINATION LEAD] One sentence stating which limb, if any, is met.",
  "On revenue, the company has answered {q3 - band rendered as prose, boundaries phrased without overlap}. On the number of consumers or households, {q4 - band as prose}. On the share of revenue from selling or sharing personal information, {q5 - rendered as prose}. Each limb is stated with its statutory figure from the verified registry; the company determines, from its actual figures, which side of each line it stands on.",
  "[GENERATED] The threshold analysis, limb by limb, attributed; undetermined limbs named with what would settle them.",
  "III. Processing-Specific Obligations",
  "[CONDITIONAL] Per-obligation treatment - triggers {q6} / {q7} / {q8} / {q8a} / {q8b}: each obligation that attaches receives its own sentence stating the duty and the company's answer; where none attaches, one honest sentence says so.",
  "IV. Conclusion",
  "[DETERMINATION LEAD] One sentence restating the scope conclusion, with any unanswered limb carried forward.",
  "[GENERATED] Counsel's closing: what in-scope status obligates next, concretely, attributed; ends on the single next act.",
  "Authorities Cited",
  "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred.",
];

/** SHA-256 over SCOPE_SPINE.join("\n"). Certified 2026-08-10. */
export const SCOPE_SPINE_SHA256 =
// RE-PIN A-TEAM S4 (doc 119 S3.1, 2026-08-31): fleet ToA rename — the "Table of Authorities" section title became "Authorities Cited" (CEO-ratified, panel A1); ids and assembly rules unchanged. Old-hash reproduction verified before re-pin. Prior pin:
// 24e551a1c8becb7339fbbc7303227056dc4f2483060b015f3799009f64f97bd2.
  "21d6feb4eca175b687e1d99df060b88d6de354a6a2da0783c1eb8b510170fe40";

export const SCOPE_PIPELINE_STAMP = "scope-pipeline@item-so9-2026-08-10";

/**
 * Per-paragraph role. "guide" and "toa_rule" are encode-time instructions to the
 * renderer and are never shown to a reader; every other kind emits.
 */
export type ScopeParaKind =
  | "title"
  | "subtitle"
  | "guide"
  | "heading"
  | "lead"
  | "fixed"
  | "generated"
  | "slotted"
  | "conditional"
  | "toa_heading"
  | "toa_rule";

export const SCOPE_PARA_KINDS: readonly ScopeParaKind[] = [
  "title",       // 0
  "subtitle",    // 1
  "guide",       // 2  — instruction, non-emitting
  "heading",     // 3
  "lead",        // 4
  "fixed",       // 5
  "generated",   // 6
  "heading",     // 7
  "slotted",     // 8
  "heading",     // 9
  "lead",        // 10
  "slotted",     // 11
  "generated",   // 12
  "heading",     // 13
  "conditional", // 14
  "heading",     // 15
  "lead",        // 16
  "generated",   // 17
  "toa_heading", // 18
  "toa_rule",    // 19 — instruction, non-emitting (the ToA list replaces it)
];

/**
 * Registry-verified statutory anchors. The verbatim quotes are byte-identical to
 * cppa_authorities row "Cal. Civ. Code § 1798.140" (status=current), verified at
 * encode time 2026-08-10 against the live corpus.
 */
export const SCOPE_STATUTORY_REGISTRY = {
  chapeau: {
    pinpoint: "Cal. Civ. Code \u00A7 1798.140(d)",
    verbatim: "(d)\u00A0\u201CBusiness\u201D means:",
  },
  revenue: {
    pinpoint: "Cal. Civ. Code \u00A7 1798.140(d)(1)(A)",
    verbatim:
      "As of January 1 of the calendar year, had annual gross revenues in excess of twenty-five million dollars ($25,000,000) in the preceding calendar year, as adjusted pursuant to subdivision (d) of Section 1798.199.95.",
    figure: "$26,625,000",
  },
  consumers: {
    pinpoint: "Cal. Civ. Code \u00A7 1798.140(d)(1)(B)",
    verbatim:
      "Alone or in combination, annually buys, sells, or shares the personal information of 100,000 or more consumers or households.",
    figure: "100,000",
  },
  saleShare: {
    pinpoint: "Cal. Civ. Code \u00A7 1798.140(d)(1)(C)",
    verbatim:
      "Derives 50 percent or more of its annual revenues from selling or sharing consumers\u2019 personal information.",
    figure: "50 percent",
  },
} as const;
