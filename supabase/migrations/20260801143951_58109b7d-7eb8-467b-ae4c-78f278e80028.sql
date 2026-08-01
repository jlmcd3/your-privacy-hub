ALTER TABLE public.quality_runs ADD COLUMN IF NOT EXISTS engine_path text;
ALTER TABLE public.quality_batch_runs ADD COLUMN IF NOT EXISTS engine_path text;