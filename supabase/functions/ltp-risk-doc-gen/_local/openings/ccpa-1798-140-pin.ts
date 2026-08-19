// T7-RISK-OPENING — Corpus pins for CCPA "business" applicability (Civ. Code § 1798.140(d)).
//
// Source of truth (ledger item 80): cppa_authorities row 'Cal. Civ. Code § 1798.140'
// (status=current). Verbatim quotes below are byte-identical to the corpus text
// extracted 2026-07-25 from cppa_authorities.full_text at bytes 1367..3836
// (subsection (d)). NBSP characters (U+00A0) and curly quotes (U+201C/U+201D,
// U+2018/U+2019) are PRESERVED — do not "clean up" this file with a formatter.
//
// The runtime pin-test (see risk-opening.ts loadCorpusPins) compares these
// literals against the live cppa_authorities row on cold-start; drift is
// telemetered and the builder falls back to omitting S0 rather than emitting
// an unverified quote.

/** § 1798.140(d) chapeau — verbatim, NBSP preserved between "(d)" and "\u201CBusiness\u201D". */
export const CCPA_1798_140_D_CHAPEAU =
  "(d)\u00A0\u201CBusiness\u201D means:";

/** § 1798.140(d)(1) chapeau — verbatim. */
export const CCPA_1798_140_D_1_CHAPEAU =
  "A sole proprietorship, partnership, limited liability company, corporation, association, or other legal entity that is organized or operated for the profit or financial benefit of its shareholders or other owners, that collects consumers\u2019 personal information, or on the behalf of which such information is collected and that alone, or jointly with others, determines the purposes and means of the processing of consumers\u2019 personal information, that does business in the State of California, and that satisfies one or more of the following thresholds:";

/** § 1798.140(d)(1)(A) — verbatim; includes the § 1798.199.95(d) CPI-adjustment cross-reference. */
export const CCPA_1798_140_D_1_A =
  "As of January 1 of the calendar year, had annual gross revenues in excess of twenty-five million dollars ($25,000,000) in the preceding calendar year, as adjusted pursuant to subdivision (d) of Section 1798.199.95.";

/** § 1798.140(d)(1)(B) — verbatim; preserves buys/sells/shares disjunction + consumer-or-household object. */
export const CCPA_1798_140_D_1_B =
  "Alone or in combination, annually buys, sells, or shares the personal information of 100,000 or more consumers or households.";

/** § 1798.140(d)(1)(C) — verbatim; retained for corpus parity, NOT emitted this pilot (deferred). */
export const CCPA_1798_140_D_1_C =
  "Derives 50 percent or more of its annual revenues from selling or sharing consumers\u2019 personal information.";
