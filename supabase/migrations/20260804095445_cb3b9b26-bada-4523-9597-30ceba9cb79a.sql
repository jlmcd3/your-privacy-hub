ALTER TABLE public.quality_runs
  ADD COLUMN IF NOT EXISTS generation_model text,
  ADD COLUMN IF NOT EXISTS ab_pair_id uuid;

ALTER TABLE public.quality_batch_runs
  ADD COLUMN IF NOT EXISTS ab_models boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS quality_runs_ab_pair_id_idx ON public.quality_runs (ab_pair_id);