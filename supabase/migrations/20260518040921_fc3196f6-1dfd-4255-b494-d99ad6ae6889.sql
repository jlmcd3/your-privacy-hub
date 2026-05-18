ALTER TABLE public.research_syntheses
  ADD COLUMN IF NOT EXISTS headlines jsonb NOT NULL DEFAULT '[]'::jsonb;