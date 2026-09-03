-- The LIA-relevant enforcement watch (doc 73 §2.1/§4 R5, CEO-ratified
-- 2026-08-25/26 as the standing corpus watch for LIA's periodic review).
--
-- FINDING (doc 73, live query against enforcement_actions, 2026-08-25):
-- the `tool_relevance` tag alone is an unreliable net for LIA-relevant
-- rows — 94 of 111 rows that cite Art. 6(1)(f) carry no 'LIA' tag. This
-- query is the union of three signals doc 73 §2.1 verified independently:
-- the LIA tag, a live Art. 6(1)(f) provision citation, and a plain-text
-- "legitimate interest" mention. That union (268 rows total, 58 verified
-- as of 2026-08-25) is the CEO-ratified curation universe for the
-- precedent-classes.ts table (doc 73 §5 item 2) and for LIA_CORPUS_MAP's
-- AP/FC-L candidate pool (doc 58 §3, R3) — NOT the tag alone.
--
-- DESIGN CHOICE: no schema column, no ALTER TABLE — same discipline as
-- cppa-native-watch.sql. The union is fully derivable from existing
-- columns; DB access in this project is read-only via query_database.
--
-- USAGE (doc 50 §4's periodic review plan):
--   T2 (monthly, doc 50 §4 lane 0, the logic-triage lane FIRST): run this
--     read-only, diff `id` against the ids already curated in
--     precedent-classes.ts / lia-corpus-map.ts (LIA_CORPUS_MAP). Every new
--     verified row is a candidate for: (a) an existing precedent-class's
--     authorities (if it fits a use-case class already ratified), (b) a
--     new precedent-class row (if it's the first strong verified authority
--     for a class with no row yet — six of eight classes are open, per
--     doc 73 §4's coverage note), or (c) a new CAM AP/FC-L row (R1/R3).
--   T3 (quarterly, CEO-attended): adopt/decline queued candidates from T2;
--     bump LIA_PRECEDENT_CLASSES_VERSION and LIA_CORPUS_MAP's map_version
--     on any change, per each file's own "HOW TO ADD A ROW" note.
--   A verified row whose text states a NEW testable rule the deterministic
--   builders don't test for (an R1 candidate, doc 73 §4) follows the
--   Logic-Bearing Law's out-of-cycle path if it would make a live
--   determination WRONG (doc 50 §4 T2 lane 0) — not a quarterly item.
--
-- Re-verify the two ILIKE literals ("6(1)(f)", "legitimate interest") at
-- T3 if the corpus's field-extraction conventions change; this predicate
-- is a text screen, not a schema constraint, precisely so new ingestion
-- flows into it without a migration.

select
  ea.id,
  ea.regulator,
  ea.subject,
  ea.jurisdiction,
  ea.decision_date,
  ea.case_reference,
  ea.fine_eur_equivalent,
  ea.verification_status,
  ('LIA' = any(ea.tool_relevance)) as tagged,
  (ea.provisions_normalized::text ilike '%6(1)(f)%' or ea.statutory_provisions::text ilike '%6(1)(f)%') as cites_61f,
  (ea.raw_text ilike '%legitimate interest%' or ea.key_compliance_failure ilike '%legitimate interest%') as li_text
from enforcement_actions ea
where ('LIA' = any(ea.tool_relevance))
   or (ea.provisions_normalized::text ilike '%6(1)(f)%' or ea.statutory_provisions::text ilike '%6(1)(f)%')
   or (ea.raw_text ilike '%legitimate interest%' or ea.key_compliance_failure ilike '%legitimate interest%')
order by ea.verification_status desc, ea.decision_date desc nulls last;
