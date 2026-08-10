// Section reference entries for /cookie-consent.
// Section ids must match those declared in CookieConsent.tsx.
//
// "matrix" and "per-jurisdiction" are deliberately omitted: both compare
// ePrivacy, UK PECR and several U.S. state regimes side by side, so no single
// provision governs them. The rail holds the previous entry for those sections.

import type { RailEntry } from "@/components/intake/StatuteRail";

const EPRIVACY_URL = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32002L0058";

export const COOKIE_CONSENT_SECTION_RAIL: Record<string, RailEntry> = {
  checklist: {
    fieldLabel: "Prior informed consent for storage and access",
    citation: "ePrivacy Directive 2002/58/EC Art. 5(3)",
    citationUrl: EPRIVACY_URL,
    plainSummary:
      "Article 5(3) — not the GDPR — is the operative rule for cookies and equivalent tracking technologies in the EU. It requires prior, informed consent before storing information on, or gaining access to information already stored in, a user's terminal equipment. Only two exemptions exist: transmission of a communication, and storage strictly necessary to provide a service the user explicitly requested. The consent standard itself is borrowed from the GDPR, which is why pre-ticked boxes, implied consent from continued browsing, and reject flows that are harder than accept flows all fail.",
    regulationText:
      "Art. 5(3) (as amended by Directive 2009/136/EC): Member States shall ensure that the storing of information, or the gaining of access to information already stored, in the terminal equipment of a subscriber or user is only allowed on condition that the subscriber or user concerned has given his or her consent, having been provided with clear and comprehensive information, in accordance with Directive 95/46/EC, inter alia, about the purposes of the processing. This shall not prevent any technical storage or access for the sole purpose of carrying out the transmission of a communication over an electronic communications network, or as strictly necessary in order for the provider of an information society service explicitly requested by the subscriber or user to provide the service.",
  },

  enforcement: {
    fieldLabel: "Cookie enforcement authority",
    citation: "ePrivacy Directive Art. 5(3), as transposed and enforced by national authorities",
    citationUrl: EPRIVACY_URL,
    plainSummary:
      "Because Article 5(3) sits in a directive rather than the GDPR, cookie enforcement runs through each national transposition and its own penalty ceiling, not the GDPR one-stop-shop. That is why the CNIL can fine a non-French-established operator directly, and why UK PECR penalties are capped at £17.5M. The recurring theories of liability are consistent across regulators: non-essential cookies dropped before consent, reject flows that are harder to reach than accept flows, and dark patterns in the banner design.",
    regulationText:
      "Art. 5(3) (as amended by Directive 2009/136/EC): Member States shall ensure that the storing of information, or the gaining of access to information already stored, in the terminal equipment of a subscriber or user is only allowed on condition that the subscriber or user concerned has given his or her consent, having been provided with clear and comprehensive information, in accordance with Directive 95/46/EC, inter alia, about the purposes of the processing.",
    enforcementNote:
      "CNIL fined Google €325M and SHEIN €150M in 2025; the Belgian APD's €250K decision against IAB Europe addressed the TCF consent string itself.",
  },
};
