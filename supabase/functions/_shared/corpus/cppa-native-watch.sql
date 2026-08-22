-- The cppa_native enforcement watch (doc 47 §5.6 / doc 53 Phase A).
--
-- FINDING (2026-08-22, live query against enforcement_actions): zero rows
-- cite any of the new CPPA rulemaking sections today. The 102 rows that
-- match jurisdiction='California' + law ILIKE '%CCPA%' are all legacy
-- CA AG / pre-rulemaking CPPA enforcement (sections < 7100 — definitions,
-- opt-out, deletion, etc.), NOT actions brought under the cyber-audit
-- (7120-7124), risk-assessment (7150-7157), or ADMT (7200-7229+) Articles
-- that this fleet's Cyber/Risk/ADMT products actually cover. "CPPA-native"
-- means the latter: an enforcement action citing the new-rulemaking range.
--
-- DESIGN CHOICE: no schema column, no ALTER TABLE, no backfill. The
-- classification is fully derivable from the existing `statutory_provisions`
-- array (text[]), so a live schema write isn't needed and never will be —
-- this query IS the tag. (Standing rule: DB access in this project is
-- read-only via query_database; a derived-view/query design keeps this
-- item entirely inside that boundary, unlike a live CREATE VIEW/ALTER
-- TABLE, which is a schema write and stays out of scope for this session
-- without separate CEO authorization.)
--
-- USAGE:
--   T2 (monthly, doc 50 §4): run this read-only and confirm it still
--     returns zero rows — the "still dark" steady state.
--   T4 (event-driven, doc 50 §4): the day this returns ANY row, that IS
--     the "first CPPA-native enforcement action" event — open the CPPA AP
--     candidate queue per doc 47 §5.6 the same day, not at the next T2/T3
--     cycle. Treat a nonzero result as an alarm, not routine output.
--
-- The section-number cutoff (>= 7100) is the dividing line between legacy
-- CCPA/CPRA regs (7001, 7021, 7050, 7051, ...) and the 2024-25 rulemaking
-- package (cyber audit 7120-7124, risk assessment 7150-7157, ADMT
-- 7200-7229+) that Cyber/Risk/ADMT are built against. Re-verify the cutoff
-- at T3 if OAL finalizes further sections outside this range.

select
  ea.id,
  ea.etid,
  ea.regulator,
  ea.jurisdiction,
  ea.decision_date,
  ea.statutory_provisions,
  ea.verification_status
from enforcement_actions ea
where ea.jurisdiction = 'California'
  and exists (
    select 1
    from unnest(ea.statutory_provisions) as p
    where p ~ '11 CCR § 7(1[0-9]{2}|[2-9][0-9]{2})'
  )
order by ea.decision_date desc;
