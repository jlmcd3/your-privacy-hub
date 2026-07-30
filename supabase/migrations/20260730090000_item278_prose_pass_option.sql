-- ITEM 278 — PASS-2R harness flag. Additive, nullable, no backfill.
-- Existing jobs and all current callers are unchanged: absent options
-- reads as prose_pass = false.
ALTER TABLE public.replay_harness_jobs
  ADD COLUMN IF NOT EXISTS options jsonb;
