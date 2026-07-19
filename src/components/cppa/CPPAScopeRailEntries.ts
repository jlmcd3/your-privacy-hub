// src/components/cppa/CPPAScopeRailEntries.ts
// StatuteRail entries for the CPPA Scope Checker (free deterministic tool).
// Citations verified against Cal. Civ. Code § 1798.140, the CPPA CPI-adjustment
// table (https://cppa.ca.gov/regulations/cpi_adjustment.html), 11 CCR
// §§ 7120–7123, § 7150, and the Delete Act (Cal. Civ. Code §§ 1798.99.80 et seq.).

import type { RailEntry } from "@/components/intake/StatuteRail";

const CCPA_URL = "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5";
const CPPA_REGS_URL = "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf";
const CPI_URL = "https://cppa.ca.gov/regulations/cpi_adjustment.html";
const DELETE_ACT_URL = "https://cppa.ca.gov/data_brokers/";

export const CPPA_SCOPE_RAIL: Record<string, RailEntry> = {
  q1_california_nexus: {
    fieldLabel: "Q1: California nexus",
    citation: "Cal. Civ. Code § 1798.140(d)",
    citationUrl: CCPA_URL,
    plainSummary:
      "CCPA/CPRA applies to for-profit entities that do business in California or collect personal information of California residents. 'Doing business in California' is a deliberately broad concept that includes any meaningful commercial engagement with the state.",
    regulationText:
      '"Business" means a sole proprietorship, partnership, limited liability company, corporation, association, or other legal entity that is organized or operated for the profit or financial benefit of its shareholders or other owners, that collects consumers\' personal information, or on the behalf of which that information is collected and that alone, or jointly with others, determines the purposes and means of the processing of consumers\' personal information, and that does business in the State of California…',
  },

  q2_revenue: {
    fieldLabel: "Q2: Annual gross revenue",
    citation: "Cal. Civ. Code § 1798.140(d)(1)(A)",
    citationUrl: CPI_URL,
    plainSummary:
      "The CPI-adjusted annual gross revenue threshold is $26,625,000 (effective 2025-01-01, per the CPPA's biennial CPI adjustment table). It is one of three independent paths to becoming a covered 'business' and is based on worldwide gross revenue in the preceding calendar year — not California-specific revenue.",
    regulationText:
      "As adjusted by the CPPA under Civil Code § 1798.199.95(d): the annual gross revenue threshold in § 1798.140(d)(1)(A) is $26,625,000 for calendar years starting 2025-01-01.",
    enforcementNote:
      "Every odd-numbered year, § 1798.199.95(d) requires the CPPA to adjust monetary thresholds for CPI. The most recent adjustment (posted 2024-12-17) raised the revenue prong from $25,000,000 to $26,625,000.",
  },

  q3_consumer_volume: {
    fieldLabel: "Q3: Volume of California consumers processed",
    citation: "Cal. Civ. Code § 1798.140(d)(1)(B)",
    citationUrl: CCPA_URL,
    plainSummary:
      "A business is covered if it annually buys, sells, shares, or receives for commercial purposes the personal information of 100,000+ California consumers or households — regardless of revenue.",
    regulationText:
      "Alone or in combination, annually buys, sells, or shares the personal information of 100,000 or more consumers or households.",
  },

  q4_sell_share: {
    fieldLabel: "Q4: Selling or sharing PI",
    citation: "Cal. Civ. Code § 1798.120; 11 CCR § 7150(b)(1)",
    citationUrl: CPPA_REGS_URL,
    plainSummary:
      "Selling personal information, or sharing PI for cross-context behavioural advertising, triggers consumer opt-out rights, a mandatory 'Do Not Sell or Share' link, and is a § 7150(b)(1) trigger for a risk assessment.",
    regulationText:
      "A consumer shall have the right, at any time, to direct a business that sells or shares personal information about the consumer to third parties not to sell or share the consumer's personal information.",
    enforcementNote:
      "The CPPA's first enforcement settlements (Honda, Tilting Point, DoorDash via the AG) all centred on sell/share mechanics — broken opt-out links, missing GPC handling, and failure to flow consumer opt-outs to ad-tech partners.",
  },

  q5_50pct_revenue: {
    fieldLabel: "Q5: 50% revenue from selling/sharing PI",
    citation: "Cal. Civ. Code § 1798.140(d)(1)(C)",
    citationUrl: CCPA_URL,
    plainSummary:
      "The third independent path to coverage: any business that derives 50% or more of annual revenue from selling or sharing personal information is a covered 'business' regardless of revenue or consumer count. This sweeps in many ad-tech and data-broker entities.",
    regulationText:
      "Derives 50 percent or more of its annual revenues from selling or sharing consumers' personal information.",
  },

  q6_sensitive_pi: {
    fieldLabel: "Q6: Sensitive personal information",
    citation: "Cal. Civ. Code § 1798.140(ae); 11 CCR § 7150(b)(2)",
    citationUrl: CCPA_URL,
    plainSummary:
      "Processing sensitive personal information — health data, precise geolocation, racial or ethnic origin, religious beliefs, union membership, biometric data, genetic data, sexual orientation, or citizenship/immigration status — triggers the consumer Right to Limit and is an independent § 7150(b)(2) trigger for a risk assessment.",
    regulationText:
      '"Sensitive personal information" means: (1) Personal information that reveals: (A) A consumer\'s social security, driver\'s license, state identification card, or passport number… (B) A consumer\'s account log-in… (C) A consumer\'s precise geolocation… (D) A consumer\'s racial or ethnic origin, religious or philosophical beliefs, or union membership… (E) The contents of a consumer\'s mail, email, and text messages… (F) A consumer\'s genetic data; and (2)(A) The processing of biometric information for the purpose of uniquely identifying a consumer…',
  },

  q7_admt: {
    fieldLabel: "Q7: Automated decision-making technology (ADMT)",
    citation: "11 CCR §§ 7001(e), 7150(b)(3)",
    citationUrl: CPPA_REGS_URL,
    plainSummary:
      "Using ADMT to make, or substantially replace human decision-making for, a significant decision about a consumer (employment, credit, housing, insurance, healthcare access, education, essential goods/services) triggers ADMT pre-use notice, opt-out, access rights, and a § 7150(b)(3) risk assessment.",
    regulationText:
      '"Automated decision-making technology" or "ADMT" means any technology that processes personal information and uses computation to replace human decision-making or substantially replace human decision-making. "Significant decision" means a decision that results in the provision or denial by the business of financial or lending services, housing, insurance, education enrollment or opportunity, criminal justice, employment or independent contracting opportunities or compensation, healthcare services, or essential goods or services.',
    enforcementNote:
      "ADMT pre-use notice and opt-out obligations attach as the § 7000-series ADMT regulations take effect. Early reviews are expected to focus on hiring and credit ADMT.",
  },

  q9_processing_250k: {
    fieldLabel: "Q9: ≥250,000 consumers/households processed (§ 7120(b)(1))",
    citation: "11 CCR § 7120(b)(1)",
    citationUrl: CPPA_REGS_URL,
    plainSummary:
      "A business whose processing of consumers' personal information presents significant risk to consumers' security — one path is processing the PI of ≥250,000 California consumers or households in the preceding calendar year — must complete an annual cybersecurity audit.",
    regulationText:
      "Section 7120(b) sets the § 7120 audit scope thresholds; one prong reaches businesses that processed the personal information of 250,000 or more consumers or households in the preceding calendar year.",
  },

  q10_processing_spi_50k: {
    fieldLabel: "Q10: ≥50,000 SPI consumers processed (§ 7120(b)(2))",
    citation: "11 CCR § 7120(b)(2)",
    citationUrl: CPPA_REGS_URL,
    plainSummary:
      "A separate § 7120(b) prong reaches businesses that processed the sensitive personal information of 50,000 or more California consumers in the preceding calendar year — an independent basis for the annual cybersecurity audit.",
    regulationText:
      "Section 7120(b) reaches businesses that processed the sensitive personal information of 50,000 or more consumers in the preceding calendar year.",
  },

  q8a_data_broker_definition: {
    fieldLabel: "Q8a: Meets data-broker definition (Delete Act)",
    citation: "Cal. Civ. Code § 1798.99.80(d)",
    citationUrl: DELETE_ACT_URL,
    plainSummary:
      "A 'data broker' under the Delete Act is a business that knowingly collects and sells to third parties the personal information of a consumer with whom the business does not have a direct relationship. Meeting the definition is a factual question separate from whether the business has registered.",
    regulationText:
      '"Data broker" means a business that knowingly collects and sells to third parties the personal information of a consumer with whom the business does not have a direct relationship. "Data broker" does not include any of the following: (1) A consumer reporting agency… (2) A financial institution… (3) An entity covered by the Insurance Information and Privacy Protection Act.',
  },

  q8b_data_broker_registered: {
    fieldLabel: "Q8b: Registered with CPPA (Delete Act)",
    citation: "Cal. Civ. Code §§ 1798.99.80–1798.99.89",
    citationUrl: DELETE_ACT_URL,
    plainSummary:
      "Registration is a separate compliance obligation for businesses that meet the data-broker definition. The California Privacy Protection Agency operates the Delete Act data-broker registry; failure to register carries administrative fines for each day of unregistered activity. Registration status does not itself determine general CCPA/CPRA applicability.",
    regulationText:
      "Under the Delete Act (Cal. Civ. Code §§ 1798.99.80–1798.99.89), data brokers must register annually with the California Privacy Protection Agency, pay a fee, and comply with the Delete Act's consumer-initiated deletion mechanism.",
    enforcementNote:
      "The CPPA operates the data-broker registry at cppa.ca.gov/data_brokers. The Delete Act consumer deletion portal is on track for its statutory launch window.",
  },
};
