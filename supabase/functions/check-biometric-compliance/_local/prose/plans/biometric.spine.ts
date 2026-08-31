// ITEM SO-6 — SPECIFIED OUTPUT ENCODE: Biometric Privacy Checker.
//
// RENDER LAW. The CEO-ratified skeleton — `Biometric_Privacy_Checker_
// Skeleton_v3.docx` as corrected on 2026-08-10 by the CEO's six paragraph
// edits (the HARD-STOP resolution: the eight slots with no live source are
// dropped, `{RETENTION_PHRASE}` is remapped to `{retentionSchedule}`, and
// `{sector}` is bound to `orgType`) — is this product's render law. Every
// string below is transcribed BYTE-FOR-BYTE from that file's paragraph text.
// Nothing here may be reworded, re-punctuated or "improved" by code, by
// refinement, or by an agent: fixed prose is a protected leaf (splice-barred)
// and conformance byte-matches the assembled document against it outside the
// slots.
//
// Block kinds:
//   "skeleton"    — FIXED PROSE. Byte-pinned; {slots} are the only mutable spans.
//   "lead"        — [DETERMINATION LEAD]: exactly one generated sentence, bound
//                   to the typed determination (`consequence_determination`,
//                   `duty_findings`). A lead may not disagree with it.
//   "generated"   — [GENERATED]: counsel-voice prose under the ATTRIBUTION RULE.
//   "conditional" — [CONDITIONAL]: renders only when its trigger fires.
//   "rule"        — authoring/assembly directive ([BYTE-PINNED] note, Table of
//                   Authorities). Never printed unless the composer supplies
//                   deterministic content for it.

// S-B5 (doc 80, 2026-08-27) bumped from prose-plans-2026-08-10-item-so6:
// the state_specific section gained the unregistered-named-jurisdictions
// conditional block (honest-posture parity).
export const BIOMETRIC_SKELETON_VERSION = "prose-plans-2026-08-30-c5-arabic";
export const BIOMETRIC_SKELETON_SOURCE_FILE =
  "Biometric_Privacy_Checker_Skeleton_v3.docx (CEO-corrected 2026-08-10: six paragraph edits, eight unsourced slots dropped)";
export const BIOMETRIC_SKELETON_PROVENANCE =
  "Biometric_Privacy_Checker_Skeleton_v3.docx, CEO correction of 2026-08-10 — panel-delegated approval per CEO delegation 2026-08-06";

/**
 * SHA-256 over the CORRECTED skeleton's paragraph text, newline-joined, in
 * file order, computed DIRECTLY from the docx bytes (all 25 `w:p` paragraphs,
 * `w:t` runs concatenated, XML entities unescaped, joined with "\n").
 *
 * Uncorrected v3 (for the audit trail):
 *   ae5f9d461f79651d9f0a2bca3cc0d60cd7e7858548c7ee5f6119bbcc9c270fd0
 * CEO-corrected v3 (25 paragraphs, superseded by S-B5's paragraph 26):
 *   4109a6f1a562a318a44978025dadb5802534f863680b8c6ecb87eace6449c48f
 *
 * S-B5 (doc 80, 2026-08-27): one conditional paragraph added under the
 * CEO's improvement grant (unregistered-named-jurisdictions honest-posture
 * parity), ratification-ledger entry pending optional redline. The hash
 * below covers the 26-paragraph set.
 */
/**
 * RE-PIN 2026-08-30 (expert-panel LEAK-1, CEO fix-campaign mandate): the
 * subtitle's " - statute-as-template" tail was internal build vocabulary
 * printed on the customer's cover (panel-C memo 3 D2); the subtitle now
 * ends at the organization name. Nothing else changed. Prior pin:
 * 2a22748ad3fc3431114799af91316a62522e33a06d22a73acdb552b3e2102006.
 *
 * RE-PIN BATCH 21b (Wave C5, doc 113 S8.1, RULING 3.6): the four section
 * titles' Roman numerals (I–IV) became arabic (1–4); no cross-reference
 * audit was needed (zero inline Roman-numeral references exist anywhere in
 * this product's composed prose, confirmed by grep). Method verified by
 * reproducing the prior value first. Prior pin:
 * 8d688a3bc21deb7066d725856f543a9ac1decef7e2e6dc5eb396ea235e160206.
 */
// RE-PIN A-TEAM S4 (doc 119 S3.1, 2026-08-31): fleet ToA rename — the "Table of Authorities" section title became "Authorities Cited" (CEO-ratified, panel A1); ids and assembly rules unchanged. Old-hash reproduction verified before re-pin. Prior pin:
// 28b62bd3385cee5feee8e8c4e6a2e4e9224895827090f857cfbcf3c26c6a0d5f.
export const BIOMETRIC_SKELETON_CONTENT_HASH =
  "4ad3d8c5bf26ddfe84dc636d32114f065599d921b6b8a60a87982f81b5807d23";

/**
 * RESTORED 2026-08-26 (Biometric Conversion groundwork audit). The 2026-08-19
 * "Work in progress" rewrite of this file (commit fe6f68321) replaced the
 * item409 arc-stage shape with the SO-6 skeleton shape above but dropped this
 * constant, even though `index.ts` and `biometric-prose-gold.ts` still import
 * it unconditionally — a module-resolution failure that would abort the
 * entire `check-biometric-compliance` function at load time (confirmed via
 * `deno check`: TS2305 on both consumers). Restored with its original
 * pre-removal value/definition; this is an internal `_meta.internal` telemetry
 * stamp only, never rendered to a customer, so restoring it changes no
 * customer-facing byte.
 */
export const BIOMETRIC_PIPELINE_STAMP = "biometric-pipeline@item-so6-2026-08-10";

export const BIOMETRIC_SKELETON_TITLE = "BIOMETRIC PRIVACY COMPLIANCE ASSESSMENT";
export const BIOMETRIC_SKELETON_SUBTITLE =
  "A multi-state review, prepared for {organizationName}";

/** The v3 register guide, verbatim. Authoring law; never printed to a customer. */
export const BIOMETRIC_REGISTER_GUIDE = "Register guide (v3 - CEO-ratified counsel register, senior privacy lawyers with the professors editing) - Fixed prose is a lawyer's client document: full flowing sentences, measured connectives, the law stated plainly and applied. The company's facts are always attributed (\"{org} has indicated that ...\", \"the company has described ...\") - \"the record shows\" and its family are banned. No dramatization, no rhetorical questions, no self-narration. Facts enter only through {slots} and [GENERATED] blocks under the ATTRIBUTION RULE: every factual clause names its source and traces to an intake answer or typed analysis; coverage, CSC and refinement police this mechanically. Statutory sentences in fixed prose are registry-verified at encode time. Slot notation: {field - rule}.";

/** The v3 banned register, lower-cased for the assembled-body check. */
export const BIOMETRIC_V3_BANNED_REGISTER: readonly string[] = [
  "the record shows",
  "on this record",
  "the record reflects",
  "the record demonstrates",
  "as the record makes clear",
];

// BATCH 18 (Wave C1): "table" joins the block kinds for the duty scorecard.
export type BiometricSkeletonBlockKind = "skeleton" | "lead" | "generated" | "conditional" | "rule" | "table";

export interface BiometricSkeletonBlock {
  readonly kind: BiometricSkeletonBlockKind;
  readonly text: string;
}

export interface BiometricSkeletonSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly BiometricSkeletonBlock[];
}

export const BIOMETRIC_SKELETON_SECTIONS: readonly BiometricSkeletonSection[] = [
  {
    id: "executive_summary",
    title: "Executive Summary",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether the programme as the company describes it meets each statute in scope, or naming plainly where it falls short." },
      { kind: "skeleton", text: "{organizationName}, operating in {sector - reader label}, has indicated that it collects {biometricTypes - reader labels} for {collectionPurpose}, by means of {collectionMethod - own clause}. The states whose laws the company has placed in scope are {states - as prose}. Each statute below is applied in its own words: the duty appears as the verified statutory passage states it, the company's answers are set beside it, and the conclusion follows from the two." },
      { kind: "generated", text: "[GENERATED] The outcome per statute in scope, one measured clause each; where the company's answers leave a duty unresolved, the assessment says so and names what would settle it." },
      // BATCH 18 (Wave C1, doc 109 §2.9 item 3): the duty scorecard —
      // Duty | Pinpoint | Status | Where addressed — built from the typed
      // duty rows; the report's first table. Carries no fixed text, so the
      // paragraph hash basis is unchanged.
      { kind: "table", text: "" },
    ],
  },
  {
    id: "notice_consent",
    title: "1. Notice, Consent and the Written Policy",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the notice-and-consent posture across the statutes in scope." },
      { kind: "skeleton", text: "The company has answered the written-notice question {HAS_NOTICE_PHRASE - reader phrase}; and the written-release question {HAS_RELEASE_PHRASE - reader phrase}." },
      { kind: "rule", text: "[BYTE-PINNED] Each statutory duty in this section is the verified corpus passage, cited to its source row; the company's facts are set beside the passage, never written into it." },
      { kind: "generated", text: "[GENERATED] Per-duty findings from the typed duty rows, each attributed; destruction obligations are stated on the statutory clock - the period runs from the individual's last interaction, not from collection - and the deterministic trigger repair guards that phrasing." },
    ],
  },
  {
    id: "state_specific",
    title: "2. State-Specific Requirements",
    blocks: [
      { kind: "conditional", text: "[CONDITIONAL] ILLINOIS - trigger IL in {states}: the BIPA Section 15(a)-(e) duties, each from its verified passage, with the 2024 amendment's damages rule per the pinned rulebook." },
      { kind: "conditional", text: "[CONDITIONAL] TEXAS - trigger TX: the CUBI duties; the company's destruction answer {txDestruction}, attributed." },
      { kind: "conditional", text: "[CONDITIONAL] WASHINGTON - trigger WA: the RCW 19.375 enrolment duties; the My Health My Data Act addressed where the answers indicate health inference." },
      { kind: "conditional", text: "[CONDITIONAL] OTHER STATES - named statutes only, per the registered-jurisdiction rule; an unresolved state is addressed by naming the statutes the company should evaluate, never by a generic instruction to confirm applicable law." },
      // S-B5 (doc 80, 2026-08-27) — honest-posture parity: a NAMED enum
      // jurisdiction with no duty registry behind it (EU/UK/CA/CO/NY/
      // Federal/Canada/AU/SG) renders an explicit scope statement, never
      // silence; EU/UK additionally name the Art. 9 route (DPIA/LIA).
      { kind: "conditional", text: "[CONDITIONAL] UNREGISTERED NAMED JURISDICTIONS - trigger: any selected enum jurisdiction outside the registered statutes: an explicit statement that no statutory duty is stated for it here, with the EU/UK Article 9 route named where selected." },
    ],
  },
  {
    id: "security_retention",
    title: "3. Security, Retention and Destruction",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether storage and destruction meet the strictest applicable standard." },
      { kind: "skeleton", text: "The company has described its security measures as {securityMeasures - reader labels as prose}. Its retention is described as {retentionSchedule - own clause, attributed}, with destruction occurring on {destructionTrigger - rendered on the statutory clock}." },
      { kind: "generated", text: "[GENERATED] The security and retention findings per statute, attributed." },
    ],
  },
  {
    id: "review_approval",
    title: "4. Review and Approval",
    blocks: [
      { kind: "skeleton", text: "{APPROVAL_SENTENCE - from approverName / approverTitle / approvalDate; these approval fields render only when answered}." },
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the operative conclusion and the single next act." },
    ],
  },
  {
    id: "table_of_authorities",
    title: "Authorities Cited",
    blocks: [
      { kind: "rule", text: "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred." },
    ],
  },
];

/**
 * The corrected docx's 25 paragraphs, verbatim and in file order. This is the
 * byte-pin of record: `BIOMETRIC_SKELETON_CONTENT_HASH` is SHA-256 over these
 * strings joined with "\n", and the colocated test asserts both that identity
 * and that every block above is a substring of one of these paragraphs.
 */
export const BIOMETRIC_SKELETON_PARAGRAPHS: readonly string[] = [
  "BIOMETRIC PRIVACY COMPLIANCE ASSESSMENT",
  "A multi-state review, prepared for {organizationName}",
  BIOMETRIC_REGISTER_GUIDE,
  "Executive Summary",
  "[DETERMINATION LEAD] One sentence stating whether the programme as the company describes it meets each statute in scope, or naming plainly where it falls short.",
  "{organizationName}, operating in {sector - reader label}, has indicated that it collects {biometricTypes - reader labels} for {collectionPurpose}, by means of {collectionMethod - own clause}. The states whose laws the company has placed in scope are {states - as prose}. Each statute below is applied in its own words: the duty appears as the verified statutory passage states it, the company's answers are set beside it, and the conclusion follows from the two.",
  "[GENERATED] The outcome per statute in scope, one measured clause each; where the company's answers leave a duty unresolved, the assessment says so and names what would settle it.",
  "1. Notice, Consent and the Written Policy",
  "[DETERMINATION LEAD] One sentence stating the notice-and-consent posture across the statutes in scope.",
  "The company has answered the written-notice question {HAS_NOTICE_PHRASE - reader phrase}; and the written-release question {HAS_RELEASE_PHRASE - reader phrase}. [BYTE-PINNED] Each statutory duty in this section is the verified corpus passage, cited to its source row; the company's facts are set beside the passage, never written into it.",
  "[GENERATED] Per-duty findings from the typed duty rows, each attributed; destruction obligations are stated on the statutory clock - the period runs from the individual's last interaction, not from collection - and the deterministic trigger repair guards that phrasing.",
  "2. State-Specific Requirements",
  "[CONDITIONAL] ILLINOIS - trigger IL in {states}: the BIPA Section 15(a)-(e) duties, each from its verified passage, with the 2024 amendment's damages rule per the pinned rulebook.",
  "[CONDITIONAL] TEXAS - trigger TX: the CUBI duties; the company's destruction answer {txDestruction}, attributed.",
  "[CONDITIONAL] WASHINGTON - trigger WA: the RCW 19.375 enrolment duties; the My Health My Data Act addressed where the answers indicate health inference.",
  "[CONDITIONAL] OTHER STATES - named statutes only, per the registered-jurisdiction rule; an unresolved state is addressed by naming the statutes the company should evaluate, never by a generic instruction to confirm applicable law.",
  // S-B5 (doc 80, 2026-08-27) — new paragraph 26 under the CEO's
  // improvement grant, ratification-ledger entry; the content hash and
  // paragraph count in tests/edge/so6/skeleton.test.ts re-pin with it.
  "[CONDITIONAL] UNREGISTERED NAMED JURISDICTIONS - trigger: any selected enum jurisdiction outside the registered statutes: an explicit statement that no statutory duty is stated for it here, with the EU/UK Article 9 route named where selected.",
  "3. Security, Retention and Destruction",
  "[DETERMINATION LEAD] One sentence stating whether storage and destruction meet the strictest applicable standard.",
  "The company has described its security measures as {securityMeasures - reader labels as prose}. Its retention is described as {retentionSchedule - own clause, attributed}, with destruction occurring on {destructionTrigger - rendered on the statutory clock}.",
  "[GENERATED] The security and retention findings per statute, attributed.",
  "4. Review and Approval",
  "{APPROVAL_SENTENCE - from approverName / approverTitle / approvalDate; these approval fields render only when answered}.",
  "[DETERMINATION LEAD] One sentence stating the operative conclusion and the single next act.",
  "Authorities Cited",
  "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred.",
];

/**
 * STATUTORY PINPOINTS carried by the fixed prose and its per-statute duty
 * blocks, each verified `approved` in `provision_texts` at encode time
 * (SO step 1):
 *   BIPA 740 ILCS 14/15(a)-(e) → `il-bipa-740-14-15-a` … `-15-e`
 *   BIPA 740 ILCS 14/20(b)-(c) → `il-bipa-740-14-20-b` / `-20-c` (2024 accrual)
 *   CUBI Tex. Bus. & Com. Code § 503.001 → `tx-cubi-503-001`
 *   RCW 19.375.020 → `wa-rcw-19-375-020`
 *   RCW 19.373 (MHMDA) → `wa-rcw-19-373`
 */
export const BIOMETRIC_SKELETON_PINPOINTS: readonly { readonly citation: string; readonly corpus_key: string }[] = [
  { citation: "740 ILCS 14/15(a)", corpus_key: "il-bipa-740-14-15-a" },
  { citation: "740 ILCS 14/15(b)", corpus_key: "il-bipa-740-14-15-b" },
  { citation: "740 ILCS 14/15(c)", corpus_key: "il-bipa-740-14-15-c" },
  { citation: "740 ILCS 14/15(d)", corpus_key: "il-bipa-740-14-15-d" },
  { citation: "740 ILCS 14/15(e)", corpus_key: "il-bipa-740-14-15-e" },
  { citation: "740 ILCS 14/20(b)", corpus_key: "il-bipa-740-14-20-b" },
  { citation: "740 ILCS 14/20(c)", corpus_key: "il-bipa-740-14-20-c" },
  { citation: "Tex. Bus. & Com. Code § 503.001(a)", corpus_key: "tx-cubi-503-001-a" },
  { citation: "Tex. Bus. & Com. Code § 503.001(b)", corpus_key: "tx-cubi-503-001-b" },
  { citation: "Tex. Bus. & Com. Code § 503.001(c)", corpus_key: "tx-cubi-503-001-c" },
  { citation: "RCW 19.375.020", corpus_key: "wa-rcw-19-375-020" },
  { citation: "RCW 19.373.030", corpus_key: "wa-rcw-19-373-030" },
];
