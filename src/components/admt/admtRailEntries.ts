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

export const ADMT_RAIL: Record<string, RailEntry> = {
  scope_does_business_use_admt: {
    coachLead: "Name the technology, its inputs, its output, and where it makes the call unaided.",
    coachBody: "Describe the specific system, the categories of PI it consumes, the type of output it produces, and the point at which that output drives a decision without meaningful human authority to change it.",
    fieldLabel: "Does your business use ADMT?",
    citation: "11 CCR § 7001(e)",
    plainSummary:
      "ADMT means any technology that processes personal information and uses computation to replace or substantially replace human decisionmaking. It includes AI, ML, and profiling systems. It does NOT include infrastructure like firewalls, databases, or spreadsheets — unless those systems replace human decisions.",
    regulationText:
      '"Automated decisionmaking technology" or "ADMT" means any technology that processes personal information and uses computation to replace human decisionmaking or substantially replace human decisionmaking.\n\n(1) For purposes of this definition, to "substantially replace human decisionmaking" means a business uses the technology\'s output to make a decision without human involvement. Human involvement requires the human reviewer to: (A) Know how to interpret and use the technology\'s output to make the decision; (B) Review and analyze the output of the technology, and any other information that is relevant to make or change the decision; and (C) Have the authority to make or change the decision based on their analysis.\n\n(2) ADMT includes profiling that replaces human decisionmaking or substantially replaces human decisionmaking.\n\n(3) ADMT does not include web hosting, domain registration, networking, caching, website-loading, data storage, firewalls, anti-virus, anti-malware, spam- and robocall-filtering, spellchecking, calculators, databases, and spreadsheets, provided that they do not replace human decisionmaking.',
    fscrContext:
      "The CPPA deliberately removed explicit references to 'artificial intelligence' from the final regulations to create a technology-neutral standard that focuses on the functional impact — does the system replace human judgment about an individual — rather than the technical architecture.",
    enforcementNote:
      "The CPPA has indicated it will look at whether a human reviewer genuinely has authority to change a decision, not just review it. A 'human in the loop' who cannot override the system's output does not satisfy the human involvement standard.",
    goodAnswer:
      "“A gradient-boosted model scores loan applications 0–100 from credit history, income, and debt ratio; scores under 40 are auto-declined with no human review.” — names the technology, the inputs, the output, and exactly where automation makes the call.",
    commonMistake:
      "Calling a tool ‘not ADMT’ because a person signs off, when that person only rubber-stamps the output and cannot realistically overturn it. If the human can't change the outcome, it is still ADMT.",
    relatedCitations: [
      { citation: "11 CCR § 7001(ii)", label: "Profiling definition" },
      { citation: "11 CCR § 7001(ddd)", label: "Significant decision definition" },
    ],
  },

  scope_significant_decision_domain: {
    coachLead: "Pick from the closed § 7001(ddd) list, and name what the ADMT output actually gates.",
    coachBody: "State which of the five statutory categories applies — financial/lending, housing, education, employment or contracting, healthcare — and identify the specific access the output governs.",
    goodAnswer:
      "'Significant decision' is a closed list — financial/lending, housing, education, employment or contracting, healthcare (§ 7001(ddd)). Advertising, audience segmentation, and ordinary profiling are excluded, however consequential they feel. The relevant category is whichever one the ADMT output actually gates.",
    commonMistake:
      "Treating any high-stakes-feeling decision as “significant.” The list is closed: advertising, gaming/subscription eligibility, and ordinary profiling don't count, however consequential they feel.",
    fieldLabel: "What type of significant decision does your ADMT make?",
    citation: "11 CCR § 7001(ddd)",
    plainSummary:
      "A 'significant decision' is one that results in the provision or denial of financial services, housing, education opportunities, employment, or healthcare. Advertising is explicitly excluded. The categories are defined narrowly — only decisions that gate access to these specific services count.",
    regulationText:
      '"Significant decision" means a decision that results in the provision or denial of financial or lending services, housing, education enrollment or opportunities, employment or independent contracting opportunities or compensation, or healthcare services.\n\n(1) "Financial or lending services" means the extension of credit or a loan, transmitting or exchanging funds, the provision of deposit or checking accounts, check cashing, or installment payment plans.\n\n(2) "Housing" means any building, structure, or portion thereof that is used or occupied as, or designed, arranged, or intended to be used or occupied as, a home, residence, or sleeping place by one or more consumers… The use of ADMT that provides or denies housing to a consumer based solely on the availability or vacancy of the housing or the successful receipt of payment for housing from the consumer is not making a significant decision.\n\n(3) "Education enrollment or opportunities" means: (A) Admission or acceptance into academic or vocational programs; (B) Educational credentials (e.g., a degree, diploma, or certificate); and (C) Suspension and expulsion.\n\n(4) "Employment or independent contracting opportunities or compensation" means: (A) Hiring; (B) Allocation or assignment of work… or compensation… ("allocation/assignment of work and compensation"); (C) Promotion; and (D) Demotion, suspension, and termination.\n\n(5) "Healthcare services" means services related to the diagnosis, prevention, or treatment of human disease or impairment, or the assessment or care of an individual\'s health.\n\n(6) Significant decision does not include advertising to a consumer.',
    fscrContext:
      "The CPPA narrowed the definition of 'significant decision' significantly from earlier drafts by removing advertising and behavioral profiling. The final definition focuses on high-stakes decisions that can materially affect a consumer's access to economic resources, shelter, education, work, or health.",
    relatedCitations: [
      { citation: "11 CCR § 7200(a)", label: "Compliance trigger" },
      { citation: "11 CCR § 7221(b)(2)-(3)", label: "Opt-out exceptions for employment/education" },
    ],
  },

  scope_human_involvement: {
    coachLead: "Say who reviews, what they see, and whether they can — and do — overturn the output before the fact.",
    coachBody: "Name the reviewer role, the information they weigh alongside the ADMT output, their authority to change the outcome, and whether review happens before the decision issues.",
    goodAnswer:
      "“A senior underwriter reviews every sub-40 score against the file and tax returns and overturns ~8% before any denial issues.” — interprets, reviews-plus-other-info, and can change the outcome, before the fact.",
    commonMistake:
      "Counting a reviewer who only sees the score after the decision, or who can't realistically overturn it. After-the-fact or no-authority review is not meaningful involvement.",
    fieldLabel: "Does a human with authority to overturn the decision review each output?",
    citation: "11 CCR § 7001(e)(1)",
    plainSummary:
      "If a human reviewer genuinely knows how to interpret the output, reviews it along with other relevant information, AND has the authority to change the decision based on their analysis — the system may not be ADMT at all. All three elements must be present.",
    regulationText:
      'For purposes of this definition, to "substantially replace human decisionmaking" means a business uses the technology\'s output to make a decision without human involvement. Human involvement requires the human reviewer to:\n(A) Know how to interpret and use the technology\'s output to make the decision;\n(B) Review and analyze the output of the technology, and any other information that is relevant to make or change the decision; and\n(C) Have the authority to make or change the decision based on their analysis in subsection (B).',
    fscrContext:
      "The FSOR commentary explains that rubber-stamp review does not constitute 'human involvement.' A reviewer who always accepts the system output, or who lacks the authority or expertise to change it, does not meet the standard. The test is functional, not formal.",
    enforcementNote:
      "Document human review processes carefully. The CPPA will scrutinize whether reviewers actually exercise independent judgment. Rate of decision reversal, reviewer training records, and whether output is shown to reviewers alongside contextual information are all relevant evidence.",
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
      "The timing rule prevents retroactive application of ADMT to data collected before the consumer was informed. If your existing customer data was collected without ADMT disclosure, you cannot use that data for ADMT significant decisions without first providing a Pre-use Notice.",
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
      "The FSOR repeatedly emphasizes that consumers must be able to understand what is actually being decided about them in order to meaningfully exercise their opt-out right. A vague purpose statement defeats the notice's function and will be treated as non-compliant.",
    enforcementNote:
      "Common violation pattern: privacy notices that say 'we use automated tools to improve our services' or 'we process information to assess your application.' These will not satisfy § 7220(c)(1). The notice must name the decision (e.g., 'to determine whether to approve your loan application' or 'to rank job applicants for initial screening').",
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
      "Trade secrets and security-compromising information are excluded from this disclosure obligation (§ 7220(d)). Businesses may withhold specific model parameters or weights that constitute trade secrets, but must still describe the categories of PI used and the general logic of how outputs are generated.",
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
      "The opt-out link title requirement is specific: it must say what the consumer is opting out of, such as 'Opt-out of Automated Decisionmaking Technology.' Generic labels like 'Your Privacy Choices' will not satisfy this requirement when used in an ADMT Pre-use Notice.",
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
      "This exception was heavily debated during rulemaking. The CPPA clarified that the appeal must be a genuine opportunity for reconsideration, not a formality. The reviewer must actually have authority — a manager who only escalates further appeals does not qualify.",
    relatedCitations: [
      { citation: "11 CCR § 7021", label: "Timeline requirements for appeal responses" },
      { citation: "11 CCR § 7001(e)(1)", label: "Human involvement definition (related)" },
    ],
  },

  optout_exception_hiring: {
    coachLead: "State the sole assessment purpose and the documented non-discrimination evidence.",
    coachBody: "Confirm the ADMT is used only to assess ability to perform in the work or program at issue, and point to the fairness testing that supports the claim it does not unlawfully discriminate across protected characteristics.",
    goodAnswer:
      "ADMT used solely to assess for a hiring/admission decision, with documented bias testing showing no unlawful discrimination.",
    commonMistake:
      "Invoking the hiring exception for a tool that also does more than assess (e.g., sets pay), or with no fairness testing on file.",
    fieldLabel: "Opt-out exception: hiring and educational assessment",
    citation: "11 CCR § 7221(b)(2)-(3)",
    plainSummary:
      "Opt-out is not required for admission/hiring decisions IF the ADMT is used solely to assess the consumer's ability to perform at work or in an educational program AND the ADMT does not unlawfully discriminate based on protected characteristics. Similarly for work allocation and compensation decisions.",
    regulationText:
      "(2) For admission, acceptance, or hiring decisions as set forth in section 7001, subsections (ddd)(3)(A) and (ddd)(4)(A), if the following are true:\n(A) The business uses the ADMT solely for the business's assessment of the consumer's ability to perform at work or in an educational program to determine whether to admit, accept, or hire them; and\n(B) The ADMT works for the business's purpose and does not unlawfully discriminate based upon protected characteristics.\n\n(3) For allocation/assignment of work and compensation decisions as set forth in section 7001, subsection (ddd)(4)(B), if the following are true:\n(A) The business uses the ADMT solely for the business's allocation/assignment of work or compensation; and\n(B) The ADMT works for the business's purpose and does not unlawfully discriminate based upon protected characteristics.",
    enforcementNote:
      "The non-discrimination condition is not self-certifying. A business relying on this exception should have documented fairness testing results (disparate impact analysis, testing across protected classes) to support the claim that the ADMT 'works for its purpose and does not unlawfully discriminate.'",
    relatedCitations: [
      { citation: "11 CCR § 7001(ddd)(3)-(4)", label: "Education and employment significant decision definitions" },
    ],
  },

  optout_timing_response: {
    coachLead: "Commit to ceasing ADMT processing within 15 business days, and to notifying downstream recipients on the same clock.",
    coachBody: "Describe the intake and cessation flow (with the 15-business-day ceiling), the mechanism for stopping ADMT use for that consumer, and the notification path to service providers, contractors, and any third parties to whom the PI was disclosed.",
    goodAnswer:
      "A documented process that honors an opt-out within 15 business days and stops ADMT processing for that consumer from then on.",
    commonMistake:
      "No defined timeline, or honoring the opt-out only for new data while the existing automated decision keeps running.",
    fieldLabel: "Opt-out: response timing",
    citation: "11 CCR § 7221(n)(1)",
    plainSummary:
      "Once a consumer submits an opt-out request AFTER you have already started ADMT processing, you must cease processing that consumer's PI using that ADMT as soon as feasibly possible but no later than 15 business days from receipt. You must also notify all service providers, contractors, and other persons to whom you disclosed that PI.",
    regulationText:
      "If the consumer did not opt-out in response to the Pre-use Notice, and submitted a request to opt-out of ADMT after the business initiated the processing, the business must comply with the consumer's opt-out request by:\n\n(1) Ceasing to process the consumer's personal information using that ADMT as soon as feasibly possible, but no later than 15 business days from the date the business receives the request; and\n\n(2) Notifying all the business's service providers, contractors, or other persons to whom the business has disclosed or made personal information available to process the consumer's personal information using that ADMT, that the consumer has made a request to opt-out of that ADMT and instructing them to comply with the consumer's request to opt-out of that ADMT within the same time frame.",
    relatedCitations: [
      { citation: "11 CCR § 7221(k)", label: "12-month re-ask restriction" },
      { citation: "11 CCR § 7221(m)", label: "Pre-initiation opt-out" },
    ],
  },

  access_logic_disclosure: {
    coachLead: "Explain, in plain language, how the ADMT processed THIS consumer's PI to produce THEIR output.",
    coachBody: "Describe the parameters and reasoning that produced the specific output for the requester. Protect genuine trade secrets under § 7222(c), but a bare trade-secret refusal is not a compliant response.",
    goodAnswer:
      "Plain-language logic: “your score reflected a high debt-to-income ratio and a short credit history; these pushed it below the approval threshold.”",
    commonMistake:
      "Hiding behind “trade secret” to disclose nothing. You may protect secrets but must still give enough for the consumer to understand the decision.",
    fieldLabel: "Access right: ADMT logic disclosure",
    citation: "11 CCR § 7222(b)(2)",
    plainSummary:
      "When a consumer requests access to ADMT, you must provide plain-language information about the logic of the ADMT — how it processed their personal information to generate the specific output about them, including the parameters that generated that output. Trade secrets and security-compromising details may be withheld.",
    regulationText:
      "Information about the logic of the ADMT. Such information must enable a consumer to understand how the ADMT processed their personal information to generate an output with respect to them, which may include the parameters that generated the output as well as the specific output with respect to the consumer.",
    fscrContext:
      "The CPPA wants consumers to be able to understand, in practical terms, what factors led to the output that affected them. This is similar to GDPR Article 22's 'meaningful information about the logic involved.' Generic explanations of how the system works in general are insufficient — the explanation must relate to the specific consumer's case.",
    relatedCitations: [
      { citation: "11 CCR § 7222(c)", label: "Trade secret and security carve-outs for access responses" },
      { citation: "11 CCR § 7222(j)", label: "Aggregate response option (>4 uses in 12 months)" },
    ],
  },

  access_outcome_disclosure: {
    coachLead: "State the output, the threshold, and how the output drove this consumer's specific decision.",
    coachBody: "Give the actual output, explain whether it was the sole factor and — if not — which other factors mattered, describe any human role that did not meet § 7001(e)(1), and disclose planned future use of the same output.",
    goodAnswer:
      "States the output and how it was used: “score 32/100; below the 40 threshold, so the application was automatically declined.”",
    commonMistake:
      "Describing the system in general but never telling the consumer their actual result or how it drove the decision.",
    fieldLabel: "Access right: decision outcome disclosure",
    citation: "11 CCR § 7222(b)(3)",
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
      "§ 7222(b)(4) imposes the DISCLOSURE duty inside the access response itself. It is distinct from § 7222(k), which is the separate substantive prohibition on retaliation, and from § 7220(c)(4), which is the pre-use-notice counterpart. Both prongs — the statement AND the direct link — are required.",
    relatedCitations: [
      { citation: "11 CCR § 7222(k)", label: "Substantive prohibition on retaliation for exercising ADMT rights" },
      { citation: "Cal. Civ. Code § 1798.125", label: "Statutory anti-retaliation prohibition" },
      { citation: "11 CCR § 7220(c)(4)", label: "Pre-use notice counterpart (notice_anti_retaliation)" },
    ],
  },



  access_verification: {
    coachLead: "Verify identity proportionately under Article 5 — and if you cannot, tell the requester so.",
    coachBody: "Match the request to the account holder with a proportionate check; do not over-collect new sensitive PI. If verification fails, respond that identity could not be verified rather than declining without explanation.",
    goodAnswer:
      "A proportionate identity check that matches the request to the account holder — without demanding excessive new personal information.",
    commonMistake:
      "Either skipping verification (risking disclosure to the wrong person) or over-collecting sensitive ID data just to process the request.",
    fieldLabel: "Access right: identity verification",
    citation: "11 CCR § 7222(e)",
    plainSummary:
      "Unlike opt-out requests, access requests DO require identity verification under Article 5. If you cannot verify the consumer's identity, you must inform them that you cannot verify their identity — you cannot just deny the request without explanation.",
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
    citation: "11 CCR § 7157(c)",
    plainSummary:
      "The person who submits the risk assessment to the Agency must be an executive who is directly responsible for risk-assessment compliance, has sufficient knowledge of the assessment to provide accurate information, and has authority to submit it. The roster you record here is what the assessment relies on to identify that individual and the roles supporting them.",
    regulationText:
      "(c) The individual submitting the information set forth in subsection (b) must be a member of the business's executive management team who: (1) Is directly responsible for the business's risk-assessment compliance; (2) Has sufficient knowledge of the business's risk assessment to provide accurate information; and (3) Has the authority to submit the risk assessment information to the Agency.",
    enforcementNote:
      "The § 7157(b)(5) attestation is signed under penalty of perjury. FSOR commentary on § 7157 (rows c49a76e8… and 23bfcaed…) confirms the Agency's focus on who bears direct responsibility and who is authorised to submit — not who merely reviewed the assessment.",
    coachLead: "Select every role that already has a defined responsibility — do not select roles you plan to assign later.",
    coachBody:
      "For each role picked, a real person should already own a documented duty for this ADMT (design, monitoring, human-review authority, incident escalation, or attestation). Roles that are aspirational belong in the remediation plan, not this roster.",
    goodAnswer:
      "A retailer picks Chief Privacy Officer, Model Owner, and Fair-Lending Reviewer because each already holds a written responsibility for the credit-decision ADMT; it leaves Ombudsperson unselected because no one currently holds that duty.",
    commonMistake:
      "Selecting every conceivable role to look complete. § 7157(c) rewards accuracy about who actually holds the responsibility — an over-broad roster weakens the attestation, not strengthens it.",
    relatedCitations: [
      { citation: "11 CCR § 7157(b)(5)", label: "Attestation under penalty of perjury" },
      { citation: "11 CCR § 7157(b)(6)", label: "Submitter name and title" },
    ],
  },

  // ITEM 308 RETROFIT — intake-rail parity for the Chapter 3 (E)(1) additions.
  // regulationText is the verbatim registry text already carried by
  // supabase/functions/_shared/registry/admt-verified-authorities.ts.
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
      "\u201cWe use an automated scoring model to decide whether to approve your rental application. You may opt out at [link]; if you do, a leasing officer reviews your application manually within five business days.\u201d \u2014 the live wording, not a summary of it.",
    commonMistake:
      "Describing what the notice covers instead of pasting it. A description cannot be assessed for adequacy; only the published words can.",
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
    coachLead: "State whether the ADMT output is used for anything beyond assessing ability to perform.",
    coachBody: "The exception is lost if the same output also drives another purpose. Answer for the output, not for the system as a whole.",
    fieldLabel: "Sole-use attestation (hiring / admission exception)",
    citation: "11 CCR § 7221(b)(2)(A)",
    plainSummary:
      "The hiring and admission exception applies only if the ADMT is used solely to assess the person's ability to perform at work or in an educational program in order to decide whether to admit, accept, or hire them.",
    regulationText:
      "The business uses the ADMT solely for the business\u2019s assessment of the consumer\u2019s ability to perform at work or in an educational program to determine whether to admit, accept, or hire them.",
    goodAnswer:
      "\u201cNo \u2014 the same score also feeds our compensation banding.\u201d An honest negative preserves the assessment; an inaccurate yes destroys it.",
    commonMistake:
      "Answering yes because assessment is the main use. \u201cSolely\u201d means only.",
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
    coachBody: "Your report quotes these words back and tests each element against the standard. A paraphrase cannot be tested; the finding degrades to a record shortfall.",
    fieldLabel: "Published Pre-use Notice, in full",
    citation: "11 CCR § 7220(c)",
    plainSummary:
      "The pre-use notice must give the consumer the specific purpose, the right to opt out and how to submit it, the right to access ADMT and how to submit it, that the business cannot retaliate, and a plain-language explanation of how the ADMT works.",
    regulationText:
      "A business that uses automated decisionmaking technology for a significant decision concerning a consumer must provide a Pre-use Notice that includes the information set forth in subsections (c)(1) through (c)(5).",
    goodAnswer:
      "The complete notice text copied from the page where it is published, headings included.",
    commonMistake:
      "Pasting the general privacy policy instead of the pre-use notice, or describing the notice rather than reproducing it.",
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
};
