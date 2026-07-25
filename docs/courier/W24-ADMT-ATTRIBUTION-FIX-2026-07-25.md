# W24-ADMT-ATTRIBUTION-FIX — 2026-07-25

**Dispatch:** `W24-ADMT-ATTRIBUTION-FIX-2026-07-25` (controller tick 18:25Z, five-lens TEAM-REVIEWED).
**Scope:** deploy turn on `run-admt-checker` ONLY. Instrument s4 (`gc-2026-07-25-s4-eu-uk-ca-au-sg`) FROZEN.
**BUILD_STAMP:** `w24-admt-attr@2026-07-25T18:28:00Z`.
**Deployed:** 2026-07-25T18:29:xxZ.

## Part 1 — Attribution verdict

Wave-24 admt (run 113, quality_run `f2c7deca-dd06-481a-9a95-0ab429a2142a`) = **79.10**, down **−4.70** vs wave-23 (run 112, quality_run `21717897-0cd1-4640-9833-856a0ece9bcc`) = **83.80**. First measurement of `W23-ADMT-TURNA` (`w23-admt-turna@2026-07-25T16:42:27Z`, ledger item 70).

Per-check diff (wave-24 vs wave-23, fail_count):

| check_id | W23 | W24 | Δ |
|---|---:|---:|---:|
| rubric_citation_misapplied | 5 | 4 | −1 |
| rubric_generic_boilerplate | 4 | 4 | 0 |
| rubric_unsupported_business_claim | 2 | 4 | **+2** |
| rubric_actionability | 2 | 4 | **+2** |
| e6_counsel_referral | 1 | 1 | 0 (**recurring**) |
| rubric_internal_reasoning_leak | 0 | 1 | **+1 (new)** |
| h7_admt_blanket_range | 0 | 1 | **+1 (new)** |

**Change-to-defect map (W23-turnA T1-T6):**

- **T3 (BARE_COUNSEL_SUBJECT_RE + BRACKETED_ROLE_PLACEHOLDER_RE)** — INSUFFICIENT COVERAGE. The wave-24 `e6_counsel_referral` leak on doc `a87dcff5` is a bracketed **ALL-CAPS advisory sentence** — `[FURTHER INTERNAL LEGAL REVIEW IS ADVISABLE TO CONFIRM …]` — that carries no role-word token (no "legal counsel", "DPO", "privacy officer", "product owner", "legal team"). T3's regex requires one of those tokens, so the sentence flowed through. Attribution: T3 detector class too narrow; product-code fix, not a measurement issue.
- **T1/T4 (resolveOrDropEmptyCitation)** — DOWNSTREAM CONSEQUENCE. `rubric_internal_reasoning_leak` on doc `95d8140f` shows `"No the applicable ADMT-subchapter provision gaps are identified …"` in `priority_actions[0]`. The fallback phrase originates from W19-turnA's registry-first pass when no proposition_key resolves. W23-turnA scrubbed empty citation SLOTS on `opt_out_gaps` but never scrubbed the same fallback phrase when it was **spliced into narrative bodies** on other buckets. Attribution: coverage gap in the W19/W23 chain, not a T1/T4 regression per se; the customer surface must never carry that noun phrase.
- **T2, T5, T6** — no attributable wave-24 regression. T2 stamp-echo persists cleanly; T5 (§ 7155(a)(1) submission-content downgrade) did not cause any of the new fails; T6 (§ 7001 chain downgrade) is orthogonal.

**h7_admt_blanket_range (new, +1)** is a blanket §§ 7220-7222 range emitted as a duty-anchor and is NOT attributable to W23-turnA. Recorded as queued in §2 (see Part 3).

**rubric_unsupported_business_claim (+2)** and **rubric_actionability (+2)** — grader-scope evidence is call-site/fact-ledger consultation gaps at the emitter level, NOT a W23-turnA regression. Queued as a separate turn (see Part 3); this attribution turn's PRODUCT scope closes the two deterministic recurrences.

**Verdict:** W23-turnA did NOT regress output quality across grader classes it targeted (T1/T4/T5/T6 net-neutral, T3 improved on the class it addresses but missed a variant). The wave-24 drop is driven by (a) a T3 detector-class gap that a bracketed ALL-CAPS advisory variant slipped through, (b) a downstream splice of the fallback phrase into narrative bodies that no upstream pass scrubbed, and (c) two grader classes (unsupported_business_claim, actionability) whose fixes require a separate turn. **We fix the PRODUCT code — the instrument stays frozen.**

## Part 2 — Fixes landed

New module `supabase/functions/run-admt-checker/_w24_admt_attr_fix.ts` (fail-open at every helper; wired AFTER `_w23_admt_turna` and BEFORE the LEAK-PREV-P1 emit gate; telemetry only under `_meta.internal.admt_w24_attr` — preserved by the LEAK-PREV-P2 whitelist serializer, no schema edit needed):

1. **`scrubBracketedAdvisorySentence` (T-Aa)** — widens counsel-referral coverage. `BRACKETED_ADVISORY_RE` matches any bracketed sentence containing `LEGAL REVIEW | LEGAL COUNSEL | COUNSEL REVIEW | ADVISABLE | RECOMMENDED | SIGN-OFF | INTERNAL REVIEW | FURTHER REVIEW | FURTHER ANALYSIS | CONFIRM(ATION) BY/WITH | ATTORNEY | OUTSIDE COUNSEL | IN-HOUSE COUNSEL` — no role-word requirement. Replaced with the same `COUNSEL_NEUTRAL` string W23-turnA uses.
2. **`scrubInformationNeededProse` (T-Ab)** — customer-facing prose must NEVER carry information-needed sentences ("More information is needed …", "Additional information is needed …", "Further information is needed …"). The fact is carried by the structured `information_needed` bucket; the sentence is stripped from the narrative. Gap recorded in `_meta.internal.admt_w24_attr.info_needed_prose_scrubs`.
3. **`rewriteOrDropUnresolvedTemplate` (T-B)** — detects the unresolved fallback phrase `"the applicable ADMT-subchapter provision"` (and 2 grammatical variants) anywhere in customer prose. Where the entry carries a `proposition_key`, the phrase is rewritten to the registry-resolved subsection (registry-first, never invented). Where no key resolves, the offending SENTENCE is dropped — never emit unresolved template text.

**Guardrails honored:** anchor keys (`citation`, `verbatim_quote`, `proposition_key`, `id`, `source_fields`, `subsection`, `provision`, `stamp`, `build_stamp`, etc.) never mutated by prose walkers. Fact-ledger consultation preserved (intake-supported claims flow through the earlier ledger pass and are not scrubbed here). LEAK-PREV-P0/P1/P2 chain intact — module runs BEFORE the P1 emit gate. `_meta.internal.admt_w24_attr` rides through the serializer via the existing `_meta.internal` verbatim preservation rule (item 32 gate honored — no whitelist edit required).

## Part 3 — Queued (NOT landed this turn)

- **Resolver key-selection audit** (carried from item 70) and **rubric_unsupported_business_claim ×4 / rubric_actionability ×4** — grader-scope evidence indicates call-site proposition-key choices and fact-ledger consultation gaps at the emitter. Requires a separate deploy turn on `run-admt-checker`; instrument stays frozen. Registry rows themselves not touched.
- **h7_admt_blanket_range** (blanket §§ 7220-7222 duty-anchor) — orthogonal to W23-turnA; queued as its own turn.

## Test run (`deno test _w24_admt_attr_fix.test.ts`)

```
running 13 tests from ./run-admt-checker/_w24_admt_attr_fix.test.ts
stamp format ... ok (0ms)
T-Aa: regression pin doc a87dcff5 — bracketed ALL-CAPS advisory scrubbed ... ok (0ms)
T-Aa: bracketed advisory with SIGN-OFF / RECOMMENDED variants scrubbed ... ok (0ms)
T-Aa: plain bracketed non-advisory left untouched ... ok (0ms)
T-Ab: 'More information is needed' scrubbed ... ok (0ms)
T-Ab: variant 'Additional information is needed' scrubbed ... ok (0ms)
T-Ab: unrelated prose left alone ... ok (0ms)
T-B: regression pin doc 95d8140f — unresolved template dropped in priority_actions body ... ok (0ms)
T-B: unresolved template REWRITTEN when proposition_key resolves ... ok (0ms)
T-B: prose without the fallback phrase untouched ... ok (0ms)
orchestrator: full integration + stamp echo registered ... ok (0ms)
orchestrator: empty report — no crash ... ok (0ms)
orchestrator: idempotency — second pass produces zero counters ... ok (0ms)
ok | 13 passed | 0 failed (9ms)
```

Regression pins: **doc `a87dcff5`** (T-Aa) and **doc `95d8140f`** (T-B) both green.

## Boot-log proof

`supabase/functions/run-admt-checker/index.ts` emits at module load:

```
[run-admt-checker] boot build_stamp=w24-admt-attr@2026-07-25T18:28:00Z
[run-admt-checker] boot admt_attr_w24_stamp=w24-admt-attr@2026-07-25T18:28:00Z
```

## Pre-deploy locks

- `quality_batch_runs` running/pending: **0**
- `cppa_assessments` <15 min old with NULL `report_data`: **0**

Deploy completed before the 19:25Z guard.

## Files changed

- `supabase/functions/run-admt-checker/_w24_admt_attr_fix.ts` (new, ~230 lines)
- `supabase/functions/run-admt-checker/_w24_admt_attr_fix.test.ts` (new, 13 tests)
- `supabase/functions/run-admt-checker/index.ts` (BUILD_STAMP bump; import + wire between W23-turnA and LEAK-PREV-P1 emit gate; boot log)
- `docs/courier/W24-ADMT-ATTRIBUTION-FIX-2026-07-25.md` (this file)
- `docs/pipeline-state.md` (ledger item 76 + header restamp)
