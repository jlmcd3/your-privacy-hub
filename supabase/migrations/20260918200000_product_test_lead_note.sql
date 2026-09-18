-- DOC 275 follow-up (2026-09-18) — a free-text "report note" on a Product
-- Test run: what the CEO saw that no check caught (a sentence that reads
-- wrongly, a missing element). The lead reads it with the run's rows and
-- turns it into a check or a fix. One nullable column; no policy change
-- (the admin-only FOR ALL policy on product_test_runs already covers it).

alter table public.product_test_runs
  add column if not exists lead_note text;
