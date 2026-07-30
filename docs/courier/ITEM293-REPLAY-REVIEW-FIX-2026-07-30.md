# ITEM 293 — /admin/replay-review BATCH SELECTION FIX (2026-07-30)

**Authority:** CEO report 2026-07-30 — "the page is not showing the new documents; all of them show that they were part of the 269 run."
**Class:** frontend-only. No backend change, no edge-function deploy, no engine/emitter change, no harness invocation, no DPA files.

---

## 1. Selection-logic autopsy (pre-fix)

| Evidence | File:line (pre-fix) | Effect |
|---|---|---|
| Hardcoded batch pin | `src/pages/admin/AdminReplayReview.tsx:18` — `const ACCEPTANCE_NOTE_PREFIXES = ["Acceptance-40", "Ramp step 1, attempt 9"];` | Only Item-269-era campaigns were ever eligible |
| Jobs query — no ordering, no filter pushdown | `:73-75` — `.from("replay_harness_jobs").select("id, notes, created_at")` | Arbitrary order; every job fetched then discarded client-side |
| Client-side discard of every newer batch | `:81-83` — `(jobs ?? []).filter(j => ACCEPTANCE_NOTE_PREFIXES.some(p => String(j.notes ?? "").startsWith(p)))` | Batches 1–4 (`Step 0a — CLEAN RUN batch 4 …`, created 2026-07-30 22:15–22:23Z) never reached the results query |
| Results query scoped to the pinned jobs only | `:90-94` — `.in("job_id", wanted.map(j => j.id))` | Newest results unreachable |
| Fixed heading | `:173` — `Replay Review — Acceptance-40` | Reinforced the impression that everything is the 269 run |
| Fixed modal caption | `:276` — `harness assembled_report (build item-269)` | Hardcoded string; every open report claimed item-269 |

**Server-side pin check — NEGATIVE.** The page reads the base tables `replay_harness_jobs` / `replay_harness_results` directly via PostgREST; no view or RPC mediates the job selection. `admin_replay_fetch_legacy_doc` is used only for per-document entity/sector/legacy metadata and takes a `p_doc_id` argument — it constrains nothing about batch selection. The pin was entirely client-side, so the fix is entirely frontend, as scoped.

---

## 2. Fix (old → new)

All changes in `src/pages/admin/AdminReplayReview.tsx`.

1. **Pin deleted.** `ACCEPTANCE_NOTE_PREFIXES` and the `.filter(...)` at `:81-83` are removed outright.
2. **All jobs, newest first.** Jobs query is now
   `.select("id, notes, status, created_at, doc_ids").order("created_at", { ascending: false })`,
   with `sortJobsNewestFirst()` re-applied client-side as a belt-and-braces ordering pin.
3. **Job table.** A jobs table lists every job newest-first with `created_at`, batch label (`notes`), `status`, and doc count (`doc_ids.length`). Clicking a row selects that batch.
4. **Batch dropdown.** `batchLabels(jobs)` yields distinct labels in newest-first order of first appearance; `defaultBatchLabel(jobs)` selects the label of the most recent job on load — today that is `Step 0a — CLEAN RUN batch 4 (post-Item-290, 20 docs, CEO read gate)`. One click reaches any earlier batch, including the Item-269-era `Acceptance-40*` and `Ramp step 1, attempt 9` labels.
5. **Results follow the selection.** Results load for the selected batch's job ids only, with the unchanged latest-per-`doc_id` dedupe and the unchanged per-doc GTM verdict / material / unclassified / logged-defects / presence columns.
6. **Captions de-hardcoded.** Heading is now `Replay Review`; the modal caption reports the row's own batch label instead of the literal "build item-269".
7. **Unchanged:** the admin gate (`ProtectedRoute` + `AdminOnly` in `src/App.tsx`), `openReport`, `downloadPdf` (`generate-report-pdf`, `mode: "replay_harness"`), the legacy side-by-side toggle, and the `toViewerReport` Item-274 page-boundary adapter.

Exported pure helpers for pinning: `sortJobsNewestFirst`, `batchLabels`, `defaultBatchLabel`, `jobLabel`.

---

## 3. Tests

`src/test/item293-replay-review-batches.test.ts` — newest-first ordering pin, default-filter pin (most recent batch label selected on load), regression that Item-269-era labels (`Acceptance-40 final`, `Ramp step 1, attempt 9`) remain reachable through the filter, unlabelled-job handling, and the empty-jobs case.

Verbatim output:

```text
 RUN  v3.2.4 /dev-server

 ✓ src/test/item293-replay-review-batches.test.ts (5 tests) 5ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  22:35:14
   Duration  5.31s (transform 305ms, setup 111ms, collect 635ms, tests 5ms, environment 639ms, prepare 1.01s)
```

`tsgo --noEmit -p tsconfig.app.json` → clean (0 errors). "No test that passes today may fail"; tolerated inventory per the Item-287 / Item-290 couriers is unchanged.

---

## 4. Double-check

- Diff limited to `src/pages/admin/AdminReplayReview.tsx`, `src/test/item293-replay-review-batches.test.ts`, `docs/courier/ITEM293-REPLAY-REVIEW-FIX-2026-07-30.md`, `docs/pipeline-state.md`.
- No backend file in the diff: no `supabase/functions/**`, no `supabase/migrations/**`, no deploy, no harness invocation, no DB write.
- Admin gate untouched; document open/PDF behavior untouched.

**Disposition:** FIXED. The CEO read at `/admin/replay-review` now opens on CLEAN RUN batch 4 by default.
