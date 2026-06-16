// src/components/cppa/CPPARiskRailEntries.ts
// StatuteRail entries for the CPPA Risk Assessment (Module 1).
// Citations verified against the codebase. Plain summaries written for compliance professionals.
// Regulation text: verbatim from 11 CCR §§ 7150–7157 and Cal. Civ. Code §§ 1798.100–1798.140.

import type { RailEntry } from "@/components/admt/StatuteRail";

const CPPA_URL = "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf";

export const CPPA_RISK_RAIL: Record<string, RailEntry> = {
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
  },
};
