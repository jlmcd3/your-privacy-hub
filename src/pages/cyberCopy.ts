/**
 * cyberCopy.ts — replacement shared copy for the CPPA Cybersecurity Audit
 * Readiness page (src/pages/CPPACybersecurity.tsx).
 *
 * Sourced verbatim from the "# Shared copy replacements" section of
 * C:\t\cyber-review.txt (lines 548–578), taking each row's "Suggested"
 * text. Two rows carry an explicit implementation marker in the same cell
 * as the customer-facing sentence (S04 "Implementation dependency:"; S06's
 * trailing sentence about not promising an unbuilt revision feature, judged
 * the same way even without the literal marker word) — that trailing,
 * developer-directed text is not included in the exported copy, consistent
 * with how the ADMT register's "Implementation note:" marker is treated in
 * admtCopy.ts.
 */

export const CYBER_COPY = Object.freeze({
  // S01 Profile introduction
  profileIntro:
    "Start with the organization and systems you want this readiness report to cover. Then answer the applicability and audit-planning questions using your records. Required fields are marked; optional answers make the report more specific. These answers do not themselves establish an audit duty or complete an independent audit.",

  // S02 Generic maturity helper
  maturityHelper:
    "Choose the description closest to what is operating today. Do not count planned work as implemented. Use Notes to explain scope, exceptions and uncertainty. An unanswered rating is recorded as insufficient information, not as a failed control. The rating is your description, not an auditor\u2019s conclusion.",

  // S03 Generic notes helper
  notesHelper:
    "Describe the measure or process in place, the systems and people it covers, and any exceptions. Identify useful supporting records. Keep planned improvements separate from current practice. If you do not know an answer, say what needs checking. Use the component-specific prompts below.",

  // S04 Generic evidence helper (trailing "Implementation dependency:" note omitted)
  evidenceHelper:
    "Select the types of supporting material available for this component. These selections do not upload documents or confirm that an auditor has reviewed them. Select None on file only if you have checked and no supporting material is available; leave unanswered if this has not yet been checked.",

  // S05 Absent coaching fallback
  absentCoachingFallback:
    "No question-specific guidance is available yet. Answer from your records, and identify any uncertainty where the form allows. Display a separate source link only when a mapped source exists. This is a fallback, not a substitute for adding the missing guidance.",

  // S06 Partial-submission message (trailing "Do not promise..." build note omitted)
  partialSubmission: (n: number): string =>
    `${n} of 18 components have no rating. They will be reported as insufficient information. Review these items before continuing, or continue with a partial readiness report.`,

  // S07 Nonapplicability helper
  nonapplicabilityHelper:
    "Explain why you believe this component does not apply to the information system being assessed, including relevant hosted or third-party resources. Identify the supporting facts and any uncertainty. Not applicable is different from not implemented. The independent auditor determines applicability under \u00a77123(b)(2).",

  // S08 Section guidance
  sectionGuidance:
    "For each component, describe current practice, its scope and exceptions, and the supporting records. Do not copy fictional examples as company facts. If a component may not apply, explain why and identify the systems considered; a lack of in-house software development alone does not settle the issue. The independent auditor determines applicability under 11 CCR \u00a77123(b)(2).",

  // S09 Audit applicability introduction
  applicabilityIntro:
    "These answers help assess whether the cybersecurity audit requirement applies. Use the specified calendar year and your records. If an answer is unknown, leave it unresolved rather than guessing. The report must not infer missing threshold facts.",

  // S10 Empty law panel
  emptyLawPanel:
    "No question-specific legal reference is configured for this field. Display a verified general source separately if useful, without implying that focusing again will supply missing content.",
});

/**
 * F12 / legal reference points (C:\t\cyber-review.txt lines 613–616) — the
 * applicability card replacing the current "For businesses over $100M in
 * revenue, the first certification is due Apr. 1, 2028" claim, which states
 * a single date without qualifying it by applicability or revenue year.
 */
export const CYBER_APPLICABILITY_CARD =
  "Businesses that meet the CCPA revenue and data-volume thresholds in 11 CCR \u00a7 7120 may be subject to an independent annual cybersecurity audit. The first certification is due April 1, 2028, 2029 or 2030 depending on annual gross revenue (\u00a7 7121); the applicable year depends on applicability and the relevant revenue year.";
