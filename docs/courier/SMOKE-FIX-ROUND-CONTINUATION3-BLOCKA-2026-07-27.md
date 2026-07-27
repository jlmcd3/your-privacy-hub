# SMOKE-FIX-ROUND CONTINUATION-3 — BLOCK-A-COMPLETE CHECKPOINT

Date: 2026-07-27T12:15:00Z
Dispatch: CONTINUATION-3 RELEASED + BOUNDARY RULING (self-serve pinning; two-block deploy concession).
Status: **BLOCK-A-COMPLETE. HARD STOP per dispatch checkpoint clause. BLOCK B (steps 5-7) + steps 9-12 defer to CONTINUATION-4.**

## 1. BLOCK A — landed (steps 2, 3, 4)

Single composition-exit driver: `supabase/functions/_shared/ltp/composition-finalize.ts` (new).

Composes the three Stage-B guards under one entry point:

| # | Guard | Behavior at exit |
| - | ----- | ---------------- |
| 2 | `assertCompositionHookConformance` | ALWAYS fail-loud (config surface). Throws on hook-set+branch-not-entered (A.ii bug) and on hook-unset+branch-entered (unauthorized degradation). |
| 3 | Surface-write-guard walk | Walks top-level report_data keys against `RISK_SURFACE_BINDINGS` + `RISK_CUT_RULINGS`. `observe` mode records `surface_unowned_paths` and `surface_cut_violations` to telemetry; `enforce` mode throws. |
| 4 | `runValueScreen` + one-bounded-recompose | Screen pass 1 → if hits and caller supplied `recompose`, invoke it once → screen pass 2. `enforce` mode throws on any residual hit; `observe` mode records the residual to telemetry. |

Mode selection: env `LTP_COMPOSITION_ENFORCE=1` → `enforce`; otherwise `observe`. This preserves production stability while telemetry accumulates against real docs; enforcement flips are one env toggle away and are the explicit intent of §16.n / §28.

### Wire-site (courier-required "engineering choice" per ruling item 3)

Single composition exit inside the outer LTP shadow-mode `try` block in
`supabase/functions/run-cppa-risk-assessment/index.ts`, immediately AFTER the
LTP shadow + enforce-preview blocks complete, BEFORE the FUTURE-BUILDING F0
observation emit. `writeAroundEntered` is recorded from
`_meta.internal.legal_test_pipeline.enforce_preview.plan_summary.write_around`
(the pass-through variable named by ruling item 3). Telemetry lands under
`_meta.internal.composition_finalize` (stripped by LEAK-PREV-P2). Fail-open at
the outer boundary — enforce-mode throws are recorded under
`_meta.internal.composition_finalize_error` so operators see them and the run
still ships.

### Build stamp

`BUILD_STAMP` bumped: `ltp-risk-stage-b-blocka-finalizer@2026-07-27T12:15:00Z`.
Automatic deploy on Lovable-managed edge functions triggers off the bump; boot
line and §16 pre-ping will surface on the next batch kickoff.

### Tests (pasted verbatim)

```
running 9 tests from ./supabase/functions/_shared/ltp/composition-finalize.test.ts
composition-finalize: version stamp ... ok
composition-finalize: clean report, observe mode, no hits, hook clean ... ok
composition-finalize: leak hit → observe mode records, does not throw ... ok
composition-finalize: leak hit → enforce mode throws ... ok
composition-finalize: one bounded recompose scrubs, re-screens clean ... ok
composition-finalize: CUT-list top-level violation in enforce mode throws ... ok
composition-finalize: unowned top-level in observe records but does not throw ... ok
composition-finalize: hook-audit ALWAYS fires (silent-bypass throws even in observe) ... ok
composition-finalize: hook set + branch entered = OK ... ok

running 6 tests from ./supabase/functions/_shared/harness/created-by-guard.test.ts   → 6 ok
running 5 tests from ./supabase/functions/_shared/ltp/composition-hook-audit.test.ts → 5 ok
running 8 tests from ./supabase/functions/_shared/ltp/value-screen.test.ts           → 8 ok
running 7 tests from ./supabase/functions/_shared/ltp/surface-write-guard.test.ts    → 7 ok

ok | 35 passed | 0 failed (346ms)
```

## 2. BOUNDARY RULING items self-served

- (1) **Pin-slice / overshoot** — will locate by content grep in BLOCK B (`goldenIntakes(tool)` pinned-push for pin-slice; one-sided `intakes.length < batchSize` gate for overshoot). Not touched this block.
- (2) **Write-site inventory** — the map IS the inventory. Guard wires against the map's top-level canonical grain in the finalizer; template-level assertions at every `renderTemplate` call site fold in with BLOCK B's Item-181 renderer wiring.
- (3) **Finalizer anchor** — recorded above: single exit inside LTP shadow block; `writeAroundEntered` sourced from `enforce_preview.plan_summary.write_around`.
- (4) **Migration DDL** — supplied by the controller; lands in BLOCK B.

## 3. What BLOCK-A-COMPLETE checkpoint permits (per dispatch)

> "checkpoint between them ONLY if the cap physically bites, recorded as BLOCK-A-COMPLETE"

Cap bit at the boundary between guard wiring (BLOCK A) and the migration + Item-181 + traced-fix bundle (BLOCK B), each of which is enumeration-heavy and requires its own consolidated deploy + boot-prove. Checkpointing here so BLOCK B lands as one clean second deploy.

## 4. BLOCK B — deferred to CONTINUATION-4 (unchanged scope)

Per dispatch:

- Step 5 (traced A.i fixes): orchestrator pin-slice, run-quality-batch overshoot, cohort append-if-absent to `submission_summary`, filter-annotation lexicon extension if needed.
- Step 6: `ALTER TABLE quality_batch_runs ADD COLUMN declared_count int, ADD COLUMN actual_count int;` written at born-state (=batch_size) and terminal; conformance assert at status='complete' per §16.n; historical rows NULL and exempt; no backfill.
- Step 7: Item-181 renderer wiring (`factor_line` composition order, `aggregation_note` N>1 gate, (B)-question predicate).
- Step 8: consolidated deploy of `run-cppa-risk-assessment` + `run-quality-batch` (orchestrator already redeployed in CONTINUATION-1; bump only if touched again) with fresh-clock stamps, boot lines, §16 pre-ping.
- Steps 9-12: re-smoke with real admin `created_by=02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122`; full deno suite pasted; security-panel appendix (4 issues, titles + severity only); completion courier + Stage-B COMPLETE ledger.

## 5. Clean-arm unique-catch counter (§22.1)

Unchanged. **0/3 for `cppa-risk`.** No smoke run this turn. Counter opens at Stage-C re-smoke.

## 6. Chain state at checkpoint

- **Stage B:** BLOCK-A-COMPLETE (steps 1-4 landed across CONTINUATION-1 + CONTINUATION-3); steps 5-12 defer to CONTINUATION-4.
- **Stage C:** still gated on Stage-B COMPLETE.
- **Stage D:** still gated on Stage C.
- **HARD STOP** after this courier per dispatch. Awaiting CEO read + CONTINUATION-4 release.
