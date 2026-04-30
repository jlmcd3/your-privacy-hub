UPDATE public.updates
SET ai_summary = NULL, enrichment_version = 0
WHERE ai_summary = '{"skipped": true}'::jsonb;