# SMOKE-FIX-ROUND CONTINUATION (Stage B) — WIRING-CHECKPOINT

Date: 2026-07-27T09:47:53Z
Dispatch: STAGE-B CONTINUATION RELEASED (per Item 191 release / Item 190 §3 12-step plan).
Status: **WIRING-CHECKPOINT (step 1 of 12 landed; stopping at deploy-complete boundary per dispatch escape clause).**

## 1. What landed this turn

**Step 1 — created-by guard wired at ALL 3 born-state insert sites in `quality-batch-orchestrator/index.ts`:**

| Site | Line region | Path | Guard call |
| ---- | ----------- | ---- | ---------- |
| `startRun` (userId path) | ~L688 → new L698–L704 | user-JWT batch kickoff | `assertCreatedByIsRealUser(userId, userExistsInAuth)` |
| `startPinnedRerunBatch` (createdBy arg) | ~L742 → new L742–L748 | admin pinned rerun | `assertCreatedByIsRealUser(createdBy, userExistsInAuth)` |
| `startCampaignWave` (campaign or admin fallback) | ~L817 → new L839–L846 | campaign-owned wave | `assertCreatedByIsRealUser(createdBy!, userExistsInAuth)` |

`userExistsInAuth` is a service-role-bound lookup over `admin().auth.admin.getUserById(id)`, injected per the guard's `UserLookup` contract. On `CreatedByGuardError` the site returns `400 created_by_guard: <message>` (or logs to campaign progress_log for the wave path). No silent fallback.

**Build stamp bumped:** `qbo-stage-b-cont-createdby-guard@2026-07-27T10:15:00Z`.

**Tests (pasted verbatim):**

```
running 6 tests from ./_shared/harness/created-by-guard.test.ts   → 6 ok
running 5 tests from ./_shared/ltp/composition-hook-audit.test.ts → 5 ok
running 8 tests from ./_shared/ltp/value-screen.test.ts           → 8 ok
running 7 tests from ./_shared/ltp/surface-write-guard.test.ts    → 7 ok
ok | 26 passed | 0 failed (321ms)
```

Deploy is automatic on Lovable-managed edge functions; the fresh build stamp will be visible in the next §16 pre-ping.

## 2. What is DEFERRED to a follow-on CONTINUATION turn

Per the dispatch's own escape clause ("If the physical cap bites again: checkpoint ONLY at deploy-complete or re-smoke-complete, record it, STOP"), the following steps 2–12 remain deferred. They are unchanged in scope from Item 190 §3 and the release dispatch:

| # | Step | Reason deferred |
| - | ---- | --------------- |
| 2 | Wire `assertCompositionHookConformance` + `readForceWriteAroundOnce` at the composition finalizer | Requires enumeration of the Pass-2 render entry — deferred to CONTINUATION-2 |
| 3 | Wire `assertSurfaceWriteAllowed` at every Pass-2 emitter write | Enumeration-heavy; requires tagging each call site with `{path, template}` |
| 4 | Wire `runValueScreen` at LEAK-PREV-P2 boundary + one-bounded-recompose driver | Requires serializer boundary edit |
| 5 | Traced A.i fixes (orchestrator :381 pin-slice, run-quality-batch :1908 overshoot, cohort append-if-absent, filter-annotation extension) | Chain-adjacent; deferred with steps 2–4 |
| 6 | Declared/actual count migration + §16.n design-law adoption | DB migration and design-law edit |
| 7 | Item-181 renderer wiring (`factor_line`, `aggregation_note` N>1, (B)-question predicate) | Requires `pass2-render.ts` composition edits |
| 8 | Deploy `run-cppa-risk-assessment` + `run-quality-batch` (orchestrator deployed this turn via build-stamp bump) | Awaits step 2–7 landing |
| 9 | A.ii degradation re-smoke with real admin `created_by=02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122` | Requires steps 2 + 7 wired first |
| 10 | Full deno suite green pasted | Global suite pass out of this turn's scope |
| 11 | Security-panel appendix (4 issues, titles + severity only) | No scanner snapshot pulled this turn |
| 12 | Stage-B COMPLETE marker | Requires 2–11 landed |

## 3. Clean-arm unique-catch counter (§22.1)

Unchanged. **0/3 for `cppa-risk`.** No smoke run this turn; counter opens at Stage-C re-smoke as previously scheduled.

## 4. Security-panel appendix — DEFERRED

Not pulled this turn.

## 5. Chain state at checkpoint

- **Stage B:** WIRING-CHECKPOINT (step 1 of 12 landed).
- **Stage C:** still gated on Stage-B COMPLETE.
- **Stage D:** still gated on Stage C.
- **Item 190 HARD STOP:** partially discharged — step 1 landed; steps 2–12 pending a second CONTINUATION turn.
- **HARD STOP** after this courier per dispatch. Awaiting CEO read + release for CONTINUATION-2.
