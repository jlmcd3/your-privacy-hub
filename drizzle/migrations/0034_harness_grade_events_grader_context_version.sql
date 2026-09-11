-- DOC 252 H1 (2026-09-10): the all-products harness recorded no grader
-- instrument version, so no batch could be attributed to a
-- GRADER_CONTEXT_VERSION after the fact (batch 916c33a8). "score" events now
-- carry the version grade-single-assessment reports.
ALTER TABLE public.harness_grade_events
  ADD COLUMN IF NOT EXISTS grader_context_version text;
