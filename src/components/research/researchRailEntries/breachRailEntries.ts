// Section reference entries for /breach-notification.
// Section ids must match those declared in BreachNotification.tsx.

import type { RailEntry } from "@/components/admt/StatuteRail";

const GDPR_URL = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679";
const HHS_URL = "https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html";
const CCPA_URL = "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5";
const SEC_URL = "https://www.sec.gov/news/press-release/2023-139";

export const BREACH_SECTION_RAIL: Record<string, RailEntry> = {
  gdpr: {
    fieldLabel: "GDPR breach notification — Articles 33 & 34",
    citation: "GDPR Art. 33; Art. 34",
    citationUrl: GDPR_URL,
    plainSummary:
      "Controllers must notify the lead supervisory authority within 72 hours of becoming aware of a personal data breach, unless it is unlikely to result in a risk to data subjects. Where the breach is likely to result in a 'high risk', controllers must also communicate the breach directly to affected individuals without undue delay. Processors must notify controllers without undue delay.",
    regulationText:
      "Art. 33(1): In the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the personal data breach to the supervisory authority competent in accordance with Article 55, unless the personal data breach is unlikely to result in a risk to the rights and freedoms of natural persons.\n\nArt. 34(1): When the personal data breach is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall communicate the personal data breach to the data subject without undue delay.",
    enforcementNote:
      "The 72-hour clock starts when the controller has a reasonable degree of certainty that a breach has occurred — not when investigation completes. The ICO's £20M British Airways fine and the DPC's €265M Meta scraping fine both turned heavily on the adequacy and timing of breach notification.",
  },

  "us-states": {
    fieldLabel: "U.S. state breach notification laws",
    citation: "Cal. Civ. Code § 1798.82; 1798.150 (PRA)",
    citationUrl: CCPA_URL,
    plainSummary:
      "All 50 states, D.C., and U.S. territories have breach notification laws. Most use an unauthorised 'acquisition' trigger; California and Florida use the broader 'access' trigger. Timing varies from 'without unreasonable delay' to fixed 30/45/60-day windows. California's CCPA also creates a private right of action with statutory damages of $100–$750 per consumer per incident for breaches resulting from failure to implement reasonable security.",
    regulationText:
      "Cal. Civ. Code § 1798.82(a): A person or business that conducts business in California, and that owns or licenses computerized data that includes personal information, shall disclose a breach of the security of the system following discovery or notification of the breach in the security of the data to a resident of California whose unencrypted personal information was, or is reasonably believed to have been, acquired by an unauthorized person.\n\n§ 1798.150(a)(1): Any consumer whose nonencrypted and nonredacted personal information… is subject to an unauthorized access and exfiltration, theft, or disclosure as a result of the business's violation of the duty to implement and maintain reasonable security procedures and practices… may institute a civil action.",
    enforcementNote:
      "The California AG's enforcement settlements with Sephora, DoorDash, and Tilting Point repeatedly cited breach-response and notification deficiencies as aggravating factors even where the underlying fine was framed around sell/share.",
  },

  sector: {
    fieldLabel: "Sector-specific U.S. breach requirements",
    citation: "45 CFR §§ 164.400–414 (HIPAA); 17 CFR § 229.106 (SEC)",
    citationUrl: HHS_URL,
    plainSummary:
      "Sector regulators layer additional breach duties on top of state law. HIPAA's Breach Notification Rule requires covered entities to notify HHS, affected individuals, and (for breaches of 500+) prominent media within 60 days. The federal banking agencies' Interagency Guidance requires notification within 36 hours for incidents impacting services. SEC Reg S-K Item 1.05 requires Form 8-K disclosure of material cybersecurity incidents within 4 business days of materiality determination.",
    regulationText:
      "45 CFR § 164.404(b): Except as provided in § 164.412, a covered entity shall provide the notification required by paragraph (a) of this section without unreasonable delay and in no case later than 60 calendar days after discovery of a breach.\n\n17 CFR § 229.106(b)(1): Disclose any cybersecurity incident… within four business days after the registrant determines that it has experienced a material cybersecurity incident.",
    enforcementNote:
      "The SEC's 2023 cybersecurity rule has driven a sharp increase in same-month 8-K cybersecurity disclosures. Several enforcement actions (Pearson, First American, SolarWinds) have flowed from inadequate or misleading prior cyber disclosures rather than the underlying breach itself.",
  },

  international: {
    fieldLabel: "International breach notification regimes",
    citation: "UK GDPR Art. 33; PIPEDA s.10.1; NDB Pt IIIC",
    citationUrl: "https://www.legislation.gov.uk/eur/2016/679/contents",
    plainSummary:
      "Outside the EU, the threshold and clock vary considerably. The UK mirrors EU GDPR's 72-hour rule. Canada's PIPEDA uses a 'real risk of significant harm' threshold. Australia's NDB scheme grants a 30-day assessment period before the obligation crystallises. Brazil's LGPD requires notification within a 'reasonable time' (ANPD-recommended 2 business days). China's PIPL is the most demanding — immediate notification to authorities and individuals.",
    regulationText:
      "PIPEDA s.10.1(1): An organization shall report to the Commissioner any breach of security safeguards involving personal information under its control if it is reasonable in the circumstances to believe that the breach creates a real risk of significant harm to an individual.\n\nUK GDPR Art. 33(1): In the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the personal data breach to the Information Commissioner.",
    enforcementNote:
      "The OAIC has signalled increased enforcement appetite for late NDB reports; the ICO has confirmed it will continue to align with EDPB guidance on the start of the 72-hour clock post-Brexit. China's CAC has imposed large fines (Didi RMB 8.026B) where breach disclosure was perceived as delayed.",
  },
};
