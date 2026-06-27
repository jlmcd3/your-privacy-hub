// src/components/cppa/CPPAScopeRailEntries.ts
// StatuteRail entries for the CPPA Scope Checker (free deterministic tool).
// Citations verified against Cal. Civ. Code § 1798.140 and 11 CCR §§ 7120, 7150–7152.

import type { RailEntry } from "@/components/intake/StatuteRail";

const CCPA_URL = "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5";
const CPPA_REGS_URL = "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf";
const DATA_BROKER_URL = "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22757";

export const CPPA_SCOPE_RAIL: Record<string, RailEntry> = {
  q1_california_nexus: {
    fieldLabel: "Q1: California nexus",
    citation: "Cal. Civ. Code § 1798.140(ag)",
    citationUrl: CCPA_URL,
    plainSummary:
      "CCPA/CPRA applies to for-profit entities that do business in California or collect personal information of California residents. 'Doing business in California' is a deliberately broad concept that includes any meaningful commercial engagement with the state.",
    regulationText:
      '"Business" means a sole proprietorship, partnership, limited liability company, corporation, association, or other legal entity that is organized or operated for the profit or financial benefit of its shareholders or other owners, that collects consumers\' personal information, or on the behalf of which that information is collected and that alone, or jointly with others, determines the purposes and means of the processing of consumers\' personal information, and that does business in the State of California…',
  },

  q2_revenue: {
    fieldLabel: "Q2: Annual gross revenue",
    citation: "Cal. Civ. Code § 1798.140(ag)(1)(A)",
    citationUrl: CCPA_URL,
    plainSummary:
      "The $25 million annual gross revenue threshold is one of three independent paths to becoming a covered 'business'. It is based on worldwide gross revenue in the preceding calendar year — not California-specific revenue.",
    regulationText:
      "Has annual gross revenues in excess of twenty-five million dollars ($25,000,000), as adjusted pursuant to paragraph (5) of subdivision (a) of Section 1798.185, in the preceding calendar year.",
    enforcementNote:
      "The CPPA has confirmed in rulemaking that 'annual gross revenues' is computed on a global, not California-only, basis. Misjudging this is one of the most common scoping errors.",
  },

  q3_consumer_volume: {
    fieldLabel: "Q3: Volume of California consumers processed",
    citation: "Cal. Civ. Code § 1798.140(ag)(1)(B)",
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
      "Selling personal information, or sharing PI for cross-context behavioural advertising, triggers consumer opt-out rights, a mandatory 'Do Not Sell or Share' link, and counts toward the risk-assessment triggers in 11 CCR § 7150(b).",
    regulationText:
      "A consumer shall have the right, at any time, to direct a business that sells or shares personal information about the consumer to third parties not to sell or share the consumer's personal information.",
    enforcementNote:
      "The CPPA's first enforcement settlements (Honda, Tilting Point, DoorDash via the AG) all centred on sell/share mechanics — broken opt-out links, missing GPC handling, and failure to flow consumer opt-outs to ad-tech partners.",
  },

  q5_50pct_revenue: {
    fieldLabel: "Q5: 50% revenue from selling/sharing PI",
    citation: "Cal. Civ. Code § 1798.140(ag)(1)(C)",
    citationUrl: CCPA_URL,
    plainSummary:
      "The third independent path to coverage: any business that derives 50% or more of annual revenue from selling or sharing personal information is a covered 'business' regardless of revenue or consumer count. This sweeps in many ad-tech and data-broker entities.",
    regulationText:
      "Derives 50 percent or more of its annual revenues from selling or sharing consumers' personal information.",
  },

  q6_sensitive_pi: {
    fieldLabel: "Q6: Sensitive personal information",
    citation: "Cal. Civ. Code § 1798.140(ae); 11 CCR § 7152(a)(5)",
    citationUrl: CCPA_URL,
    plainSummary:
      "Processing sensitive personal information — health data, precise geolocation, racial or ethnic origin, religious beliefs, union membership, biometric data, genetic data, sexual orientation, or citizenship/immigration status — triggers the consumer Right to Limit and is an independent trigger for a CCPA risk assessment under § 7152(a)(5).",
    regulationText:
      '"Sensitive personal information" means: (1) Personal information that reveals: (A) A consumer\'s social security, driver\'s license, state identification card, or passport number… (B) A consumer\'s account log-in… (C) A consumer\'s precise geolocation… (D) A consumer\'s racial or ethnic origin, religious or philosophical beliefs, or union membership… (E) The contents of a consumer\'s mail, email, and text messages… (F) A consumer\'s genetic data; and (2)(A) The processing of biometric information for the purpose of uniquely identifying a consumer…',
  },

  q7_admt: {
    fieldLabel: "Q7: Automated decision-making technology (ADMT)",
    citation: "11 CCR §§ 7001(e), 7001(ddd), 7150(b)(3)",
    citationUrl: CPPA_REGS_URL,
    plainSummary:
      "Using ADMT to make, or substantially replace human decision-making for, decisions producing significant effects on consumers (employment, credit, housing, insurance, healthcare access, education, essential goods/services) triggers the CPPA ADMT regulations: pre-use notice, opt-out, access rights, and a § 7150(b)(3) risk assessment.",
    regulationText:
      '"Automated decision-making technology" or "ADMT" means any technology that processes personal information and uses computation to replace human decision-making or substantially replace human decision-making… "Significant decision" means a decision that results in the provision or denial by the business of financial or lending services, housing, insurance, education enrollment or opportunity, criminal justice, employment or independent contracting opportunities or compensation, healthcare services, or essential goods or services.',
    enforcementNote:
      "The ADMT regulations took effect January 1, 2027 with a phased compliance window — pre-use notices and opt-out by 2027; full risk-assessment compliance by 2028. Early reviews are expected to focus on hiring and credit ADMT.",
  },

  q8_data_broker: {
    fieldLabel: "Q8: Data broker registration",
    citation: "Cal. Bus. & Prof. Code § 22757",
    citationUrl: DATA_BROKER_URL,
    plainSummary:
      "A 'data broker' is a business that knowingly collects and sells the personal information of consumers with whom it does not have a direct relationship. Data brokers must register annually with the CPPA, pay a fee, and comply with the DELETE Act's consumer-initiated deletion mechanism (operational by August 2026).",
    regulationText:
      '"Data broker" means a business that knowingly collects and sells to third parties the personal information of a consumer with whom the business does not have a direct relationship. "Data broker" does not include any of the following: (1) A consumer reporting agency… (2) A financial institution… (3) An entity covered by the Insurance Information and Privacy Protection Act.',
    enforcementNote:
      "The CPPA took over the data broker registry from the AG on January 1, 2024. Failure to register carries administrative fines of $200 per day plus expenses. The DELETE Act consumer portal is on track for an August 2026 launch.",
  },
};
