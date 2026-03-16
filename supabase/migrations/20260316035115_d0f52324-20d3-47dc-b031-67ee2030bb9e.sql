ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS ai_summary JSONB;
CREATE INDEX IF NOT EXISTS updates_ai_summary_idx ON public.updates ((ai_summary IS NOT NULL));