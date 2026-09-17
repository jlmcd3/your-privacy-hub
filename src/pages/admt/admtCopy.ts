/**
 * admtCopy.ts — replacement shared copy for the ADMT Compliance Assessment
 * page (src/pages/admt/ADMTChecker.tsx).
 *
 * Sourced verbatim from section 3 "Shared copy and controls" of
 * C:\t\admt-review.txt (lines 307–327), taking the "Recommended wording"
 * column and dropping each row's trailing "Implementation note:" sentence
 * (developer-facing, not customer-facing copy). S11, S12 and S17 describe
 * conditional / state-dependent messaging rather than one fixed sentence;
 * for those rows this file also exports the individual fragments the page's
 * scope logic assembles, named in the same style as the rest of this
 * object. S14 (Shared coaching expander) is not part of the page's required
 * key list but is included for completeness, since every row S01–S18 gets a
 * constant here.
 */

export const ADMT_COPY = Object.freeze({
  // S01 Applicability card
  // Verified 2026-09-16 against the CPPA text of regulations: § 7200(b)
  // ("must be in compliance with the requirements of this Article no later
  // than January 1, 2027"); § 7155(a)(1) ("before initiating any processing
  // activity identified in section 7150, subsection (b)"); § 7155(b)
  // (pre-existing processing: "no later than December 31, 2027"). The
  // January 1, 2026 effective date is the OAL-approved effective date
  // published at https://cppa.ca.gov/regulations/ccpa_updates.html; the
  // corpus and registry text of § 7155(b) carry that date (refreshed
  // 2026-09-17 from the final OAL text, doc 267 item 1).
  applicabilityCard:
    "If your business uses ADMT to make significant decisions, Article 11 notice, opt-out and access requirements must be met by January 1, 2027. Risk assessments follow a separate timetable: covered new processing requires assessment before it begins from January 1, 2026. Covered processing begun before that date and continuing afterward has the transition deadline in § 7155(b), December 31, 2027. This product assesses Article 11 gaps; it does not replace a separate risk assessment.",

  // S02 One system instruction — § 7220(e) (consolidated Pre-use Notice)
  // verified 2026-09-16 against the CPPA text of regulations.
  oneSystemInstruction:
    "Use one assessment in this tool for each ADMT system. Describe every purpose for which that system is used. The law permits a consolidated Pre-use Notice in the circumstances described in § 7220(e); shared request mechanisms may serve several systems when all applicable requirements are met.",

  // S03 Step 1 introduction
  step1Intro:
    "This step records the system, the decisions it supports and the role of any human reviewer. Those facts help determine whether Article 11 applies and which obligations need assessment. Record uncertainty rather than selecting an answer solely to reach a result.",

  // S04 Worked example — "Label it Fictional example, not a template."
  workedExampleLabel: "Fictional example",
  // S04 Worked example — replacement final sentence.
  workedExampleClosing:
    "Examples elsewhere in the form may use different fictional systems. Describe your own records; do not copy an example as a company fact.",

  // S05 Additional risk triggers — § 7150(b) verified 2026-09-16: (b)(3) ADMT
  // for a significant decision; (b)(4)–(5) the specified automated profiling;
  // (b)(6) processing personal information to train the specified technology.
  riskTriggersIntro:
    "These questions identify activities that may require a separate risk assessment. Relevant triggers include ADMT used for significant decisions, the specified forms of automated profiling and the specified uses of personal information for training technology under § 7150(b)(3)–(6). Describe the activity and its context; a broad Yes to profiling or training does not by itself establish every condition.",

  // S06 Step 2 timing introduction
  step2TimingIntro:
    "This step checks when consumers receive the notice and what it says. For information collected for ADMT use, notice timing is tied to collection. For information previously collected for another purpose, notice must precede the relevant ADMT processing. Record the actual timing, including late or missing notice.",

  // S07 Step 2 count of duties
  step2ElementsIntro:
    "This step supports an element-by-element review of your published notice under § 7220(c). The form separates several topics into individual questions so each can be assessed.",

  // S08 Step 3 introduction
  step3Intro:
    "Consumers can opt out of ADMT used for significant decisions unless a listed exception applies. When the opt-out right must be offered, at least two designated submission methods are required. Describe the methods or exception actually used.",

  // S09 Step 4 timing — verified 2026-09-16: § 7222(e) applies the Article 5
  // verification requirements to requests to access ADMT; § 7021 names
  // "request to access ADMT" in its own title and subsection (b) ("no later
  // than 45 calendar days", up to 45 more with notice, 90 in total).
  step4Timing:
    "Consumers can request information about how ADMT was used in their case. Access requests are verified under Article 5. Apply the response periods in § 7021, including the standard 45-calendar-day period and the conditions for any extension. Describe the process you currently follow.",

  // S10 Preliminary scope footer
  scopeFooter:
    "This is a preliminary assessment based on the answers supplied. Review the regulation-cited analysis and any unresolved questions with qualified counsel; neither the on-screen summary nor the generated report is a regulator's determination.",

  // S11 Human self-test messages — logic-dependent; the recommendation calls
  // for an incomplete state and a contradiction state in addition to the
  // existing conditional finding, rather than one blanket positive/negative
  // message. Fragments below are what the page's scope logic assembles.
  scopeIncomplete:
    "We don't yet have enough information to determine whether a qualifying human reviewer is involved in this decision. Answer the reviewer questions above to complete this check.",
  scopeContradiction:
    "Your answers about the reviewer's training, review of other information, and authority to change the outcome do not agree with each other. Review those answers before relying on this result.",
  humanInvolvementLikely:
    "Based on your answers, this likely qualifies as human involvement under § 7001(e)(1) — the system may not 'substantially replace' human decisionmaking, so Article 11 ADMT obligations may not attach. Confirm with counsel.",
  humanInvolvementUnlikely:
    "Based on your answers, this likely does NOT qualify as human involvement under § 7001(e)(1) — all three elements (interpret, review-plus-other-info, authority-to-change) must be present and applied before the decision. Article 11 obligations (notice, opt-out, access) therefore apply.",

  // S12 Other preliminary scope messages — logic-dependent; the register
  // directs the page to use the unified scope result rather than a
  // domain-unanswered or profiling-categorical shortcut, so these three
  // conditional title/body pairs are exported as fragments the scope logic
  // selects among, not as one fixed sentence.
  scopeNoSignificantDecisionTitle: "Article 11 ADMT obligations may not apply yet",
  scopeNoSignificantDecisionBody:
    "You haven't indicated a significant decision (a provision/denial of financial, housing, education, employment, or healthcare). Advertising and ordinary profiling are excluded. If this system doesn't gate one of those, the ADMT notice/opt-out/access duties may not attach — keep this reasoning on file.",
  scopeQualifyingReviewerTitle: "A qualifying human reviewer appears to be in the loop",
  scopeQualifyingReviewerBody:
    "Because your reviewer can interpret the output, reviews it with other information, AND can change the outcome before it issues, the system may not \u201csubstantially replace\u201d human decisionmaking under § 7001(e). Article 11 may not apply — document this and confirm with counsel. You can stop here.",
  scopeObligationsApplyTitle: "Article 11 ADMT obligations appear to apply",
  scopeObligationsApplyBody:
    "Your system makes a significant decision and no qualifying human reviewer overrides it before it issues, so it \u201csubstantially replaces\u201d human decisionmaking. You'll need a pre-use notice, an opt-out, and an access process — the remaining steps check each. (Preliminary read; your report confirms it.)",

  // S13 Fallback coaching
  fallbackCoaching:
    "No question-specific guidance is configured for this field. Answer from your records and identify uncertainty where the form permits.",

  // S14 Shared coaching expander (not in the page's required key list; kept for completeness)
  coachingExampleLabel: "See an example of a specific answer",
  coachingFictionalExampleLabel: "Fictional example",

  // S15 Exhibit choice
  exhibitChoice:
    "Add a blank exhibit for me to complete separately. Selecting this does not upload evidence or complete the exhibit; anything you had written is kept separately, and the report lists the exhibit as outstanding.",

  // S16 Optional panels
  optionalPanelHint:
    "Collapsing this panel hides its questions but keeps the answers you have given. Optional here means optional for completing the intake, not that any legal duty is optional.",

  // S17 Partial scope banner — logic-dependent (derived from the unified
  // scope result rather than a standing categorical negative), but the
  // recommendation itself is one coherent paragraph, not several messages.
  partialScopeBanner:
    "On your Step 1 answers the Article 11 notice, opt-out and access duties this step checks may not attach, so its questions are optional for this system and the required marks are removed. Every answer you do give is kept and reported; leave the rest blank and continue.",

  // S18 Final review instruction
  finalReviewInstruction:
    "Review all answers and unresolved items before continuing. Use Edit to return to a question. The report will analyze the information you provide; an unanswered item or blank exhibit does not establish compliance.",
});
