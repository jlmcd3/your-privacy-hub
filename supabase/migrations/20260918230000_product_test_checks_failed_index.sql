-- Doc 275 §14 (2026-09-18) — run 8e0f2e5c (1,196 documents, 34,818 check
-- rows) stalled: the page re-read EVERY check row of the run on each poll
-- and the reads hit "canceling statement due to statement timeout". The
-- page now reads only failed rows while a run is live and pages exports by
-- key; this partial index makes the failed-only read cheap on a large run.

create index if not exists product_test_checks_run_failed_idx
  on public.product_test_checks (run_id, id)
  where passed = false;
