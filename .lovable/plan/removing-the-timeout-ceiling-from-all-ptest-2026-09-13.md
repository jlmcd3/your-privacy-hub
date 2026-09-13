# Removing the timeout ceiling from /all-ptest

Today every review and arbitration is one long request: the browser calls the backend, the backend calls the model, and everyone waits. Backend requests are killed at a fixed wall-clock limit, so a long document or a high-effort arbitration is cut off even though the model was still working correctly. Adding more products makes this worse, not better, because arbitration input grows with every product and every document.

The fix is to stop waiting on a single request. Work becomes a job the backend picks up and continues on its own, and the page watches progress instead of holding a connection open.

## 1. Jobs instead of long requests

Add one job table (`ptest_jobs`) holding: batch, product, kind (`review` or `arbitration`), target document, effort, status (`queued` / `running` / `done` / `failed`), attempt count, heartbeat time, result pointer, error.

- The page enqueues jobs and returns immediately.
- Each backend call claims one job, does as much as it can, writes results, and returns fast.
- The page polls the job table (same polling it already does for generation) and renders progress per document.

Nothing about the review or arbitration prompts changes.

## 2. Self-continuation before the deadline

Each function starts a soft deadline clock well under the hard request limit. When a unit of work finishes and the clock is close, the function stops, marks the job `queued` again with its partial state saved, and re-invokes itself in the background using the existing internal service header. The next invocation resumes exactly where the previous one stopped. This is the pattern already used by the corpus drivers, so it carries forward proven behaviour rather than inventing one.

For a single review call that genuinely runs longer than one request window, the call is issued in the background and its result written when it lands; the job stays `running` with a heartbeat, and a job whose heartbeat goes stale is re-queued once by the same reaper rule the batch harness already uses.

## 3. Arbitration becomes two passes (map, then merge)

Arbitration currently reads every finding for a product in one turn. With more products and longer documents that input will keep growing until it either times out or gets silently truncated — which is worse, because truncation drops findings.

Replace it with:

1. **Per-document pass.** One arbitration call per document, arbitrating just that document's two review sets. Small, fast, parallel, cacheable.
2. **Merge pass.** One call per product that takes only the per-document verdicts (already compact) and deduplicates across documents, producing the single Agreed Fix List and CEO Decision Sheet.

The CEO routing rules stay word for word as they are. Deduplication still happens — it just happens in the merge pass instead of in one giant turn. The existing single-pass path stays available for small products.

## 4. Truncation becomes visible, never silent

Any input cap that is actually hit is recorded on the job and surfaced in the page and the Markdown export as a warning, so a cut-short arbitration can never look like a clean run.

## Technical notes

- New migration: `ptest_jobs` (with grants, RLS admin-read, service-role-all) plus `arbitration_scope` (`document` | `merge`) and `parent_job_id` on `ptest_arbitrations`.
- `deep-review-document` and `arbitrate-review-batch` gain a job-claim entry point; their current direct-call bodies stay as the worker functions so existing behaviour is unchanged.
- New `ptest-run-driver` function: claims queued jobs for a batch, runs them under a soft deadline, re-invokes itself with `x-internal-resume: 1` when the deadline nears.
- `src/lib/ptestRun.ts`: `deepReviewDocument`/`arbitrateProduct` become enqueue + poll helpers; `mapLimited`, retry and timeout discipline are retained for the short enqueue/poll calls.
- `src/pages/admin/AllPTest.tsx`: per-job progress rows; existing stop control cancels queued jobs.
- Effort selectors return to `high` defaults, since the request window is no longer the limiting factor.
