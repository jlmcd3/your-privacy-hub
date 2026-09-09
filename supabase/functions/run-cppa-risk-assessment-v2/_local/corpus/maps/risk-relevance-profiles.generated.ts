// GENERATED FILE — DO NOT EDIT BY HAND.
//
// Mirrors run-li-assessment/_local/corpus/maps/lia-relevance-profiles.generated.ts's
// pattern (doc 191 §5) for the CPPA Risk product's own CAM
// (_shared/corpus/maps/risk-corpus-map.ts). Produced (once a generator
// exists — see the doc 231A follow-up log's [NEEDS] note; no
// `generate-corpus-relevance-profiles` product entry for `cppa-risk` was
// built this session) from the `authority_relevance_profiles` curation
// table, filtered to `product = 'cppa-risk'`. Edit the table and
// re-generate; a hand edit here would be overwritten and, worse,
// un-reviewed.
//
// SHIPS EMPTY TODAY (doc 231 §9, confirmed unchanged this session, 2026-09-08):
// zero `authority_relevance_profiles` rows exist for `product = 'cppa-risk'`
// (the five candidate profiles in doc 231 §9 are unstamped SQL, not yet
// run). The CEO's H3-style Persuasive Authority extension
// (run-cppa-risk-assessment-v2/_local/ltp/eu-authority/hook-persuasive.ts)
// therefore ranks NOTHING from this file today — every candidate that
// reaches its ranking is hook-backed (`AuthorityHook.relevance`, copied by
// generate-corpus-hooks at generate time), never a CAM-row profile, until a
// future curation pass populates one of the two records below.
//
// Product: cppa-risk
// Factor vocabulary: the CAM's 17 factor_id labels (risk-corpus-map.ts) —
// factor-level, not a three-part-test-style grouping (doc 229 §8 default #1).
// Profiles version: risk-relevance-profiles-v1-2026-09-08 (empty)
//
// THE EXPORT SPLIT mirrors LIA's own doc-191 §5 enforcement: a gate or
// outcome-override file may import RISK_RULE_PROFILES only (there are none
// today for either product's `cppa-risk` map — this product's engine has no
// rule-fired outcome-override mechanism analogous to LIA's `rule-pass.ts`).
// RISK_PATTERN_PROFILES content is persuasive-only, forever.

import type { AuthorityRelevanceProfile } from "../../../../_shared/corpus/authority-relevance-profile.ts";

export const RISK_PROFILES_VERSION = "risk-relevance-profiles-v1-2026-09-08";

export const RISK_RULE_PROFILES: Readonly<Record<string, AuthorityRelevanceProfile>> = {};

export const RISK_PATTERN_PROFILES: Readonly<Record<string, AuthorityRelevanceProfile>> = {};
