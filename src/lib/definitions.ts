export interface TermDefinition {
  term: string;
  definition: string;
  cite: string;
  ukNote?: string;
}

export const DEFINITIONS: Record<string, TermDefinition> = {
  comparable_set: {
    term: "Comparable set of processing activities",
    definition: "A set of similar processing activities that present similar risks to consumers' privacy, which a business may address in a single risk assessment. (verbatim, condensed)",
    cite: "11 CCR § 7156(a)",
  },

  sensitive_pi: {
    term: "Sensitive personal information",
    definition: "Personal information revealing a consumer's Social Security, driver's license, state ID, or passport number; account log-in credentials; precise geolocation; racial or ethnic origin, religious or philosophical beliefs, or union membership; the contents of mail, email, or text messages where the business is not the intended recipient; genetic data; biometric information processed to identify a consumer; health data; or data concerning sex life or sexual orientation. (summary)",
    cite: "Cal. Civ. Code § 1798.140(ae)",
  },
  ccba: {
    term: "Cross-context behavioral advertising",
    definition: "The targeting of advertising to a consumer based on personal information obtained from the consumer's activity across businesses, distinctly-branded websites, applications, or services other than the one with which the consumer intentionally interacts. (verbatim, condensed)",
    cite: "Cal. Civ. Code § 1798.140(k)",
  },
  right_to_know: {
    term: "Right to Know / Access",
    definition: "A consumer's right to request that a business disclose the categories and specific pieces of personal information collected about them, the sources, the purposes for collection, and the categories of third parties to whom it is disclosed. (summary)",
    cite: "Cal. Civ. Code §§ 1798.110, 1798.115",
  },
  right_to_delete: {
    term: "Right to Deletion",
    definition: "A consumer's right to request deletion of personal information the business has collected from them, subject to statutory exceptions such as completing a transaction, security, or legal compliance. (summary)",
    cite: "Cal. Civ. Code § 1798.105",
  },
  right_to_correct: {
    term: "Right to Correction",
    definition: "A consumer's right to request that a business correct inaccurate personal information it maintains about them, taking into account the nature of the information and purposes of processing. (summary)",
    cite: "Cal. Civ. Code § 1798.106",
  },
  right_to_opt_out: {
    term: "Right to Opt-Out",
    definition: "A consumer's right to direct a business not to sell or share their personal information. Businesses that sell or share PI must provide a clear and conspicuous 'Do Not Sell or Share My Personal Information' link on their homepage. (summary)",
    cite: "Cal. Civ. Code §§ 1798.120, 1798.135(a)",
  },
  notice_at_collection: {
    term: "Notice at collection",
    definition: "At or before collection, a business must inform consumers of the categories of personal information collected, the purposes of use, whether it is sold or shared, the retention period, and how to exercise opt-out rights. (summary — full disclosure contents are detailed in the statute)",
    cite: "Cal. Civ. Code §§ 1798.100(a), 1798.130",
  },
  admt: {
    term: "Automated Decision-Making Technology (ADMT)",
    definition:
      "Technology that processes personal information and uses computation to replace or substantially replace human decisionmaking (11 CCR § 7001(e)). Includes profiling. Excludes infrastructure (firewalls, databases, spreadsheets) that does not replace human decisions.",
    cite: "11 CCR § 7001(e)",
  },
  significant_decision: {
    term: "Significant Decision",
    definition:
      "A decision that results in the provision or denial of: financial or lending services; housing; education enrollment or opportunities; employment, independent contracting, or compensation; or healthcare services. Does NOT include advertising (11 CCR § 7001(ddd)).",
    cite: "11 CCR § 7001(ddd)",
  },
  meaningful_human_involvement: {
    term: "Meaningful human involvement",
    definition:
      "A human reviewer who (A) knows how to interpret and use the system's output, (B) reviews that output together with other relevant information, and (C) has authority to make or change the decision. If all three are present and applied before the decision, the technology does not 'substantially replace' human decisionmaking, and Article 11 may not apply. A reviewer who cannot override the output is NOT meaningful involvement.",
    cite: "11 CCR § 7001(e)(1)",
  },
  pre_use_notice: {
    term: "Pre-use notice",
    definition:
      "A notice a business must give consumers, at or before the point it collects/uses their personal information with ADMT for a significant decision, stating the specific purpose, how the ADMT works and what output it produces, how to opt out, how to access information, that retaliation is prohibited, and the alternative process if the consumer opts out.",
    cite: "11 CCR § 7220",
  },
  admt_opt_out: {
    term: "ADMT opt-out right",
    definition:
      "The consumer's right to opt out of a business's use of ADMT for a significant decision, unless a listed exception applies (human appeal; or use solely to assess for hiring/admission, or work allocation/compensation, with no unlawful discrimination). At least two opt-out methods must be offered.",
    cite: "11 CCR § 7221",
  },
  admt_access_right: {
    term: "ADMT access right",
    definition:
      "The consumer's right to request information about a business's use of ADMT to make a significant decision about them — including the output, how it was used, the logic, and the role of any human reviewer. Trade secrets may be withheld, but the business must still provide the information needed to understand the decision.",
    cite: "11 CCR § 7222",
  },

  // === GDPR Article 4 core terms (P1-1b) ===
  gdpr_personal_data: {
    term: "Personal data",
    definition: "Any information relating to an identified or identifiable natural person ('data subject'); an identifiable natural person is one who can be identified, directly or indirectly, in particular by reference to an identifier such as a name, an identification number, location data, an online identifier or to one or more factors specific to the physical, physiological, genetic, mental, economic, cultural or social identity of that natural person. (verbatim)",
    cite: "Art. 4(1) GDPR / UK GDPR",
  },
  gdpr_processing: {
    term: "Processing",
    definition: "Any operation or set of operations performed on personal data, whether or not by automated means, such as collection, recording, organisation, structuring, storage, adaptation or alteration, retrieval, consultation, use, disclosure by transmission, dissemination or otherwise making available, alignment or combination, restriction, erasure or destruction. (verbatim, condensed)",
    cite: "Art. 4(2) GDPR / UK GDPR",
  },
  gdpr_profiling: {
    term: "Profiling",
    definition: "Any form of automated processing of personal data consisting of the use of personal data to evaluate certain personal aspects relating to a natural person, in particular to analyse or predict aspects concerning that person's performance at work, economic situation, health, personal preferences, interests, reliability, behaviour, location or movements. (verbatim)",
    cite: "Art. 4(4) GDPR / UK GDPR",
  },
  gdpr_pseudonymisation: {
    term: "Pseudonymisation",
    definition: "The processing of personal data in such a manner that the personal data can no longer be attributed to a specific data subject without the use of additional information, provided that such additional information is kept separately and is subject to technical and organisational measures. (verbatim, condensed)",
    cite: "Art. 4(5) GDPR / UK GDPR",
  },
  gdpr_controller: {
    term: "Controller",
    definition: "The natural or legal person, public authority, agency or other body which, alone or jointly with others, determines the purposes and means of the processing of personal data. (verbatim, condensed)",
    cite: "Art. 4(7) GDPR / UK GDPR",
  },
  gdpr_processor: {
    term: "Processor",
    definition: "A natural or legal person, public authority, agency or other body which processes personal data on behalf of the controller. (verbatim)",
    cite: "Art. 4(8) GDPR / UK GDPR",
  },
  gdpr_recipient: {
    term: "Recipient",
    definition: "A natural or legal person, public authority, agency or another body, to which the personal data are disclosed, whether a third party or not. (verbatim, condensed)",
    cite: "Art. 4(9) GDPR / UK GDPR",
  },
  gdpr_consent: {
    term: "Consent",
    definition: "Any freely given, specific, informed and unambiguous indication of the data subject's wishes by which he or she, by a statement or by a clear affirmative action, signifies agreement to the processing of personal data relating to him or her. (verbatim)",
    cite: "Art. 4(11) GDPR / UK GDPR",
  },
  gdpr_personal_data_breach: {
    term: "Personal data breach",
    definition: "A breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to, personal data transmitted, stored or otherwise processed. (verbatim)",
    cite: "Art. 4(12) GDPR / UK GDPR",
  },
  gdpr_biometric_data: {
    term: "Biometric data",
    definition: "Personal data resulting from specific technical processing relating to the physical, physiological or behavioural characteristics of a natural person, which allow or confirm the unique identification of that natural person, such as facial images or dactyloscopic data. (verbatim)",
    cite: "Art. 4(14) GDPR / UK GDPR",
  },
  gdpr_health_data: {
    term: "Data concerning health",
    definition: "Personal data related to the physical or mental health of a natural person, including the provision of health care services, which reveal information about his or her health status. (verbatim)",
    cite: "Art. 4(15) GDPR / UK GDPR",
  },
  gdpr_supervisory_authority: {
    term: "Supervisory authority",
    definition: "An independent public authority established by a Member State pursuant to Article 51, responsible for monitoring the application of the GDPR. (verbatim, condensed)",
    cite: "Art. 4(21), Art. 51 GDPR",
    ukNote: "UK GDPR: the supervisory authority is the Information Commissioner (ICO).",
  },

  // === GDPR operative-concept definitions (P1-1c) ===
  gdpr_special_categories: {
    term: "Special categories of personal data",
    definition: "Personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership, and the processing of genetic data, biometric data for the purpose of uniquely identifying a natural person, data concerning health or data concerning a natural person's sex life or sexual orientation. Processing is prohibited unless an Art. 9(2) condition applies. (verbatim, condensed)",
    cite: "Art. 9(1)–(2) GDPR / UK GDPR",
  },
  gdpr_lawful_basis: {
    term: "Lawful basis (Article 6)",
    definition: "Processing is lawful only if at least one of six bases applies: consent; necessity for a contract; compliance with a legal obligation; protection of vital interests; performance of a task in the public interest or official authority; or legitimate interests. (summary)",
    cite: "Art. 6(1)(a)–(f) GDPR / UK GDPR",
  },
  gdpr_legitimate_interests: {
    term: "Legitimate interests",
    definition: "Processing necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject, in particular where the data subject is a child. Requires a documented three-part assessment: purpose, necessity, and balancing. (verbatim + summary)",
    cite: "Art. 6(1)(f) GDPR; Recital 47",
    ukNote: "UK GDPR: the Data (Use and Access) Act 2025 added 'recognised legitimate interests' (new Annex 1) that do not require a balancing test.",
  },
  gdpr_dpia: {
    term: "Data Protection Impact Assessment (DPIA)",
    definition: "Where a type of processing, in particular using new technologies, is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall, prior to the processing, carry out an assessment of the impact of the envisaged processing operations on the protection of personal data. (verbatim, condensed)",
    cite: "Art. 35(1), (3) GDPR / UK GDPR",
  },
  gdpr_ropa: {
    term: "Record of Processing Activities (RoPA)",
    definition: "Each controller shall maintain a record of processing activities under its responsibility, containing: the controller's details; the purposes of processing; categories of data subjects and personal data; categories of recipients; third-country transfers; envisaged retention periods; and a general description of security measures. (summary)",
    cite: "Art. 30(1) GDPR / UK GDPR",
  },
  gdpr_processor_contract: {
    term: "Processor contract (Article 28)",
    definition: "Processing by a processor shall be governed by a binding contract setting out the subject-matter and duration of the processing, its nature and purpose, the type of personal data and categories of data subjects, and the obligations and rights of the controller, including the specific terms required by Art. 28(3)(a)–(h) — documented instructions, confidentiality, security, sub-processor authorisation, data subject rights assistance, breach assistance, deletion or return, and audit rights. (summary)",
    cite: "Art. 28(3) GDPR / UK GDPR",
  },
  gdpr_breach_notification: {
    term: "Breach notification (72 hours)",
    definition: "In the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the breach to the competent supervisory authority, unless the breach is unlikely to result in a risk to the rights and freedoms of natural persons. (verbatim, condensed)",
    cite: "Art. 33(1) GDPR / UK GDPR",
    ukNote: "UK GDPR: notification is to the ICO.",
  },
  gdpr_breach_communication: {
    term: "Communication to data subjects",
    definition: "When a personal data breach is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall communicate the breach to the data subject without undue delay. (verbatim, condensed)",
    cite: "Art. 34(1) GDPR / UK GDPR",
  },
  gdpr_transparency: {
    term: "Transparency information (Arts. 13–14)",
    definition: "At the time personal data are obtained, the controller must provide the data subject with prescribed information including the controller's identity and contact details, the purposes and legal basis of processing, recipients, third-country transfers, retention period, data subject rights, and the source of the data where not collected from the data subject. (summary)",
    cite: "Arts. 13–14 GDPR / UK GDPR",
  },
  gdpr_international_transfer: {
    term: "International transfer (Chapter V)",
    definition: "Personal data may be transferred to a third country or international organisation only where the conditions of Chapter V are met: an adequacy decision (Art. 45), appropriate safeguards such as standard contractual clauses or binding corporate rules (Art. 46), or a specific derogation (Art. 49). (summary)",
    cite: "Arts. 44–49 GDPR / UK GDPR",
    ukNote: "UK GDPR: UK adequacy regulations and the ICO's IDTA or UK Addendum replace the EU mechanisms.",
  },
  gdpr_sccs: {
    term: "Standard Contractual Clauses (SCCs)",
    definition: "Standard data protection clauses adopted by the European Commission providing appropriate safeguards for transfers to third countries. Following the Schrems II judgment, reliance on SCCs requires a documented transfer impact assessment and, where needed, supplementary measures. (summary)",
    cite: "Art. 46(2)(c) GDPR; EDPB Recommendations 01/2020",
    ukNote: "UK GDPR: the ICO's International Data Transfer Agreement (IDTA) or the UK Addendum to the EU SCCs apply.",
  },
  gdpr_dpo: {
    term: "Data Protection Officer (DPO)",
    definition: "A controller or processor must designate a DPO where processing is carried out by a public authority, or where core activities consist of regular and systematic monitoring of data subjects on a large scale, or large-scale processing of special categories of data or criminal conviction data. (summary)",
    cite: "Arts. 37–39 GDPR / UK GDPR",
  },
  gdpr_security_measures: {
    term: "Security of processing (Article 32)",
    definition: "Controllers and processors must implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk — including, as appropriate, pseudonymisation and encryption, the ability to ensure ongoing confidentiality, integrity, availability and resilience of systems, and a process for regularly testing the effectiveness of those measures. (summary)",
    cite: "Art. 32 GDPR / UK GDPR",
  },
  gdpr_data_subject_rights: {
    term: "Data subject rights",
    definition: "Data subjects have the right to be informed and to obtain access to their personal data, and to rectification, erasure, restriction of processing, data portability, and to object. The controller must facilitate these rights and respond without undue delay and within one month. (summary)",
    cite: "Arts. 12, 15–22 GDPR / UK GDPR",
  },
  gdpr_accountability: {
    term: "Accountability (Article 24)",
    definition: "The controller must implement appropriate technical and organisational measures to ensure, and to be able to demonstrate, that processing complies with the Regulation — reviewing and updating those measures where necessary, and maintaining records, inventories and governance processes that evidence compliance. (summary)",
    cite: "Art. 24 GDPR / UK GDPR",
  },
};

export type DefinitionKey = keyof typeof DEFINITIONS;
