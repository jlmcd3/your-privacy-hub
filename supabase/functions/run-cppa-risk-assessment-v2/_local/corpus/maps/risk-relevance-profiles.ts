// DOC 231A (2026-09-08) — CPPA RISK RELEVANCE PROFILES, the CAM sidecar the
// H3-style Persuasive Authority extension ranks against (mirrors LIA's own
// `lia-relevance-profiles.ts`, doc 189/191).
//
// Kept as a sidecar rather than inline on each risk-corpus-map.ts row so
// that map's ratified display bytes are not touched by a relevance-attribute
// pass — the scorer (`_shared/corpus/cam-relevance.ts`) resolves a row's
// profile through `riskProfileOf(row)`, which prefers an inline
// `relevance_profile` where a future row carries one, then the doc-231A
// generated file's pattern half, then its (today empty) rule half.
//
// WHAT RENDERS: nothing from this file renders today. `RISK_PATTERN_PROFILES`
// / `RISK_RULE_PROFILES` both ship empty (doc 231 §9 confirmed unchanged
// this session — zero `authority_relevance_profiles` rows for
// product='cppa-risk'), and `risk-corpus-map.ts`'s own AP rows carry no
// inline `relevance_profile` either (verified this session — see the
// doc 231A follow-up log). Ranking is therefore driven entirely by
// hook-backed synthetic candidates (`AuthorityHook.relevance`) until a
// future curation pass populates one of these three sources.

import type { CamRelevanceProfile, CamRow } from "../../../../_shared/corpus/cam-types.ts";
import { RISK_PATTERN_PROFILES, RISK_RULE_PROFILES } from "./risk-relevance-profiles.generated.ts";

export const RISK_RELEVANCE_PROFILES_VERSION = "risk-relevance-profiles-v1-2026-09-08";

/** Lookup order identical to LIA's `liaProfileOf` (doc 207 Track 2): an
 *  inline profile on the row wins first; then the generated file's pattern
 *  half; then its rule half. No hand-authored literal fallback exists for
 *  this product (LIA's own literal is itself only a fallback the generated
 *  file has already superseded for every key it carries — doc 231A does not
 *  reproduce that transitional stage for a product starting from zero). */
export function riskProfileOf(row: CamRow): CamRelevanceProfile | undefined {
  return (
    row.relevance_profile ??
    (RISK_PATTERN_PROFILES[row.id] as unknown as CamRelevanceProfile | undefined) ??
    (RISK_RULE_PROFILES[row.id] as unknown as CamRelevanceProfile | undefined)
  );
}
