UPDATE public.research_syntheses
SET model_used = 'claude-sonnet-4-6'
WHERE model_used = 'claude-haiku-4-5-20251001';

ALTER TABLE public.research_syntheses
ALTER COLUMN model_used SET DEFAULT 'claude-sonnet-4-6';