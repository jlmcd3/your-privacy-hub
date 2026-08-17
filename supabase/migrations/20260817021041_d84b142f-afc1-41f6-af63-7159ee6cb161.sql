ALTER TABLE public.replay_harness_jobs
  ADD COLUMN IF NOT EXISTS tool text NOT NULL DEFAULT 'cppa_risk';

CREATE INDEX IF NOT EXISTS replay_harness_jobs_tool_created_idx
  ON public.replay_harness_jobs (tool, created_at DESC);