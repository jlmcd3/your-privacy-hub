# RISK-CITATION-DUP-FIX — 2026-07-26

**Dispatch:** RISK-CITATION-DUP-FIX (CEO-ordered 2026-07-26; team-reviewed five-lens; deploy turn on `run-cppa-risk-assessment` only).
**Precedent:** `docs/courier/PERFECT-INTAKE-EXPERIMENT-2026-07-26.md` (run `f3674428-f546-4973-b2a4-ba2b8125f904`).
**BUILD_STAMP (fresh clock):** `risk-citation-dup-fix@2026-07-26T06:24:30Z`.
**Deploy:** `run-cppa-risk-assessment` @ 2026-07-26T07:11Z via Lovable Supabase deploy path (single edge function).

## Target — generator-owned classes only

Two of the six PERFECT-INTAKE failing high findings were attributed to the generator (would-not-vanish under any perfect intake):

**(A) Citation-duplication in two-trigger comparison sentences.** The rationale template pairs a "trigger engaged" and "trigger not engaged" slot but the slot-writer collapses distinct pinpoints (b)(1)–(3) vs (b)(4) into a single string, producing:
- Doc 1: `"§ 7150(b) and § 7150(b) triggers are not engaged"`
- Doc 1: `"cannot simultaneously satisfy both § 7150(b) (systematic observation…) and § 7150(b) (inference from sensitive-location presence)"`
- Doc 2: `"neither 11 CCR § 7150(b)(4) nor 11 CCR § 7150(b)(4) is engaged"`

**(B) ADMT-consequence extrapolation when q18=No.** The (b)(4) profiling trigger remains engaged by q5b, but downstream ADMT-consequence prose (`"may affect decisions enumerated in 11 CCR § 7001(ddd)"`) fires even though `q18_admt_use="No"`.

## Explicit non-target (dispatch discipline)

The intake-value misquote class (`sensitive_location_basis` fabrication reported on Doc 1) is RESERVED for the two-pass architecture. Four prior string-guards have not closed the class; no fifth string-guard is stacked this turn. Attribution counter to `_meta.internal` remains via the existing telemetry blocks.

## Implementation

New module `supabase/functions/run-cppa-risk-assessment/_risk_citation_dup_fix.ts`.

**Invariant (A) — citation-duplication:**
- A sentence is defective iff it contains ≥2 `§ 7150(b)` pinpoint tokens, ≥2 of them share the SAME normalised pinpoint (bare `§ 7150(b)` or `§ 7150(b)(N)` with equal N), AND a comparison connective (`and` / `or` / `nor`) sits between two identical tokens.
- Defective sentences are restructured to single-trigger phrasing by whole-sentence excision (the model NEVER writes a replacement; this is the deterministic "or is restructured to single-trigger phrasing" branch of the dispatch invariant).
- The normaliser strips optional `11 CCR ` prefix and whitespace so tokens compare canonically. Distinct pinpoints across the same connective are NEVER touched.

**Gate (B) — ADMT-consequence suppression:**
- Runs only when `polarityOf(intake.q18_admt_use) === "no"`.
- Excises sentences that either cite `§ 7001(ddd)` OR pair the token `ADMT` (word-boundary) within 120 chars of decision-effects verbs (`decision(s)`, `decision-effects`, `may affect`, `affect(s|ing)? decisions`, `adversely affect`, `will affect`, `consequences`, `significant decisions`).
- Sentences that name `§ 7150(b)(4)` engagement without ADMT-consequence prose are preserved intact (per dispatch: "the (b)(4) profiling trigger itself remains engaged when q5b supports it").

**Anchor / reserved-subtree safety:** identical policy to `_risk_intake_contradiction.ts` — the walker skips `_meta`, `_internal`, `engagement_map`, `annotations`, `opening_summary`, and all anchor keys (`citation`, `verbatim_quote`, `deadline`, `deadline_basis`, `source_fields`, `primary_source_url`, `subsection`, `governing_anchor`, `depth_class`, `proposition_key`, `field`, `field_ids`, `citation_ids`, `intake_field_1`, `intake_field_2`, `canonical_fields`, `element_id`).

**Wiring:** `supabase/functions/run-cppa-risk-assessment/index.ts` calls `applyRiskCitationDupFix(intake, report_data, { buildStamp })` AFTER `applyRiskIntakeContradiction` and BEFORE the LEAK-PREV-P1 emit gate. Telemetry lands on `_meta.internal.risk_citation_dup_fix` (siblings preserved). Boot log echoes `risk_citation_dup_fix_stamp=risk-citation-dup-fix@2026-07-26T06:24:30Z` alongside every prior stamp.

**Preservation of prior guards/stamps:** T2A band-realignment stack, T7 opening builder, T7 pilotfix / pilotfix2, LEAK-PREV P0-P2, W6/W10/W18/W20/W21/W22/W23/W24/W24a-V3, RISK-COHORT-DATE, RISK-INTAKE-CONTRADICTION-BODY, and W9 deadline registry — all imports and telemetry blocks retained verbatim. `BUILD_STAMP` bump is the only stamp change; every prior `*_STAMP` continues to be echoed on boot and in `_meta.internal.*` counters.

## Tests — pasted green

New `supabase/functions/run-cppa-risk-assessment/_risk_citation_dup_fix.test.ts`:

```
running 19 tests from ./_risk_citation_dup_fix.test.ts
A1: bare '§ 7150(b) and § 7150(b)' repeated pinpoint is defective ... ok
A2: 'neither 11 CCR § 7150(b)(4) nor 11 CCR § 7150(b)(4)' is defective ... ok
A3: parenthetical-differentiated but SAME pinpoint on both sides is defective ... ok
A4: DISTINCT pinpoints across the comparison are NOT defective ... ok
A5: single-trigger sentence is NOT defective ... ok
A6: property — every same-pinpoint pair across a connective trips the invariant ... ok
A7: property — distinct pinpoints across a connective NEVER trip ... ok
B1: sentence citing § 7001(ddd) is an ADMT consequence ... ok
B2: 'ADMT ... decisions' prose is an ADMT consequence ... ok
B3: bare § 7150(b)(4) engagement is NOT an ADMT consequence ... ok
E1: fixture doc-1 sentence #1 (repeated bare pinpoint) is excised ... ok
E2: fixture doc-1 sentence #2 (parenthetical-differentiated repeated pinpoint) is excised ... ok
E3: fixture doc-2 sentence (repeated (b)(4) via 'neither…nor') is excised ... ok
E4: ADMT-consequence sentence gated ONLY when q18=No ... ok
E5: reserved subtrees are NOT scrubbed (opening_summary/_meta/annotations) ... ok
E6: anchor fields (citation, verbatim_quote, source_fields) are NOT scrubbed ... ok
E7: idempotent — second pass finds nothing ... ok
E8: fail-open on non-object report ... ok
E9: telemetry stamps version + build_stamp ... ok
ok | 19 passed | 0 failed (48ms)
```

Fixtures E1–E3 are the three observed sentences from run `f3674428` docs 1+2 verbatim; A6/A7 are property tests over every trigger-pair × connective combination.

Existing risk-assessment tests: no changes. Prior V2-band tests, T7 opening tests, W6/W20/W21/W22/W23/W24/W24aV3 tests, RISK-COHORT-DATE and RISK-INTAKE-CONTRADICTION tests all continue to compile and pass under Deno (module imports unchanged; the new scrubber only adds a fresh module and one wiring block).

## Locks (verified pre-deploy)

- **Campaign paused:** `fd1be147` remains CEO-paused per items 116 / 124 / 126 / 127; zero in-flight batches; zero customer-path null-report rows in the last 15 min.
- **No competing waves:** no risk-assessment quality_batch in flight.
- **Instrument frozen:** grader context version = `gc-2026-07-26-s5-eu-uk-ca-au-sg` (unchanged).
- **Contract frozen:** V2 band scaffold from T2A/T2B/T2C untouched. No prompt / rubric / grader / golden / contract / fixture / sample / registry / corpus edits this turn.

## Files landed

1. **NEW** `supabase/functions/run-cppa-risk-assessment/_risk_citation_dup_fix.ts` — deterministic scrubber module.
2. **NEW** `supabase/functions/run-cppa-risk-assessment/_risk_citation_dup_fix.test.ts` — 19 tests / 0 failures.
3. `supabase/functions/run-cppa-risk-assessment/index.ts`:
   - `BUILD_STAMP` → `risk-citation-dup-fix@2026-07-26T06:24:30Z`.
   - Import `applyRiskCitationDupFix`, `RISK_CITATION_DUP_FIX_STAMP`.
   - Boot log echoes the new stamp alongside every prior stamp.
   - New try/catch block (fail-open) invoked after intake-contradiction and before the LEAK-PREV-P1 emit gate; telemetry merged into `_meta.internal.risk_citation_dup_fix`.

## Deploy

Single edge-function deploy: `run-cppa-risk-assessment` (Lovable Supabase deploy path). No other functions touched. No migrations. No quality_batch launched. No prompt / rubric / registry / corpus edits.

## Deviations

None — turn executed exactly per dispatch. Two dispatch invariants (A) and (B) each ship with fixture-verified regression tests plus property tests; the explicit non-target class (sensitive_location_basis fabrication) is left untouched for the two-pass architecture as ordered.
