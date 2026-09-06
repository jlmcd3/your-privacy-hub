-- LIA standing watch query (doc 73 §2 / doc 50 §4 quarterly cadence).
--
-- HISTORY: the map header cites `_shared/corpus/lia-li-relevant-watch.sql`
-- as the standing source for the "58-row verified LIA-relevant pool".
-- That file did not survive the corpus relocation (the golden/corpus move
-- into product-local trees); it is reconstructed here, inside the LIA
-- product tree, so it cannot be orphaned by a future relocation.
--
-- REPRODUCIBILITY NOTE (2026-09-05 re-run, recorded honestly):
-- this definition returns 48 verified rows, not 58. The 58 figure recorded
-- in doc 73 is NOT reproducible from any surviving query text. Treat 48 as
-- the current, reproducible pool and this file as the definition of record.
--
-- Layer counts observed on 2026-09-05:
--   enforcement_actions total ................................. 5,690
--   verification_status = 'verified' ...........................  709
--   verified AND tool_relevance @> {LIA} .......................   16
--   verified AND Art. 6(1)(f) / legitimate-interest text .......   33
--   verified AND (tag OR text)  = THE POOL .....................   48
--     of which pinnable (non-empty key_compliance_failure) .....   28
--     of which wired into lia-corpus-map.ts (v5) ...............   25
--
-- The raw `tool_relevance` tag alone is an unreliable net: most rows that
-- turn on Article 6(1)(f) carry no LIA tag at all. Hence the text arm,
-- including the Spanish and French phrasings, which AEPD/CNIL rows use.

SELECT
  id,
  regulator,
  subject,
  jurisdiction,
  decision_date,
  case_reference,
  law,
  violation,
  fine_eur,
  source_url,
  tool_relevance,
  key_compliance_failure,
  (coalesce(key_compliance_failure, '') <> '') AS pinnable
FROM public.enforcement_actions
WHERE verification_status = 'verified'
  AND (
       'LIA' = ANY(tool_relevance)
    OR law ILIKE '%6(1)(f)%'
    OR violation ILIKE '%legitimate interest%'
    OR key_compliance_failure ILIKE '%legitimate interest%'
    OR raw_text ILIKE '%legitimate interest%'
    OR raw_text ILIKE '%interés legítimo%'
    OR raw_text ILIKE '%intérêt légitime%'
  )
ORDER BY decision_date DESC NULLS LAST;

-- T2 PROCEDURE (doc 50 §4):
--   1. Run this file. Diff the returned ids against the `source_row_id`
--      values in run-li-assessment/_local/corpus/maps/lia-corpus-map.ts and
--      in run-li-assessment/_local/ltp/lia-deliverables/precedent-classes.ts.
--   2. For each new id: re-verify the row live, pin an EXACT substring of
--      key_compliance_failure (≤300 chars, clause boundary, no silent
--      correction of source flaws), translate it into English in the
--      curation_note if the source text is not English, write the
--      factor-bearing posture sentence, and land the row DARK
--      (render_eligible: false).
--   3. Bump map_version. Customer-facing rendering of any new row requires
--      separate CEO ratification (doc 48 §II.6) — wiring alone never
--      flips a row live.
--   4. Rows with an empty key_compliance_failure are NOT pinnable and are
--      logged for the excerpt-extraction pass, not wired.
