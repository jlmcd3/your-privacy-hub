# ITEM 281 — PASS-2R CLOCK-BUDGET FIX (Track 2, cppa-risk, Step 0a)

Date: 2026-07-30
Authority: CEO fleet-rebuild directive 2026-07-30; four-lens UNANIMOUS; content delegation per Plan §0.3 law 15.
Turn class: CLOCK-BUDGET FIX + LEDGER RECORD. **One variable only.** No prompt change, no validator change, no schema change.

## 1. Evidence

From `replay_harness_results`, job `343e35d0-2600-41cc-9b0a-4fde13c9afe5` (first-ever live Pass-2R invocation), doc `0754dbc8-5976-4b5b-9b4f-af929176ce9e`:

- `anthropic_attempt_abort: ltp-pass2r-prose aborted after 90002ms (limit 90000ms)` — **×2**
- terminal error: `pass2r_stage_budget_exhausted`
- `validator_outcomes: []`
- `shipped_surface: "deterministic"`

Both attempts aborted at exactly the self-imposed cap. A `max_tokens=6000` prose generation cannot complete in 90s at typical Sonnet throughput. **This is a mechanical budget defect, not a prompt or model defect.** The fallback law held and observe mode held: no customer surface was affected.

## 2. The change (exactly two constants)

`supabase/functions/_shared/ltp/pass2r-llm.ts`

| Constant | File:line (post-change) | Old | New |
| --- | --- | --- | --- |
| `PASS2R_PER_ATTEMPT_TIMEOUT_MS` | `pass2r-llm.ts:53` | `90_000` | `170_000` |
| `PASS2R_STAGE_CEILING_MS` | `pass2r-llm.ts:54` | `180_000` | `360_000` |

`PASS2R_MAX_ATTEMPTS` (3) and `PASS2R_MAX_TOKENS` (6_000) are **unchanged**.

`PASS2R_MANIFEST` (`pass2r-llm.ts:59`) echoes both constants by reference (`per_attempt_timeout_ms: PASS2R_PER_ATTEMPT_TIMEOUT_MS` at `pass2r-llm.ts:65`, `stage_ceiling_ms: PASS2R_STAGE_CEILING_MS` at `pass2r-llm.ts:66`), so the ping surface's declared-vs-actual assertion now reports **170000 / 360000**. The harness echoes the manifest at `supabase/functions/replay-cppa-risk-harness/index.ts:305` (`pass2r_manifest: PASS2R_MANIFEST`).

An in-file comment at `pass2r-llm.ts:49–52` records the evidence and the arithmetic: 2 × 170s = 340s < 360s ceiling.

## 3. Test pin updated

`supabase/functions/_shared/ltp/item278-pass2r.test.ts:84–85` pinned the old values; both updated in this same turn:

```
  assertEquals(PASS2R_PER_ATTEMPT_TIMEOUT_MS, 170_000); // Item 281
  assertEquals(PASS2R_STAGE_CEILING_MS, 360_000); // Item 281
```

### Verbatim test output

```
running 11 tests from ./supabase/functions/_shared/ltp/item278-pass2r.test.ts
manifest pins the §2R.6 model and budget ... ok (0ms)
adapter — injected provider, clean pass, observe never ships 2R ... ok (44ms)
adapter — validator reject retries at most twice and feeds the reason back verbatim ... ok (11ms)
adapter — transport failure and malformed output both fall back, never throw ... ok (3ms)
plan lock — 2R receives a deep-frozen plan; write-back is impossible ... ok (1ms)
prose_pass=false is byte-identical to a no-2R run ... ok (27ms)
FALLBACK LAW — a 2R failure ships the deterministic document byte-identically ... ok (22ms)
observe mode ships deterministic even when every validator passes ... ok (14ms)
spend guard — 2R is skipped fail-closed when the release switch is off ... ok (6ms)
clock budget — 2R is skipped when the remaining budget is under the stage ceiling ... ok (6ms)
enforce branch exists, is all-or-nothing, and nothing in the codebase sets it ... ok (7ms)

ok | 11 passed | 0 failed (156ms)
```

No test that passed before this turn fails now. Tolerated-failure inventory unchanged: the 3 stale-pin failures (Item 273/278 inventory) + the `BiometricRailEntries.ts` R1 rail-lint failure.

## 4. Double-check clause

**Grep proving no stale 2R-stage occurrence of 90000/180000 remains** (`rg -n "90_000|180_000|90000|180000" supabase/functions/_shared/ltp/`):

```
supabase/functions/_shared/ltp/pass2r-llm.ts:49:// Item 281 (2026-07-30): raised from 90_000/180_000 on evidence from job
supabase/functions/_shared/ltp/retry-budget.branch-correction.test.ts:46:  // remaining = 900_000 - 60_000 = 840_000; cap = 840_000 - 180_000 = 660_000
supabase/functions/_shared/ltp/retry-budget.ts:33:export const POST_RETRY_RESERVE_MS = 180_000;          // 3 min: finalize + serializer + persist
```

The only three hits are (a) the historical note inside this turn's own comment, and (b) `POST_RETRY_RESERVE_MS` plus its test comment — the **Pass-1 post-lint retry reserve**, an unrelated budget that this dispatch does not touch. **No live 2R-stage constant remains at the old values.**

**`run-cppa-risk-assessment` untouched.** Files changed this turn, exhaustively:

```
supabase/functions/_shared/ltp/pass2r-llm.ts
supabase/functions/_shared/ltp/item278-pass2r.test.ts
docs/pipeline-state.md
docs/courier/ITEM281-PASS2R-CLOCK-FIX-2026-07-30.md   (new)
```

No path under `supabase/functions/run-cppa-risk-assessment/`, no legacy function, and no DPA file appears in that list.

## 5. Deploy confirmation

`replay-cppa-risk-harness` deployed (it inlines the shared module). **No other function deployed.** No harness invocation this turn — the controller runs replay jobs.

New manifest echo on the ping surface:

```
pass2r_manifest: {
  stamp: "ltp-pass2r-llm-2026-07-30-item278",
  model: "claude-sonnet-4-6",
  max_attempts: 3,
  per_attempt_timeout_ms: 170000,
  stage_ceiling_ms: 360000,
  max_tokens: 6000
}
```

## 6. Four-lens record (UNANIMOUS)

- **LEGAL.** No customer surface. Observe mode only; the fallback law is absolute — a 2R failure still ships the deterministic document byte-identically. No representation to any customer changes.
- **COMPUTER SCIENCE.** Clock budgets remain bounded: 2 × 170s = 340s < the 360s stage ceiling, and the stage is still skipped fail-closed when remaining budget is under the ceiling. Single-doc parallel jobs bound isolate exposure. The fail-closed env gates (`LTP_ENFORCE_ENABLED`, release switch) are untouched.
- **PROMPT ENGINEERING.** No prompt variable moves. The experiment variable is the clock budget alone; the one-variable law is preserved for the calibration A/B that follows.
- **PROSE.** No register consequence until prose exists. This fix is precisely what lets prose exist.
