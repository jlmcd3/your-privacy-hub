/**
 * GDPR Article Verbatim Text — Blocking Rule Expansions
 *
 * These are the exact operative sentences from the GDPR that power the
 * "Show legal basis" collapsible inside each Blocking flag card.
 *
 * Source: verified against gdpr-info.eu (consolidated Regulation (EU) 2016/679 text).
 * Every quote was character-for-character confirmed by the legal reviewer.
 *
 * DO NOT edit these strings without running them past the legal reviewer —
 * the tool's credibility claim ("defensible against the literal text") depends on
 * verbatim accuracy.
 */

export const GDPR_ART_9_1 =
  "Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership, and the processing of genetic data, biometric data for the purpose of uniquely identifying a natural person, data concerning health or data concerning a natural person's sex life or sexual orientation shall be prohibited.";

export const GDPR_ART_44 =
  "Any transfer of personal data which are undergoing processing or are intended for processing after transfer to a third country or to an international organisation shall take place only if, subject to the other provisions of this Regulation, the conditions laid down in this Chapter are complied with by the controller and processor, including for onward transfers of personal data from the third country or an international organisation to another third country or to another international organisation.";

export const GDPR_ART_6_1 =
  "Processing shall be lawful only if and to the extent that at least one of the following applies:";

export const GDPR_ART_5_1_E =
  "kept in a form which permits identification of data subjects for no longer than is necessary for the purposes for which the personal data are processed";

export const GDPR_ART_22_4 =
  "Decisions referred to in paragraph 2 shall not be based on special categories of personal data referred to in Article 9(1), unless point (a) or (g) of Article 9(2) applies and suitable measures to safeguard the data subject's rights and freedoms and legitimate interests are in place.";

/**
 * Map of rule IDs to their verbatim Article text.
 * Used by the Blocking flag "Show legal basis" expansion.
 */
export const BLOCKING_RULE_VERBATIM: Record<string, string> = {
  "GDPR-ART9-PROHIBITED-NO-EXCEPTION": GDPR_ART_9_1,
  "GDPR-ART46-NO-TRANSFER-MECHANISM": GDPR_ART_44,
  "GDPR-ART6-NO-LAWFUL-BASIS": GDPR_ART_6_1,
  "GDPR-ART5-1E-INDEFINITE-RETENTION": GDPR_ART_5_1_E,
  "GDPR-ART22-4-SPECIAL-CATEGORY-ADM": GDPR_ART_22_4,
};

/**
 * Human-readable citation labels for each Article.
 * Shown below the verbatim quote in the expansion.
 */
export const BLOCKING_RULE_CITATION: Record<string, string> = {
  "GDPR-ART9-PROHIBITED-NO-EXCEPTION": "GDPR Article 9(1)",
  "GDPR-ART46-NO-TRANSFER-MECHANISM": "GDPR Article 44",
  "GDPR-ART6-NO-LAWFUL-BASIS": "GDPR Article 6(1)",
  "GDPR-ART5-1E-INDEFINITE-RETENTION": "GDPR Article 5(1)(e)",
  "GDPR-ART22-4-SPECIAL-CATEGORY-ADM": "GDPR Article 22(4)",
};
