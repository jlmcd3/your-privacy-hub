// Shared source-of-truth for the three deterministic generators'
// statutory-assertion manifests. Each generator re-exports its own slice as
// `LEGAL_TEXT_ASSERTIONS` from the top of its file; the
// lint-deterministic-legal-text function imports the same slices from here so
// cross-function bundling stays clean (edge functions cannot import each
// other's index.ts).

export type LegalTextAssertion = { citation: string; mustContain: string[] };

// `§` via char code keeps the source ASCII-safe and matches the corpus
// citation strings exactly (e.g. "11 CCR § 7011").
const SECTION = String.fromCharCode(167);

// ---------------------------------------------------------------------------
// generate-ropa-document
// ---------------------------------------------------------------------------
export const ROPA_LEGAL_TEXT_ASSERTIONS: LegalTextAssertion[] = [
  // Article 30(1)/(2) GDPR — controller / processor records of processing.
  { citation: "gdpr:eu:30", mustContain: ["record of processing activities", "controller's representative", "processor"] },
  // Article 37 GDPR — DPO designation triggers.
  { citation: "gdpr:eu:37", mustContain: ["designate a data protection officer", "regular and systematic monitoring", "large scale"] },
  // Article 27 EU GDPR — representative for controllers not established in the Union.
  { citation: "gdpr:eu:27", mustContain: ["designate in writing a representative"] },
  // Article 27 UK GDPR — mirrored representative obligation.
  { citation: "gdpr:uk:27", mustContain: ["representative"] },
];

// ---------------------------------------------------------------------------
// generate-us-notice
// ---------------------------------------------------------------------------
export const US_NOTICE_LEGAL_TEXT_ASSERTIONS: LegalTextAssertion[] = [
  { citation: "Cal. Civ. Code " + SECTION + " 1798.100", mustContain: ["personal information"] },
  { citation: "Cal. Civ. Code " + SECTION + " 1798.105", mustContain: ["right to delete"] },
  { citation: "Cal. Civ. Code " + SECTION + " 1798.110", mustContain: ["right to know"] },
  // Response window ("respond within 45 days") + authorized-agent + extension mechanics from § 1798.130.
  { citation: "Cal. Civ. Code " + SECTION + " 1798.130", mustContain: ["45 days", "authorized agent", "extension"] },
  { citation: "11 CCR " + SECTION + " 7011", mustContain: ["privacy policy", "authorized agent"] },
  { citation: "11 CCR " + SECTION + " 7012", mustContain: ["privacy policy", "sensitive personal information"] },
];

// ---------------------------------------------------------------------------
// generate-eu-notice
// ---------------------------------------------------------------------------
export const EU_NOTICE_LEGAL_TEXT_ASSERTIONS: LegalTextAssertion[] = [
  // Article 6(1) GDPR — lawful bases enumerated in the template.
  { citation: "gdpr:eu:6", mustContain: ["consent", "legitimate interests", "legal obligation"] },
  // Article 9(2) GDPR — special-category processing conditions (explicit consent under 9(2)(a) etc.).
  { citation: "gdpr:eu:9", mustContain: ["explicit consent"] },
  // Article 14(3) GDPR — timing when data not obtained from the data subject.
  { citation: "gdpr:eu:14", mustContain: ["one month"] },
  // Article 27 EU GDPR — representative.
  { citation: "gdpr:eu:27", mustContain: ["designate in writing a representative"] },
  // Article 27 UK GDPR — mirrored representative obligation.
  { citation: "gdpr:uk:27", mustContain: ["representative"] },
  // Article 46 GDPR — appropriate safeguards for international transfers (SCCs etc.).
  { citation: "gdpr:eu:46", mustContain: ["appropriate safeguards"] },
  // Article 49 GDPR — derogations for specific situations for transfers.
  { citation: "gdpr:eu:49", mustContain: ["appropriate safeguards"] },
];
