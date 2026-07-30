# ITEM 287 — RESIDUAL 2R FIXES + PERSIST-FIRST HARNESS + §2R.2 MAP AMENDMENT

**Date:** 2026-07-30 · **Item:** 287 · **Authority:** CEO "go for it" 2026-07-30 on the Item-286 next steps; four-lens rulings unanimous.
**Deploy:** `replay-cppa-risk-harness` ONLY. **No harness invocation** (the controller runs the batch).
**Not touched:** prompts, composers, legacy functions, DPA files, schema.

---

## FIX 1 — NUMERIC RANGE CONSTITUENTS

`supabase/functions/_shared/ltp/pass2r-validators.ts`

- NEW `NUMERIC_RANGE_RE`, `numKey()`, `carriedNumericEndpoints()` (~L155-186).
- `validateNumericDateWhitelist` — old: `haystack.includes(n)` / comma-stripped only → new: additionally `if (endpoints.has(numKey(n))) continue;`.

CLOSED RULE: only endpoints LITERALLY present inside a carried string are admitted. Separators accepted: en dash, em dash, minus sign, hyphen, "to". Thousands separators normalized for comparison only. Nothing is derived, inferred, or arithmetically produced.

Evidence closed: `"249,999"` rejected while the plan carried `"100,000–249,999"`.

## FIX 2 — ACRONYM DERIVED FORMS

- NEW `acronymDerivedStem()` (~L191-197): matches `^([A-Z]{2,6})(?:'s|-word(-word)*)$`.
- `properNounCandidates` — old: only `^[A-Z]{2,6}$` skipped → new: `if (acronymDerivedStem(bare)) continue;`.

STEM RULE ONLY: the compound tail is not itself whitelisted. `"Cascade's"` and `"Protection-related"` still reject.

Evidence closed: `"ADMT's"`, `"ADMT-related"`.

## FIX 3 — "Protection": ADJUDICATED TRUE POSITIVE (no code change)

Queried doc `1cda30f6`. `"Protection"` appears in `per_doc_result` **only as a rejection evidence string**; it is present in neither `intake_data` nor `report_data`, and no carried role title, label, or ledger value in that document contains it. **Disposition: TRUE POSITIVE — the validator was right.** No harvest gap, no regression added, nothing changed.

## FIX 4 — §2R.2 MAP AMENDMENT (`exception_analysis` → Part 4)

- `pass2r-validators.ts` `PASS2R_PART_HOME` — old `exception_analysis: 2` → new `exception_analysis: 4`.
- SPEC `docs/CPPA-RISK-IMPLEMENTATION-SPEC-v1.md` §2R.2: Part-2 registry mapping annotated, Part-4 mapping extended, and a dedicated **§2R.2 AMENDMENT** subsection added carrying the four-lens record (LEGAL / CS / PROMPT / PROSE) verbatim.

`exception_analysis:part_4` fired on every reject in both batches — the map was wrong, not the model. `processing_narrative` / `opening_summary` / `risk_assessment_by_activity` part-4 homings are NOT map errors and were left unchanged.

## FIX 5 — PERSIST-FIRST HARNESS

`supabase/functions/replay-cppa-risk-harness/index.ts`

- `processDoc(doc, prosePass)` → `processDoc(doc)`: the deterministic phase only (Pass-1 + assembly + gates). The inline 2R block was removed from it.
- `DocProcessOutcome` gains `plan`, so the caller can run 2R after persisting.
- NEW `runProseObserve(plan, assembledReport)` — never throws.
- Doc loop: `INSERT ... .select("id")` FIRST with the deterministic `per_doc_result` + `pass1_usage` + `assembled_report`, THEN 2R, THEN `UPDATE` the same row with `per_doc_result.pass2r`.

Isolate death inside a 3-attempt × ~170s 2R path now costs only the 2R telemetry, never the document. Job-row lifecycle unchanged.

## FIX 6 — PERSIST REJECTED PROSE (observe-mode calibration)

`supabase/functions/_shared/ltp/pass2r-llm.ts`

- NEW `Pass2rAttemptRejection { attempt, validators, codes }`.
- `Pass2rResult` gains `prose_rejected` + `attempt_rejections`; the reject branch records `lastRejectedDoc` and pushes the attempt's rejection set; the FALLBACK-LAW return carries both.
- `ProsePassStageResult` gains the same two fields; `runProsePassStage` passes them through and NEVER merges them into `shipped_report`.
- Harness persists them under `per_doc_result.pass2r.prose_rejected` / `.attempt_rejections`.

`PASS2R_MAX_ATTEMPTS` stays 3 — the only prose success to date landed on attempt 3.

Version stamp: `PASS2R_VALIDATORS_VERSION = "ltp-pass2r-validators-2026-07-30-item287-residual"`.

---

## TESTS

NEW `supabase/functions/_shared/ltp/item287-residual-2r.test.ts`:

```
running 6 tests from ./supabase/functions/_shared/ltp/item287-residual-2r.test.ts
FIX 1 — endpoints of a carried en-dash range are carried values ... ok
FIX 1 — hyphen, em dash and 'to' range forms all yield endpoints ... ok
FIX 1 — CLOSED RULE: nothing is derived from a non-range number ... ok
FIX 2 — possessive and hyphenated acronym forms resolve to their stem ... ok
FIX 2 — STEM RULE ONLY: non-acronym stems do not escape ... ok
FIX 4 — §2R.2 map amendment: exception_analysis homes in Part 4 ... ok
ok | 6 passed | 0 failed (5ms)
```

Adjacent 2R suites, unchanged and green:

```
running 11 tests from ./item278-pass2r.test.ts ... all ok
running 5 tests from ./item285-entity-whitelist.test.ts ... all ok
ok | 16 passed | 0 failed (254ms)
```

Full `_shared/ltp/` suite: **347 passed / 5 failed**. The 5 failures are the tolerated pre-existing inventory (`pass2 templates present with expected ids`, `ITEM 276 processing narrative…`, `LAW 3 (a) single write site`, `value-screen version stamp (Item 237)`, `all 36 templates enumerated`) — all in templates/composer/assembler modules NOT touched this turn. No test that passed before this turn fails now.

## DEPLOY

`replay-cppa-risk-harness` redeployed. No other function deployed. No harness invocation, no DB writes.

## DOUBLE-CHECK

Diff limited to: `pass2r-validators.ts`, `pass2r-llm.ts`, `replay-cppa-risk-harness/index.ts`, `item287-residual-2r.test.ts`, `docs/CPPA-RISK-IMPLEMENTATION-SPEC-v1.md`, `docs/pipeline-state.md`, this courier. No other validator logic touched. Shipped-surface content byte-unchanged: this turn changes validators, the re-homing map, and harness persistence only.
