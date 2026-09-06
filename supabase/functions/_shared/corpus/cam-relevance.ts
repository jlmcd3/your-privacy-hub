// DOC 189 (2026-09-05, CEO-approved scoring) — RELEVANCE-RANKED ATTACHMENT.
//
// The scored sibling of `attachCorpusRows` (cam-attach.ts). Where the boolean
// attach renders a row iff every render_when token fired, this module ranks
// render-eligible rows against the customer's own TYPED intake states using
// the curation-time relevance profile (cam-types.ts CamRelevanceProfile):
//
//   instrument mismatch → excluded, unless the product has NO same-instrument
//                         authority at all, in which case the row is included
//                         and labelled cross-instrument (the UK GDPR pool is
//                         empty today — doc 189 §2.3(b));
//   use-case class match .......................................... +3
//   each test element the authority bears on:
//       the record's verdict on that element is not passing ........ +2
//       the record's verdict on that element is passing ............ +1
//   relationship match ............................................. +1
//   each data-category overlap (capped at two) ..................... +1
//   each matching flag ............................................. +1
//   ties: newer decision first, then map order.
//   tiers: ≥6 "highly relevant", 3–5 "relevant", 1–2 "context", 0 not rendered.
//
// LAW: pure function of the map, the profiles and the typed query. No text
// similarity, no runtime query, no model call — the determinism law (doc 48
// §II.2a) as attachCorpusRows keeps it. The mapping from a product's factor
// vocabulary to its test elements is supplied by the product.

import type { CamRelevanceProfile, CamRow } from "./cam-types.ts";

export type RelevanceInstrument = "EU GDPR" | "UK GDPR";

export interface RelevanceQuery {
  /** The instrument the record is assessed under. */
  readonly instrument: RelevanceInstrument;
  /** The record's use-case class (the product's classifier), or null. */
  readonly use_case_class: string | null;
  /** Factors whose test element the record leaves open or failing. */
  readonly live_factor_ids: ReadonlySet<string>;
  /** Factors whose test element the record passes. */
  readonly passing_factor_ids: ReadonlySet<string>;
  readonly relationship: CamRelevanceProfile["relationship"];
  readonly data_categories: ReadonlySet<string>;
  readonly flags: ReadonlySet<string>;
}

export type RelevanceTier = "highly relevant" | "relevant" | "context";

export interface RelevanceMatch {
  readonly class_matched: boolean;
  /** Elements the authority bears on that the record leaves open. */
  readonly live_elements: readonly string[];
  /** Elements the authority bears on that the record passes. */
  readonly passing_elements: readonly string[];
  readonly relationship_matched: boolean;
  readonly data_categories: readonly string[];
  readonly flags: readonly string[];
  /** True where the authority's instrument differs from the record's and
   *  the row was included only because no same-instrument authority exists. */
  readonly cross_instrument: boolean;
}

export interface ScoredRow {
  readonly row: CamRow;
  readonly profile: CamRelevanceProfile;
  readonly score: number;
  readonly tier: RelevanceTier;
  readonly match: RelevanceMatch;
}

export const RELEVANCE_WEIGHTS = {
  class: 3,
  live_element: 2,
  passing_element: 1,
  relationship: 1,
  data_category: 1,
  data_category_cap: 2,
  flag: 1,
} as const;

export function relevanceTier(score: number): RelevanceTier | null {
  if (score >= 6) return "highly relevant";
  if (score >= 3) return "relevant";
  if (score >= 1) return "context";
  return null;
}

function instrumentOf(profile: CamRelevanceProfile): RelevanceInstrument {
  return profile.instrument === "UK GDPR" ? "UK GDPR" : "EU GDPR";
}

/**
 * Score one profile against the query. `elementOf` maps a factor to its test
 * element (e.g. LIA: "Interest legitimacy" → "purpose"); factors with no
 * element (gates and overlays) score nothing here — their flags carry them.
 */
export function scoreRelevance(
  profile: CamRelevanceProfile,
  query: RelevanceQuery,
  elementOf: (factorId: string) => string | null,
  crossInstrument: boolean,
): { score: number; match: RelevanceMatch } {
  let score = 0;
  const class_matched = !!profile.use_case_class && !!query.use_case_class &&
    profile.use_case_class === query.use_case_class;
  if (class_matched) score += RELEVANCE_WEIGHTS.class;

  const live = new Set<string>();
  const passing = new Set<string>();
  for (const f of profile.factor_ids) {
    const el = elementOf(f);
    if (!el) continue;
    if (query.live_factor_ids.has(f)) live.add(el);
    else if (query.passing_factor_ids.has(f)) passing.add(el);
  }
  for (const el of live) passing.delete(el);
  score += live.size * RELEVANCE_WEIGHTS.live_element;
  score += passing.size * RELEVANCE_WEIGHTS.passing_element;

  const relationship_matched = !!profile.relationship && !!query.relationship &&
    profile.relationship === query.relationship;
  if (relationship_matched) score += RELEVANCE_WEIGHTS.relationship;

  const data_categories = profile.data_categories.filter((c) => query.data_categories.has(c));
  score += Math.min(data_categories.length, RELEVANCE_WEIGHTS.data_category_cap) * RELEVANCE_WEIGHTS.data_category;

  const flags = profile.flags.filter((f) => query.flags.has(f));
  score += flags.length * RELEVANCE_WEIGHTS.flag;

  return {
    score,
    match: {
      class_matched,
      live_elements: [...live],
      passing_elements: [...passing],
      relationship_matched,
      data_categories,
      flags,
      cross_instrument: crossInstrument,
    },
  };
}

/**
 * Rank the render-eligible AP rows of a map against the query. Rows without
 * a resolvable profile are skipped (they are not "irrelevant", they are
 * unprofiled — the curation gap is logged by the caller's tests, never
 * papered over here). Deduped by source row: the best-scoring row wins.
 */
export function rankByRelevance(
  rows: readonly CamRow[],
  query: RelevanceQuery,
  opts: {
    readonly profileOf: (row: CamRow) => CamRelevanceProfile | undefined;
    readonly elementOf: (factorId: string) => string | null;
    readonly limit?: number;
  },
): ScoredRow[] {
  const candidates = rows
    .filter((r) => r.role === "AP" && r.render_eligible && r.display)
    .map((row) => ({ row, profile: opts.profileOf(row) }))
    .filter((x): x is { row: CamRow; profile: CamRelevanceProfile } => !!x.profile);

  const sameInstrument = candidates.filter((c) => instrumentOf(c.profile) === query.instrument);
  const pool = sameInstrument.length > 0 ? sameInstrument : candidates;
  const crossInstrument = sameInstrument.length === 0;

  const scored: ScoredRow[] = [];
  for (const { row, profile } of pool) {
    const { score, match } = scoreRelevance(profile, query, opts.elementOf, crossInstrument);
    const tier = relevanceTier(score);
    if (!tier) continue;
    scored.push({ row, profile, score, tier, match });
  }

  // Dedupe by source row — keep the best score (map order breaks ties).
  const bySource = new Map<string, ScoredRow>();
  for (const s of scored) {
    const prior = bySource.get(s.row.source_row_id);
    if (!prior || s.score > prior.score) bySource.set(s.row.source_row_id, s);
  }

  const order = new Map(rows.map((r, i) => [r.id, i] as const));
  const dateOf = (s: ScoredRow): string => s.row.citation_source?.decision_date ?? "";
  const ranked = [...bySource.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const d = dateOf(b).localeCompare(dateOf(a));
    if (d !== 0) return d;
    return (order.get(a.row.id) ?? 0) - (order.get(b.row.id) ?? 0);
  });
  return typeof opts.limit === "number" ? ranked.slice(0, opts.limit) : ranked;
}
