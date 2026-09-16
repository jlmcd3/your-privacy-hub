// COACHING CONTENT RULE — coaching describes the SHAPE of a complete answer
// (dimensions, specificity, separateness). It NEVER describes the CONTENT of a
// compliant answer (what facts satisfy the law, what answer "passes").
// goodAnswer examples are clearly fictional and illustrate FORM, never a template.
// Voice: imperative, active, plain subject-verb-object, one idea per sentence,
// specific over vague, no ornamental legalese. Layered: coachLead = one line an
// expert acts on instantly; goodAnswer/commonMistake = the expansion for newer users.

// src/components/admt/admtRailEntries.ts
// Verbatim regulation text, plain summaries, and FSOR context
// for every field in the ADMT Compliance Assessment.

import type { RailEntry } from "@/components/intake/StatuteRail";

// Canonical OAL-approved regulations PDF — the same URL used elsewhere in the
// codebase (e.g. supabase/functions/_shared/registry/risk-verified-authorities.ts)
// for every CCR citation whose regulationText quotes verbatim text below.
const CPPA_PDF_URL =
  "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf";

export const ADMT_RAIL: Record<string, RailEntry> = {
  scope_does_business_use_admt: {
    coachLead: "Name the system, the personal information it uses, and the output it produces.",
    coachBody: "Describe how that output affects the decision and any human review, including the reviewer's authority to change it. Record those facts before concluding the system falls outside the definition.",
    fieldLabel: "Does your business use ADMT?",
    citation: "11 CCR § 7001(e)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "ADMT means any technology that processes personal information and uses computation to replace or substantially replace human decisionmaking. It includes AI, ML, and profiling systems. It does NOT include infrastructure like firewalls, databases, or spreadsheets — unless those systems replace human decisions.",
    regulationText:
      '"Automated decisionmaking technology" or "ADMT" means any technology that processes personal information and uses computation to replace human decisionmaking or substantially replace human decisionmaking.\n\n(1) For purposes of this definition, to "substantially replace human decisionmaking" means a business uses the technology\'s output to make a decision without human involvement. Human involvement requires the human reviewer to: (A) Know how to interpret and use the technology\'s output to make the decision; (B) Review and analyze the output of the technology, and any other information that is relevant to make or change the decision; and (C) Have the authority to make or change the decision based on their analysis.\n\n(2) ADMT includes profiling that replaces human decisionmaking or substantially replaces human decisionmaking.\n\n(3) ADMT does not include web hosting, domain registration, networking, caching, website-loading, data storage, firewalls, anti-virus, anti-malware, spam- and robocall-filtering, spellchecking, calculators, databases, and spreadsheets, provided that they do not replace human decisionmaking.',
    fscrContext:
      "Product interpretation (FSOR pinpoint pending verification): the CPPA deliberately removed explicit references to 'artificial intelligence' from the final regulations to create a technology-neutral standard that focuses on the functional impact — does the system replace human judgment about an individual — rather than the technical architecture.",
    enforcementNote:
      "Product interpretation (FSOR pinpoint pending verification): the CPPA has indicated it will look at whether a human reviewer genuinely has authority to change a decision, not just review it. A 'human in the loop' who cannot override the system's output does not satisfy the human involvement standard.",
    goodAnswer:
      "“A gradient-boosted model scores loan applications 0–100 from credit history, income, and debt ratio; scores under 40 are auto-declined with no human review.” — names the technology, the inputs, the output, and exactly where automation makes the call.",
    commonMistake:
      "Calling a tool ‘not ADMT’ because a person signs off, when that person only rubber-stamps the output and cannot realistically overturn it. That fact points toward ADMT status, though the full definition also turns on its other elements.",
    relatedCitations: [
      { citation: "11 CCR § 7001(ii)", label: "Profiling definition" },
      { citation: "11 CCR § 7001(ddd)", label: "Significant decision definition" },
    ],
  },

  scope_significant_decision_domain: {
    coachLead: "Select the § 7001(ddd) categories that describe what the output actually provides or denies.",
    coachBody: "Identify the specific service, opportunity, or compensation affected. Choose None of these categories if nothing on the list applies, and separately answer the housing follow-up on availability, vacancy, or receipt of payment where relevant.",
    goodAnswer:
      "A worked example: “The output determines whether an applicant is admitted to a nursing program — that is an education-enrollment decision, not advertising or ordinary profiling.” Names the actual category the output affects.",
    commonMistake:
      "Treating any high-stakes-feeling decision as significant, or treating every kind of profiling as automatically excluded. Advertising is excluded by definition; profiling that itself makes one of the listed decisions is not excluded simply because it is profiling.",
    fieldLabel: "What type of significant decision does your ADMT make?",
    citation: "11 CCR § 7001(ddd)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "A 'significant decision' is one that results in the provision or denial of financial services, housing, education opportunities, employment, or healthcare. Advertising is explicitly excluded. The categories are defined narrowly — only decisions that gate access to these specific services count.",
    regulationText:
      '"Significant decision" means a decision that results in the provision or denial of financial or lending services, housing, education enrollment or opportunities, employment or independent contracting opportunities or compensation, or healthcare services.\n\n(1) "Financial or lending services" means the extension of credit or a loan, transmitting or exchanging funds, the provision of deposit or checking accounts, check cashing, or installment payment plans.\n\n(2) "Housing" means any building, structure, or portion thereof that is used or occupied as, or designed, arranged, or intended to be used or occupied as, a home, residence, or sleeping place by one or more consumers… The use of ADMT that provides or denies housing to a consumer based solely on the availability or vacancy of the housing or the successful receipt of payment for housing from the consumer is not making a significant decision.\n\n(3) "Education enrollment or opportunities" means: (A) Admission or acceptance into academic or vocational programs; (B) Educational credentials (e.g., a degree, diploma, or certificate); and (C) Suspension and expulsion.\n\n(4) "Employment or independent contracting opportunities or compensation" means: (A) Hiring; (B) Allocation or assignment of work… or compensation… ("allocation/assignment of work and compensation"); (C) Promotion; and (D) Demotion, suspension, and termination.\n\n(5) "Healthcare services" means services related to the diagnosis, prevention, or treatment of human disease or impairment, or the assessment or care of an individual\'s health.\n\n(6) Significant decision does not include advertising to a consumer.',
    fscrContext:
      "Product interpretation (FSOR pinpoint pending verification): the CPPA narrowed the definition of 'significant decision' from earlier drafts by removing advertising and behavioral profiling. The final definition focuses on decisions that can materially affect a consumer's access to economic resources, shelter, education, work, or health.",
    relatedCitations: [
      { citation: "11 CCR § 7200(a)", label: "Compliance trigger" },
      { citation: "11 CCR § 7221(b)(2)-(3)", label: "Opt-out exceptions for employment/education" },
    ],
  },

  scope_human_involvement: {
    coachLead: "State who reviews the output, when they act, and whether they hold authority to change the decision.",
    coachBody: "Describe what information the reviewer considers alongside the output, and identify any limits on their authority. An override-rate example is illustrative evidence, not a minimum standard to reach.",
    goodAnswer:
      "“A senior underwriter reviews every sub-40 score against the file and tax returns and overturns ~8% before any denial issues.” — interprets, reviews-plus-other-info, and can change the outcome, before the fact.",
    commonMistake:
      "Counting a reviewer who only sees the score after the decision, or who can't realistically overturn it. After-the-fact or no-authority review is not meaningful involvement.",
    fieldLabel: "Does a human with authority to overturn the decision review each output?",
    citation: "11 CCR § 7001(e)(1)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "If a human reviewer genuinely knows how to interpret the output, reviews it along with other relevant information, AND has the authority to change the decision based on their analysis — the system may not be ADMT at all. All three elements must be present.",
    regulationText:
      'For purposes of this definition, to "substantially replace human decisionmaking" means a business uses the technology\'s output to make a decision without human involvement. Human involvement requires the human reviewer to:\n(A) Know how to interpret and use the technology\'s output to make the decision;\n(B) Review and analyze the output of the technology, and any other information that is relevant to make or change the decision; and\n(C) Have the authority to make or change the decision based on their analysis in subsection (B).',
    fscrContext:
      "Product interpretation (FSOR pinpoint pending verification): rubber-stamp review does not constitute 'human involvement.' A reviewer who always accepts the system output, or who lacks the authority or expertise to change it, does not meet the standard. The test is functional, not formal.",
    enforcementNote:
      "Product interpretation (FSOR pinpoint pending verification): describe human review processes in detail. Rate of decision reversal, reviewer training records, and whether output is shown to reviewers alongside contextual information are all relevant evidence of whether review is genuinely exercised.",
  },

  notice_timing: {
    coachLead: "Place the notice at or before the point of collection, on the surface the consumer is using.",
    coachBody: "Identify the moment ADMT-relevant PI is collected (or when previously collected PI is first subjected to ADMT) and put the notice on that surface, not in a downstream policy link.",
    goodAnswer:
      "The notice appears at or before the point you use ADMT — e.g., on the application page itself, before the applicant submits.",
    commonMistake:
      "Burying it in a general privacy policy linked in the footer, or showing it only after the decision. It must come before use.",
    fieldLabel: "When must the pre-use notice be provided?",
    citation: "11 CCR § 7220(b)(2)",
    plainSummary:
      "The Pre-use Notice must be provided at or before the point when you collect the consumer's personal information that you plan to process using ADMT. If you already collected the data for a different purpose and now want to use ADMT, you must provide the notice BEFORE you start that ADMT processing.",
    regulationText:
      "Be presented prominently and conspicuously to the consumer at or before the point when the business collects the consumer's personal information that the business plans to process using ADMT. If a business has already collected the consumer's personal information for a different purpose and subsequently plans to process it using ADMT for the purpose set forth in section 7200, subsection (a), the business must provide a Pre-use Notice before processing the consumer's personal information for that purpose.",
    fscrContext:
      "Product interpretation (FSOR pinpoint pending verification): the timing rule prevents retroactive application of ADMT to data collected before the consumer was informed. If your existing customer data was collected without ADMT disclosure, using that data for an ADMT significant decision needs a Pre-use Notice first.",
    relatedCitations: [
      { citation: "11 CCR § 7003", label: "Notice format and presentation requirements" },
      { citation: "11 CCR § 7220(e)", label: "Consolidated notice option" },
    ],
  },

  notice_specific_purpose: {
    coachLead: "Name the actual decision the ADMT drives — not a category, not a benefit, not boilerplate.",
    coachBody: "Describe the specific significant decision being made about this consumer using plain language a reader can act on. Generic phrasing (“to improve services”, “to make a significant decision”) is expressly insufficient.",
    goodAnswer:
      "“We use an automated model to score your loan application and decide approval.” — names the actual decision and that it's automated.",
    commonMistake:
      "Generic boilerplate like “we use technology to improve our services.” The purpose must be specific to this ADMT and this decision.",
    fieldLabel: "Pre-use notice: specific purpose for ADMT use",
    citation: "11 CCR § 7220(c)(1)",
    plainSummary:
      "The notice must explain in plain language the specific purpose for which ADMT will be used. Generic descriptions like 'to make a significant decision' or 'to improve our services' are explicitly prohibited. You must describe what the system actually decides about the consumer.",
    regulationText:
      'A plain language explanation of the specific purpose for which the business plans to use the ADMT. The business must not describe the purpose in generic terms, such as "to make a significant decision" without further information, because this does not describe to the consumer the specific decision for which the business plans to use ADMT with respect to them.',
    fscrContext:
      "Product interpretation (FSOR pinpoint pending verification): consumers need to understand what is actually being decided about them in order to meaningfully exercise their opt-out right. A vague purpose statement defeats the notice's function.",
    enforcementNote:
      "Product interpretation (FSOR pinpoint pending verification): a common pattern is a notice that says 'we use automated tools to improve our services' or 'we process information to assess your application' — wording that does not name the decision itself (e.g., 'to determine whether to approve your loan application' or 'to rank job applicants for initial screening').",
    relatedCitations: [
      { citation: "11 CCR § 7222(b)(1)", label: "Same specificity required in access responses" },
    ],
  },

  notice_opt_out_description: {
    coachLead: "State the opt-out right in a sentence and put the working mechanism next to it.",
    coachBody: "Describe the right in plain language and provide the submission mechanism (link, form, phone). If relying on an exception, name it (§ 7221(b)) and — for the human-appeal exception — describe the appeal path instead.",
    goodAnswer:
      "States the right plainly and links the mechanism: “You can opt out of automated scoring — submit a request here [link] or call [number].”",
    commonMistake:
      "Mentioning that opt-out exists but giving no clear instructions or link, so a consumer can't actually act on it.",
    fieldLabel: "Pre-use notice: opt-out right description",
    citation: "11 CCR § 7220(c)(2)",
    plainSummary:
      "The notice must describe the consumer's right to opt out and explain exactly how to submit an opt-out request. If you are relying on the human appeal exception instead of providing an opt-out, the notice must instead explain the appeal process. If you are relying on another exception, identify it specifically.",
    regulationText:
      "A description of the consumer's right to opt-out of ADMT and how the consumer can submit a request to opt-out of ADMT.\n\n(A) If the business is not required to provide the ability to opt-out because it is relying upon the human appeal exception set forth in section 7221, subsection (b)(1), the business must instead inform the consumer of their ability to appeal the decision and provide instructions to the consumer on how to submit their appeal.\n\n(B) If the business is not required to provide the ability to opt-out because it is relying upon another exception set forth in section 7221, subsection (b), the business must identify the specific exception it is relying upon.",
    relatedCitations: [
      { citation: "11 CCR § 7221(b)", label: "Opt-out exceptions" },
      { citation: "11 CCR § 7221(c)", label: "Required opt-out methods" },
    ],
  },

  notice_access_right_description: {
    coachLead: "Tell consumers they can ask how ADMT was used on them, and give them a working way to ask.",
    coachBody: "State the access right in plain language and provide the submission method. Do not bury it inside a general privacy right paragraph.",
    goodAnswer:
      "Tells consumers they can ask how the ADMT was used on them, and gives a working method to request it.",
    commonMistake:
      "Omitting the access right, or describing it so vaguely the consumer doesn't realize it covers automated decisions.",
    fieldLabel: "Pre-use notice: access right description",
    citation: "11 CCR § 7220(c)(3)",
    plainSummary:
      "The notice must tell consumers they have the right to request information about how your ADMT was used in decisions about them, and explain how to submit that request.",
    regulationText:
      "A description of the consumer's right to access ADMT with respect to the consumer and how the consumer can submit their request to access ADMT to the business.",
    relatedCitations: [{ citation: "11 CCR § 7222", label: "Access right — full requirements" }],
  },

  notice_how_admt_works: {
    coachLead: "Explain inputs, output, and how the output drives the decision — in consumer language.",
    coachBody: "Name the PI categories that affect the output, describe the type of output, explain how it is used to make the decision, and say what happens for consumers who opt out. Aim for a plain explanation, not a spec sheet.",
    goodAnswer:
      "A plain summary of inputs and output: “a model weighs your credit history, income, and debt ratio to produce a 0–100 score used to approve or decline.”",
    commonMistake:
      "Either saying nothing about how it works, or dumping proprietary model internals. Aim for a consumer-understandable explanation, not a spec sheet.",
    fieldLabel: "Pre-use notice: how the ADMT works (additional information)",
    citation: "11 CCR § 7220(c)(5)",
    plainSummary:
      "You must provide additional information explaining how the ADMT works and how significant decisions would be made if a consumer opts out. This may be via a layered notice or hyperlink. You must explain: what categories of PI affect the output; what type of output the ADMT generates; how that output is used in the decision; and what happens to consumers who opt out.",
    regulationText:
      'Additional information about how the ADMT works to make a significant decision about consumers, and how the significant decision would be made if a consumer opts out. The business may provide this information via a simple and easy-to-use method (e.g., a layered notice or hyperlink). The additional information must include a plain language explanation of the following:\n\n(A) How the ADMT processes personal information to make a significant decision about consumers, including the categories of personal information that affect the output generated by the ADMT. An "output" may include predictions, decisions, and recommendations (e.g., numerical scores of compatibility).\n\n(B) The type of output generated by the ADMT, and how that output is used to make a significant decision…\n\n(C) What the alternative process for making a significant decision is for consumers who opt out, unless an exception to providing the opt-out of ADMT set forth in section 7221, subsection (b), applies.',
    fscrContext:
      "Product interpretation (FSOR pinpoint pending verification): trade secrets and security-compromising information are excluded from this disclosure obligation (§ 7220(d)). Withholding specific model parameters or weights that constitute trade secrets does not remove the separate duty to describe the categories of PI used and the general logic of how outputs are generated.",
    relatedCitations: [
      { citation: "11 CCR § 7220(d)", label: "Trade secret and security carve-outs" },
      { citation: "11 CCR § 7220(e)", label: "Consolidated notice for multiple ADMTs" },
    ],
  },

  notice_anti_retaliation: {
    coachLead: "Include an explicit non-retaliation line — do not leave it implied.",
    coachBody: "State plainly that the business will not retaliate for exercising CCPA rights. Implication and cross-reference do not satisfy § 7220(c)(4).",
    goodAnswer:
      "An explicit line that you won't deny service, change prices, or lower quality because someone exercised a CCPA right.",
    commonMistake:
      "Assuming it's implied. The non-retaliation statement has to actually appear in the notice.",
    fieldLabel: "Pre-use notice: anti-retaliation statement",
    citation: "11 CCR § 7220(c)(4)",
    plainSummary:
      "The notice must state that the business is prohibited from retaliating against consumers for exercising their CCPA rights.",
    regulationText:
      "That the business is prohibited from retaliating against consumers for exercising their CCPA rights.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.125", label: "Statutory anti-retaliation prohibition" },
    ],
  },

  optout_methods: {
    coachLead: "Offer two methods, one matching your primary channel, without account creation or cookie-only routing.",
    coachBody: "Name the two designated methods and confirm at least one matches how you primarily interact with consumers. If you operate online, the interactive form must be linked from the Pre-use Notice with an ADMT-specific link title.",
    goodAnswer:
      "At least two easy methods — e.g., an online form linked from the notice and a toll-free number — with no account required and not routed through a cookie banner.",
    commonMistake:
      "Offering only one method, or one that forces account creation or hides behind a generic cookie banner that doesn't cover ADMT.",
    fieldLabel: "Opt-out: how many methods does your business provide?",
    citation: "11 CCR § 7221(c)",
    plainSummary:
      "You must provide at least two designated methods for consumers to opt out. At least one method must match how you primarily interact with consumers. If you interact with consumers online, you must provide an interactive online form accessible via an opt-out link in the Pre-use Notice. Cookie banners alone do not count.",
    regulationText:
      'A business must provide two or more designated methods for submitting requests to opt-out of ADMT. A business must consider the methods by which it interacts with consumers, the manner in which the business uses the ADMT, and the ease of use by the consumer when determining which methods consumers may use to submit requests to opt-out of the business\'s use of the ADMT. At least one method offered must reflect the manner in which the business primarily interacts with the consumer.\n\n(1) A business that interacts with consumers online must, at a minimum, allow consumers to submit requests to opt-out through an interactive form accessible via an opt-out link that is provided in the Pre-use Notice. The link title must state what the consumer is opting out of, such as "Opt-out of Automated Decisionmaking Technology."\n\n(4) A notification or tool regarding cookies, such as a cookie banner or cookie controls, is not by itself an acceptable method for submitting requests to opt-out of the business\'s use of ADMT because cookies concern the collection of personal information and not necessarily the use of ADMT.',
    enforcementNote:
      "Product interpretation (FSOR pinpoint pending verification): the opt-out link title requirement is specific — it must say what the consumer is opting out of, such as 'Opt-out of Automated Decisionmaking Technology.' A generic label like 'Your Privacy Choices,' used alone in an ADMT Pre-use Notice, does not name what the link opts the consumer out of.",
    relatedCitations: [
      { citation: "11 CCR § 7004", label: "Ease-of-use requirements" },
      { citation: "11 CCR § 7221(d)-(e)", label: "Process requirements — minimal steps, no account required" },
    ],
  },

  optout_exception_human_appeal: {
    coachLead: "Name the reviewer, their authority, and the mechanism the consumer uses to appeal.",
    coachBody: "Identify the designated human reviewer, confirm they can interpret the output and change the decision, and describe an easy-to-use, minimal-steps appeal path that lets the consumer submit their own information.",
    goodAnswer:
      "A named, trained reviewer (e.g., “Adverse Action Review Officer”) who reviews the consumer's submission plus other information and can overturn the decision — documented end to end.",
    commonMistake:
      "Claiming the appeal exception while the “appeal” goes to someone who can't actually reverse the outcome — which defeats the exception.",
    fieldLabel: "Opt-out exception: human appeal process",
    citation: "11 CCR § 7221(b)(1)",
    plainSummary:
      "You may be exempt from providing an opt-out right if you instead give consumers the right to appeal the ADMT decision to a human reviewer. The human reviewer must: be designated; have authority to overturn the decision; know how to interpret the output; consider information the consumer provides in their appeal; and the appeal process must require minimal steps and be easy to use.",
    regulationText:
      "The business provides the consumer with a method to appeal the decision to a human reviewer who has the authority to overturn the decision. To qualify for this exception, the business must do the following:\n\n(A) Designate a human reviewer to review and analyze the output of the ADMT and any other information that is relevant to change the significant decision at issue. This human reviewer must consider the information provided by the consumer in support of their appeal and may consider any other sources of information about the significant decision. The human reviewer must know how to interpret and use the output of the ADMT that made the significant decision being appealed and must have the authority to change the decision based on their analysis.\n\n(B) Clearly describe to the consumer how to submit an appeal and enable the consumer to provide information to the human reviewer in support of their appeal. The method of appeal must be easy for the consumers to execute, require minimal steps, and comply with section 7004.",
    fscrContext:
      "Product interpretation (FSOR pinpoint pending verification): the appeal is meant to be a genuine opportunity for reconsideration, not a formality. A reviewer who only escalates the matter to someone else, without personal authority to change it, does not satisfy the designated-reviewer element.",
    relatedCitations: [
      { citation: "11 CCR § 7021", label: "Timeline requirements for appeal responses" },
      { citation: "11 CCR § 7001(e)(1)", label: "Human involvement definition (related)" },
    ],
  },

  optout_exception_hiring: {
    coachLead: "State which branch you rely on, and confirm the sole-use condition for that branch specifically.",
    coachBody: "For hiring or admission, confirm the ADMT is used solely to assess ability to perform. For work allocation, assignment, or compensation, confirm the ADMT is used solely for that purpose. Point to the fairness testing supporting the non-discrimination condition for whichever branch applies.",
    goodAnswer:
      "ADMT used solely to assess ability to perform for a hiring decision, with documented testing supporting the non-discrimination condition for that branch.",
    commonMistake:
      "Invoking either branch for a tool that also serves another purpose — for example a hiring-assessment tool that also sets pay — because assessment or allocation is the main use. 'Solely' excludes a tool with any additional purpose.",
    fieldLabel: "Opt-out exceptions: hiring/admission and work allocation or compensation",
    citation: "11 CCR § 7221(b)(2)-(3)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "This exception has two separate branches, each with its own sole-use condition. Under (b)(2), opt-out is not required for admission, acceptance, or hiring decisions if the ADMT is used solely to assess the consumer's ability to perform at work or in an educational program, and the ADMT works for the business's purpose without unlawfully discriminating. Under (b)(3), opt-out is not required for allocation/assignment of work or compensation decisions if the ADMT is used solely for that allocation/assignment or compensation purpose, and works for the business's purpose without unlawfully discriminating. A tool is not covered by (b)(2) merely because assessment is its main use if it also serves another purpose, and the same is true of (b)(3) for allocation or compensation tools.",
    regulationText:
      "(2) For admission, acceptance, or hiring decisions as set forth in section 7001, subsections (ddd)(3)(A) and (ddd)(4)(A), if the following are true:\n(A) The business uses the ADMT solely for the business's assessment of the consumer's ability to perform at work or in an educational program to determine whether to admit, accept, or hire them; and\n(B) The ADMT works for the business's purpose and does not unlawfully discriminate based upon protected characteristics.\n\n(3) For allocation/assignment of work and compensation decisions as set forth in section 7001, subsection (ddd)(4)(B), if the following are true:\n(A) The business uses the ADMT solely for the business's allocation/assignment of work or compensation; and\n(B) The ADMT works for the business's purpose and does not unlawfully discriminate based upon protected characteristics.",
    enforcementNote:
      "Product interpretation (FSOR pinpoint pending verification): the non-discrimination condition is not self-certifying. A business relying on either branch of this exception would typically hold documented fairness-testing results (disparate impact analysis, testing across protected classes) supporting the claim that the ADMT 'works for its purpose and does not unlawfully discriminate.'",
    relatedCitations: [
      { citation: "11 CCR § 7001(ddd)(3)-(4)", label: "Education and employment significant decision definitions" },
      { citation: "11 CCR § 7221(b)(3)(A)", label: "Work-allocation/compensation sole-use condition (sole_use_attestation_work)" },
    ],
  },

  optout_timing_response: {
    coachLead: "Commit to ceasing ADMT processing as soon as feasibly possible, within 15 business days, and to notifying downstream recipients on the same clock.",
    coachBody: "Describe the cessation flow for a request received after processing has begun, and separately explain how a request received before processing starts prevents initiation instead. Confirming completion to the consumer is a related but separate duty under § 7221(h).",
    goodAnswer:
      "A documented process that honors an opt-out within 15 business days and stops ADMT processing for that consumer from then on.",
    commonMistake:
      "No defined timeline, honoring the opt-out only for new data while the existing automated decision keeps running, or conflating this cessation duty with the separate duty to confirm completion.",
    fieldLabel: "Opt-out: response timing",
    citation: "11 CCR § 7221(n)(1)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "Once a consumer submits an opt-out request AFTER you have already started ADMT processing, you must cease processing that consumer's PI using that ADMT as soon as feasibly possible but no later than 15 business days from receipt. You must also notify all service providers, contractors, and other persons to whom you disclosed that PI.",
    regulationText:
      "If the consumer did not opt-out in response to the Pre-use Notice, and submitted a request to opt-out of ADMT after the business initiated the processing, the business must comply with the consumer's opt-out request by:\n\n(1) Ceasing to process the consumer's personal information using that ADMT as soon as feasibly possible, but no later than 15 business days from the date the business receives the request; and\n\n(2) Notifying all the business's service providers, contractors, or other persons to whom the business has disclosed or made personal information available to process the consumer's personal information using that ADMT, that the consumer has made a request to opt-out of that ADMT and instructing them to comply with the consumer's request to opt-out of that ADMT within the same time frame.",
    relatedCitations: [
      { citation: "11 CCR § 7221(h)", label: "Consumer confirmation of opt-out completion (separate duty)" },
      { citation: "11 CCR § 7221(k)", label: "12-month re-ask restriction" },
      { citation: "11 CCR § 7221(m)", label: "Request received before processing begins" },
    ],
  },

  access_logic_disclosure: {
    coachLead: "Explain how the system processed this specific consumer's information to produce their output.",
    coachBody: "Describe the parameters and reasoning behind the output for this requester, and identify anything withheld along with its basis under § 7222(c). Keep the readiness workflow — how you would produce this explanation — distinct from the explanation itself; a copied workflow sentence is not the explanation.",
    goodAnswer:
      "Plain-language logic: “your output reflected a high debt-to-income ratio and a short credit history; these placed it below the approval threshold.”",
    commonMistake:
      "Hiding behind “trade secret” to disclose nothing, or reusing the sentence that describes how you would produce the explanation as though it were the explanation itself.",
    fieldLabel: "Access right: ADMT logic disclosure",
    citation: "11 CCR § 7222(b)(2)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "When a consumer requests access to ADMT, you must provide plain-language information about the logic of the ADMT — how it processed their personal information to generate the specific output about them, including the parameters that generated that output. Trade secrets and security-compromising details may be withheld.",
    regulationText:
      "Information about the logic of the ADMT. Such information must enable a consumer to understand how the ADMT processed their personal information to generate an output with respect to them, which may include the parameters that generated the output as well as the specific output with respect to the consumer.",
    fscrContext:
      "Product interpretation (FSOR pinpoint pending verification): the goal is for consumers to understand, in practical terms, what factors led to the output that affected them — comparable to GDPR Article 22's 'meaningful information about the logic involved.' A generic explanation of how the system works in general, without relating it to the specific consumer's case, does not serve that goal.",
    relatedCitations: [
      { citation: "11 CCR § 7222(c)", label: "Trade secret and security carve-outs for access responses" },
      { citation: "11 CCR § 7222(j)", label: "Aggregate response option (>4 uses in 12 months)" },
    ],
  },

  access_outcome_disclosure: {
    coachLead: "State the output and the actual outcome for this consumer, not a description of the process that produces one.",
    coachBody: "Explain whether the output was the sole factor, which other factors mattered, what any human did, and any planned future use, keeping this substantive explanation distinct from the readiness workflow that describes how you would assemble it.",
    goodAnswer:
      "States the output and how it was used: “output 32/100; below the 40 threshold, so the application was automatically declined.”",
    commonMistake:
      "Describing the system in general without ever stating this consumer's actual result, or substituting the readiness-workflow sentence for the outcome explanation itself.",
    fieldLabel: "Access right: decision outcome disclosure",
    citation: "11 CCR § 7222(b)(3)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "You must explain how the ADMT output was used to make the specific significant decision about this consumer — whether it was the sole factor, what other factors played a role, and what role any human played. If the output will be used to make future decisions about this consumer, you must explain that too.",
    regulationText:
      'The outcome of the decisionmaking process for the consumer, including how the business used the output of the ADMT to make a significant decision with respect to the consumer. For example, this may include information about whether the output was the sole factor to make the decision; and if it was not the sole factor, which other factors played a role in making the decision; and to the extent that a human was part of the decisionmaking process in a manner that does not meet the requirements of "human involvement" in section 7001, subsection (e)(1), what that human\'s role was in the decisionmaking process.\n\n(A) If the business also plans to use the output to make an additional significant decision concerning the consumer in the future, the business\'s explanation must include how the business plans to use that output to make a significant decision about the consumer in the future.',
    relatedCitations: [
      { citation: "11 CCR § 7222(b)(1)", label: "Specific purpose disclosure (also required)" },
      { citation: "11 CCR § 7222(d)-(e)", label: "Submission methods and verification" },
    ],
  },

  access_anti_retaliation: {
    coachLead: "State non-retaliation explicitly in the access response AND link directly to the privacy-policy section for exercising CCPA rights.",
    coachBody: "The access response must (1) say plainly that the business will not retaliate for exercising CCPA rights and (2) give instructions with a direct link to the SPECIFIC privacy-policy section where those rights are exercised. A link to the top of the privacy policy does not satisfy this — the link must land on the rights-exercise section.",
    goodAnswer:
      "An explicit non-retaliation line together with a direct link that deep-links to the 'Your CCPA Rights' section of the privacy policy (not the policy's homepage anchor).",
    commonMistake:
      "Copying the pre-use notice's non-retaliation line but omitting the deep link, or providing only a generic link to the privacy policy that lands on the top of the page.",
    fieldLabel: "Access response: anti-retaliation statement and rights-exercise link",
    citation: "11 CCR § 7222(b)(4)",
    plainSummary:
      "The access response must include an explanation that the business is prohibited from retaliating against the consumer for exercising CCPA rights, together with instructions — including a direct link — for exercising the CCPA rights described in the business's privacy policy. A link to the top of the privacy policy does not comply; the link must point to the specific rights-exercise section.",
    regulationText:
      "An explanation that the business is prohibited from retaliating against the consumer for exercising their rights under the CCPA, and instructions, including any direct link, for how the consumer may exercise the CCPA rights described in the business's privacy policy.",
    fscrContext:
      "Product interpretation (FSOR pinpoint pending verification): § 7222(b)(4) is the disclosure duty inside the access response itself. It is distinct from § 7222(k), the separate substantive prohibition on retaliation, and from § 7220(c)(4), the pre-use-notice counterpart. Both the statement and the direct link belong in the response.",
    relatedCitations: [
      { citation: "11 CCR § 7222(k)", label: "Substantive prohibition on retaliation for exercising ADMT rights" },
      { citation: "Cal. Civ. Code § 1798.125", label: "Statutory anti-retaliation prohibition" },
      { citation: "11 CCR § 7220(c)(4)", label: "Pre-use notice counterpart (notice_anti_retaliation)" },
    ],
  },



  access_verification: {
    coachLead: "Describe the identity check you actually run, proportionate to the request and the information at stake.",
    coachBody: "Distinguish account holders from people without an account, and say what you tell a requester when verification cannot be completed. Government ID, a selfie, knowledge-based questions, and notarization are practices to report if used, not defaults to adopt; 'Not currently defined' or 'Unknown' describes an unresolved process accurately.",
    goodAnswer:
      "A proportionate identity check that matches the request to the account holder — without demanding excessive new personal information.",
    commonMistake:
      "Treating a suggested method — a government ID, a selfie, a notarized letter — as the expected default, or skipping verification altogether and disclosing to whoever asked.",
    fieldLabel: "Access right: identity verification",
    citation: "11 CCR § 7222(e)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "Unlike opt-out requests, access requests do require identity verification under Article 5, using measures proportionate to the information and risk involved. If you cannot verify the consumer's identity, you must inform them that you cannot verify their identity rather than denying the request without explanation.",
    regulationText:
      "A business must comply with the verification requirements set forth in Article 5 for requests to access ADMT. If a business cannot verify the identity of the person making the request to access ADMT, the business must inform the requestor that it cannot verify their identity.",
    relatedCitations: [
      { citation: "11 CCR § 7221(f)", label: "Opt-out does NOT require verification (contrast)" },
      { citation: "11 CCR § 7222(d)", label: "No dark patterns in access submission methods" },
    ],
  },

  // TURN 2 RETROFIT — intake-rail parity for the two new fields.
  // Corpus consulted: cppa_authorities row citation="11 CCR § 7152"
  // (id f509e45b-ce32-4564-b1c2-b0553c1751b9); regulationText is the verbatim
  // subsection (a)(3)(D) extracted from that row's full_text.
  affected_population_band: {
    fieldLabel: "Affected-population band (approximate California consumers subject to this ADMT)",
    citation: "11 CCR § 7152(a)(3)(D)",
    plainSummary:
      "The risk assessment must document the approximate number of consumers whose personal information the business plans to process. The band you record here is what the assessment carries forward when sizing exposure and shaping the applicability verdict.",
    regulationText:
      "(D) The approximate number of consumers whose personal information the business plans to process.",
    coachLead: "Record the band your own analytics support — do not round to make the number smaller.",
    coachBody:
      "Pick the band whose lower bound your best available count actually meets. If your systems can only estimate an order of magnitude, choose the band that contains that order — the assessment carries the band, not a false precision.",
    goodAnswer:
      "A payroll platform's segmentation shows ~48,000 California employees run through its automated pay-decision model in a year; it picks the 10,000–100,000 band.",
    commonMistake:
      "Selecting a smaller band because 'exact numbers aren't known.' The § 7152(a)(3)(D) element is the approximate number, not a certified number; understating it distorts every downstream weighting.",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(3)", label: "Operational elements of the processing" },
      { citation: "11 CCR § 7150(a)", label: "Risk-assessment trigger" },
    ],
  },

  // Corpus consulted: cppa_authorities row citation="11 CCR § 7157"
  // (id a2e0974a-0dbb-48b5-bebb-14784cf02730); regulationText is the verbatim
  // subsection (c) extracted from that row's full_text. FSOR commentary
  // consulted: cppa_fsor_commentary rows on § 7157 responsibility scope
  // (ids c49a76e8-8c96-48d8-9fc7-3d1f1d2d546c, 23bfcaed-a6ea-4752-882c-89608dc07f5e).
  role_roster: {
    fieldLabel: "Internal role roster (roles with defined responsibilities for this ADMT)",
    citation: "11 CCR § 7157(c) (context)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "Section 7157(c) governs who may sign and submit a risk assessment to the Agency — an executive with direct responsibility, sufficient knowledge, and authority to submit — not a general mandate that every ADMT have an assigned owner in each listed role. This roster is contextual background for that separate risk-assessment submission, and by itself does not identify the executive authorized to submit.",
    regulationText:
      "(c) The individual submitting the information set forth in subsection (b) must be a member of the business's executive management team who: (1) Is directly responsible for the business's risk-assessment compliance; (2) Has sufficient knowledge of the business's risk assessment to provide accurate information; and (3) Has the authority to submit the risk assessment information to the Agency.",
    enforcementNote:
      "The § 7157(b)(5) attestation is signed under penalty of perjury. FSOR commentary on § 7157 (rows c49a76e8… and 23bfcaed…) confirms the Agency's focus on who bears direct responsibility and who is authorised to submit — not who merely reviewed the assessment.",
    coachLead: "Select the roles that already hold a defined responsibility for this system today.",
    coachBody:
      "Describe current assignments rather than planned ones. Leaving a role unselected records that this intake found no current assignment for it, not that the role is unassigned — and this checklist does not by itself identify the executive authorized to submit a risk assessment for this system.",
    goodAnswer:
      "A payroll platform selects Privacy officer, Product owner, and Security officer because each already holds a written duty for this system; it leaves Vendor manager not recorded because no one has yet taken on that duty.",
    commonMistake:
      "Selecting every listed role to look complete, or reading an unselected role as evidence that the role is unassigned rather than simply not recorded here.",
    relatedCitations: [
      { citation: "11 CCR § 7157(b)(5)", label: "Attestation under penalty of perjury" },
      { citation: "11 CCR § 7157(b)(6)", label: "Submitter name and title" },
    ],
  },

  // ITEM 308 RETROFIT — intake-rail parity for the Chapter 3 (E)(1) additions.
  // regulationText is the verbatim registry text already carried by
  // supabase/functions/run-admt-checker/_local/registry/admt-verified-authorities.ts.
  notice_element_text: {
    coachLead: "Paste the words your notice actually publishes, element by element.",
    coachBody: "Copy the live wording for each element separately. We assess adequacy against your published text, not against a description of it.",
    fieldLabel: "Published Pre-use Notice text, element by element",
    citation: "11 CCR § 7220(c)",
    plainSummary:
      "The Pre-use Notice must carry five elements: the specific purpose, the opt-out right and how to exercise it, the access right and how to exercise it, the anti-retaliation statement, and how the ADMT works including the alternative process for consumers who opt out.",
    regulationText:
      "(1) A plain language explanation of the specific purpose for which the business plans to use the ADMT.\n(2) A description of the consumer\u2019s right to opt-out of ADMT and how the consumer can submit a request to opt-out of ADMT.\n(3) A description of the consumer\u2019s right to access ADMT with respect to the consumer and how the consumer can submit their request to access ADMT to the business.\n(4) That the business is prohibited from retaliating against consumers for exercising their CCPA rights.\n(5)(A) How the ADMT processes personal information to make a significant decision about consumers, including the categories of personal information that affect the output generated by the ADMT; (B) The type of output generated by the ADMT, and how that output is used to make a significant decision; (C) What the alternative process for making a significant decision is for consumers who opt out.",
    goodAnswer:
      "A worked example from an unrelated sector \u2014 the live wording, element by element, not a summary of it. Purpose: \u201cWe use an automated scoring model to decide whether to approve your rental application.\u201d Opt-out: \u201cYou can ask us not to use the model. Submit the form at example.com/no-automation or call 1-800-000-0000; a leasing officer then reviews your application by hand within five business days.\u201d Access: \u201cYou can ask what the model did in your case at example.com/my-decision; we reply within 45 days.\u201d Anti-retaliation: \u201cWe will not deny you housing, charge you more, or give you a lesser service because you used any of these rights.\u201d How it works: \u201cThe model reads your reported income, your rental payment history over the last 36 months, and any prior evictions on public record, and returns a score from 0 to 100. Applications scoring under 55 are declined unless a leasing officer overrides.\u201d Each element stands on its own and names something concrete \u2014 the channel, the clock, the inputs, the threshold, the alternative.",
    commonMistake:
      "Describing what the notice covers instead of pasting it. A description cannot be assessed for adequacy; only the published words can. The second most common defect is an element that exists but says nothing operable \u2014 \u201cyou may have certain rights\u201d names no channel, and \u201cwe use advanced technology\u201d names no input and no output.",

  },
  appeal_step_count: {
    coachLead: "Count the steps a consumer takes from the adverse decision to the human reviewer.",
    coachBody: "State the number of discrete actions required. A route the consumer cannot realistically complete is not a method to appeal.",
    fieldLabel: "Steps from decision to human reviewer",
    citation: "11 CCR § 7221(b)(1)",
    plainSummary:
      "The human-appeal exception requires an actual method to appeal to a human reviewer who can overturn the decision. How many steps the route takes is evidence of whether that method is real.",
    regulationText:
      "The business provides the consumer with a method to appeal the decision to a human reviewer who has the authority to overturn the decision.",
    goodAnswer:
      "\u201c2 \u2014 the consumer replies to the decision email, and the review officer decides within ten business days.\u201d",
    commonMistake:
      "Counting an internal escalation path the consumer is never told about. The steps that matter are the ones the consumer must take.",
  },
  sole_use_attestation: {
    coachLead: "Answer for the ADMT's actual use in this hiring or admission decision, not for the system as a whole.",
    coachBody: "State whether the ADMT is used solely to assess the consumer's ability to perform for this decision, and describe any additional purpose it also serves instead of choosing an inaccurate affirmative answer.",
    fieldLabel: "Sole-use condition — hiring or admission",
    citation: "11 CCR § 7221(b)(2)(A)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "The hiring and admission exception applies only if the ADMT is used solely to assess the person's ability to perform at work or in an educational program in order to decide whether to admit, accept, or hire them. The condition is answered for the ADMT's actual use, not for the system's overall purpose.",
    regulationText:
      "The business uses the ADMT solely for the business\u2019s assessment of the consumer\u2019s ability to perform at work or in an educational program to determine whether to admit, accept, or hire them.",
    goodAnswer:
      "\u201cNo \u2014 the same output also feeds our compensation banding.\u201d An honest negative preserves the assessment; an inaccurate yes does not.",
    commonMistake:
      "Answering yes because assessment is the main use. \u201cSolely\u201d means only.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7221(b)(3)(A)", label: "Work-allocation/compensation sole-use condition (separate branch)" },
    ],
  },

  sole_use_attestation_work: {
    coachLead: "Answer for the ADMT's actual use in allocating work or setting compensation, not for the system as a whole.",
    coachBody: "State whether the ADMT is used solely for allocation, assignment of work, or compensation, and describe any additional purpose it also serves instead of assuming the hiring test controls.",
    fieldLabel: "Sole-use condition \u2014 allocation/assignment of work or compensation",
    citation: "11 CCR \u00a7 7221(b)(3)(A)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "The work-allocation and compensation exception applies only if the ADMT is used solely for the business's allocation or assignment of work, or for compensation decisions, and works for the business's purpose without unlawfully discriminating based on protected characteristics. It is a separate branch from the hiring/admission exception and carries its own sole-use condition.",
    regulationText:
      "(3) For allocation/assignment of work and compensation decisions as set forth in section 7001, subsection (ddd)(4)(B), if the following are true: (A) The business uses the ADMT solely for the business's allocation/assignment of work or compensation; and (B) The ADMT works for the business's purpose and does not unlawfully discriminate based upon protected characteristics.",
    goodAnswer:
      "\"No \u2014 the same output also feeds a separate promotion-eligibility screen.\" An accurate negative preserves the assessment of which exception may apply; an inaccurate yes does not.",
    commonMistake:
      "Applying the hiring/admission sole-use test to this branch, or assuming that because one category of significant decision qualifies, a system serving mixed purposes qualifies for all of them.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7221(b)(2)(A)", label: "Hiring/admission sole-use condition (separate branch)" },
      { citation: "11 CCR \u00a7 7001(ddd)(4)(B)", label: "Allocation/assignment of work and compensation definition" },
    ],
  },

  nondiscrimination_testing: {
    coachLead: "Say whether a testing record exists, and whether it is documented.",
    coachBody: "The exception requires that the ADMT works for its purpose and does not unlawfully discriminate. Undocumented testing cannot be shown to a regulator.",
    fieldLabel: "Non-discrimination testing record",
    citation: "11 CCR § 7221(b)(2)(B)",
    plainSummary:
      "The hiring and admission exception also requires that the ADMT works for the business's purpose and does not unlawfully discriminate based upon protected characteristics.",
    regulationText:
      "The ADMT works for the business\u2019s purpose and does not unlawfully discriminate based upon protected characteristics.",
    goodAnswer:
      "\u201cYes \u2014 documented testing record: annual adverse-impact analysis across race, sex, and age, last run March 2026, report retained.\u201d",
    commonMistake:
      "Treating a vendor's marketing claim of fairness as your testing record. The obligation sits with the business using the ADMT.",
  },

  // ── UPGRADE-3 — new intake fields (§ 7220 notice text, § 7222 readiness) ──
  notice_full_text: {
    coachLead: "Paste the notice as consumers actually see it, not a summary of it.",
    coachBody: "Your report quotes these words back and tests each element against the standard. If you use text assembled from excerpts, compare it against the published notice for order and missing passages, and confirm it is complete before treating it as the notice — excerpts alone are not automatically a complete notice.",
    fieldLabel: "Published Pre-use Notice, in full",
    citation: "11 CCR § 7220(c)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "The pre-use notice must give the consumer the specific purpose, the right to opt out and how to submit it, the right to access ADMT and how to submit it, that the business cannot retaliate, and a plain-language explanation of how the ADMT works.",
    regulationText:
      "A business that uses automated decisionmaking technology for a significant decision concerning a consumer must provide a Pre-use Notice that includes the information set forth in subsections (c)(1) through (c)(5).",
    goodAnswer:
      "The complete notice text copied from the page where it is published, headings included.",
    commonMistake:
      "Pasting the general privacy policy instead of the pre-use notice, describing the notice rather than reproducing it, or confirming an assembled excerpt as complete without checking it against the published order and content.",
  },
  access_readiness: {
    coachLead: "Answer for what you can produce today, not for what you intend to build.",
    coachBody: "Each § 7222(b) element is tested separately. A readiness claim without a process behind it reads as partial, because there is nothing to perform on the day a request arrives.",
    fieldLabel: "Access-request explanation readiness",
    citation: "11 CCR § 7222(b)",
    plainSummary:
      "On a verified access request the business must explain the specific purpose the ADMT was used for, its logic including assumptions and limitations, the output and how it was used, the outcome for the consumer, and the role any human played.",
    regulationText:
      "A business that receives a verifiable consumer request to access automated decisionmaking technology must provide the consumer with the information set forth in subsection (b).",
    goodAnswer:
      "Element-by-element answers naming the record each explanation is drawn from and who assembles it.",
    commonMistake:
      "Answering yes across the board because the data exists somewhere. The question is whether it can be assembled into an explanation within the response window.",
  },
  access_readiness_b1_purpose: {
    coachLead: "Say whether you can state the purpose as it applied to that one consumer.",
    coachBody: "The consumer is entitled to the specific purpose, not the programme description. If your record only holds a programme-level purpose, say so.",
    fieldLabel: "Readiness — specific purpose (§ 7222(b)(1))",
    citation: "11 CCR § 7222(b)(1)",
    plainSummary: "The business must explain the specific purpose for which it used the ADMT with respect to that consumer.",
    regulationText: "The specific purpose for which the business used the automated decisionmaking technology with respect to the consumer.",
    goodAnswer: "\u201cYes \u2014 the decision log records the rubric and role the applicant was screened against.\u201d",
    commonMistake: "Offering the marketing purpose of the tool rather than the purpose it served for that person.",
  },
  access_readiness_b2_logic: {
    coachLead: "Say whether your explanation covers assumptions and limitations, not just inputs.",
    coachBody: "Logic that omits what the model assumes, or what it cannot show, does not let the consumer understand how their information produced the output.",
    fieldLabel: "Readiness — logic, assumptions, limitations (§ 7222(b)(2))",
    citation: "11 CCR § 7222(b)(2)",
    plainSummary: "The explanation must let the consumer understand how their personal information was processed to generate the output about them, including the ADMT's assumptions and limitations.",
    regulationText: "The logic of the automated decisionmaking technology, including key parameters that affect the output of the automated decisionmaking technology, and how those parameters were applied to the consumer.",
    goodAnswer: "\u201cPartially \u2014 we can list the ranking factors, but our record does not carry the model's stated limitations.\u201d",
    commonMistake: "Treating a trade-secret withholding as an answer. Withholding narrows what you disclose; it does not remove the duty to explain.",
  },
  access_readiness_b3_output_use: {
    coachLead: "Say whether you can state the output and the weight it carried.",
    coachBody: "The consumer is entitled to know what the tool produced and how that fed the decision, including whether other factors mattered.",
    fieldLabel: "Readiness — output and its use (§ 7222(b)(3))",
    citation: "11 CCR § 7222(b)(3)",
    plainSummary: "The explanation must state the output the ADMT produced for the consumer and how the business used it in making the significant decision.",
    regulationText: "The output of the automated decisionmaking technology with respect to the consumer, and how the business used the output to make the significant decision.",
    goodAnswer: "\u201cYes \u2014 the case record stores the score, the band, and the reviewer's note on how it was weighed.\u201d",
    commonMistake: "Storing the outcome but not the output, which leaves half the element unanswerable.",
  },
  access_readiness_b3_outcome: {
    coachLead: "Say whether the outcome, and any planned reuse of the output, are retrievable.",
    coachBody: "Where the output will be reused for a later significant decision, the consumer is entitled to know that too.",
    fieldLabel: "Readiness — outcome for the consumer (§ 7222(b)(3))",
    citation: "11 CCR § 7222(b)(3)",
    plainSummary: "The explanation must state the outcome of the decisionmaking process for the consumer, and how the business plans to use any retained output.",
    regulationText: "The outcome of the decisionmaking process with respect to the consumer, including how the business plans to use the output if it plans to use it for a future significant decision.",
    goodAnswer: "\u201cYes \u2014 outcome and any retention-for-reuse flag are both written to the decision record.\u201d",
    commonMistake: "Reporting the outcome while staying silent on reuse of the retained score.",
  },
  access_readiness_b3_human_role: {
    coachLead: "Say whether you can describe what the human actually did.",
    coachBody: "This element bites where a human took part but not in the qualifying way. Recording a reviewer's name is not a description of their role.",
    fieldLabel: "Readiness — role of any human (§ 7222(b)(3))",
    citation: "11 CCR § 7222(b)(3)",
    plainSummary: "Where a human was involved in a way that does not meet the § 7001(e)(1) standard, the explanation must state what that human's role was.",
    regulationText: "The role of any human involvement in the decisionmaking process with respect to the consumer.",
    goodAnswer: "\u201cYes \u2014 the audit trail records who reviewed, what they saw, and whether they altered the outcome.\u201d",
    commonMistake: "Describing a sign-off step as review when the person could not change the decision.",
  },
  vendor_documentation: {
    coachLead: "Name what the vendor has given you in writing, not what the vendor says on a call.",
    coachBody: "Record the vendor's role, the documents you actually hold, and the contract terms that let you meet your own § 7221 and § 7222 duties. Where a term is absent, say so plainly rather than leaving the field empty.",
    fieldLabel: "Vendor and downstream-recipient detail",
    citation: "11 CCR §§ 7150(b)(6), 7153",
    plainSummary:
      "Using a vendor's model does not move the duty. You remain the business. Where a vendor makes ADMT trained on personal information available to other businesses for significant decisions, it must supply the facts those businesses need for their own risk assessments.",
    regulationText:
      "A business that makes automated decisionmaking technology or artificial intelligence available to another business, and knows or reasonably should know that the recipient-business will use it to make a significant decision concerning a consumer, must provide the recipient-business with all facts necessary for the recipient-business to conduct its own risk assessment.",
    goodAnswer:
      "A worked example from an unrelated sector: \u201cVendor is a service provider under a signed CCPA addendum dated March 2025. On file: model card v3.1, the vendor\u2019s own bias-testing summary (June 2025), and the sub-processor list. The contract grants annual audit rights and 5-business-day assistance with access requests; it is silent on opt-out propagation, so suppression is handled by us disabling the API call at our own gateway.\u201d That answer names the role, the documents, the dates, the terms that exist, the term that does not, and the compensating step.",
    commonMistake:
      "Treating a vendor as a service provider because an invoice exists. The role turns on the contract terms, not the commercial relationship, and a vendor that determines its own purposes is a third party regardless of what the order form calls it.",
  },
  optout_15_day_process: {
    coachLead: "Trace one opt-out request from arrival to downstream suppression, and identify whether it arrived before or after processing began.",
    coachBody: "Describe the intake point, the team that owns it, the system where suppression is set, and the downstream recipients notified, with the elapsed time for each step. As soon as feasibly possible sets the pace; 15 business days is the ceiling, not a waiting period.",
    fieldLabel: "Operational opt-out process (15 business days)",
    citation: "11 CCR \u00a7 7221(n)(1)\u2013(2)",
    citationUrl: CPPA_PDF_URL,
    relatedCitations: [
      { citation: "11 CCR \u00a7 7221(m)", label: "Opt-out received before processing prevents it from starting" },
    ],
    plainSummary:
      "Once a consumer opts out after ADMT processing has already begun, you must cease processing their personal information using that ADMT as soon as feasibly possible, with 15 business days from receipt as the outer limit \u2014 not a period to wait out. You must also notify every service provider, contractor, and other person you disclosed that information to, on the same clock. A request submitted before processing began is a different fact pattern: \u00a7 7221(m) requires that the processing never start at all.",
    regulationText:
      "(n) If the consumer did not opt-out in response to the Pre-use Notice, and submitted a request to opt-out of ADMT after the business initiated the processing, the business must comply with the consumer\u2019s opt-out request by: (1) Ceasing to process the consumer\u2019s personal information using that ADMT as soon as feasibly possible, but no later than 15 business days from the date the business receives the request; and (2) Notifying all the business\u2019s service providers, contractors, or other persons to whom the business has disclosed or made personal information available to process the consumer\u2019s personal information using that ADMT, that the consumer has made a request to opt-out of that ADMT and instructing them to comply with the consumer\u2019s request to opt-out of that ADMT within the same time frame.",
    goodAnswer:
      "A worked example from an unrelated sector: \u201cRequests arrive through the privacy webform or the toll-free line and are ticketed to the Privacy Operations queue the same business day. Operations sets a suppression flag on the customer record in the decisioning platform within 3 business days, which removes the account from the scoring job on its next nightly run. Two downstream recipients \u2014 the scoring vendor and the analytics warehouse \u2014 receive an automated suppression file within 5 business days, and their acknowledgements are logged against the ticket. The ticket cannot be closed without both acknowledgements.\u201d That answer has an intake point, an owner, a system, a clock on each hop, and downstream closure.",
    commonMistake:
      "Describing only the internal switch, or treating the 15 business days as a window to use before acting rather than an outer limit. The duty also runs to any downstream recipient still holding a copy of the information.",
  },
  access_trade_secret_policy: {
    coachLead: "Decide in advance what you would withhold, and on which of the two grounds.",
    coachBody: "List the categories, and for each one the ground \u2014 trade secret or security compromise. A policy written before the first request is a policy; one written during a 45-day clock is an improvisation.",
    fieldLabel: "Trade secret and security information policy",
    citation: "11 CCR § 7222(c); Civil Code § 3426.1(d)",
    plainSummary:
      "You may withhold trade secrets and information whose disclosure would compromise security, but you cannot use either ground to refuse the explanation itself. The consumer still gets a meaningful account of the logic and the outcome.",
    regulationText:
      "A business is not required to disclose a trade secret, as defined in Civil Code section 3426.1(d), in response to a request to access automated decisionmaking technology. A business must not withhold information about its use of automated decisionmaking technology solely on the basis that the information is a trade secret. A business may also withhold information where disclosure would compromise the security of the business\u2019s systems or the integrity of the automated decisionmaking technology.",
    goodAnswer:
      "A worked example from an unrelated sector: \u201cWithheld as trade secret: model architecture, feature weights, and the training-data composition, each of which derives independent economic value from not being generally known and is protected by access controls and NDAs. Withheld as security-compromising: the numeric thresholds at which a transaction is routed to manual fraud review, because publishing them would let a bad actor structure transactions beneath them. Disclosed in every case: the categories of information used, their relative weight in plain terms, the outcome, and the human reviewer\u2019s role.\u201d That answer separates the two grounds, justifies each, and states what survives the withholding.",
    commonMistake:
      "Stamping the whole explanation \u2018proprietary\u2019. The regulation expressly forbids withholding information about your ADMT use solely because it is a trade secret \u2014 the shield covers the specific secret, never the duty to explain.",
  },
  access_secure_transmission: {
    coachLead: "Match the delivery channel to the sensitivity of what you are about to send.",
    coachBody: "An access response can contain the decision, the inputs, and the reviewer\u2019s notes. The channel that carries it is part of your security obligation, not an administrative afterthought.",
    fieldLabel: "Secure transmission of the access response",
    citation: "11 CCR § 7222; Civil Code § 1798.100(e)",
    plainSummary:
      "A business must use reasonable security procedures appropriate to the nature of the personal information it handles. That duty does not switch off at the moment you answer a rights request.",
    regulationText:
      "A business that collects a consumer\u2019s personal information shall implement reasonable security procedures and practices appropriate to the nature of the personal information to protect the personal information from unauthorized or illegal access, destruction, use, modification, or disclosure.",
    goodAnswer:
      "A restatement of the standard: the channel is adequate where an interceptor of the message cannot read the response, and the recipient is the verified consumer rather than whoever holds the mailbox. Authenticated portal download satisfies both; unencrypted email satisfies neither.",
    commonMistake:
      "Verifying identity rigorously at intake and then mailing the full explanation to an unverified address on file.",
  },
  access_denial_basis: {
    coachLead: "Name the specific ground for any denial, and hold the line at that ground.",
    coachBody: "Denials are permitted only on enumerated bases. Write down which ones you would rely on and in what circumstances, so a refusal can be explained afterwards rather than defended after the fact.",
    fieldLabel: "Basis for partial or full denial",
    citation: "11 CCR § 7222(c); § 7024",
    plainSummary:
      "You may deny an access request only where responding would conflict with federal or state law, where a CCPA exception applies, where a trade secret is at stake, or where disclosure would create a substantial security risk. A partial denial still requires you to give everything else.",
    regulationText:
      "A business may deny a request to access automated decisionmaking technology, in whole or in part, only where the business can demonstrate that the denial is based upon a conflict with federal or state law, an exception to the CCPA, or that disclosure would compromise the security of the business\u2019s systems. The business must inform the consumer of the basis for the denial and provide any information it is able to disclose.",
    goodAnswer:
      "A worked example from an unrelated sector: \u201cWe would deny in part where the record contains a suspicious-activity report, because federal law prohibits disclosure of its existence; the consumer is told that a legally restricted category exists and receives every other element. We would deny in full only where verification fails after two attempts.\u201d That answer names a ground, ties it to a rule, and states what the consumer still receives.",
    commonMistake:
      "Denying because the request is inconvenient or the record is spread across several systems. Neither is an enumerated ground, and the burden of demonstrating the ground sits with the business.",
  },
  // DOC 158 (2026-09-03, ADMT model-vs-law build) — the § 7221(f), (i), (j),
  // (k), (m) handling duties (a question the form never asked). Verbatim
  // source: cppa_authorities row "11 CCR § 7221" full_text.
  optout_handling: {
    coachLead: "Confirm only the duties your process actually performs today — an unconfirmed duty is a follow-up, not a violation.",
    coachBody: "Walk the opt-out request from receipt to completion. Do you ask for identity proof (you may not, beyond what is needed to act)? Is there one control that stops every ADMT use at once? Do you take requests from an authorized agent with signed permission? Do you wait twelve months before asking an opted-out consumer to consent again? Does a request received before processing starts stop that processing?",
    goodAnswer: "A lender confirms four duties and leaves the authorized-agent duty unconfirmed because its intake form has no agent field yet. The report lists that one duty as a follow-up item.",
    commonMistake: "Confirming every duty because the policy document says so. The test is what the request-handling process does, not what the policy promises.",
    fieldLabel: "Opt-out handling duties",
    citation: "11 CCR § 7221(f), (i), (j), (k), (m)",
    plainSummary:
      "Beyond offering the opt-out, the regulation governs how requests are handled: no verifiable-request requirement, a single option to opt out of every ADMT use, authorized-agent requests, a twelve-month wait before re-asking for consent, and no initiation of processing after a pre-processing opt-out.",
    regulationText:
      "\u201C(f) A business must not require a verifiable consumer request for a request to opt-out of ADMT set forth in subsection (a). A business may ask the consumer for information necessary to complete the request, such as information necessary to identify the consumer whose information is subject to the business\u2019s use of ADMT. However, to the extent that the business can comply with a request to opt-out of ADMT without additional information, it must do so.\u201D \u2026 \u201C(i) In responding to a request to opt-out of ADMT, a business may present the consumer with the choice to allow specific uses of ADMT as long as the business also offers a single option to opt-out of all of the business\u2019s uses of ADMT set forth in subsection (a). (j) A consumer may use an authorized agent to submit a request to opt-out of ADMT as set forth in subsection (a) on the consumer\u2019s behalf if the consumer provides the authorized agent written permission signed by the consumer. \u2026 (k) Except as allowed by these regulations, a business must wait at least 12 months from the date the business receives the consumer\u2019s request to opt-out of ADMT before asking a consumer who has exercised their right to opt-out of ADMT, to consent to the business\u2019s use of the ADMT for which the consumer previously opted out.\u201D \u2026 \u201C(m) If the consumer submits a request to opt-out of ADMT before the business has initiated that processing, the business must not initiate processing of the consumer\u2019s personal information using that ADMT.\u201D",
    relatedCitations: [
      { citation: "11 CCR § 7221(c)", label: "Designated opt-out methods" },
      { citation: "11 CCR § 7221(n)", label: "Cessation within 15 business days; notifying service providers" },
      { citation: "11 CCR § 7004", label: "Ease-of-use requirements for request methods" },
    ],
  },

  // DOC 158 — § 7222(b)(4) readiness element (the readiness loop's rail key).
  // Verbatim source: cppa_authorities row "11 CCR § 7222" full_text.
  access_readiness_b4_rights: {
    coachLead: "The access response must say you cannot retaliate and tell the consumer how to exercise their other rights — with a link that lands on the instructions.",
    coachBody: "Check the response template for two things: the anti-retaliation statement, and instructions for the consumer\u2019s other CCPA rights (know, delete, correct, opt-out) with a link straight to the request form or portal, or to the exact privacy-policy section that holds the instructions.",
    goodAnswer: "\u201CYes \u2014 the template ends with the anti-retaliation statement and a deep link to the rights-request section of our privacy policy.\u201D A link to the top of the privacy policy would be a No.",
    commonMistake: "Linking to the beginning of the privacy policy. The regulation says a link that makes the consumer scroll to find the instructions does not satisfy the requirement.",
    fieldLabel: "Anti-retaliation statement and other-rights instructions",
    citation: "11 CCR § 7222(b)(4)",
    plainSummary:
      "The response to a request to access ADMT must state that the business is prohibited from retaliating against consumers for exercising their CCPA rights, and give instructions \u2014 including any links to an online request form or portal \u2014 for exercising their other CCPA rights.",
    regulationText:
      "\u201C(4) That the business is prohibited from retaliating against consumers for exercising their CCPA rights, and instructions for how the consumer can exercise their other CCPA rights. These instructions must include any links to an online request form or portal for making such a request, if offered by the business. (A) The business may comply with the instructions requirement by providing a link that takes the consumer directly to the specific section of the business\u2019s privacy policy that contains these instructions. Directing the consumer to the beginning of the privacy policy, or to another section of the privacy policy that does not contain these instructions, so that the consumer is required to scroll through other information in order to find the instructions, does not satisfy the instructions requirement.\u201D",
    relatedCitations: [
      { citation: "11 CCR § 7222(k)", label: "Substantive prohibition on retaliation" },
      { citation: "11 CCR § 7220(c)(4)", label: "Pre-use Notice counterpart" },
    ],
  },


  // ── New rail entries for intake fields that previously had no direct mapping ──

  organization_name: {
    coachLead: "Enter the legal name of the entity whose use of this system is being assessed.",
    coachBody: "Distinguish the responsible entity from a trading name, a brand, or a supplier. This answer alone does not establish that the entity is a CCPA \u2018business\u2019 or that this system is in scope.",
    fieldLabel: "Which organization is running this assessment?",
    citation: "Cal. Civ. Code \u00a7 1798.140(d)",
    plainSummary:
      "Civil Code \u00a7 1798.140(d) defines the CCPA-responsible \u2018business\u2019 \u2014 generally a for-profit legal entity that does business in California and meets the statute\u2019s collection, revenue, or data-sale thresholds, among other conditions. This field records the entity whose use of the system is being assessed, not a trading name or an affiliated brand.",
    regulationText:
      "Summary of Cal. Civ. Code \u00a7 1798.140(d) (verbatim text is not in the verified corpus): the statute defines \u2018business\u2019 by reference to a set of conditions \u2014 including for-profit status, doing business in California, and meeting specified thresholds for revenue, the volume of consumers\u2019 or households\u2019 personal information bought, sold, or shared, or revenue derived from selling or sharing personal information \u2014 that determine which entities the CCPA\u2019s obligations reach.",
    goodAnswer:
      "\u2018Cascade Materials Holdings, Inc.\u2019 \u2014 the registered entity that operates the system, not the storefront brand \u2018Cascade Building Supply\u2019 that consumers see.",
    commonMistake:
      "Naming the consumer-facing brand instead of the entity that controls the processing, or naming a vendor rather than the business that deployed the vendor\u2019s tool.",
  },

  system_type: {
    coachLead: "Name the technology used, and keep that label separate from the legal question of whether it is ADMT.",
    coachBody: "List each method if the system combines several \u2014 for example a rules engine plus a statistical model. A label such as \u2018ML classifier\u2019 or \u2018rules engine\u2019 does not by itself determine whether \u00a7 7001(e) applies; the system description does that.",
    fieldLabel: "System type",
    citation: "11 CCR \u00a7 7001(e)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "The technology label you choose \u2014 rules engine, statistical model, ML classifier, generative AI, and so on \u2014 does not itself decide whether \u00a7 7001(e) applies. The definition turns on function: does the system process personal information and use computation to replace or substantially replace a human decision. A system built on any of these technologies can meet or fail that test.",
    regulationText:
      "\u201CAutomated decisionmaking technology\u201D or \u201CADMT\u201D means any technology that processes personal information and uses computation to replace human decisionmaking or substantially replace human decisionmaking.\n\n(1) For purposes of this definition, to \u201Csubstantially replace human decisionmaking\u201D means a business uses the technology\u2019s output to make a decision without human involvement. Human involvement requires the human reviewer to: (A) Know how to interpret and use the technology\u2019s output to make the decision; (B) Review and analyze the output of the technology, and any other information that is relevant to make or change the decision; and (C) Have the authority to make or change the decision based on their analysis.\n\n(2) ADMT includes profiling that replaces human decisionmaking or substantially replaces human decisionmaking.\n\n(3) ADMT does not include web hosting, domain registration, networking, caching, website-loading, data storage, firewalls, anti-virus, anti-malware, spam- and robocall-filtering, spellchecking, calculators, databases, and spreadsheets, provided that they do not replace human decisionmaking.",
    goodAnswer:
      "\u2018Statistical model combined with a rules engine for eligibility cutoffs\u2019 \u2014 names the actual combination rather than picking one label to simplify the answer.",
    commonMistake:
      "Adopting a technical label from a suggested example because it sounds authoritative, rather than describing the technology actually in use.",
    relatedCitations: [{ citation: "11 CCR \u00a7 7001(ddd)", label: "Significant decision definition" }],
  },

  third_party_admt: {
    coachLead: "List each third-party tool or API that makes or materially contributes to this decision, one per line.",
    coachBody: "Identify the supplier and its actual contribution for each one. Naming a system, or reserving an exhibit to complete later, records that the information will be supplied \u2014 it is not itself a fact about what the vendor does.",
    fieldLabel: "Third-party tools or APIs contributing to the decision",
    citation: "11 CCR \u00a7\u00a7 7150(b)(6), 7153",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "Using a vendor\u2019s ADMT does not shift responsibility away from the business that deploys it for a significant decision. Where a vendor makes ADMT trained on personal information available for that purpose, \u00a7 7153 requires the vendor to supply the facts the deploying business needs for its own risk assessment, and \u00a7 7150(b)(6) can independently trigger a risk assessment for training such technology. Naming a system here, or reserving an exhibit for later, is not itself a supplier fact.",
    regulationText:
      "\u00a7 7150(b)(6): \u201CProcessing the personal information of consumers, which the business intends to use to train an ADMT for a significant decision concerning a consumer; or train a facial-recognition, emotion-recognition, or other technology that verifies a consumer\u2019s identity, or conducts physical or biological identification or profiling of a consumer. For purposes of this paragraph, \u2018intends to use\u2019 means the business is using, plans to use, permits others to use, plans to permit others to use, is advertising or marketing the use of, or plans to advertise or market the use of.\u201D \u00a7 7153: \u201C(a) A business that makes ADMT available to another business (\u2018recipient-business\u2019) to make a significant decision as set forth in section 7150, subsection (b)(3), must provide to the recipient-business all facts available to the business that are necessary for the recipient-business to conduct its own risk assessment. (b) The requirements of this section apply only to ADMT trained using personal information.\u201D",
    goodAnswer:
      "\u2018Vendor: Northwind Analytics Labs \u2014 supplies the underlying risk model; internal team applies the cutoff.\u2019 Names the vendor and its specific role rather than a generic \u2018we use a vendor.\u2019",
    commonMistake:
      "Treating the exhibit placeholder, or a single named product, as if it already described every vendor\u2019s role, documentation, and contract terms.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7157(c)", label: "Vendor detail feeds a separate risk-assessment submission" },
    ],
  },

  ca_consumer_count: {
    coachLead: "Give a number or a range, and identify the year or period it covers.",
    coachBody: "Keep the estimate as free text and explain any uncertainty. Do not collapse a range into a single number by joining its digits \u2014 \u20181,000\u20132,000\u2019 is not \u201810002000,\u2019 and a unit such as thousand changes the value it represents.",
    fieldLabel: "Approximate number of California consumers this system decides about",
    citation: "11 CCR \u00a7 7152(a)(3)(D)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "\u00a7 7152(a)(3)(D) asks the risk assessment to state the approximate number of consumers whose personal information the business plans to process. An estimate or a range is an acceptable answer; the field records an approximation, not a certified count.",
    regulationText: "(D) The approximate number of consumers whose personal information the business plans to process.",
    goodAnswer:
      "\u2018Approximately 12,000\u201315,000 California consumers in 2026, based on loan-application volume.\u2019 States a range, a period, and its basis.",
    commonMistake:
      "Concatenating the digits of a range, or dropping a unit like \u2018thousand\u2019 or \u2018k,\u2019 so that an estimate of twenty thousand is recorded as twenty.",
    relatedCitations: [{ citation: "11 CCR \u00a7 7152(a)(3)", label: "Operational elements of the processing" }],
  },

  admt_system_count: {
    coachLead: "Count the distinct systems used for significant decisions, and separately check which consolidation pattern, if any, actually fits.",
    coachBody: "This assessment still addresses the system named above regardless of the total count. A higher count does not by itself establish eligibility for a consolidated notice \u2014 match your actual systems and purposes against the four listed patterns.",
    fieldLabel: "Distinct ADMT systems run for significant decisions",
    citation: "11 CCR \u00a7 7220(e)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "Running more than one ADMT system can make a business eligible to publish one consolidated Pre-use Notice under \u00a7 7220(e) instead of a separate notice for each use \u2014 but eligibility depends on which of the four listed consolidation patterns actually describes the business\u2019s systems and purposes, not on the count alone.",
    regulationText:
      "(e) A business may provide a consolidated Pre-use Notice as set forth below, provided that the consolidated Pre-use Notice includes the information required by this Article for each of the business\u2019s proposed uses of ADMT: (1) The business\u2019s use of a single ADMT for multiple purposes. For example, an employer may provide a consolidated Pre-use Notice to an employee that addresses the employer\u2019s proposed use of productivity monitoring software to determine the employee\u2019s allocation/assignment of work and compensation, and to determine which employees will be demoted. (2) The business\u2019s use of multiple ADMTs for a single purpose. For example, a business may provide a consolidated Pre-use Notice to a job applicant that addresses the business\u2019s proposed use of: (1) software to screen applicants\u2019 resumes to determine which applicants it will hire, and (2) software to evaluate applicants\u2019 vocal intonation, facial expression, and gestures to determine which applicants to hire. (3) The business\u2019s use of multiple ADMTs for multiple purposes. For example, an educational provider may provide a consolidated Pre-use Notice to a new student that addresses the educational provider\u2019s proposed use of: (A) software that automatically screens students\u2019 work for plagiarism to determine whether they will be suspended, and (B) software that automatically assesses students\u2019 exams to determine whether to grant them a diploma or certificate. (4) The systematic use of a single ADMT. For example, a business may provide a consolidated Pre-use Notice to an employee that addresses the business\u2019s methodical and regular use of ADMT to allocate work to its employees, rather than providing a Pre-use Notice to the same employees each time it proposes to use the same ADMT for the same purpose.",
    goodAnswer:
      "\u2018Three systems: resume screening, interview-scoring, and background-check triage \u2014 all used for hiring, so a single consolidated notice may cover them under the multiple-ADMTs-for-a-single-purpose pattern.\u2019 Names each system and checks it against a specific pattern.",
    commonMistake:
      "Assuming that operating several systems automatically qualifies for one consolidated notice, without checking which of the four listed patterns the actual systems and purposes match.",
    relatedCitations: [{ citation: "11 CCR \u00a7 7220(b)", label: "Pre-use Notice content requirements" }],
  },

  training_data_use: {
    coachLead: "Identify the system, the training purpose, and whether your own business does the training.",
    coachBody: "Separate your business\u2019s own training activity from a vendor\u2019s contractual right to train on your data. Describe the actual technology and intended use rather than treating any \u2018Yes\u2019 as automatically meeting every condition of this trigger.",
    fieldLabel: "Using personal information to train an automated decision system",
    citation: "11 CCR \u00a7 7150(b)(3)\u2013(6)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "Training an ADMT for a significant decision, or training facial-recognition, emotion-recognition, identity-verification, or physical/biological-identification technology, using personal information, is itself one of the activities listed in \u00a7 7150(b) that can trigger a risk assessment \u2014 separately from whether the business also uses ADMT to make a significant decision. This question is contextual to that separate risk-assessment trigger; a broad \u2018Yes\u2019 does not by itself establish every condition of the trigger.",
    regulationText:
      "(3) Using ADMT for a significant decision concerning a consumer. \u2026 (6) Processing the personal information of consumers, which the business intends to use to train an ADMT for a significant decision concerning a consumer; or train a facial-recognition, emotion-recognition, or other technology that verifies a consumer\u2019s identity, or conducts physical or biological identification or profiling of a consumer. For purposes of this paragraph, \u201Cintends to use\u201D means the business is using, plans to use, permits others to use, plans to permit others to use, is advertising or marketing the use of, or plans to advertise or market the use of.",
    goodAnswer:
      "\u2018Yes \u2014 we fine-tune an internal fraud-scoring model quarterly on transaction records, including personal information, for use in account-closure decisions.\u2019 Names the technology, the training activity, and its intended use.",
    commonMistake:
      "Answering Yes because a vendor\u2019s contract permits it to train on your data, when your own business does not perform or direct that training.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7150(a)", label: "Risk-assessment trigger" },
      { citation: "11 CCR \u00a7 7153", label: "Recipient-business facts when ADMT trained on personal information is made available" },
    ],
  },

  profiling_use: {
    coachLead: "Describe the actual profiling activity, including what it infers and from what observation.",
    coachBody: "Distinguish profiling from a significant decision and from advertising alone, and identify whether it involves systematic observation in an applicant, student, employee, or contractor capacity, or a sensitive location. Compare the actual activity against the trigger conditions instead of treating any \u2018Yes\u2019 as a legal conclusion.",
    fieldLabel: "Automated profiling of consumers without a significant decision",
    citation: "11 CCR \u00a7 7150(b)(3)\u2013(6)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "Using automated processing to infer or extrapolate a consumer\u2019s traits \u2014 intelligence, health, behavior, reliability, and similar characteristics \u2014 from systematic observation can itself trigger a risk assessment under \u00a7 7150(b)(4)-(5), separately from whether that profiling also makes a significant decision. This question is contextual to that separate trigger; a broad \u2018Yes\u2019 does not by itself establish every condition.",
    regulationText:
      "(4) Using automated processing to infer or extrapolate a consumer\u2019s intelligence, ability, aptitude, performance at work, economic situation, health (including mental health), personal preferences, interests, reliability, predispositions, behavior, location, or movements, based upon systematic observation of that consumer when they are acting in their capacity as an educational program applicant, job applicant, student, employee, or independent contractor for the business. (5) Using automated processing to infer or extrapolate a consumer\u2019s intelligence, ability, aptitude, performance at work, economic situation, health (including mental health), personal preferences, interests, reliability, predispositions, behavior, or movements, based upon that consumer\u2019s presence in a sensitive location. \u201CInfer or extrapolate\u201D does not include a business using a consumer\u2019s personal information solely to deliver goods to, or provide transportation for, that consumer at a sensitive location.",
    goodAnswer:
      "\u2018Yes \u2014 we infer likely commute patterns from location pings to route delivery offers; no significant decision results.\u2019 Describes the actual inference and confirms it is not tied to a listed decision.",
    commonMistake:
      "Treating any personalization or analytics activity as \u2018profiling\u2019 under this trigger, or assuming a Yes here automatically triggers a risk assessment without checking the specific conditions.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7001(ii)", label: "Profiling definition" },
      { citation: "11 CCR \u00a7 7150(a)", label: "Risk-assessment trigger" },
    ],
  },

  optout_confirmation_mechanism: {
    coachLead: "Describe how a consumer can confirm that their opt-out request was actually processed.",
    coachBody: "Name the confirmation channel \u2014 a status page, an email receipt, a support line \u2014 and keep it distinct from the internal cessation and notification steps. A completed suppression is not itself a consumer-facing confirmation method.",
    fieldLabel: "Opt-out confirmation mechanism",
    citation: "11 CCR \u00a7 7221(h)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "The business must give the consumer a way to confirm that their opt-out request has been processed. This is a separate duty from the cessation and downstream-notification timeline in \u00a7 7221(n) \u2014 completing the underlying suppression is not the same as giving the consumer a means to confirm it happened.",
    regulationText:
      "(h) A business must provide a means by which the consumer can confirm that the business has processed their request to opt-out of ADMT.",
    goodAnswer:
      "\u2018Consumers receive an automated email once suppression is applied, and may also check status through the account portal.\u2019 Names an actual channel the consumer uses.",
    commonMistake:
      "Describing only the internal suppression step and treating it as if it were also the consumer\u2019s confirmation method.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7221(n)", label: "Cessation and downstream-notification timeline (separate duty)" },
    ],
  },

  optout_exception_other: {
    coachLead: "Describe the approach you actually use today, and name which exception you think may apply, if any.",
    coachBody: "State what remains uncertain rather than asserting a conclusion. This path keeps the facts available for assessment without forcing a choice between a full opt-out right and one of the listed exceptions.",
    fieldLabel: "Opt-out exception: other / situation differs",
    citation: "11 CCR \u00a7 7221(a)\u2013(b)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "Selecting \u2018Other\u2019 records that the business\u2019s situation does not cleanly match the full opt-out right in \u00a7 7221(a) or any of the three listed exceptions in \u00a7 7221(b) \u2014 the human-appeal exception, the hiring/admission exception, or the work-allocation/compensation exception. It is an unresolved position pending further review, not a claim that the business already provides a complete opt-out right.",
    regulationText:
      "(a) A business must provide consumers with the ability to opt-out of the use of ADMT to make a significant decision concerning the consumer, except as set forth in subsection (b). (b) A business is not required to provide consumers with the ability to opt-out of a business\u2019s use of ADMT to make a significant decision in the following circumstances: \u2026",
    goodAnswer:
      "\u2018We currently offer a single opt-out form, but have not confirmed whether our review process meets the human-appeal exception\u2019s authority requirement.\u2019 Names the open question rather than resolving it.",
    commonMistake:
      "Treating an unresolved \u2018Other\u2019 answer as though it already establishes a full, compliant opt-out right.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7221(b)(1)", label: "Human appeal exception" },
      { citation: "11 CCR \u00a7 7221(b)(2)-(3)", label: "Hiring/admission and work-allocation exceptions" },
    ],
  },

  optout_appeal_mechanics: {
    coachLead: "Name the reviewer\u2019s role, confirm their training and authority, and describe the actual submission and timeline.",
    coachBody: "Report what the process does today \u2014 role, training, authority to overturn, what the consumer may submit, the target response time, and the outcomes it produces. A reversal rate, a specific timeline, or a fixed list of outcome categories are examples of evidence a process might show, not a threshold the process needs to reach.",
    fieldLabel: "Human-appeal mechanics (reviewer role, training, authority, submission, timeline, outcomes)",
    citation: "11 CCR \u00a7 7221(b)(1)(A)\u2013(B)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "These mechanics \u2014 the reviewer\u2019s role and training, their authority to overturn the decision, what the consumer may submit, the target timeline, and outcome tracking \u2014 are the operational detail behind the \u00a7 7221(b)(1) three-part test: a designated reviewer who can interpret the output, consider the consumer\u2019s submission, and has authority to change the decision, reached through an appeal process that is easy to use and requires minimal steps.",
    regulationText:
      "(1) The business provides the consumer with a method to appeal the decision to a human reviewer who has the authority to overturn the decision. To qualify for this exception, the business must do the following: (A) Designate a human reviewer to review and analyze the output of the ADMT and any other information that is relevant to change the significant decision at issue. This human reviewer must consider the information provided by the consumer in support of their appeal and may consider any other sources of information about the significant decision. The human reviewer must know how to interpret and use the output of the ADMT that made the significant decision being appealed and must have the authority to change the decision based on their analysis. (B) Clearly describe to the consumer how to submit an appeal and enable the consumer to provide information to the human reviewer in support of their appeal. The method of appeal must be easy for the consumers to execute, require minimal steps, and comply with section 7004. Disclosures and communications with consumers concerning the appeal must comply with section 7003, subsections (a)\u2013(b). The timeline for requests to appeal ADMT must comply with section 7021. Businesses must comply with the verification requirements set forth in Article 5 when a consumer submits an appeal.",
    goodAnswer:
      "\u2018The Appeals Coordinator role reviews the consumer\u2019s statement plus the underlying file, is trained on the scoring model\u2019s outputs, and can reverse a decision; target response is 10 business days; outcomes are upheld, reversed, or modified.\u2019 Covers role, training, authority, timeline, and outcomes in one narrative.",
    commonMistake:
      "Treating the example timeline or reversal rate as a deadline or rate the process needs to hit, rather than as illustrative detail describing whatever the actual process produces.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7221(b)(1)", label: "Human-appeal exception (parent provision)" },
      { citation: "11 CCR \u00a7 7021", label: "Appeal-response timeline" },
    ],
  },

  fairness_testing_detail: {
    coachLead: "Describe what testing or other evidence you actually have, and say plainly when there is none.",
    coachBody: "Name the method, the groups covered, the date, and the findings where testing exists. \u2018Not currently documented\u2019 or \u2018Unknown\u2019 accurately describes the position when no testing has occurred or the record has not been located \u2014 the regulation names no particular method, cadence, or metric as the one to use.",
    fieldLabel: "Fairness and non-discrimination testing detail",
    citation: "11 CCR \u00a7 7221(b)(2)(B), (b)(3)(B)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "Whichever exception a business claims \u2014 hiring/admission or work-allocation/compensation \u2014 the second sole-use condition is the same: the ADMT must work for the business\u2019s purpose and must not unlawfully discriminate based on protected characteristics. The regulation does not specify a required testing method, cadence, or metric for showing this.",
    regulationText:
      "11 CCR \u00a7 7221(b)(2)(B) and \u00a7 7221(b)(3)(B) each provide, in identical terms: \u201CThe ADMT works for the business\u2019s purpose and does not unlawfully discriminate based upon protected characteristics.\u201D",
    goodAnswer:
      "\u2018Vendor-supplied disparate-impact analysis across race and sex, run March 2026, no statistically significant gap found; not yet extended to age.\u2019 Names the method, the groups covered, the date, and the finding \u2014 including a gap.",
    commonMistake:
      "Treating a vendor\u2019s general fairness marketing claim as a testing record, or leaving every field blank rather than recording \u2018Not currently documented\u2019 where that is the actual position.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7221(b)(2)(A)", label: "Hiring/admission sole-use condition" },
      { citation: "11 CCR \u00a7 7221(b)(3)(A)", label: "Work-allocation/compensation sole-use condition" },
    ],
  },

  access_submission_methods: {
    coachLead: "List each method consumers can use today to request ADMT information, and where to find it.",
    coachBody: "Existing right-to-know channels may serve this purpose. Treat a suggested phrase as a starting point to edit into the actual route, not as a channel that exists simply because it was offered.",
    fieldLabel: "Access request submission methods",
    citation: "11 CCR \u00a7 7222(d)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "Methods for submitting a request to access ADMT must be easy to use and must not use dark patterns. A business may rely on its existing methods for right-to-know, deletion, or correction requests to also serve access-to-ADMT requests; the suggested channels in this field are editable descriptions of possible methods, not an endorsed or required list.",
    regulationText:
      "(d) A business\u2019s methods for consumers to submit requests to access ADMT must be easy to use and must not use dark patterns. A business may use its existing methods to submit requests to know, delete, or correct as set forth in section 7020 for requests to access ADMT.",
    goodAnswer:
      "\u2018Privacy request form at [company]/privacy-requests, and the same toll-free line used for right-to-know requests.\u2019 Names the actual channel and its existing use.",
    commonMistake:
      "Selecting a suggested method without confirming it is actually offered, or listing a channel that exists for another purpose without checking it reaches ADMT requests too.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7222", label: "Access right \u2014 full requirements" },
      { citation: "11 CCR \u00a7 7020", label: "Existing right-to-know, deletion, and correction methods" },
    ],
  },

  access_response_timeline: {
    coachLead: "Choose the timeline your current process actually supports, and describe when notice of any extension goes out.",
    coachBody: "The standard period is 45 calendar days from receipt; an additional 45 days is available only with notice and an explanation given to the consumer, not as an automatic extra period. Record \u2018Not yet defined\u2019 if no process exists.",
    fieldLabel: "Response timeline for access requests",
    citation: "11 CCR \u00a7 7021(b); 11 CCR \u00a7 7222(a)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "A response to a request to access ADMT is due no later than 45 calendar days after receipt, and that clock starts on receipt regardless of the time needed for verification. A business may take up to an additional 45 calendar days \u2014 a maximum of 90 calendar days total \u2014 but only if it gives the consumer notice and an explanation of the reason before the standard period runs out. The extension is conditional, not an automatic extra 45 days.",
    regulationText:
      "(b) Businesses shall respond to a request to delete, request to correct, and request to know, request to access ADMT, and request to appeal ADMT no later than 45 calendar days after receipt of the request. The 45-day period will begin on the day that the business receives the request, regardless of time required to verify the request. If the business cannot verify the consumer within the 45-day time period, the business may deny the request. If necessary, businesses may take up to an additional 45 calendar days to respond to the consumer\u2019s request, for a maximum total of 90 calendar days from the day the request is received, provided that the business provides the consumer with notice and an explanation of the reason that the business will take more than 45 days to respond to the request. (11 CCR \u00a7 7222(a): \u201CA business that uses ADMT to make a significant decision must provide a consumer with information about this use when responding to a consumer\u2019s request to access ADMT.\u201D)",
    goodAnswer:
      "\u2018We target 30 calendar days; if verification or volume pushes past 45, we send a written extension notice before the 45th day, consistent with the 90-day maximum.\u2019 Ties the actual practice to the conditional extension.",
    commonMistake:
      "Describing the 90-day maximum as the standard timeline, or assuming the extension applies without sending the consumer notice and an explanation.",
    relatedCitations: [{ citation: "11 CCR \u00a7 7222(b)", label: "What the response must explain" }],
  },

  notice_delivery: {
    coachLead: "Identify the page, screen, or document that actually shows the notice today.",
    coachBody: "Name every place consumers currently receive it. If none has been published yet, select only that \u2014 a draft sitting in a document is not a delivered notice.",
    fieldLabel: "Pre-use Notice delivery method",
    citation: "11 CCR \u00a7 7220(b)(1)\u2013(3)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "The Pre-use Notice must comply with \u00a7 7003(a)-(b), be presented prominently and conspicuously at or before the point of collection (or before ADMT processing begins, for already-collected information), and be presented in the manner the business primarily interacts with the consumer. A draft notice that has not been published to consumers does not satisfy any of these delivery conditions.",
    regulationText:
      "(b) The Pre-use Notice must: (1) Comply with section 7003, subsections (a)\u2013(b). (2) Be presented prominently and conspicuously to the consumer at or before the point when the business collects the consumer\u2019s personal information that the business plans to process using ADMT. If a business has already collected the consumer\u2019s personal information for a different purpose and subsequently plans to process it using ADMT for the purpose set forth in section 7200, subsection (a), the business must provide a Pre-use Notice before processing the consumer\u2019s personal information for that purpose. (3) Be presented in the manner in which the business primarily interacts with the consumer.",
    goodAnswer:
      "\u2018Displayed as a standalone notice on the loan-application page, immediately before the applicant submits personal information.\u2019 Names the actual surface and its timing.",
    commonMistake:
      "Selecting a delivery method that is planned or drafted but not yet live, or describing the intended future workflow instead of the current one.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7220(e)", label: "Consolidated notice option" },
      { citation: "11 CCR \u00a7 7003", label: "Notice format and presentation requirements" },
    ],
  },

  system_decision_detail: {
    coachLead: "Trace the output to the actual action taken, and keep an intermediate ranking separate from the final outcome.",
    coachBody: "Name the product and hosting arrangement, the technology types combined, what the decision provides, denies, ranks, or changes, and its cadence. State whether the output is the sole factor or one of several, what the other factors are, and whether the same output is planned for use in a later significant decision.",
    fieldLabel: "System and decision detail (vendor/product, hosting, model type, effects, cadence, factor weight, future use, advertising)",
    citation: "11 CCR \u00a7 7001(ddd) (context)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "These fields describe the mechanics of the system and its decision \u2014 the product and hosting arrangement, the technology types combined, what the decision actually provides or denies, how often it recurs, whether the output is the sole factor, and whether the same output feeds a later decision. They are context for classifying the significant decision under \u00a7 7001(ddd); none of them is itself a separate legal category, and a technology label does not decide whether the ADMT definition is met.",
    regulationText:
      "\u201CSignificant decision\u201D means a decision that results in the provision or denial of financial or lending services, housing, education enrollment or opportunities, employment or independent contracting opportunities or compensation, or healthcare services. For purposes of this definition: \u2026 (6) Significant decision does not include advertising to a consumer.",
    goodAnswer:
      "\u2018Hosted by the vendor; a statistical model plus a rules-based cutoff; produces a numeric ranking used to order candidates for interview, one factor among several including a recruiter\u2019s review; not reused for later decisions.\u2019 Traces product, technology, effect, and factor weight together.",
    commonMistake:
      "Treating an intermediate ranking or output value as though it were itself the final decision, or assuming a technology label like \u2018ML classifier\u2019 settles whether the ADMT definition applies.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7200(a)", label: "Compliance trigger" },
      { citation: "11 CCR \u00a7 7222(b)(3)", label: "Outcome disclosure \u2014 sole factor and other factors" },
    ],
  },

  housing_decision_basis: {
    coachLead: "Check the actual decision rules \u2014 including any eligibility or screening factor \u2014 before answering.",
    coachBody: "Answer Yes only when availability, vacancy, or receipt of payment is the sole basis for the outcome. Keep this fact separate from any other significant-decision category also selected for this system.",
    fieldLabel: "Housing decision based solely on availability, vacancy, or payment",
    citation: "11 CCR \u00a7 7001(ddd)(2)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "A housing decision made by ADMT is not a \u2018significant decision\u2019 at all if it is based solely on the availability or vacancy of the housing, or on the successful receipt of payment for it. Any other factor in the decision takes it outside this exclusion.",
    regulationText:
      "The use of ADMT that provides or denies housing to a consumer based solely on the availability or vacancy of the housing or the successful receipt of payment for housing from the consumer is not making a significant decision.",
    goodAnswer:
      "\u2018No \u2014 the system also screens applicants against income and rental-history criteria before offering a unit.\u2019 Names the additional factor that takes the decision outside the exclusion.",
    commonMistake:
      "Answering Yes because availability or payment is one of several factors, when the exclusion applies only when it is the sole basis for the decision.",
    relatedCitations: [{ citation: "11 CCR \u00a7 7001(ddd)", label: "Significant decision definition" }],
  },

  human_involvement_self_test: {
    coachLead: "Report the reviewer\u2019s stage, training, and authority as separate facts, not one combined impression.",
    coachBody: "State when the reviewer acts relative to the decision \u2014 before it issues, after it issues, or only on appeal \u2014 since a pre-decision review differs from a later appeal. Give the override rate, if known, as illustrative evidence only; a low or zero rate does not by itself show the reviewer lacks authority.",
    fieldLabel: "Human-involvement self-test (reviewer presence, role, stage, training, other information, authority, override rate)",
    citation: "11 CCR \u00a7 7001(e)(1)(A)\u2013(C)",
    citationUrl: CPPA_PDF_URL,
    plainSummary:
      "These questions walk through the three-part human-involvement test one element at a time \u2014 whether a reviewer is present, their role, when they act, whether they are trained to interpret the output, whether they weigh other information alongside it, and whether they hold authority to change the decision. Frequency (how often a human reviews) and authority (whether that human can change the outcome) are different facts; a review that occurs on every decision but cannot change any of them still fails the authority element.",
    regulationText:
      "For purposes of this definition, to \u201Csubstantially replace human decisionmaking\u201D means a business uses the technology\u2019s output to make a decision without human involvement. Human involvement requires the human reviewer to: (A) Know how to interpret and use the technology\u2019s output to make the decision; (B) Review and analyze the output of the technology, and any other information that is relevant to make or change the decision; and (C) Have the authority to make or change the decision based on their analysis in subsection (B).",
    goodAnswer:
      "\u2018A claims adjuster reviews every flagged file before the denial letter goes out, is trained on the scoring tool\u2019s output, and can reverse the flag; override rate last year was 6% of flagged files.\u2019 Separates stage, training, authority, and rate as distinct facts.",
    commonMistake:
      "Inferring review frequency from the authority answer, or treating an after-the-fact review as equivalent to a review that happens before the decision issues.",
    relatedCitations: [
      { citation: "11 CCR \u00a7 7001(e)", label: "ADMT definition (parent provision)" },
      { citation: "11 CCR \u00a7 7222(b)(3)", label: "Outcome disclosure \u2014 human's role when involvement does not meet \u00a7 7001(e)(1)" },
    ],
  },
};
