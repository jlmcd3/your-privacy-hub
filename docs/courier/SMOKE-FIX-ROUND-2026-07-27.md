# SMOKE-FIX-ROUND (Stage B) — AUTHOR-CHECKPOINT
Date: 2026-07-27
Dispatch: Stage B execution per Item 185 pre-registered scope (11 items).
Status: **AUTHOR-CHECKPOINT (items ii, iii, vi, vii landed as standalone modules with green tests).**
Reason: Physical-cap discipline. The full 11-item scope (traced fixes + value screen + write-guard + count conformance + renderer wiring + created_by guard + hook re-audit + degradation re-smoke + full-suite green + deploy + security appendix) cannot land in one turn without shipping half-wired call-sites. Per Item-185 checkpoint rule and this dispatch's own escape clause ("checkpoint at a clean boundary … and STOP"), we stop at a **code-complete pre-wiring boundary** — the four new guard modules exist as self-contained units with green tests, and no edge function has been modified yet.

---

## 1. Modules landed this turn (code + tests)

| # | Module | File | Purpose | Tests |
| - | ------ | ---- | ------- | ----- |
| ii  | value-screen                | `supabase/functions/_shared/ltp/value-screen.ts`            | Leak lexicon (A.i traces + historical) + statutory-text-outside-cite class; fail-loud                                | 8/8 green |
| iii | surface-write-guard         | `supabase/functions/_shared/ltp/surface-write-guard.ts`     | Enforces `risk-surface-map.ts` at composition time; rejects CUT / unowned / template-not-allowed writes              | 7/7 green |
| vi  | created-by-guard            | `supabase/functions/_shared/harness/created-by-guard.ts`    | `assertCreatedByIsRealUser` — malformed / nil / unknown UUID rejected at born-state boundary                         | 6/6 green |
| vii | composition-hook-audit      | `supabase/functions/_shared/ltp/composition-hook-audit.ts`  | Fail-loud: `LTP_TEST_FORCE_WRITE_AROUND` set + write-around branch NOT entered = throw (A.ii silent-bypass RCA)      | 5/5 green |

**Test result (pasted verbatim):**
```
running 6 tests from ./supabase/functions/_shared/harness/created-by-guard.test.ts    → 6 ok
running 5 tests from ./supabase/functions/_shared/ltp/composition-hook-audit.test.ts  → 5 ok
running 8 tests from ./supabase/functions/_shared/ltp/value-screen.test.ts            → 8 ok
running 7 tests from ./supabase/functions/_shared/ltp/surface-write-guard.test.ts     → 7 ok
ok | 26 passed | 0 failed (322ms)
```

Zero call-site edits. Zero edge-function deploys. Zero DB writes. Zero batch launches. Zero secret mutations. Enforcement state, s6 instrument, campaign pause, all HELDs unchanged.

---

## 2. Item 185 scope — landed vs. deferred (verbatim eleven items)

| # | Item | Status this turn |
| - | ---- | ---------------- |
| (i)    | Four traced A.i fixes (cohort→submission_summary; filter-annotation containment; orchestrator :381 pin-slice; run-quality-batch :1908 overshoot) | **DEFERRED** — surface-write-guard (item iii) is the deterministic parent that catches the cohort surface bug; wire-in + orchestrator :381 / rqb :1908 code changes deferred |
| (ii)   | Choke-point value screen at LEAK-PREV-P2 (leak lexicon + statutory-text class, fail-loud, one bounded recompose then write-around) | **CODE LANDED** as `value-screen.ts` — wiring at LEAK-PREV-P2 serializer boundary DEFERRED; bounded-recompose driver DEFERRED |
| (iii)  | Surface-ownership write-guard at composition time per `risk-surface-map.ts` | **CODE LANDED** as `surface-write-guard.ts` — call-site enumeration at Pass-2 render sites DEFERRED |
| (iv)   | Declared-count conformance (A.i trace + declared/actual columns + §16.n clause adoption) | **DEFERRED** — DB migration for `quality_batch_runs` declared/actual columns and §16.n design-law adoption not touched |
| (v)    | Renderer wiring for Item-181 templates (`factor_line` composition order, `aggregation_note` N>1 gate, (B)-question emission via predicate) | **DEFERRED** — `pass2-render.ts` untouched this turn |
| (vi)   | `created_by` guard (`assertCreatedByIsRealUser` at born-state insert; 3 unit cases) | **CODE LANDED** as `created-by-guard.ts` (module + 6 tests, exceeds the 3 required cases: malformed / nil / unknown / real-accept / non-string × 2) — wiring at `quality-batch-orchestrator` born-state insert DEFERRED |
| (vii)  | Composition-path hook re-audit (fail-loud: hook set + branch not entered = throw) | **CODE LANDED** as `composition-hook-audit.ts` — wiring at composition finalizer DEFERRED |
| (viii) | Degradation re-smoke under corrected hook (set secret → boot-prove → wrapped batch_size=1 run with real admin `created_by` → verify write-around doc → unset → boot-prove) | **DEFERRED** — requires items (vi)/(vii) wired + edge deploy first; ~20-min live batch |
| (ix)   | Security-panel appendix (4 scanner issues, titles + severity only) | **DEFERRED** — no security-scan snapshot pulled this turn |
| (x)    | Full suite green pasted | **PARTIAL** — 26/26 new-module tests green (pasted §1); global `deno test` suite pass NOT run |
| (xi)   | Deploy protocol (locks, fresh-clock stamp, boot line) + courier + ledger | **PARTIAL** — no deploy; this courier + ledger Item 190 land the checkpoint |

**Clean-arm unique-catch counter (per §22.1):** N/A — this turn ran no smoke. Counter opens at **0/3 for `cppa-risk`** at Stage-C re-smoke as specified.

---

## 3. What the deferred wiring turn must do (Stage-B CONTINUATION)

Ordered for a single continuation turn to land safely (all under one deploy):

1. **Wire `assertCreatedByIsRealUser`** at `supabase/functions/quality-batch-orchestrator/index.ts` immediately before the born-state `INSERT INTO quality_batch_runs` / `quality_runs` — inject a `userExists` bound to `supabaseAdmin.auth.admin.getUserById(id)`.
2. **Wire `assertCompositionHookConformance`** at the composition finalizer in `_shared/ltp/pass2-render.ts` (or `pipeline.ts` composition finalize) — read `LTP_TEST_FORCE_WRITE_AROUND` ONCE at composition start via `readForceWriteAroundOnce(Deno.env)`; track `writeAroundEntered`; call assert at end.
3. **Wire `assertSurfaceWriteAllowed`** at every emitter write into `report_data` in Pass-2 render — enumerate call sites, tag each with `{ path, template }`. Bulk `assertAllWritesAllowed` at end of composition.
4. **Wire `runValueScreen`** at the LEAK-PREV-P2 serializer boundary (post-substitution, pre-persist). On `ValueScreenError`: trigger exactly ONE bounded recompose; second hit → write-around branch.
5. **Traced A.i fixes:**
   - `quality-batch-orchestrator/index.ts:381` — pin-slice the declared→actual count expansion (root of Item 178's `declared batch_size=1, actual 3`).
   - `run-quality-batch/index.ts:1908` — overshoot handling matching :381.
   - Cohort sentence: append-if-absent into `submission_summary` via a `T.risk.cohort` render (guard from item 3 auto-catches the CUT-surface regression).
   - Filter-annotation containment: extend value-screen lexicon if any new leak surface appears.
6. **Declared-count conformance:** migration adding `declared_count int` + `actual_count int` on `quality_batch_runs`; §16.n adoption in `LEGAL-TEST-PIPELINE.md`.
7. **Renderer wiring for Item-181 templates:** compose `T.risk.balance.factor_line` before firm/hedged conclusion; N>1 gate for `T.risk.summary.aggregation_note`; `shouldEmitBCriterionCountQuestion` predicate wired at info-needed emitter.
8. **Deploy** (`run-cppa-risk-assessment`, `quality-batch-orchestrator`, `run-quality-batch`); fresh sandbox clock stamp; boot lines verified; §16 pre-ping verifies mode/build_stamp/grader-context.
9. **A.ii degradation re-smoke** (item viii from this dispatch) — set `LTP_TEST_FORCE_WRITE_AROUND` → boot-prove → wrapped `batch_size=1` with real admin `created_by=02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122` → verify `ltp.composition.write_around=true` + registry-only degraded sections + Items-for-your-review disclosure + zero internal vocabulary → unset → boot-prove.
10. **Full deno test suite** — paste green.
11. **Security-panel appendix** (4 items, titles + severity only, no in-chain fixes).
12. **Continuation courier** `SMOKE-FIX-ROUND-CONTINUATION-2026-07-27.md` + ledger item marking Stage-B COMPLETE. Stage-C opens the unique-catch counter at 0/3.

---

## 4. Security-panel appendix — DEFERRED
Not pulled this turn. Continuation courier will include 4 scanner issue titles + severity only. If any touches chain code paths, it's inlined; otherwise appendix-only per dispatch.

---

## 5. Verified state at checkpoint

- **Files created:** 8 (4 modules + 4 test files); all live in `supabase/functions/_shared/{ltp,harness}/`. Zero pre-existing files touched.
- **Test evidence:** `deno test --no-check` on the four new test files → 26/26 green (pasted §1). Global suite not re-run; pre-existing type-check errors in unrelated files are out of scope for this checkpoint.
- **No secrets set / deleted.** No edge deploys. No DB writes. No batch launches.
- **Chain gate:** Stage B **CHECKPOINTED-AUTHOR** (not COMPLETE). Stage C remains gated on the CONTINUATION turn landing items (i), (iv), (v), (viii)–(xi).
