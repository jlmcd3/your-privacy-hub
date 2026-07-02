// COACHING CONTENT RULE — coaching describes the SHAPE of a complete answer
// (dimensions, specificity, separateness). It NEVER describes the CONTENT of a
// compliant answer (what facts satisfy the law, what answer "passes").
// goodAnswer examples are clearly fictional and illustrate FORM, never a template.
// Voice: imperative, active, plain subject-verb-object, one idea per sentence,
// specific over vague, no ornamental legalese. Layered: coachLead = one line an
// expert acts on instantly; goodAnswer/commonMistake = the expansion for newer users.

// src/components/cppa/CPPARiskRailEntries.ts
// StatuteRail entries for the CPPA Risk Assessment (Module 1).
// Citations verified against the codebase. Plain summaries written for compliance professionals.
// Regulation text: verbatim from 11 CCR §§ 7150–7157 and Cal. Civ. Code §§ 1798.100–1798.140.

import type { RailEntry } from "@/components/intake/StatuteRail";

const CPPA_URL = "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf";

export const CPPA_RISK_RAIL: Record<string, RailEntry> = {
  subject_anchor: {
    fieldLabel: "In one line — what processing does this assessment cover?",
    citation: "11 CCR § 7150(b)",
    citationUrl: CPPA_URL,
    plainSummary:
      "One assessment covers one processing activity. This line names it and fixes it across your runs.",
    regulationText: "…",
    coachLead: "Name the one processing activity being assessed.",
    coachBody:
      "One line, one activity. The detailed purpose in Step 6 stays editable; this is the record's fixed subject.",
    goodAnswer:
      "\u201CAutomated resume-screening for hiring.\u201D — the activity, not the department or the vendor.",
    commonMistake:
      "Naming the tool (\u201Cthe HireSmart platform\u201D) instead of the processing. Vendors change; the assessed activity is the record.",
  },

  q1_revenue: {
    fieldLabel: "Q1: Annual gross revenue",
    citation: "Cal. Civ. Code § 1798.140(ag)(1)",
    citationUrl: CPPA_URL,
    plainSummary: "A 'business' subject to CCPA/CPRA includes any for-profit entity doing business in California with annual gross revenues exceeding $25 million. This threshold applies regardless of how much California consumer data you process.",
    regulationText: "A \"business\" means a sole proprietorship, partnership, limited liability company, corporation, association, or other legal entity that is organized or operated for the profit or financial benefit of its shareholders or other owners… and that… Has annual gross revenues in excess of twenty-five million dollars ($25,000,000).",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.140(ag)(2)", label: "Consumer volume threshold" },
      { citation: "Cal. Civ. Code § 1798.140(ag)(3)", label: "50% revenue threshold" },
    ],
  },

  q2_consumers: {
    fieldLabel: "Q2: Number of California consumers processed annually",
    citation: "Cal. Civ. Code § 1798.140(ag)(2)(A)",
    citationUrl: CPPA_URL,
    plainSummary: "A business that annually buys, sells, receives, or shares the personal information of 100,000 or more California consumers or households is subject to CCPA/CPRA, regardless of revenue.",
    regulationText: "Alone or in combination, annually buys, sells, receives for the business's commercial purposes, or shares for commercial purposes, alone or in combination, the personal information of 100,000 or more consumers or households.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.140(ag)(1)", label: "Revenue threshold ($25M+)" },
    ],
  },

  q3_sector: {
    fieldLabel: "Q3: Primary business sector",
    citation: "11 CCR § 7150(a)",
    citationUrl: CPPA_URL,
    plainSummary: "A risk assessment is required before beginning any processing of personal information that presents significant risk to consumer privacy. The CPPA's regulations identify specific categories of processing — including by sector — that trigger this requirement.",
    regulationText: "A business shall conduct and document a risk assessment before initiating any processing of personal information that presents significant risk to the privacy of consumers.",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)", label: "Categories of processing that present significant risk" },
    ],
  },

  q4_pi_categories: {
    fieldLabel: "Q4: Categories of personal information processed",
    citation: "11 CCR § 7152(a)(2)",
    citationUrl: CPPA_URL,
    plainSummary: "The risk assessment must identify the specific categories of personal information involved in the processing. Eight categories are classified as sensitive PI under Cal. Civ. Code § 1798.140(ae) and trigger additional harm analysis requirements.",
    regulationText: "The categories of personal information processed, including whether the categories are sensitive personal information as defined in Civil Code section 1798.140, subdivision (ae).",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.140(ae)", label: "Sensitive PI definition" },
      { citation: "11 CCR § 7152(a)(5)", label: "Sensitive PI harm categories" },
    ],
  },

  q5_sell_share: {
    fieldLabel: "Q5: Sell or share PI for cross-context behavioural advertising",
    citation: "Cal. Civ. Code §§ 1798.120, 1798.135(a)",
    citationUrl: CPPA_URL,
    plainSummary: "Businesses that sell or share PI must provide a 'Do Not Sell or Share My Personal Information' link on their homepage. Selling or sharing PI is also one of the six categories of processing that triggers the CPPA's risk assessment requirement.",
    regulationText: "A consumer shall have the right, at any time, to direct a business that sells or shares personal information about the consumer to third parties not to sell or share the consumer's personal information.",
    enforcementNote: "Undisclosed data selling and sharing is among the most cited CCPA violations. The CPPA's first wave of enforcement investigations (2024–2025) prioritised businesses with absent or non-functional opt-out mechanisms. Ensure your answer here is consistent with your privacy policy and actual data flows.",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)(1)", label: "Risk assessment trigger — sell/share" },
      { citation: "Cal. Civ. Code § 1798.140(k)", label: "Cross-context behavioural advertising definition" },
    ],
  },

  q9_opt_out: {
    fieldLabel: "Q9: Right to Opt-Out — Do Not Sell or Share link",
    citation: "Cal. Civ. Code §§ 1798.120, 1798.135(a)",
    citationUrl: CPPA_URL,
    plainSummary: "If your business sells or shares PI, you must provide a clearly visible 'Do Not Sell or Share My Personal Information' link on your homepage. The link must be conspicuous — footer-only placement may not satisfy the requirement.",
    regulationText: "A business that sells consumers' personal information to, or shares it with, third parties shall provide notice to consumers… and shall disclose… the title 'Do Not Sell or Share My Personal Information' conspicuously posted on the business's internet homepage.",
    enforcementNote: "Absent, buried, or broken opt-out links appear repeatedly in enforcement actions. The CPPA has specifically cited homepages that require scrolling to find the opt-out link as potentially non-compliant with the conspicuousness requirement.",
    relatedCitations: [
      { citation: "11 CCR § 7004", label: "Ease-of-use requirements for privacy choices" },
    ],
  },

  q10_verification: {
    fieldLabel: "Q10: Identity verification for consumer rights requests",
    citation: "11 CCR §§ 7060–7062",
    citationUrl: CPPA_URL,
    plainSummary: "Businesses must verify the identity of consumers making rights requests before responding. The verification process must be proportionate to the sensitivity of the information requested and must not create barriers to exercising rights.",
    regulationText: "A business shall implement a reasonable method to verify that the consumer making the request is the consumer about whom the business has collected personal information, or is that consumer's authorized agent.",
    relatedCitations: [
      { citation: "11 CCR § 7023", label: "Methods of verification" },
      { citation: "11 CCR § 7025", label: "Verification for sensitive PI requests" },
    ],
  },

  q15_sensitive_pi: {
    fieldLabel: "Q15: Do you process any sensitive personal information?",
    citation: "Cal. Civ. Code § 1798.140(ae)",
    citationUrl: CPPA_URL,
    plainSummary: "Sensitive PI is a defined category that includes health data, biometrics, genetic data, precise geolocation, racial/ethnic origin, religious beliefs, union membership, sexual orientation, and citizenship status. Processing sensitive PI triggers the right to limit use and additional harm analysis in the risk assessment.",
    regulationText: "\"Sensitive personal information\" means personal information that reveals… a consumer's social security, driver's license, state identification card, or passport number; account log-in… precise geolocation; racial or ethnic origin, religious or philosophical beliefs, or union membership… the contents of a consumer's mail, email, and text messages… genetic data… biometric information processed for the purpose of uniquely identifying a consumer; personal information collected and analyzed concerning a consumer's health; sex life or sexual orientation.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.121", label: "Right to limit use of sensitive PI" },
      { citation: "11 CCR § 7152(a)(5)", label: "Sensitive PI in risk assessment" },
    ],
  },

  q18_admt: {
    fieldLabel: "Q18: Do you use ADMT for decisions with significant effects on consumers?",
    citation: "11 CCR § 7001(e)",
    citationUrl: CPPA_URL,
    plainSummary: "ADMT means technology that processes PI and uses computation to replace or substantially replace human decision-making. It includes AI, ML, and profiling. It does NOT include infrastructure (firewalls, databases, spreadsheets) that doesn't replace human decisions. ADMT use triggers a mandatory risk assessment under §§ 7150(b)(3) and 7150(b)(6).",
    regulationText: "\"Automated decisionmaking technology\" or \"ADMT\" means any technology that processes personal information and uses computation to replace human decisionmaking or substantially replace human decisionmaking. (1) For purposes of this definition, to \"substantially replace human decisionmaking\" means a business uses the technology's output to make a decision without human involvement.",
    enforcementNote: "The CPPA has indicated it will look at whether a human reviewer genuinely has authority to change a decision, not just review it. A 'human in the loop' who cannot override the system's output does not satisfy the human involvement standard.",
    coachLead: "If ADMT is in play, describe the system, not the vendor.",
    coachBody: "The description that matters is what the technology does with whose data and which decision it touches — name the decision domain, the inputs, and where the output lands.",
    goodAnswer: "\u201CA scoring model ranks rental applicants using credit and tenancy history; scores gate which applications an agent reviews.\u201D — the decision, the inputs, and the output's role.",
    commonMistake: "Answering with a product name. \u2018We use VendorX\u2019 says who sold it; § 7001(e) turns on what it does to the decision.",
    relatedCitations: [
      { citation: "11 CCR § 7001(ddd)", label: "Significant decision definition" },
      { citation: "11 CCR § 7150(b)(3)", label: "Risk assessment trigger — ADMT" },
    ],
  },

  i1_purpose: {
    fieldLabel: "I-1: Specific processing purpose",
    citation: "11 CCR § 7152(a)(1)",
    citationUrl: CPPA_URL,
    plainSummary: "The risk assessment must state the specific purpose of the processing. Generic descriptions — 'to improve services', 'for security', 'analytics' — are explicitly insufficient. You must describe what the processing does, who it affects, and what business outcome it achieves.",
    regulationText: "The specific purpose or purposes of the processing.",
    fscrContext: "During rulemaking, many commenters argued that generic purpose statements should be acceptable to reduce compliance burden. The CPPA rejected this position, stating in the Final Statement of Reasons that a vague purpose prevents consumers from meaningfully exercising their rights and prevents the Agency from evaluating proportionality. Specificity is required because the purpose statement anchors all subsequent harm analysis in the assessment.",
    coachLead: "State the concrete operation and its business outcome.",
    coachBody:
      "Name the specific system, its inputs, what it produces, and who acts on it. The validator flags umbrella phrases — they also weaken every downstream section.",
    goodAnswer:
      "\u201CA gradient-boosted model scores applicants 0\u2013100 on four years of hiring-outcome data; scores order the shortlist recruiters review.\u201D — mechanism, inputs, output, and where automation makes the call.",
    commonMistake:
      "\u201CImprove hiring\u201D / \u201Canalytics\u201D / \u201Cas described in our privacy policy.\u201D These state a goal, not a processing purpose — § 7152(a)(2) needs a purpose specific enough to test necessity against.",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(2)", label: "PI categories — must align with stated purpose" },
    ],
  },

  i2_retention: {
    fieldLabel: "I-2: Retention period and criteria",
    citation: "11 CCR § 7152(a)(3)(B)",
    citationUrl: CPPA_URL,
    plainSummary: "The assessment must state how long each category of personal information will be retained, or the criteria used to determine the retention period. You must state a specific period or a specific determinable criterion — 'as long as necessary' is not sufficient.",
    regulationText: "The length of time the business intends to retain each category of personal information, or if that is not possible, the criteria used to determine that period.",
    coachLead: "Give a number, a trigger, and what happens at the end.",
    coachBody: "State the retention period per category as a defined duration or a computable criterion, the event that starts the clock, and the deletion or de-identification step at period end. § 7152(a)(3)(B) looks for the plan, not an intention.",
    goodAnswer: "\u201CApplication records: 24 months from decision date, then automated deletion; access logs: 12 months rolling.\u201D — a duration, a start event, and an end-state for each category.",
    commonMistake: "\u201CAs long as necessary\u201D restates the legal standard instead of applying it. A criterion must let a reader compute the date for a specific record.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.100(a)(5)", label: "Retention disclosure requirement" },
    ],
  },

  i5_admt: {
    fieldLabel: "I-5: ADMT specifics",
    citation: "11 CCR § 7152(a)(3)(G)",
    citationUrl: CPPA_URL,
    plainSummary: "When the processing involves ADMT for significant decisions, the risk assessment must describe: the logic of the ADMT system, the training data sources, fairness/bias testing, and the human review process. All four elements are required.",
    regulationText: "If the processing involves automated decisionmaking technology for a significant decision concerning a consumer: (i) A description of the logic involved in the automated decision and the training data used; (ii) An explanation of how the business tests for and corrects bias; (iii) A description of the human review process for outputs of the technology.",
    fscrContext: "The CPPA retained the detailed ADMT disclosure requirements over industry objections that they were too prescriptive and could expose trade secrets. The FSOR notes that § 7220 already provides trade secret protections, and that without specificity, the risk assessment cannot demonstrate proportionality or bias mitigation.",
    coachLead: "Cover all four: the logic, the training data, the human's role, the testing.",
    coachBody: "Describe what the system computes and from which inputs, where its training data came from, what a human can actually change before the decision takes effect, and any validity or fairness testing with its cadence.",
    goodAnswer: "\u201CA gradient-boosted scorer trained on three years of outcome data; a reviewer can override any score before the decision issues; disparate-impact testing runs quarterly.\u201D — mechanism, data lineage, real human authority, and a test cadence.",
    commonMistake: "Describing human review as \u2018a person sees the output.\u2019 § 7152(a)(3)(G) turns on whether the human can change the outcome, not whether they observe it.",
    relatedCitations: [
      { citation: "11 CCR § 7001(e)(1)", label: "Human involvement definition" },
      { citation: "11 CCR § 7156(b)", label: "Cross-referencing existing DPIA" },
    ],
  },

  i9_dpia: {
    fieldLabel: "I-9: Existing GDPR DPIA or other PIA",
    citation: "11 CCR § 7156(b)",
    citationUrl: CPPA_URL,
    plainSummary: "A prior GDPR DPIA or other PIA can be cross-referenced in the CPPA risk assessment. It does not substitute — the CPPA requires § 7152(a)(1)–(9) elements whether or not a prior assessment exists. However, cross-referencing reduces duplication and speeds completion.",
    regulationText: "A business may satisfy the requirements of section 7152 by cross-referencing an existing risk assessment… provided that any such existing risk assessment addresses the requirements of this Article and the business identifies the portions of that risk assessment addressing each of the requirements of section 7152.",
    fscrContext: "Commenters argued that an existing GDPR DPIA should substitute entirely for the CPPA risk assessment. The Agency rejected full substitution but confirmed in the FSOR that cross-referencing is permitted under § 7156(b) where the prior assessment covers the required elements, reducing the compliance burden without compromising the assessment's integrity.",
    coachLead: "Name the assessment, its date, and what it covered.",
    coachBody: "If a GDPR DPIA or other risk assessment exists for this processing, identify it by title and date and state the scope it examined and where that scope ends; § 7156(b) lets a conforming existing assessment carry part of this work.",
    goodAnswer: "\u201CDPIA \u2018Applicant scoring v2\u2019, completed November 2025, covering the EU hiring flow; the US expansion is out of its scope.\u201D — the record, its date, its coverage, and its edges.",
    commonMistake: "Citing a privacy policy or a vendor certification as a prior assessment. § 7156(b) concerns your documented risk assessment of this processing.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CCPA "business purposes" (Civ. Code § 1798.140(e)) and statutory
  // exemptions (Civ. Code § 1798.145). These are NOT § 7152 exceptions — the
  // CCPA does not exempt these activities from a risk assessment when a
  // § 7150 trigger applies. They define permitted internal uses or carve
  // out specific obligations (e.g., HR data, legal compliance).
  // ──────────────────────────────────────────────────────────────────────────

  exc_fraud_detection: {
    fieldLabel: "Business purpose: Fraud prevention / detection",
    citation: "Cal. Civ. Code § 1798.140(e)(2)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.",
    plainSummary: "Detecting security incidents, protecting against malicious, deceptive, fraudulent, or illegal activity, and prosecuting those responsible is an enumerated CCPA \"business purpose.\" It permits service providers/contractors to use personal information for this purpose and supports a § 1798.121 limit-use carve-out for sensitive PI — but it does NOT remove a § 7150 risk-assessment trigger. If you sell/share, process sensitive PI, or use ADMT, you must still conduct the assessment.",
    regulationText: "Helping to ensure security and integrity to the extent the use of the consumer's personal information is reasonably necessary and proportionate for these purposes. Detecting security incidents, protecting against malicious, deceptive, fraudulent, or illegal actions directed at the business, and prosecuting those responsible for those actions.",
    enforcementNote: "Common error: treating fraud-detection as a blanket exemption. The CPPA's enforcement posture treats it as a permitted purpose with a proportionality test — over-collection or secondary use beyond fraud will not qualify.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.121(d)", label: "Sensitive PI limit-use carve-out" },
      { citation: "11 CCR § 7150", label: "Risk assessment triggers (not removed)" },
    ],
  },

  exc_security_integrity: {
    fieldLabel: "Business purpose: Security & integrity of systems and data",
    citation: "Cal. Civ. Code § 1798.140(e)(2)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.",
    plainSummary: "Maintaining the security and integrity of information and the systems that process it is an enumerated business purpose. Like fraud detection, it permits the use but does NOT exempt the activity from risk-assessment scope when a § 7150 trigger fires.",
    regulationText: "Helping to ensure security and integrity to the extent the use of the consumer's personal information is reasonably necessary and proportionate for these purposes. Resisting malicious, deceptive, fraudulent, or illegal actions directed at the business and helping to prosecute those responsible for those actions.",
    enforcementNote: "The \"reasonably necessary and proportionate\" qualifier is doing real work. Logging an entire session keystroke-by-keystroke for security purposes will not qualify; targeted, time-boxed retention will.",
  },

  exc_debugging: {
    fieldLabel: "Business purpose: Debugging to identify and repair errors",
    citation: "Cal. Civ. Code § 1798.140(e)(3)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.",
    plainSummary: "Debugging to identify and repair errors that impair existing intended functionality is a permitted business purpose. It does not authorize using debug data for product development, analytics, or model training, and it does not remove a § 7150 trigger when one applies.",
    regulationText: "Debugging to identify and repair errors that impair existing intended functionality.",
  },

  exc_transient_use: {
    fieldLabel: "Business purpose: Transient / short-term use",
    citation: "Cal. Civ. Code § 1798.140(e)(4)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.",
    plainSummary: "Short-term, transient use — including non-personalized advertising shown as part of a consumer's current interaction — where the personal information is not disclosed to another third party and is not used to build a profile or otherwise alter the consumer's experience outside that current interaction. Strict conditions; rarely satisfied for tracked sessions.",
    regulationText: "Short-term, transient use, including, but not limited to, nonpersonalized advertising shown as part of a consumer's current interaction with the business, provided that the consumer's personal information is not disclosed to another third party and is not used to build a profile about the consumer or otherwise alter the consumer's experience outside the current interaction with the business.",
    enforcementNote: "If any of (a) disclosure to a third party, (b) profile building, or (c) cross-session experience changes occurs, the transient-use carve-out is lost.",
  },

  exc_internal_research: {
    fieldLabel: "Business purpose: Internal research for technological development",
    citation: "Cal. Civ. Code § 1798.140(e)(8)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.",
    plainSummary: "Undertaking internal research for technological development and demonstration is an enumerated business purpose. Note: training ADMT/AI systems on personal information almost always implicates § 7150(b) triggers regardless of this purpose — a risk assessment is still required.",
    regulationText: "Undertaking internal research for technological development and demonstration.",
  },

  exc_employment_context: {
    fieldLabel: "Exemption: Employment-context processing",
    citation: "Cal. Civ. Code § 1798.145(m)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.145.",
    plainSummary: "The CCPA's employee/applicant/contractor exemption expired January 1, 2023. HR and B2B data are now fully in scope. The original § 1798.145(m) carve-out remains only for emergency-contact and benefits-administration disclosures to third parties — it does NOT remove HR processing from risk-assessment scope.",
    regulationText: "This title shall not apply to personal information collected by a business about a natural person in the course of the natural person acting as a job applicant to, an employee of, owner of, director of, officer of, medical staff member of, or contractor of that business to the extent that the natural person's personal information is collected and used by the business solely within the context of having an emergency contact on file for the natural person, or administering specified benefits.",
    enforcementNote: "Common error: treating all HR data as exempt. Post-AB 1184 / AB 1281 sunset, employee and applicant data are subject to the full CCPA, including risk assessments where § 7150 triggers apply (e.g., ADMT in hiring).",
  },

  exc_legal_compliance: {
    fieldLabel: "Exemption: Compliance with a legal obligation",
    citation: "Cal. Civ. Code § 1798.145(a)(1)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.145.",
    plainSummary: "The CCPA does not restrict a business's ability to comply with federal, state, or local laws, or to comply with a court order or subpoena. This is a narrow carve-out for the specific compelled disclosure — it does NOT exempt the underlying processing activity (e.g., the AML monitoring program itself) from a risk assessment when a § 7150 trigger applies.",
    regulationText: "The obligations imposed on businesses by this title shall not restrict a business's ability to: (1) Comply with federal, state, or local laws or comply with a court order or subpoena to provide information.",
  },

  exc_consumer_request: {
    fieldLabel: "Business purpose: Performing a service the consumer requested",
    citation: "Cal. Civ. Code § 1798.140(e)(1)",
    citationUrl: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.",
    plainSummary: "Auditing related to counting ad impressions, verifying positioning and quality of ad impressions, and auditing compliance with this and other specifications — together with performing services on behalf of the business or service provider — is an enumerated business purpose. It permits service-provider arrangements and supports primary-purpose use, but does not remove a § 7150 trigger.",
    regulationText: "Performing services on behalf of the business or service provider, including maintaining or servicing accounts, providing customer service, processing or fulfilling orders and transactions, verifying customer information, processing payments, providing financing, providing analytic services, providing storage, or providing similar services on behalf of the business or service provider.",
  },

  q5b_profiling: {
    fieldLabel: "Q5b: Profiling via systematic observation / sensitive location",
    citation: "11 CCR § 7150(b)(4)",
    citationUrl: CPPA_URL,
    plainSummary: "A risk assessment is independently required where a business profiles consumers acting as job applicants, employees, students, or independent contractors based on systematic observation, or profiles consumers based on their presence in a sensitive location. This is separate from selling/sharing or ADMT use.",
    regulationText: "Processing the personal information of consumers to profile them while they are acting in their capacity as a job applicant, student, employee, or independent contractor, where the profiling is based on the consumer's systematic observation; or to profile a consumer based on their presence in a sensitive location.",
    relatedCitations: [
      { citation: "11 CCR § 7001(ii)", label: "'Profiling' definition" },
      { citation: "11 CCR § 7001", label: "'Sensitive location' / 'systematic observation'" },
    ],
  },

  q15b_under16: {
    fieldLabel: "Q15b: Actual knowledge of under-16 processing",
    citation: "11 CCR § 7001(bbb)",
    citationUrl: CPPA_URL,
    plainSummary: "The 2026 regulations make all personal information of a consumer under 16 sensitive personal information where the business has actual knowledge of the consumer's age. Requesting age, or willfully disregarding it, is treated as actual knowledge. Processing under-16 data therefore engages the sensitive-PI risk-assessment trigger.",
    regulationText: "'Sensitive personal information' includes the personal information of consumers that the business has actual knowledge are less than 16 years of age. A business that willfully disregards the consumer's age shall be deemed to have had actual knowledge of the consumer's age.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.140(ae)", label: "Sensitive PI definition" },
      { citation: "11 CCR § 7070", label: "Consumers under 13" },
    ],
  },

  q18b_admt_training: {
    fieldLabel: "Q21: Training ADMT / facial / emotion / biometric",
    citation: "11 CCR § 7150(b)(5)",
    citationUrl: CPPA_URL,
    plainSummary: "Processing personal information to train automated decisionmaking technology for significant decisions, or to train facial-recognition, emotion-recognition, identity-verification, or physical/biological-identification or profiling technology, independently requires a risk assessment — separate from deploying ADMT against consumers.",
    regulationText: "Processing the personal information of consumers to train automated decisionmaking technology that is capable of being used for a significant decision concerning a consumer, or to train facial-recognition, emotion-recognition, or other technology used to verify a consumer's identity or to conduct physical or biological identification or profiling of a consumer.",
    relatedCitations: [
      { citation: "11 CCR § 7150(b)(3)", label: "Using ADMT for significant decisions" },
      { citation: "11 CCR § 7001(e)", label: "'ADMT' definition" },
    ],
  },

  i1b_min_pi: {
    fieldLabel: "I-1b: Minimum PI necessary",
    citation: "11 CCR § 7152(a)(2)",
    citationUrl: CPPA_URL,
    plainSummary: "The risk assessment must identify the minimum personal information necessary to achieve the processing purpose. This reflects the CCPA's data-minimisation requirement: a business may only collect and process what is reasonably necessary and proportionate to the disclosed purpose.",
    regulationText: "The categories of personal information processed, including… the minimum personal information that is necessary to achieve the purpose identified in subsection (a)(1).",
    coachLead: "List the categories this purpose actually requires — and stop there.",
    coachBody:
      "Name each category of personal information the stated purpose needs. If a category is collected but not needed for THIS purpose, it belongs in a different assessment, not this list.",
    goodAnswer:
      "\u201CR\u00E9sum\u00E9 text, work history, education records. Not collected for this purpose: references, social profiles.\u201D — what's in, and explicitly what's out.",
    commonMistake:
      "Listing everything the company collects. Minimum necessary is tested against the single stated purpose, not the whole data estate.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.100(c)", label: "Reasonably necessary & proportionate" },
      { citation: "11 CCR § 7002", label: "Restrictions on collection and use" },
    ],
  },

  i4b_sources: {
    fieldLabel: "I-4b: Sources of the personal information",
    citation: "11 CCR § 7152(a)(3)",
    citationUrl: CPPA_URL,
    plainSummary: "The operational elements of the processing must identify the sources of the personal information — for example collected directly from the consumer, passively observed, generated or inferred by the business, or obtained from third parties such as data brokers, advertising partners, or affiliates.",
    regulationText: "The operational elements of the processing, including… the sources of the personal information and the business's planned method for collecting, using, disclosing, retaining, or otherwise processing the personal information.",
    coachLead: "Name each source and how the data arrives.",
    coachBody: "For every category, say where it comes from — the consumer directly, a named class of third party, a public source, or your own systems — and the mechanism (form, SDK, purchase, inference).",
    goodAnswer: "\u201CContact data from the signup form; device signals from our mobile SDK; prior-tenancy records purchased from a screening bureau.\u201D — each source named with its channel.",
    commonMistake: "Listing the categories again instead of their origins. § 7152(a)(3) asks where the information comes from, not what it is.",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(3)(E)", label: "Disclosures to consumers" },
      { citation: "11 CCR § 7152(a)(3)(F)", label: "Recipients of the PI" },
    ],
  },

  i6_recipients: {
    fieldLabel: "I-6: Recipients of the personal information",
    citation: "11 CCR § 7152(a)(3)(F)",
    citationUrl: CPPA_URL,
    plainSummary: "The assessment must identify the recipients of the personal information and the purpose of each disclosure. The recipient's category matters: a service provider or contractor is bound by contract to the business's purposes, whereas disclosure to a third party for its own use is a sale or share that carries opt-out and additional assessment obligations.",
    regulationText: "The operational elements of the processing, including… the names or categories of the recipients to whom the business discloses or makes available the personal information, and the purpose for which the personal information is disclosed or made available.",
    relatedCitations: [
      { citation: "Cal. Civ. Code § 1798.140(ah)", label: "'Share' definition" },
      { citation: "11 CCR § 7051", label: "Service provider / contractor contracts" },
    ],
  },

  impact_benefits: {
    fieldLabel: "Benefits of the processing",
    citation: "11 CCR § 7152(a)(4)",
    citationUrl: CPPA_URL,
    plainSummary: "The assessment must identify the benefits of the processing to the business, the consumer, other stakeholders, and the public, as applicable. Benefits must be described specifically — generic descriptions are not permitted — and are weighed against the negative impacts to reach the risk/benefit determination.",
    regulationText: "The benefits resulting from the processing to the business, the consumer, other stakeholders, and the public, as applicable. A business shall not describe the benefits in generic terms.",
    coachLead: "Separate who gains what — the business, the consumer, others.",
    coachBody: "§ 7152(a)(4) weighs benefits by beneficiary. State each group's concrete gain separately, with the mechanism that produces it; a merged everyone-wins paragraph weighs nothing.",
    goodAnswer: "\u201CBusiness: fewer fraudulent signups reach onboarding; consumers: legitimate applications clear same-day; other users: fewer scam listings surface.\u201D — one concrete gain per beneficiary, each with its mechanism.",
    commonMistake: "Restating the purpose as the benefit. The purpose says what the processing does; this section says what good comes of it, and for whom.",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(5)", label: "Negative impacts" },
      { citation: "11 CCR § 7154", label: "Goal of a risk assessment" },
    ],
  },

  impact_safeguards: {
    fieldLabel: "Safeguards for the processing",
    citation: "11 CCR § 7152(a)",
    citationUrl: CPPA_URL,
    plainSummary: "The assessment must identify the safeguards the business plans to implement to address the negative impacts of the processing. The regulations give examples including encryption, access controls, network monitoring, privacy-enhancing technologies, de-identification, and policies and training.",
    regulationText: "The safeguards that the business plans to implement to address the negative impacts… Examples of safeguards include, but are not limited to, encryption; the segmentation of personal information; access controls; privacy-enhancing technologies; and policies, procedures, and training.",
    coachLead: "Name each safeguard and the specific harm it blunts.",
    coachBody: "List the concrete measures — technical, organisational, contractual — and pair each with the negative impact it addresses. An unpaired safeguard list reads as boilerplate and maps to nothing.",
    goodAnswer: "\u201CScores expire after 90 days (limits stale-data decisions); a reviewer confirms every adverse outcome (catches model error); access is limited to three named analysts (limits exposure).\u201D — each control tied to the harm it reduces.",
    commonMistake: "Citing company-level certifications as safeguards for this processing. The section asks what protects these consumers from these impacts, not how the company is audited.",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(5)", label: "Negative impacts addressed" },
      { citation: "11 CCR § 7123", label: "Cybersecurity audit safeguards" },
    ],
  },

  impact_harm_causes: {
    fieldLabel: "Negative impacts — sources and causes",
    citation: "11 CCR § 7152(a)(5)",
    citationUrl: CPPA_URL,
    plainSummary: "The assessment must identify the negative impacts to consumers' privacy associated with the processing, including the sources and causes of those impacts. The regulations enumerate examples: unauthorised access, destruction, use, modification or disclosure; loss of availability; unlawful discrimination; impairment of control; coercion or dark patterns; and economic, physical, reputational, and psychological harms.",
    regulationText: "The negative impacts to consumers' privacy associated with the processing, including the sources and causes of the negative impacts. Negative impacts include, but are not limited to: unauthorized access, destruction, use, modification, or disclosure of personal information; unlawful discrimination; impairment of consumers' control over their personal information; economic, physical, psychological, or reputational harms; and coercion or the use of dark patterns.",
    coachLead: "Trace each negative impact to its source in the processing.",
    coachBody: "For every harm identified, state what in the processing could produce it — the data, the operation, or the failure mode — so the safeguard mapping has something to attach to.",
    goodAnswer: "\u201CWrongful denial from stale bureau data; exposure of address history if the screening vendor is breached.\u201D — each harm with the mechanism that would cause it.",
    commonMistake: "Listing harm categories without causes. The § 7152(a)(5) analysis runs cause → impact → safeguard; a bare category breaks the chain.",
    relatedCitations: [
      { citation: "11 CCR § 7152(a)(4)", label: "Benefits weighed against impacts" },
      { citation: "11 CCR § 7002", label: "Dark patterns / restrictions on use" },
    ],
  },
};
