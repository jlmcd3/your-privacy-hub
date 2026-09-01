// DOC 132 (Track A, CEO-ratified 2026-09-01) — ADVISORY CORPUS SURFACING.
//
// The complement to the compiled-decision-tree half of the corpus program
// (docs 130/131): where a customer's free-text intake mentions a topic the
// corpus holds external enforcement-action precedent on, but the product's
// OWN deterministic triggers never fired on it (the CEO's drone example —
// WP29/CNIL guidance the DPIA record's own trigger logic never reaches),
// this module surfaces that precedent as a labeled, non-determinative
// appendix rather than leaving it invisible.
//
// LAW: this module decides NOTHING. It performs a dumb, reproducible,
// in-process string match — no model call, no interpretation, no network —
// over `advisory_terms` authored at curation time on the corpus row (never
// invented at runtime). Inclusion in the appendix is signpost-only; the
// ratified framing sentence says so explicitly, and no product's
// determination reads this module's output.
//
// SCOPE: only rows carrying `advisory_terms` are candidates (curation-time
// opt-in — see cam-types.ts's field comment). Every candidate today is an
// AP row (external enforcement-action precedent, `display` populated);
// FC/AQ commentary and statute-pin rows are never curated with terms
// because they already render deterministically on their own gates.

import type { CamRow, CorpusMap } from "./cam-types.ts";

export interface AdvisoryMatch {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly citation_label: string;
  readonly source_url?: string;
  readonly verified_on?: string;
  readonly matched_terms: readonly string[];
}

const MAX_ADVISORY_MATCHES = 8;

function wordBoundaryRegex(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

/** Dedupe key: the real-world matter, not the internal row id (an AP row
 * and its sibling AOW warning can cite the same case under different ids;
 * only AP rows carry advisory_terms today, so this mostly guards future
 * curation, not current behavior). */
function dedupeKey(row: CamRow): string {
  if (row.provenance.source_url) return row.provenance.source_url;
  if (row.citation_source) {
    return `${row.citation_source.regulator}|${row.citation_source.subject}|${row.citation_source.decision_date}`;
  }
  return row.id;
}

/**
 * Scan a corpus map's advisory-term-bearing rows against the product's
 * free-text intake fields. Returns matches sorted by match strength
 * (most matched terms first, ties broken by the map's own row order),
 * deduped by underlying matter, capped at MAX_ADVISORY_MATCHES.
 *
 * `alreadyCited` excludes rows whose authority is already relied on
 * elsewhere in the document — the Authorities Cited / persuasive-authority
 * appendix (matched by `provenance.source_url`), or a product-specific
 * always-rendered precedent list (matched by `source_row_id`, e.g. DPIA's
 * pinned EnforcementPrecedents surface) — this appendix is for topics NOT
 * already surfaced.
 */
export function matchAdvisoryRows(
  map: CorpusMap,
  freeText: readonly (string | null | undefined)[],
  alreadyCited: ReadonlySet<string> = new Set(),
): AdvisoryMatch[] {
  const haystack = freeText.filter((t): t is string => !!t && t.trim().length > 0).join(" \n ");
  if (!haystack.trim()) return [];

  const seen = new Set<string>();
  const scored: Array<{ row: CamRow; matched: string[] }> = [];

  for (const row of map.rows) {
    if (!row.render_eligible) continue;
    if (!row.advisory_terms || row.advisory_terms.length === 0) continue;
    if (row.provenance.source_url && alreadyCited.has(row.provenance.source_url)) continue;
    if (alreadyCited.has(row.source_row_id)) continue;
    const key = dedupeKey(row);
    if (seen.has(key)) continue;

    const matched = row.advisory_terms.filter((term) => wordBoundaryRegex(term).test(haystack));
    if (matched.length === 0) continue;

    seen.add(key);
    scored.push({ row, matched });
  }

  scored.sort((a, b) => b.matched.length - a.matched.length);

  return scored.slice(0, MAX_ADVISORY_MATCHES).map(({ row, matched }) => ({
    id: row.id,
    title: row.display?.matter ?? row.factor_id,
    description: row.display?.what_happened ?? row.display?.bearing ?? "",
    citation_label: row.display?.authority_label ?? row.citation_source?.regulator ?? "Persuasive authority",
    source_url: row.provenance.source_url,
    verified_on: row.provenance.verified_on,
    matched_terms: matched,
  }));
}

// ─── RATIFIED CUSTOMER-FACING BYTES (doc 132; wording accepted 2026-09-01, no redline) ───

export const ADVISORY_APPENDIX_TITLE = "Regulatory Developments Suggested for Review";

export const ADVISORY_APPENDIX_PREAMBLE =
  "This appendix lists authorities from the verified library whose subject-matter terms match the information you provided. Inclusion means the topic may warrant review — not that the authority applies — and no determination in this report rests on this appendix.";

/** Renders the matches as a table (columns: Topic | Summary | Source). A
 * row's cell states the citation label; the URL (when present) and the
 * verified date are appended so a reader can follow it without the table
 * needing a hyperlink-capable renderer. */
export function advisoryMatchesTable(matches: readonly AdvisoryMatch[]): {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
} | null {
  if (matches.length === 0) return null;
  return {
    columns: ["Topic", "Summary", "Source"],
    rows: matches.map((m) => [
      m.title,
      m.description,
      `${m.citation_label}${m.source_url ? ` — ${m.source_url}` : ""}${m.verified_on ? ` (verified ${m.verified_on})` : ""}`,
    ]),
  };
}
