# T-M7.1 TEST BOOKKEEPING PASS — cppa-risk

**Dispatch:** CONTROLLER DISPATCH — T-M7.1 (CEO-released chain).
**Turn timestamp:** 2026-07-28T07:13Z.
**Ledger:** Item 228.
**Scope discipline:** the 18 residual failures enumerated in the T-M7
courier §Residual failures, plus one constant (`WRONG_DATE_RE_25_50M`).
**TEST-FILE CHANGES ONLY** — one dispatch-authorized product-code
micro-change under ruling (d) (dead-code removal, zero runtime effect).

---

## 1. Deliverables

- Deletion of 13 stale wave-test files whose only assertions were
  BUILD_STAMP-exports or module-shape pins on modules retired /
  subsumed at T-M7 (`SUBSUMED_GUARDS` in `_shared/ltp/pipeline.ts`).
- Version-pin update in `_risk_cohort_date.test.ts` to the shipped
  `risk-cohort-date-v2-truth-table-2026-07-27`.
- Contract-aligned rewrite of RCD no-op-band tests to match the V2
  truth-table (all four resolved real bands emit their corpus-pinned
  literal; only `unspecified` and `legacy_25_100m` remain no-emit).
- Substring-target correction: assertions on the deterministic sentence
  swapped from the long-form corpus-pin constant
  `DETERMINISTIC_COHORT_SENTENCE_25_50M` to the short-form
  `EMITTED_SENTENCE_25_50M` actually produced by
  `deterministicSentenceFor("25_50m")`.
- `retry-budget.test.ts::wall_clock_insufficient` retargeted to assert
  that the branch is **unreachable** under the current SMOKE-HANG
  BRANCH-CORRECTION constants — flipping any future ceiling tightening
  that revives the branch into a failing test.
- Ruling-(d) product-code micro-edit: dead helper
  `exciseWrongCohortSentences` and its sentinel `WRONG_DATE_RE_25_50M`
  removed from `_risk_cohort_date.ts` with an in-file provenance
  comment (see §5 below for rationale).

---

## 2. Deleted files (ruling (a))

```
run-cppa-risk-assessment/_w6_risk_fix.test.ts
run-cppa-risk-assessment/_w9_risk_slots.test.ts
run-cppa-risk-assessment/_w10_risk_b1.test.ts
run-cppa-risk-assessment/_w12_turnd.test.ts
run-cppa-risk-assessment/_w15_risk_fl.test.ts
run-cppa-risk-assessment/_w15_risk_va.test.ts
run-cppa-risk-assessment/_w16_risk_collapse.test.ts
run-cppa-risk-assessment/_w18_risk_collapse2.test.ts
run-cppa-risk-assessment/_w18_risk_vocab.test.ts
run-cppa-risk-assessment/_w19_risk_turnb.test.ts
run-cppa-risk-assessment/_w20_risk_turnb.test.ts
run-cppa-risk-assessment/_w24_risk_turna.test.ts
run-cppa-risk-assessment/_w24a_v3.test.ts
```

Each file pinned a BUILD_STAMP or module-shape assertion whose target
module was retired or subsumed in T-M7. The T-M7 courier's per-module
preservation table already recorded the retirements; T-M7.1 completes
the bookkeeping by removing the orphan tests.

## 3. Contract-aligned reversals (rulings (b) + (c))

**Version pin (b):**

```diff
- assertEquals(RISK_COHORT_DATE_VERSION, "risk-cohort-date-v1-2026-07-26");
+ assertEquals(RISK_COHORT_DATE_VERSION, "risk-cohort-date-v2-truth-table-2026-07-27");
```

**No-op band block (c):** the old loop asserted no-emit for five bands,
which was correct only under the V1 (25–50M-only) module. Under V2 the
truth-table gives four resolved real bands their own corpus-pinned
dates; only `legacy_25_100m` remains an OMISSION-OVER-INVENTION no-op.
Rewritten to a 4-band `for..of` emitting per-band `emit=1` assertions
plus a single `legacy_25_100m` no-op case.

**Emitted-sentence substring (c):** V2's `deterministicSentenceFor`
appends the shorter form `Per 11 CCR § 7121(a)(3), the first
cybersecurity audit report is due April 1, 2030 (audit period January
1, 2029 through January 1, 2030).` The exported constant
`DETERMINISTIC_COHORT_SENTENCE_25_50M` appends a trailing
"for a business whose 2028 annual gross revenue was less than
$50,000,000." clause and is retained only as a corpus-pin (registry
drift trips CI). Assertions now compare against `EMITTED_SENTENCE_25_50M`.

**T-C1 fold-in (c):** `_w9_risk_slots.test.ts::buildAttestationBlock`
asserted `/7156/` on `statutory_basis`, but the shipped attestation
emits `"§ 7157(b)(5), § 7157(c)"` — § 7156(a) was removed as unverified
in `provision_texts` (see comment at `_w9_risk_slots.ts:159`). Test
retired with the file under (a). Similarly, `_w18_risk_vocab.test.ts`
tripped on the T-C1-added `bought_sold_shared_count` field being
present in `RISK_INTAKE_FIELD_IDS` (derived from `cppaRiskContract`)
but absent from `RISK_INTAKE_LABELS`. The vocab-scrub module is
subsumed per T-M7 with no runtime consumer, so the test retires under
(a); the labels-map staleness is filed as a **queued cleanup** for a
future dispatch if any consumer is ever re-wired.

## 4. Retry-budget branch (c)

Current constants (`_shared/ltp/retry-budget.ts`):

- `ISOLATE_CEILING_MS = 900_000`
- `MAX_ELAPSED_FOR_RETRY_MS = 240_000`
- `POST_RETRY_RESERVE_MS = 180_000`
- `MIN_RETRY_WINDOW_MS = 30_000`

For `wall_clock_insufficient` to fire, we need
`retryCapMs < MIN_RETRY_WINDOW_MS`, i.e.
`ISOLATE_CEILING − elapsedMs − POST_RETRY_RESERVE < 30s`,
i.e. `elapsedMs > 690s`. But the elapsed-threshold check fires first
for `elapsedMs > 240s` (`elapsed_threshold_exceeded`), so
`wall_clock_insufficient` is unreachable. The prior test pinned the
OLD constants (330s ceiling / 90s reserve) under which the branch was
reachable. Rewritten to assert the branch stays dead — any future
ceiling tightening that revives it will trip a real assertion.

## 5. Ruling (d) — dead helper removal

The dispatch permits (d) to either restore
`WRONG_DATE_RE_25_50M` to its real regex or remove it explicitly with
rationale if genuinely obsolete under the V2 truth-table module.

**Rationale for removal:**

- The sentinel had only one consumer: `exciseWrongCohortSentences`, a
  single-band (25–50M) helper.
- `exciseWrongCohortSentences` has **no remaining call sites** in the
  codebase. `walkExcise` invokes only the band-aware
  `exciseAnyWrongCohortSentences` matching against `ALL_COHORT_DATE_RE`,
  which handles every cohort year (2028/2029/2030) against the
  resolved correct date for ANY band.
- Restoring the constant to a real regex would resurrect a dead
  code-path whose narrower regex would silently miss wrong-date
  sentences for the 2028 and 2029 cohorts under V2.

Both the helper and the constant are removed. An in-file provenance
comment at `_risk_cohort_date.ts:154` records the rationale so future
grep-based investigations land on the retirement note. This is the
**sole product-code edit in this turn** and is scope-authorized by
ruling (d).

Zero runtime behaviour change (function was unreachable) — no deploy
required.

## 6. Verification

```
$ deno test --no-check --allow-env --allow-read --allow-net \
    _shared/ltp/ run-cppa-risk-assessment/
...
266 passed | 1 failed (2m 4s)

FAILED:
  pass1-llm: write-around fallback preserves customer path on gateway missing key
             (_shared/ltp/waveb.test.ts:22:6)
```

**All 18 enumerated residuals from T-M7 courier §Residual failures:
CLEARED.**

## 7. Residual (out-of-scope, queued)

`pass1-llm: write-around fallback preserves customer path on gateway
missing key` (1 failure) is a **pre-existing out-of-scope hang** first
noted in the T-M7 courier itself as
`pass1-llm live-network probe timeout also queued T-M7`. It is not one
of the 18 enumerated residuals for T-M7.1.

Root-cause hypothesis (unverified this turn — not addressed under
T-M7.1's test-file-only mandate): after PRE-WAVE-D EMITTER FIXES
2026-07-27 rewired Pass-1 to the direct Anthropic client, the test
deletes `LOVABLE_API_KEY` to force the write-around fallback, but
Pass-1 now attempts the Anthropic path against `ANTHROPIC_API_KEY`
before the fallback fires, blocking on network. Queued as a separate
product-code investigation ticket for a future dispatch (either
extend the test's env-scrub to include `ANTHROPIC_API_KEY`, or add an
outer wall-clock guard, per CEO ruling).

## 8. Next per Item 218 plan

**T-M8 — production smoke on the assembler-body path** (this was
originally queued as the T-M7 smoke). HARD STOP awaiting release.
