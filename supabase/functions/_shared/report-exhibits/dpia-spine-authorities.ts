// PROMPT 12D (2026-08-17) — AUTHORITY-EXHIBIT COMPLETENESS FOR SPINE-CITED
// ARTICLES.
//
// The ratified DPIA spine prose cites three authorities that the citation
// harvest never saw, because the harvest only recognises the "GDPR Art. …"
// short form while the spine sentences use the long form ("Article 35(7)(a)
// requires …"):
//
//   • Art. 35(7)(a) — Section 1 opener (renders on every document)
//   • Art. 35(9)    — Section 5 opener (renders on every document)
//   • Art. 35(11)   — the review-schedule sentence
//
// With no exhibit entry, the iff-cited Table of Authorities could not list
// them. This module is the exhibit-side supply of those citations. It changes
// no body prose, no builder output and no ToA rule: the ToA's existing
// iff-cited gate (`bodyCites`) still decides whether an entry is listed, so a
// document that does not carry the citing text still does not list it.
//
// Each citation below is backed by a row already present in
// DPIA_VERIFIED_AUTHORITIES (both EU and UK forms); the regime prefix is
// applied downstream by the existing `toaRegimeForm` handling.

import { DPIA_VERIFIED_AUTHORITIES } from "../registry/dpia-verified-authorities.ts";

/** Registry proposition keys whose subsections the ratified spine prose cites. */
export const DPIA_SPINE_CITED_PROPOSITION_KEYS: readonly string[] = [
  "dpia_content_description", // GDPR Art. 35(7)(a) — Section 1 opener
  "consultation_of_data_subjects_35_9", // GDPR Art. 35(9) — Section 5 opener
  "dpia_review_on_change", // GDPR Art. 35(11) — review schedule
];

/**
 * The citations, in EU form. Derived from the registry so a registry edit can
 * never drift from the exhibit. Regime folding happens in `toaRegimeForm`.
 */
export const DPIA_SPINE_CITED_AUTHORITIES: readonly string[] =
  DPIA_SPINE_CITED_PROPOSITION_KEYS.map((k) => {
    const row = DPIA_VERIFIED_AUTHORITIES[k];
    if (!row) throw new Error(`[12D] missing DPIA registry row for ${k}`);
    return row.subsection || row.citation;
  });

/** Union of harvested citations with the spine-cited set, order-stable. */
export function withDpiaSpineAuthorities(cited: Iterable<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of cited) {
    const v = String(c || "").replace(/\s+/g, " ").trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  for (const c of DPIA_SPINE_CITED_AUTHORITIES) {
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}
