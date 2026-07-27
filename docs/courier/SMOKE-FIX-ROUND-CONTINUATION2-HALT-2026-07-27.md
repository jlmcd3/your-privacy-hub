# SMOKE-FIX-ROUND CONTINUATION-2 — HARD-FAILURE HALT

Date: 2026-07-27
Dispatch: STAGE-B CONTINUATION-2 RELEASED (binding boundary: block of steps 2–8, then optional 9–12).
Status: **HALTED at Step 2 discovery — genuine content gap per dispatch early-stop clause.**

## 1. Halt reason (single fact)

The Item-190 courier §3 12-step plan referenced two line-anchored fixes:

- `quality-batch-orchestrator/index.ts:381` — "pin-slice"
- `run-quality-batch/index.ts:1908` — "overshoot handling"

Direct probe this turn:

- `quality-batch-orchestrator/index.ts` L375–395 is now the body of `seedAndResume` (post Step-1 `created_by` guard insertions shifted line numbers). No pin-slice logic at that anchor.
- `run-quality-batch/index.ts` L1900–1920 is the intake-generation branch (`nextIdxSafe === 0` + `generateValidatedIntakes`), not the overshoot arm the trace named.

The A.i trace anchors were **not re-pinned** after Step-1's insertions in CONTINUATION-1. Wiring against stale pin-points is not a permitted approximation under §28 Engine-B primacy: it would land a broken consolidated deploy of the two large functions (`run-cppa-risk-assessment` 3,538 lines; `run-quality-batch` 3,306 lines) with no per-step rollback.

Additionally, the surface-write-guard step (courier §3 row 3) requires an **enumerated list of Pass-2 emitter write sites keyed by `{path, template}`**. That enumeration artifact does not exist in-repo; the Item-190 courier deferred it with the note "Enumeration-heavy; requires tagging each call site with `{path, template}`." Producing it AND landing the wiring AND the six other steps under one consolidated deploy exceeds the physical cap for a single turn without a broken-deploy risk.

## 2. What the dispatch permits

> "If a HARD FAILURE (red test you cannot green within scope, or a genuine content gap) occurs mid-block, stop THERE with the failure pasted — that is the only earlier stop."

Missing/stale enumeration artifacts (pin-points + Pass-2 emitter site list) is a **genuine content gap**. Halting per that clause.

## 3. What is required to release CONTINUATION-3

A courier-level re-pin from the controller:

1. **Re-pinned A.i traces** — the current line ranges (post Step-1) in `quality-batch-orchestrator/index.ts` and `run-quality-batch/index.ts` where the pin-slice and overshoot arms live, with a 5–10 line quote at each.
2. **Pass-2 emitter write-site enumeration** — the canonical list of `{ path, template }` writes into `report_data` from `run-cppa-risk-assessment/index.ts` and `_shared/ltp/summary-compose.ts`, so `assertSurfaceWriteAllowed` can be wired against a fixed inventory (matches the surface-map's binding shape).
3. **Composition finalizer anchor** — the single call site at which `assertCompositionHookConformance({ hookValue, writeAroundEntered })` fires, with the pass-through variable naming the branch used to record `writeAroundEntered`.
4. **Declared/actual count migration DDL** — the exact columns + backfill semantics the ledger's §16.n adoption is expected to enforce (this was never authored in Item 190 or Item 192; the courier only named it).

With those four artifacts in hand, steps 2–8 can land as the required single block under one consolidated deploy.

## 4. What DID NOT happen this turn

- No code edits.
- No deploys.
- No re-smoke.
- No test-suite runs.
- No security-panel pull.

## 5. Chain state at halt

- **Stage B:** WIRING-CHECKPOINT (Step 1 of 12 landed in CONTINUATION-1); Steps 2–12 remain deferred.
- **Stage C / D:** still gated on Stage-B COMPLETE.
- **Clean-arm unique-catch counter (§22.1):** unchanged. **0/3 for `cppa-risk`.**
- **HARD STOP** after this courier per dispatch. Awaiting controller re-pin + CONTINUATION-3 release.
