export interface TermDefinition {
  term: string;
  definition: string;
  cite: string;
  ukNote?: string;
}

export const DEFINITIONS: Record<string, TermDefinition> = {
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
    definition: "Technology that processes personal information and uses computation to replace, or substantially replace, human decisionmaking, as defined in the CPPA's 2025 regulations. (summary)",
    cite: "11 CCR § 7001",
  },
};

export type DefinitionKey = keyof typeof DEFINITIONS;
