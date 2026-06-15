// src/components/admt/admtRailEntries.ts
// Verbatim regulation text, plain summaries, and FSOR context
// for every field in the ADMT Compliance Checker.

import type { RailEntry } from "./StatuteRail";

export const ADMT_RAIL: Record<string, RailEntry> = {
  scope_does_business_use_admt: {
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
    relatedCitations: [
      { citation: "11 CCR § 7001(ii)", label: "Profiling definition" },
      { citation: "11 CCR § 7001(ddd)", label: "Significant decision definition" },
    ],
  },

  scope_significant_decision_domain: {
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
    fieldLabel: "Pre-use notice: access right description",
    citation: "11 CCR § 7220(c)(3)",
    plainSummary:
      "The notice must tell consumers they have the right to request information about how your ADMT was used in decisions about them, and explain how to submit that request.",
    regulationText:
      "A description of the consumer's right to access ADMT with respect to the consumer and how the consumer can submit their request to access ADMT to the business.",
    relatedCitations: [{ citation: "11 CCR § 7222", label: "Access right — full requirements" }],
  },

  notice_how_admt_works: {
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

  access_verification: {
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
};
