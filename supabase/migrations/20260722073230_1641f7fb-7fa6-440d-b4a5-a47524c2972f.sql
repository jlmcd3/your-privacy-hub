ALTER TABLE public.quality_batch_runs
  ADD COLUMN IF NOT EXISTS concurrency int NOT NULL DEFAULT 1;