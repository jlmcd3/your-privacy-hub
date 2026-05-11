ALTER TABLE public.updates
  ADD COLUMN IF NOT EXISTS source_tier integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS contextual_record jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enrichment_quality text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS contextual_teaser text DEFAULT NULL;