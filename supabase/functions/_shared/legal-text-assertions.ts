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
  // S-N3 (doc 80, 2026-08-27) — the § 7012(e)(4) retention rule the US
  // notice now implements: a stated period, OR the criteria used to
  // determine it. The phrase below is verbatim from the live
  // cppa_authorities row (verified 2026-08-27).
  { citation: "11 CCR " + SECTION + " 7012", mustContain: ["privacy policy", "sensitive personal information", "criteria used to determine the period"] },
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

  // DOC 180 (2026-09-04) — the EU/UK GDPR notice spine's additional
  // statutory assertions, each verified live against gdpr_articles this
  // session (jurisdiction 'eu' / 'uk', body_text). The UK entries carry the
  // Data (Use and Access) Act 2025 regime: Article 22 UK GDPR is NOT in force
  // (the corpus row says so) — the UK spine cites Articles 22A–22C, the
  // Article 12A time period and Article 77's "complaint with the Commissioner".
  // Article 7(3) — withdrawal of consent.
  { citation: "gdpr:eu:7", mustContain: ["withdraw his or her consent at any time"] },
  // Article 12(3) — the one-month response period the EU rights section states.
  { citation: "gdpr:eu:12", mustContain: ["within one month"] },
  // Article 13(1)(d), (2)(e), (2)(f) — legitimate interest, provision requirement, ADM detail.
  { citation: "gdpr:eu:13", mustContain: ["statutory or contractual requirement", "legitimate interests pursued by the controller or by a third party", "meaningful information about the logic involved"] },
  // Articles 15–18, 20 — the rights list.
  { citation: "gdpr:eu:15", mustContain: ["confirmation as to whether or not personal data"] },
  { citation: "gdpr:eu:16", mustContain: ["rectification of inaccurate personal data"] },
  { citation: "gdpr:eu:17", mustContain: ["erasure of personal data"] },
  { citation: "gdpr:eu:18", mustContain: ["restriction of processing"] },
  { citation: "gdpr:eu:20", mustContain: ["structured, commonly used and machine-readable format"] },
  // Article 21(2)–(4) — direct-marketing objection, presented clearly and separately.
  { citation: "gdpr:eu:21", mustContain: ["direct marketing", "presented clearly and separately"] },
  // Article 22(3) — human intervention safeguard.
  { citation: "gdpr:eu:22", mustContain: ["human intervention"] },
  // Article 77 — complaint to a supervisory authority.
  { citation: "gdpr:eu:77", mustContain: ["lodge a complaint with a supervisory authority"] },
  // UK GDPR Article 12 — the response period now lives in Article 12A.
  { citation: "gdpr:uk:12", mustContain: ["applicable time period"] },
  // UK GDPR Article 13 — Commissioner complaint, Article 22C safeguards, provision requirement.
  { citation: "gdpr:uk:13", mustContain: ["lodge a complaint with the Commissioner", "safeguards under Article 22C", "statutory or contractual requirement"] },
  // UK GDPR Article 21 — direct-marketing objection.
  { citation: "gdpr:uk:21", mustContain: ["direct marketing", "presented clearly and separately"] },
  // UK GDPR Article 22C — the safeguards for solely automated significant decisions.
  { citation: "gdpr:uk:22C", mustContain: ["obtain human intervention", "contest such decisions"] },
  // UK GDPR Article 77 — complaint with the Commissioner.
  { citation: "gdpr:uk:77", mustContain: ["lodge a complaint with the Commissioner"] },
];
