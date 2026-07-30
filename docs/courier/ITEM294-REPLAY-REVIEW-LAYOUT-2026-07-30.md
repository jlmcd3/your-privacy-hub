# ITEM 294 — /admin/replay-review LAYOUT + ROBUSTNESS (2026-07-30)

**Authority:** CEO screenshot report 2026-07-30.
**Class:** frontend-only. No backend change, no edge-function deploy, no harness invocation, no DPA files.

---

## 1. CEO-observed problems → fixes (old → new)

All code changes in `src/pages/admin/AdminReplayReview.tsx`.

| # | Problem | Old (file:line, pre-fix) | New |
|---|---|---|---|
| a | Jobs table (20 near-identical rows, no actions) filled the viewport; the DOCUMENTS table with `View report` / `Download PDF` was buried below and read as missing | `:287-312` — jobs `<table>` rendered directly under the batch dropdown, above the summary line and documents table | Summary line + documents table (`data-testid="documents-table"`, Actions column) now render directly under the batch dropdown at `:302-371`; the jobs table moved BELOW the documents table at `:373-411`, collapsed by default behind a `Show jobs (N)` toggle (`showJobs` state, `:125`) |
| b | Batch labels displayed the harness bookkeeping suffix `[bg:waitUntil]` | `:65-67` — `jobLabel` returned the raw `notes` string | `stripBgMarker()` (`:65-70`) removes a trailing `\s*\[bg:…\]` marker; `jobLabel()` applies it, and `batchLabels()` (`:51-57`) now groups via `jobLabel`, so display and grouping use the SAME stripped label — the marker can never split a batch |
| c | Results-query / PDF failures gave no visible explanation (toast-only) | `:158-162` — results error was `toast.error` only, then silent return; `:231-233` — PDF catch emitted the bare error message | `rowsError` state (`:123`) set on failure; inline banner (`role="alert"`, `data-testid="results-error"`) renders above the summary at `:287-298` with the message plus a platform-incident retry note. PDF catch (`:244-249`) now says the PDF service may be temporarily unavailable (platform incident) and to retry |
| d | — | — | Per-row `View report` and `Download PDF` behaviour otherwise UNCHANGED (same `openReport`, same `generate-report-pdf` invoke with `mode: "replay_harness"`), admin gate in `src/App.tsx` untouched |

Exported for pinning: `stripBgMarker` (new), plus the existing `sortJobsNewestFirst`, `batchLabels`, `defaultBatchLabel`, `jobLabel`.

---

## 2. Tests

`src/test/item294-replay-review-layout.test.tsx` — label-stripping pin, grouping equality with/without the `[bg:…]` marker, render-order pin (documents table precedes the jobs toggle; jobs table absent by default), and inline error-banner render on results-query failure. `src/test/item293-replay-review-batches.test.ts` re-run unchanged.

Verbatim output:

```text
 RUN  v3.2.4 /dev-server

 ✓ src/test/item294-replay-review-layout.test.tsx (4 tests) 181ms
 ✓ src/test/item293-replay-review-batches.test.ts (5 tests) 7ms

 Test Files  2 passed (2)
      Tests  9 passed (9)
   Start at  23:11:28
   Duration  6.44s (transform 380ms, setup 341ms, collect 1.23s, tests 188ms, environment 1.90s, prepare 2.52s)
```

`tsgo --noEmit -p tsconfig.app.json` → clean. "No test that passes today may fail"; tolerated inventory per the Item-287 / Item-290 couriers unchanged.

---

## 3. STANDING PUBLISH LAW

Every frontend-affecting turn ENDS WITH A PRODUCTION PUBLISH. Root cause of record: the Item-293 fix was invisible to the CEO because production was never published — controller confirmed from the live bundle hashes. Recorded as ledger law under Item 294.

---

## 4. Double-check

- Diff limited to `src/pages/admin/AdminReplayReview.tsx`, `src/test/item294-replay-review-layout.test.tsx`, `docs/courier/ITEM294-REPLAY-REVIEW-LAYOUT-2026-07-30.md`, `docs/pipeline-state.md`.
- No `supabase/functions/**`, no `supabase/migrations/**`, no deploy, no harness invocation, no DB write, no DPA file.

**Disposition:** FIXED + PUBLISHED.
