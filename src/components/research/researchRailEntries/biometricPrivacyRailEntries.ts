// Section reference entries for /biometric-privacy.
// Section ids must match those declared in BiometricPrivacy.tsx.
//
// Sections whose controlling authority spans several statutes ("state-laws",
// which ranks BIPA, CUBI and HB 1493 side by side) or which rest on agency
// guidance rather than a single provision ("workplace" — EEOC/NLRB) are
// deliberately omitted: the rail holds the previous entry for those.

import type { RailEntry } from "@/components/intake/StatuteRail";

const BIPA_URL = "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004&ChapterID=57";
const GDPR_ART9_URL = "https://gdpr-info.eu/art-9-gdpr/";

export const BIOMETRIC_PRIVACY_SECTION_RAIL: Record<string, RailEntry> = {
  "enforcement-history": {
    fieldLabel: "BIPA private right of action and damages",
    citation: "740 ILCS 14/20 (BIPA § 20)",
    citationUrl: BIPA_URL,
    plainSummary:
      "Section 20 is the provision that made BIPA the most-litigated biometric statute in the United States: any person aggrieved by a violation may sue in their own right and recover liquidated damages of $1,000 for negligent violations or $5,000 for intentional or reckless violations, plus attorney's fees. The 2024 amendment limits recovery where the same private entity collects or discloses the same person's biometric identifier by the same method more than once.",
    regulationText:
      "740 ILCS 14/20: Any person aggrieved by a violation of this Act shall have a right of action in a State circuit court or as a supplemental claim in federal district court against an offending party. A prevailing party may recover for each violation: (1) against a private entity that negligently violates a provision of this Act, liquidated damages of $1,000 or actual damages, whichever is greater; (2) against a private entity that intentionally or recklessly violates a provision of this Act, liquidated damages of $5,000 or actual damages, whichever is greater; (3) reasonable attorneys' fees and costs, including expert witness fees and other litigation expenses; and (4) other relief, including an injunction, as the State or federal court may deem appropriate.",
    enforcementNote:
      "The $650M Meta (Facebook) BIPA settlement and the $1.4B Texas–Meta settlement under CUBI remain the benchmark recoveries for biometric claims.",
  },

  "gdpr-eu": {
    fieldLabel: "Biometric data as a special category",
    citation: "GDPR Art. 9(1)–(2)",
    citationUrl: GDPR_ART9_URL,
    plainSummary:
      "Under the GDPR, biometric data is special-category data only when it is processed for the purpose of uniquely identifying a natural person. Where it is, processing is prohibited unless one of the Article 9(2) conditions applies — most commonly explicit consent, or substantial public interest laid down in Member State law. An Article 6 lawful basis is still required in addition to the Article 9(2) condition.",
    regulationText:
      "Art. 9(1): Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership, and the processing of genetic data, biometric data for the purpose of uniquely identifying a natural person, data concerning health or data concerning a natural person's sex life or sexual orientation shall be prohibited.",
    enforcementNote:
      "Clearview AI has been fined €20M each by the French, Italian and Greek supervisory authorities over scraped facial images; the UK ICO's £7.5M penalty was overturned on jurisdictional grounds by the First-tier Tribunal in 2023.",
  },
};
