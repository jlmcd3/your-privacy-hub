// FLEET CONVENTION — CORPUS TYPOGRAPHY NORMALIZATION (single source of truth).
//
// Item 324 §OPEN-2 flagged two divergent normalizers pinning the SAME corpus
// row (`cppa-7152`). CEO ruling (2026-08-01): the Item 324 approach is the
// fleet convention going forward —
//
//   For hyphenated line-break artifacts, DROP THE LINE BREAK AND KEEP THE
//   HYPHEN. "non-\nmedical" becomes "non-medical", never "nonmedical".
//   The hyphen is part of the word, not typesetting.
//
// REUSE LAW: corpus pins import these helpers; they do not copy them.

/**
 * Drop a line break that splits a hyphenated compound, keeping the hyphen.
 * Requires a lowercase letter on both sides so en/em dashes normalized to
 * " - " (e.g. the running page header) are untouched.
 */
export function joinHyphenLineBreaks(s: string): string {
  return String(s).replace(/(\p{Ll}-)\s*\n\s*(\p{Ll})/gu, "$1$2");
}

/** Normalize typography only — curly quotes/dashes, NBSP, whitespace runs. */
export function normTypography(s: string): string {
  return String(s)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Corpus-side normalization: hyphen-line-break repair FIRST (it needs the raw
 * newlines), then typography normalization.
 */
export function normCorpus(s: string): string {
  return normTypography(joinHyphenLineBreaks(s));
}
